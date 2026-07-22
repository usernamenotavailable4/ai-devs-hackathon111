/**
 * Seeds Qdrant Cloud with the 30 historical fraud cases from fixtures.
 * Run once after creating your Qdrant cluster:
 *
 *   QDRANT_URL=https://xxx.qdrant.io QDRANT_API_KEY=your_key node scripts/seed-qdrant.mjs
 */
import { QdrantClient } from "@qdrant/js-client-rest";
import { createHash } from "crypto";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dir = dirname(fileURLToPath(import.meta.url));
const cases = JSON.parse(readFileSync(join(__dir, "../fixtures/historical_fraud_cases.json"), "utf8"));

const QDRANT_URL = process.env.QDRANT_URL;
const QDRANT_API_KEY = process.env.QDRANT_API_KEY;
const COLLECTION = process.env.QDRANT_COLLECTION || "fraud_case_memory";
const DIM = 128;

if (!QDRANT_URL || !QDRANT_API_KEY) {
  console.error("Set QDRANT_URL and QDRANT_API_KEY env vars.");
  process.exit(1);
}

function embed(text) {
  const vec = new Array(DIM).fill(0);
  const words = text.toLowerCase().match(/[a-z]+/g) || [];
  for (const w of words) {
    const digest = createHash("md5").update(w).digest("hex");
    const idx = parseInt(digest.slice(0, 8), 16) % DIM;
    vec[idx] += 1;
  }
  const norm = Math.sqrt(vec.reduce((s, v) => s + v * v, 0));
  return norm > 0 ? vec.map((v) => v / norm) : vec;
}

function amountBracket(amount) {
  if (amount < 1000) return "UNDER_1K";
  if (amount < 10000) return "1K_10K";
  if (amount < 50000) return "10K_50K";
  return "OVER_50K";
}

function caseIdToInt(id) {
  return Math.abs(id.split("").reduce((h, c) => (h * 31 + c.charCodeAt(0)) | 0, 0));
}

const client = new QdrantClient({ url: QDRANT_URL, apiKey: QDRANT_API_KEY });

// Create or recreate collection
try {
  await client.deleteCollection(COLLECTION);
  console.log("Deleted existing collection.");
} catch {}

await client.createCollection(COLLECTION, {
  vectors: { size: DIM, distance: "Cosine" },
});
console.log(`Created collection '${COLLECTION}' (${DIM}-dim, Cosine).`);

// Upsert all cases
const points = cases.map((c) => ({
  id: caseIdToInt(c.case_id),
  vector: embed(c.narrative),
  payload: {
    case_id: c.case_id,
    narrative: c.narrative,
    fraud_type: c.fraud_type,
    amount_bracket: amountBracket(c.amount || 0),
    channel: c.channel,
    geography: c.geography,
    resolution_date: c.resolution_date,
    analyst_verdict: c.analyst_verdict,
  },
}));

await client.upsert(COLLECTION, { wait: true, points });
console.log(`Seeded ${points.length} cases into Qdrant.`);

// Quick sanity search
const result = await client.search(COLLECTION, {
  vector: embed("offshore wire transfer high risk"),
  limit: 3,
  with_payload: true,
});
console.log("\nTop 3 results for 'offshore wire transfer high risk':");
result.forEach((r) => console.log(`  ${r.payload.case_id}  score=${r.score.toFixed(3)}  ${r.payload.fraud_type}`));
console.log("\nDone. Add QDRANT_URL and QDRANT_API_KEY to Vercel env vars.");
