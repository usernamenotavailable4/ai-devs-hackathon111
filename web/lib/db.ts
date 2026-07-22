/**
 * Storage layer for the Vercel deployment.
 *
 * Vercel serverless functions are stateless and short-lived, so unlike the
 * docker-compose reference architecture (Postgres + Qdrant as separate
 * long-running containers), this deployment needs a persistence layer that
 * works from any function invocation. It uses Vercel Postgres
 * (@vercel/postgres, powered by Neon) when POSTGRES_URL is set -- add it
 * from the Vercel dashboard: Storage tab -> Create Database -> Postgres,
 * which auto-injects the env var, no manual setup.
 *
 * If POSTGRES_URL is absent (e.g. local `next dev` without configuring
 * storage), falls back to a per-process in-memory store. That's fine for
 * a quick local click-through but will NOT persist across serverless
 * invocations in a real Vercel deployment -- configure Postgres before
 * sharing a public demo link.
 */
import { sql } from "@vercel/postgres";

export const HAS_POSTGRES = !!process.env.POSTGRES_URL;

// ---- in-memory fallback (dev only, single-process) ----
// Stored on globalThis so all Next.js route-handler module instances share
// the same Map — module-level vars get separate instances per route bundle.
type MemCase = Record<string, any>;
declare global { var _fi_cases: Map<string, MemCase>; var _fi_audit: MemCase[]; var _fi_memory: MemCase[]; var _fi_seeded: boolean; }
if (!global._fi_cases)  global._fi_cases  = new Map<string, MemCase>();
if (!global._fi_audit)  global._fi_audit  = [];
if (!global._fi_memory) global._fi_memory = [];
const memCases  = global._fi_cases;
const memAudit  = global._fi_audit;
const memMemory = global._fi_memory;

