# Vercel-deployable version

This is a single Next.js app that collapses the reference architecture's API Gateway, PII masking, orchestrator, and four agents into one deployable project, so it runs on Vercel with essentially zero infrastructure setup. It's the "click a link and it just works" version for judges; the `docker-compose` stack at the repo root remains the full reference architecture demonstrating the mandatory stack (Google ADK, Qdrant, Lyzr) and a true async Pub/Sub design.

## Why this exists alongside the docker-compose stack

Vercel serverless functions are stateless and time-limited -- they cannot host long-running Pub/Sub subscribers, a standalone Qdrant container, or a stateful orchestrator process. Rather than fake that architecture badly, this deployment is honest about the substitution:

| Reference build (repo root) | This Vercel deployment | Why |
| :--- | :--- | :--- |
| Orchestrator + Pub/Sub topics, agents as separate subscriber processes | Agents called as concurrent `Promise.all` functions inside one API route | A serverless function can't host a subscriber; concurrent promises still express "parallel, non-blocking fan-out," just within one invocation instead of across processes. |
| Qdrant vector DB | Cosine similarity computed at request time over a bundled fixture + a small Postgres-backed "memory" table | The corpus is ~30 historical cases; a full vector DB is overkill and adds a signup step. Documented explicitly as a substitution, not hidden. |
| Postgres in a container | Vercel Postgres (Storage tab, powered by Neon) or in-memory fallback for local dev | Vercel's own first-party storage integration -- zero extra signup, env vars auto-injected. |
| Microsoft Presidio PII masking | Regex-based PII masking (`lib/pii.ts`) | Presidio's Python/NLP dependencies don't fit a lean serverless bundle. Narrower coverage, same purpose, clearly labeled. |
| Lyzr + Google ADK agent structure, CRISPE prompts | Same prompts, same schemas, same mock-fallback contract, ported to TypeScript | The intelligence design didn't change -- only the runtime/transport did. |

Every agent's system prompt, output schema, and mock-mode fallback logic is a direct port of the Python reference implementation in `services/agents/`See `../docs/prompts/` for the CRISPE specs these implement.

## Deploy to Vercel

1. Push this repo to GitHub.
2. In Vercel: **New Project** → import the repo → set **Root Directory** to `web`.
3. (Recommended) In the project's **Storage** tab: **Create Database** → **Postgres**. This auto-injects `POSTGRES_URL` and related env vars — no manual connection-string wrangling.
4. (Optional) Add `GROQ_API_KEY` in **Settings → Environment Variables** to switch every agent from deterministic `DEMO_MODE` mock output to live Groq calls. Leave it unset and the full pipeline still runs end-to-end.
5. (Optional) Add `LYZR_API_KEY`, `LYZR_API_BASE`, `LYZR_ORCHESTRATOR_AGENT_ID` to route dispatch-planning through a real Lyzr Studio agent.
6. Change `API_GATEWAY_KEY` from the default placeholder before sharing the URL publicly, and set the matching `NEXT_PUBLIC_API_GATEWAY_KEY` so the dashboard can call the API.
7. Deploy. Open the generated `*.vercel.app` URL — the dashboard loads directly, no separate setup step.

## Local development

```bash
cd web
npm install
cp .env.example .env.local   # optionally fill in POSTGRES_URL / GROQ_API_KEY
npm run dev
```

Without `POSTGRES_URL` set, storage falls back to an in-memory store scoped to the running `next dev` process — fine for a quick local click-through, but it won't persist across serverless invocations in an actual Vercel deployment. Configure Vercel Postgres before sharing a public demo link.

## What's real here

Every prompt, schema, dispatch-planning call, hash-chained audit log, PII masking pass, and the scroll-gated dashboard verdict flow are fully implemented and functional -- this is not a static mockup. What's scoped down for the serverless constraint is documented in the table above.
