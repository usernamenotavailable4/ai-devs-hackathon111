# AI Fraud & Anomaly Investigation Agent (BFSI)

An AI-native multi-agent system that investigates flagged bank transactions end to end: retrieves similar historical fraud cases, verifies KYC and sanctions screening, analyzes transaction behavior, reasons about fraud probability, and generates a cited, analyst-ready investigation report.

Built for the [track brief]: automate the "detective work" fraud analysts currently do manually across disconnected systems, cutting a 30-45 minute investigation down to under 2 minutes of human review.

This is the Stage 2 submission — a running system, not just a design. See `docs/PRD.md` for the full requirements doc (with FR/NFR IDs and a traceability matrix) and `docs/architecture.md` for the architecture diagram and design rationale.

## Two ways to run this

This repo ships two runnable versions of the same design, for two different purposes:

1. **`web/` — the live demo, deployable to Vercel in a few clicks.** A single Next.js app collapsing the API Gateway, PII masking, orchestrator, and all four agents into one project, using Vercel's built-in Postgres storage. This is what you hand to judges as a clickable URL. See `web/README.md` for one-click deploy steps.
2. **`services/` + `docker-compose.yml` — the full reference architecture.** The mandatory hackathon stack (Google ADK, Qdrant, Lyzr) wired together with real async Pub/Sub messaging, a standalone Qdrant vector DB, and Microsoft Presidio PII masking. This is the architecture described in `docs/architecture.md` and is what demonstrates production-grade design depth.

Both run the identical CRISPE prompts, output schemas, and agent logic (`docs/prompts/`) — the Vercel version substitutes serverless-friendly infrastructure (concurrent function calls instead of Pub/Sub, request-time cosine similarity instead of a Qdrant container, regex PII masking instead of Presidio) where a container-based service doesn't fit a stateless function runtime. Every substitution is listed and justified in `web/README.md`.

## What changed since Stage 1

Stage 1 scored "Strongly Aligned" with the track but flagged four gaps. Each is addressed here, with a pointer to the exact evidence:

| Stage 1 finding | Fix | Where |
| :--- | :--- | :--- |
| Synchronous orchestration → tight coupling, latency risk | Orchestrator and agents communicate only via Pub/Sub topics (emulator locally, same SDK as production Cloud Pub/Sub) | `services/orchestrator/`, `docs/architecture.md` |
| No production-grade prompt specs (CRISPE, output schemas, few-shot) | CRISPE prompt appendix per agent, enforced at runtime via Gemini `response_schema` | `docs/prompts/*.md`, `services/agents/*/agent.py` |
| No explicit security controls (encryption, input validation) | Pydantic schema validation at every boundary; PII masking with a scripted leak test; security control table split into "implemented" vs "documented production target" | `docs/PRD.md` §7 |
| No LLM observability (OpenTelemetry, correlation IDs) | OpenTelemetry spans around every agent/orchestrator call, tagged with the case's correlation ID; token + latency tracked per LLM call | `services/agents/common/tracing.py` |

## Architecture at a glance

Flagged alert → API Gateway (input validation) → PII Masking → Pub/Sub → Lyzr Orchestrator (Gemini 2.5 Pro) fans out to three parallel agents (KYC Retriever, Transaction Analyzer, Fraud Case Search — all Google ADK + Gemini 2.5 Flash) → Report Generator (Gemini 2.5 Pro) synthesizes a schema-enforced, evidence-cited report → Analyst Dashboard (scroll-gated verdict) → confirmed/false-positive verdict is embedded and written back into Qdrant's fraud case memory.

Every hop is logged to a hash-chained, tamper-evident audit log that you can verify live (`GET /audit/verify`) — see `docs/architecture.md` for the full diagram and the local-vs-production substitution table (Postgres↔Spanner, hashed log↔BigQuery+CMEK, mock Sanctions API↔licensed vendor, etc.).