// Seed demo cases so the app looks populated out of the box
if (!global._fi_seeded) {
  global._fi_seeded = true;
  const seed = (id: string, custId: string, accId: string, status: string, prob: number | null, verdict: string | null, report: any | null, createdAt: string) => {
    memCases.set(id, { case_id: id, customer_id: custId, account_id: accId, status, fraud_probability: prob, report_json: report, analyst_verdict: verdict, analyst_notes: verdict ? "Reviewed and confirmed by senior analyst." : null, created_at: createdAt, resolved_at: verdict ? createdAt : null });
  };
  const r1 = { fraud_probability: 91, recommended_action: "ESCALATE_SAR", confidence: "HIGH", narrative: "This transaction exhibits strong indicators of offshore money laundering.\n• TXN-000412: Wire of $148,500 to an entity in a FATF high-risk jurisdiction with no prior relationship.\n• KYC-SANCTION-HIT: Partial name match against OFAC SDN list requires immediate escalation.\n• CASE-HIST-007: 92% similar to a confirmed MULE_ACCOUNT case resolved in 2023.\nEscalate to SAR filing — evidence meets the threshold for regulatory reporting.", evidence_citations: [{ evidence_id: "TXN-000412", source: "Transaction Analyzer", detail: "Offshore wire $148,500 to high-risk geography" }, { evidence_id: "KYC-SANCTION-HIT", source: "KYC Retriever", detail: "Partial OFAC SDN name match" }, { evidence_id: "CASE-HIST-007", source: "Fraud Case Memory (Qdrant)", detail: "MULE_ACCOUNT case, 92% similar, verdict=CONFIRMED_FRAUD" }] };
  const r2 = { fraud_probability: 19, recommended_action: "CLEAR_FALSE_POSITIVE", confidence: "HIGH", narrative: "Flagged pattern is consistent with legitimate payroll activity.\n• TXN-BATCH-221: Three ACH transfers match the company's bi-weekly payroll cycle exactly.\n• KYC-EMP-VERIFY: Customer is a verified payroll administrator at a registered LLC.\n• CASE-HIST-019: 88% similar to a prior FALSE_POSITIVE payroll structuring case.\nClear as false positive — structuring flag does not apply to recurring payroll disbursements.", evidence_citations: [{ evidence_id: "TXN-BATCH-221", source: "Transaction Analyzer", detail: "ACH transfers match bi-weekly payroll schedule" }, { evidence_id: "KYC-EMP-VERIFY", source: "KYC Retriever", detail: "Verified payroll administrator, clean KYC" }, { evidence_id: "CASE-HIST-019", source: "Fraud Case Memory (Qdrant)", detail: "FALSE_POSITIVE payroll case, 88% similar, verdict=FALSE_POSITIVE" }] };
  const r3 = { fraud_probability: 76, recommended_action: "CONFIRM_FRAUD", confidence: "HIGH", narrative: "Account takeover indicators are strong across multiple signals.\n• LOGIN-GEO-ANOMALY: First-ever login from Eastern Europe followed by immediate $47,000 wire within 4 minutes.\n• DEVICE-FINGERPRINT-NEW: Unknown device with no prior session history used for the transaction.\n• CASE-HIST-031: 87% similar to a confirmed account takeover case from Q1 2024.\nRecommend CONFIRM_FRAUD — velocity and geo-anomaly pattern is consistent with credential-stuffing ATO.", evidence_citations: [{ evidence_id: "LOGIN-GEO-ANOMALY", source: "KYC Retriever", detail: "Login from new geography 4 min before wire" }, { evidence_id: "DEVICE-FINGERPRINT-NEW", source: "Transaction Analyzer", detail: "Unknown device, no prior session history" }, { evidence_id: "CASE-HIST-031", source: "Fraud Case Memory (Qdrant)", detail: "ATO case, 87% similar, verdict=CONFIRMED_FRAUD" }] };
  seed("CASE-DEMO-001", "CUST-1000", "ACC-5000", "CONFIRMED_FRAUD", 91, "CONFIRMED_FRAUD", r1, "2026-07-22T08:14:00.000Z");
  seed("CASE-DEMO-002", "CUST-1004", "ACC-5004", "FALSE_POSITIVE",  19, "FALSE_POSITIVE",  r2, "2026-07-22T09:30:00.000Z");
  seed("CASE-DEMO-003", "CUST-1015", "ACC-5015", "PENDING_REVIEW",  76, null,              r3, "2026-07-22T10:55:00.000Z");
  // Seed audit entries for demo case 1
  const hash = (s: string) => Array.from(s).reduce((h, c) => (Math.imul(31, h) + c.charCodeAt(0)) | 0, 0).toString(16).padStart(64, "0");
  const auditEvents = [
    { actor: "api_gateway", event_type: "ALERT_RECEIVED", correlation_id: "CASE-DEMO-001" },
    { actor: "orchestrator", event_type: "DISPATCH_PLAN", correlation_id: "CASE-DEMO-001" },
    { actor: "kyc_retriever_agent", event_type: "AGENT_CALL", correlation_id: "CASE-DEMO-001" },
    { actor: "transaction_analyzer_agent", event_type: "AGENT_CALL", correlation_id: "CASE-DEMO-001" },
    { actor: "fraud_case_search_agent", event_type: "AGENT_CALL", correlation_id: "CASE-DEMO-001" },
    { actor: "report_generator_agent", event_type: "REPORT_FINALIZED", correlation_id: "CASE-DEMO-001" },
    { actor: "api_gateway", event_type: "ANALYST_VERDICT", correlation_id: "CASE-DEMO-001" },
  ];
  let prevHash = "0".repeat(64);
  auditEvents.forEach((e, i) => {
    const entryHash = hash(prevHash + e.actor + e.event_type + i);
    memAudit.push({ seq: i + 1, correlation_id: e.correlation_id, actor: e.actor, event_type: e.event_type, payload: { case_id: e.correlation_id }, prev_hash: prevHash, entry_hash: entryHash, created_at: "2026-07-22T08:14:00.000Z" });
    prevHash = entryHash;
  });
}

let initialized = false;

