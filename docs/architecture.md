# Architecture — AI Fraud & Anomaly Investigation Agent

## Flow diagram

```
                                   ┌─────────────────────────┐
  Flagged Transaction Alert  ───▶  │      API Gateway        │
                                   │ (FastAPI, Pydantic       │
                                   │  input validation)       │
                                   └───────────┬─────────────┘
                                               │ mask PII
                                               ▼
                                   ┌─────────────────────────┐
                                   │   PII Masking Service    │
                                   │   (Presidio)              │
                                   └───────────┬─────────────┘
                                               │ publish: investigation-tasks
                                               ▼
                              ┌───────────────────────────────────┐
                              │  Google Cloud Pub/Sub (emulator)   │
                              └───────────────┬─────────────────────┘
                                              ▼
                              ┌───────────────────────────────────┐
                              │   Investigation Orchestrator        │
                              │   (Lyzr + Gemini 2.5 Pro)            │
                              │   -> decides dispatch plan           │
                              └───┬───────────┬───────────┬─────────┘
                       publish    │           │           │  publish
                  kyc-retriever   │  txn-analyzer          │ fraud-case-search
                     -tasks       │     -tasks              │    -tasks
                                  ▼           ▼              ▼
                     ┌─────────────┐ ┌─────────────────┐ ┌────────────────────┐
                     │ KYC Retriever│ │Transaction       │ │ Fraud Case Search   │
                     │ Agent (ADK,  │ │Analyzer Agent    │ │ Agent (ADK,          │
                     │ Gemini Flash)│ │(ADK, Gemini Flash)│ │ Gemini Flash)        │
                     │ -> Sanctions │ │ -> Postgres       │ │ -> Qdrant hybrid     │
                     │   & PEP API  │ │   (txn history)   │ │   search             │
                     └──────┬───────┘ └────────┬──────────┘ └──────────┬──────────┘
                            │ publish results   │ publish results       │ publish results
                            ▼                   ▼                       ▼
                     ┌───────────────────────────────────────────────────────┐
                     │        Pub/Sub *-results topics (async fan-in)          │
                     └───────────────────────────┬───────────────────────────┘
                                                 │ orchestrator joins all 3, publishes
                                                 ▼           report-generator-tasks
                                    ┌─────────────────────────┐
                                    │   Report Generator Agent  │
                                    │   (ADK, Gemini 2.5 Pro)    │
                                    │   -> schema-enforced,       │
                                    │      evidence-cited report  │
                                    └───────────┬─────────────┘
                                               │ persist + publish result
                                               ▼
                                    ┌─────────────────────────┐
                                    │   Investigation Case DB   │
                                    │       (Postgres)           │
                                    └───────────┬─────────────┘
                                               ▼
                                    ┌─────────────────────────┐
                                    │   Analyst Dashboard        │
                                    │ (React/Tailwind/TS)        │
                                    │ -> scroll-gated verdict     │
                                    └───────────┬─────────────┘
                                               │ verdict + write-back
                                               ▼
                                    ┌─────────────────────────┐
                                    │  Qdrant Fraud Case Memory  │
                                    │  (Continuous Learning Loop) │
                                    └─────────────────────────┘

  Every arrow above that crosses a service boundary also writes an entry to the
  hash-chained Audit & Compliance Log, and is wrapped in an OpenTelemetry span
  tagged with the case's correlation_id.
```

## Why async, not synchronous (Stage 1 finding #1)

Stage 1 feedback: *"Reliance on synchronous internal APIs for agent orchestration ... introduces tight coupling and latency bottlenecks."*

In this build, the orchestrator never calls a worker agent's endpoint directly and blocks for a response. Instead:
- The orchestrator **publishes** a task message to a topic and returns immediately.
- Each agent is an independent long-running subscriber; it can be scaled, restarted, or fail independently without blocking the others or the orchestrator.
- Results flow back over their own topics; the orchestrator's fan-in logic is just three background threads updating shared state, not a blocking wait on three RPCs.
- Because this uses the real `google-cloud-pubsub` SDK against a local emulator, moving to production Google Cloud Pub/Sub is a configuration change (drop `PUBSUB_EMULATOR_HOST`, add real project credentials) — no code changes to any publisher or subscriber.

## Why a hash-chained log instead of "BigQuery says immutable" (Stage 1 finding, security)

An assertion that a table is "configured as immutable" isn't something a judge (or a regulator) can verify by looking at the PRD. The local build instead computes a SHA-256 hash chain across every audit row: each row embeds the hash of the previous row plus its own payload. `GET /audit/verify` recomputes the entire chain and returns the exact row where any tampering occurred. This is a stronger and independently checkable claim than "immutable storage," and it maps directly onto the production target (BigQuery insert-only table + CMEK + no delete/update IAM grants).

## Production swap-in path

| Local (this build) | Production |
| :--- | :--- |
| Pub/Sub emulator | Google Cloud Pub/Sub |
| Postgres (transactions, cases, audit log) | Cloud Spanner (transactions), Cloud SQL (cases), BigQuery insert-only + CMEK (audit log) |
| Mock Sanctions/PEP API (fixture-backed FastAPI) | Licensed screening vendor (e.g. World-Check), same HTTP contract |
| Hashed bag-of-words embeddings | Third-party embedding API (same `embed()` call signature, swappable via config) |
| API-key auth stub | Full Google Cloud IAM / OAuth2 |
| No TLS (docker-compose internal network) | TLS 1.3 termination at Cloud Run / Envoy ingress |
| No at-rest encryption config | AES-256 via Cloud SQL/GCS/BigQuery managed encryption + CMEK |

## Google ADK / Qdrant / Lyzr usage (mandatory stack, confirmed "Met" in Stage 1)

- **Google ADK**: all four worker agents (`services/agents/*`) are structured as ADK-style agents — each owns a system prompt, a strict output schema, and a single well-defined responsibility.
- **Qdrant**: the Fraud Case Search Agent's read path and the Analyst Dashboard's write-back path both operate on the same `fraud_case_memory` collection, using the exact metadata schema (`fraud_type`, `amount_bracket`, `channel`, `geography`, `resolution_date`) specified in PRD §6.
- **Lyzr**: the Investigation Orchestrator's dispatch-planning brain (`services/orchestrator/lyzr_client.py`) is a Lyzr-backed decision point; the async messaging glue around it is what fixes the Stage 1 architecture finding without removing Lyzr from the design.
