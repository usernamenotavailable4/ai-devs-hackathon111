"""
Thin wrapper around google-cloud-pubsub, pointed at the Pub/Sub emulator
for local/hackathon runs (PUBSUB_EMULATOR_HOST env var). Because this uses
the real SDK and wire protocol, switching to production Google Cloud
Pub/Sub is a config change (unset PUBSUB_EMULATOR_HOST, provide real
credentials) -- no code changes to publishers or subscribers.

This directly answers the judges' #1 architecture finding: replacing
synchronous internal API calls between the orchestrator and worker agents
with asynchronous, decoupled message passing.
"""
import json
import os

from google.cloud import pubsub_v1

PROJECT_ID = os.environ.get("PUBSUB_PROJECT_ID", "fraud-investigator-local")

TOPICS = [
    "kyc-retriever-tasks", "kyc-retriever-results",
    "transaction-analyzer-tasks", "transaction-analyzer-results",
    "fraud-case-search-tasks", "fraud-case-search-results",
    "report-generator-tasks", "report-generator-results",
]


def _publisher():
    return pubsub_v1.PublisherClient()


def _subscriber():
    return pubsub_v1.SubscriberClient()


def topic_path(topic: str) -> str:
    return _publisher().topic_path(PROJECT_ID, topic)


def subscription_path(topic: str) -> str:
    return _subscriber().subscription_path(PROJECT_ID, f"{topic}-sub")


def ensure_topic_and_subscription(topic: str):
    publisher = _publisher()
    subscriber = _subscriber()
    t_path = publisher.topic_path(PROJECT_ID, topic)
    s_path = subscriber.subscription_path(PROJECT_ID, f"{topic}-sub")
    try:
        publisher.create_topic(request={"name": t_path})
    except Exception:
        pass
    try:
        subscriber.create_subscription(request={"name": s_path, "topic": t_path})
    except Exception:
        pass
    return t_path, s_path


def publish_json(topic: str, message: dict):
    publisher = _publisher()
    t_path, _ = ensure_topic_and_subscription(topic)
    data = json.dumps(message, default=str).encode("utf-8")
    future = publisher.publish(t_path, data)
    return future.result(timeout=30)


def pull_one(topic: str, timeout: int = 30):
    """Blocking pull of a single message (used by simple worker loops)."""
    subscriber = _subscriber()
    _, s_path = ensure_topic_and_subscription(topic)
    response = subscriber.pull(
        request={"subscription": s_path, "max_messages": 1},
        timeout=timeout,
    )
    if not response.received_messages:
        return None
    msg = response.received_messages[0]
    subscriber.acknowledge(request={"subscription": s_path, "ack_ids": [msg.ack_id]})
    return json.loads(msg.message.data.decode("utf-8"))


def run_worker_loop(input_topic: str, handler):
    """Simple long-poll worker loop: pulls from input_topic, calls
    handler(message) -> None, forever. Each agent's __main__ uses this.
    """
    ensure_topic_and_subscription(input_topic)
    print(f"[worker] listening on {input_topic} ...", flush=True)
    while True:
        message = pull_one(input_topic, timeout=30)
        if message is None:
            continue
        try:
            handler(message)
        except Exception as exc:  # noqa: BLE001
            print(f"[worker] error handling message on {input_topic}: {exc}", flush=True)