export async function ensureSchema() {
  if (!HAS_POSTGRES || initialized) return;
  await sql`
    CREATE TABLE IF NOT EXISTS investigation_cases (
      case_id TEXT PRIMARY KEY,
      customer_id TEXT NOT NULL,
      account_id TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'IN_PROGRESS',
      fraud_probability INTEGER,
      report_json JSONB,
      analyst_verdict TEXT,
      analyst_notes TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      resolved_at TIMESTAMPTZ
    );
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS audit_log (
      seq BIGSERIAL PRIMARY KEY,
      correlation_id TEXT NOT NULL,
      actor TEXT NOT NULL,
      event_type TEXT NOT NULL,
      payload JSONB NOT NULL,
      prev_hash TEXT NOT NULL,
      entry_hash TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS fraud_case_memory (
      id SERIAL PRIMARY KEY,
      case_id TEXT NOT NULL,
      narrative TEXT NOT NULL,
      embedding JSONB NOT NULL,
      fraud_type TEXT NOT NULL,
      amount_bracket TEXT NOT NULL,
      channel TEXT NOT NULL,
      geography TEXT NOT NULL,
      resolution_date TEXT NOT NULL,
      analyst_verdict TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `;
  initialized = true;
}

export async function insertCase(caseId: string, customerId: string, accountId: string) {
  if (HAS_POSTGRES) {
    await ensureSchema();
    await sql`
      INSERT INTO investigation_cases (case_id, customer_id, account_id, status)
      VALUES (${caseId}, ${customerId}, ${accountId}, 'IN_PROGRESS')
      ON CONFLICT (case_id) DO NOTHING;
    `;
  } else {
    memCases.set(caseId, {
      case_id: caseId, customer_id: customerId, account_id: accountId,
      status: "IN_PROGRESS", fraud_probability: null, report_json: null,
      analyst_verdict: null, analyst_notes: null, created_at: new Date().toISOString(),
      resolved_at: null,
    });
  }
}

export async function updateCaseReport(caseId: string, report: any) {
  if (HAS_POSTGRES) {
    await ensureSchema();
    await sql`
      UPDATE investigation_cases
      SET status = 'PENDING_REVIEW', fraud_probability = ${report.fraud_probability}, report_json = ${JSON.stringify(report)}
      WHERE case_id = ${caseId};
    `;
  } else {
    const c = memCases.get(caseId);
    if (c) {
      c.status = "PENDING_REVIEW";
      c.fraud_probability = report.fraud_probability;
      c.report_json = report;
    }
  }
}

export async function updateCaseVerdict(caseId: string, verdict: string, notes: string) {
  if (HAS_POSTGRES) {
    await ensureSchema();
    await sql`
      UPDATE investigation_cases
      SET status = ${verdict}, analyst_verdict = ${verdict}, analyst_notes = ${notes}, resolved_at = now()
      WHERE case_id = ${caseId};
    `;
  } else {
    const c = memCases.get(caseId);
    if (c) {
      c.status = verdict;
      c.analyst_verdict = verdict;
      c.analyst_notes = notes;
      c.resolved_at = new Date().toISOString();
    }
  }
}

export async function listCases() {
  if (HAS_POSTGRES) {
    await ensureSchema();
    const { rows } = await sql`
      SELECT case_id, customer_id, account_id, status, fraud_probability, analyst_verdict, created_at, resolved_at
      FROM investigation_cases ORDER BY created_at DESC LIMIT 200;
    `;
    return rows;
  }
  return [...memCases.values()]
    .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
    .map(({ report_json, analyst_notes, ...rest }) => rest);
}

export async function getCase(caseId: string) {
  if (HAS_POSTGRES) {
    await ensureSchema();
    const { rows } = await sql`SELECT * FROM investigation_cases WHERE case_id = ${caseId};`;
    return rows[0] || null;
  }
  return memCases.get(caseId) || null;
}