Mandatory hackathon stack — **Google ADK, Qdrant, Lyzr** — all present and load-bearing, not decorative:
- **Google ADK**: all four agents.
- **Qdrant**: fraud case memory, read by the search agent and written back by the dashboard.
- **Lyzr**: the orchestrator's dispatch-planning brain.

## Quickstart

Requires Docker + Docker Compose, and Python 3.11+ on the host for the seed/demo scripts.

```bash
cp .env.example .env
# Optionally fill in GROQ_API_KEY and LYZR_API_KEY in .env for live LLM calls.
# Leave them blank and the whole pipeline still runs end-to-end in
# deterministic DEMO_MODE (every agent falls back to schema-matching mock output).

./scripts/run_demo_case.sh
```

This brings up the full stack (Qdrant, Postgres, Pub/Sub emulator, mock Sanctions API, PII masking, audit log, API gateway, orchestrator, all four agents, and the dashboard), seeds transaction/KYC/historical fraud case fixtures, submits one flagged alert, and prints the resulting investigation report.

Then open the dashboard: **http://localhost:5173**

To submit more cases interactively, use the "Submit a flagged transaction alert" form in the dashboard, or:

```bash
curl -X POST http://localhost:8000/alerts \
  -H "X-API-Key: demo-key-change-me" -H "Content-Type: application/json" \
  -d '{"customer_id":"CUST-1004","account_id":"ACC-5004","flagged_transaction_id":"TXN-000452",
       "narrative":"Three transfers just under the $10,000 threshold within 48 hours."}'
```

Check audit log integrity live: `curl http://localhost:8000/audit/verify` (or the "Verify Audit Log Integrity" button in the dashboard header) — this recomputes the hash chain and will name the exact tampered row if you edit an entry directly in Postgres.

## Demo mode vs. live mode

Every LLM call and embedding call checks for `GROQ_API_KEY`; every Lyzr orchestration decision checks for `LYZR_API_KEY`. If absent, the system runs in `DEMO_MODE`: deterministic, schema-matching mock responses stand in, so the entire async multi-agent pipeline — Pub/Sub dispatch, parallel agent execution, join logic, report synthesis, audit logging, dashboard — runs and is fully demonstrable without any credentials. Supplying the keys in `.env` switches every agent to real Groq calls and real Lyzr orchestration with no code changes.

## Repository layout

```
docs/                  PRD (with FR/NFR IDs + traceability matrix), architecture doc, CRISPE prompt specs
services/
  api_gateway/          FastAPI entry point, input validation, verdict + write-back endpoints
  pii_masking/           Presidio-based PII redaction service
  audit_log/             Hash-chained immutable audit log
  mock_sanctions_api/    Fixture-backed Sanctions/PEP screening API
  orchestrator/          Lyzr-backed dispatch planner + Pub/Sub fan-out/fan-in
  agents/
    common/               Shared LLM client, schemas, Pub/Sub client, tracing, embeddings
    kyc_retriever/        Google ADK agent
    transaction_analyzer/ Google ADK agent
    fraud_case_search/    Google ADK agent
    report_generator/     Google ADK agent
frontend/               React + Tailwind + TypeScript analyst dashboard
fixtures/               Synthetic transactions, KYC docs, sanctions watchlist, historical fraud cases
scripts/                Seed scripts + one-command demo runner
```

## Known limitations / honest scoping

This is a hackathon build, not a bank's production deployment. What's real: the full async multi-agent pipeline, Qdrant hybrid search, schema-enforced LLM outputs, PII masking, the hash-chained audit log, OpenTelemetry tracing, and the dashboard. What's substituted for speed and demo reliability: Cloud Spanner → Postgres, BigQuery → hash-chained Postgres, a real Sanctions/PEP vendor → a fixture-backed mock with the same API contract, and full GCP IAM → an API-key stub. Every substitution is listed with its production target in `docs/architecture.md` and `docs/PRD.md` §7 — nothing here is hidden or overstated.

## License

Built for a hackathon submission; no license restrictions on reuse for evaluation purposes.