export async function appendAudit(correlationId: string, actor: string, eventType: string, payload: any) {
  const crypto = await import("node:crypto");
  const hashRow = (prevHash: string, createdAt: string) =>
    crypto
      .createHash("sha256")
      .update(JSON.stringify({ prevHash, correlationId, actor, eventType, payload, createdAt }))
      .digest("hex");

  const createdAt = new Date().toISOString();

  if (HAS_POSTGRES) {
    await ensureSchema();
    const { rows } = await sql`SELECT entry_hash FROM audit_log ORDER BY seq DESC LIMIT 1;`;
    const prevHash = rows[0]?.entry_hash || "0".repeat(64);
    const entryHash = hashRow(prevHash, createdAt);
    await sql`
      INSERT INTO audit_log (correlation_id, actor, event_type, payload, prev_hash, entry_hash, created_at)
      VALUES (${correlationId}, ${actor}, ${eventType}, ${JSON.stringify(payload)}, ${prevHash}, ${entryHash}, ${createdAt});
    `;
    return entryHash;
  }
  const prevHash = memAudit.length ? memAudit[memAudit.length - 1].entry_hash : "0".repeat(64);
  const entryHash = hashRow(prevHash, createdAt);
  memAudit.push({ correlation_id: correlationId, actor, event_type: eventType, payload, prev_hash: prevHash, entry_hash: entryHash, created_at: createdAt, seq: memAudit.length + 1 });
  return entryHash;
}

export async function getAuditForCase(correlationId: string) {
  if (HAS_POSTGRES) {
    await ensureSchema();
    const { rows } = await sql`SELECT * FROM audit_log WHERE correlation_id = ${correlationId} ORDER BY seq ASC;`;
    return rows;
  }
  return memAudit.filter((r) => r.correlation_id === correlationId);
}

export async function verifyAuditChain() {
  const crypto = await import("node:crypto");
  const hashRow = (prevHash: string, correlationId: string, actor: string, eventType: string, payload: any, createdAt: string) =>
    crypto
      .createHash("sha256")
      .update(JSON.stringify({ prevHash, correlationId, actor, eventType, payload, createdAt }))
      .digest("hex");

  let rows: any[];
  if (HAS_POSTGRES) {
    await ensureSchema();
    rows = (await sql`SELECT * FROM audit_log ORDER BY seq ASC;`).rows;
  } else {
    rows = memAudit;
  }

  let prevHash = "0".repeat(64);
  for (const row of rows) {
    const createdAt = row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at;
    const expected = hashRow(prevHash, row.correlation_id, row.actor, row.event_type, row.payload, createdAt);
    if (row.prev_hash !== prevHash || row.entry_hash !== expected) {
      return { valid: false, broken_at_seq: row.seq, reason: "hash mismatch: row payload or chain link has been altered" };
    }
    prevHash = row.entry_hash;
  }
  return { valid: true, entries_checked: rows.length };
}

export async function writeBackResolvedCase(entry: {
  case_id: string; narrative: string; embedding: number[]; fraud_type: string;
  amount_bracket: string; channel: string; geography: string; resolution_date: string; analyst_verdict: string;
}) {
  // Always write to Qdrant when available (primary vector store)
  const { upsertCase, HAS_QDRANT } = await import("./qdrant");
  if (HAS_QDRANT) await upsertCase(entry);

  if (HAS_POSTGRES) {
    await ensureSchema();
    await sql`
      INSERT INTO fraud_case_memory (case_id, narrative, embedding, fraud_type, amount_bracket, channel, geography, resolution_date, analyst_verdict)
      VALUES (${entry.case_id}, ${entry.narrative}, ${JSON.stringify(entry.embedding)}, ${entry.fraud_type},
              ${entry.amount_bracket}, ${entry.channel}, ${entry.geography}, ${entry.resolution_date}, ${entry.analyst_verdict});
    `;
  } else if (!HAS_QDRANT) {
    memMemory.push({ ...entry, id: memMemory.length + 1 });
  }
}

export async function listMemoryCases() {
  if (HAS_POSTGRES) {
    await ensureSchema();
    const { rows } = await sql`SELECT * FROM fraud_case_memory ORDER BY id ASC;`;
    return rows;
  }
  return memMemory;
}
