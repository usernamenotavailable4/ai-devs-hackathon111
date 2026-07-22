/**
 * Qdrant Cloud client for the Vercel deployment.
 * Set QDRANT_URL + QDRANT_API_KEY env vars to enable.
 * Falls back to null (in-memory cosine path) when absent.
 */
import { QdrantClient } from "@qdrant/js-client-rest";

export const COLLECTION = process.env.QDRANT_COLLECTION || "fraud_case_memory";
export const HAS_QDRANT = !!(process.env.QDRANT_URL && process.env.QDRANT_API_KEY);

let _client: QdrantClient | null = null;

export function getQdrant(): QdrantClient | null {
  if (!HAS_QDRANT) return null;
  if (!_client) {
    _client = new QdrantClient({
      url: process.env.QDRANT_URL!,
      apiKey: process.env.QDRANT_API_KEY!,
    });
  }
  return _client;
}

export const DIM = 128;

/** Ensure collection exists with correct vector config. */
export async function ensureCollection() {
  const client = getQdrant();
  if (!client) return;
  try {
    await client.getCollection(COLLECTION);
  } catch {
    await client.createCollection(COLLECTION, {
      vectors: { size: DIM, distance: "Cosine" },
    });
  }
}

/** Upsert a resolved case into Qdrant. */
export async function upsertCase(entry: {
  case_id: string; narrative: string; embedding: number[];
  fraud_type: string; amount_bracket: string; channel: string;
  geography: string; resolution_date: string; analyst_verdict: string;
}) {
  const client = getQdrant();
  if (!client) return;
  await ensureCollection();
  const id = Math.abs(entry.case_id.split("").reduce((h, c) => (h * 31 + c.charCodeAt(0)) | 0, 0));
  await client.upsert(COLLECTION, {
    wait: true,
    points: [{
      id,
      vector: entry.embedding,
      payload: {
        case_id: entry.case_id,
        narrative: entry.narrative,
        fraud_type: entry.fraud_type,
        amount_bracket: entry.amount_bracket,
        channel: entry.channel,
        geography: entry.geography,
        resolution_date: entry.resolution_date,
        analyst_verdict: entry.analyst_verdict,
      },
    }],
  });
}

/** Search for similar cases by vector. */
export async function searchSimilar(
  vector: number[],
  limit = 5,
  filter?: Record<string, string>,
): Promise<any[]> {
  const client = getQdrant();
  if (!client) return [];
  await ensureCollection();

  const mustConditions = filter
    ? Object.entries(filter)
        .filter(([, v]) => v)
        .map(([k, v]) => ({ key: k, match: { value: v } }))
    : [];

  const results = await client.search(COLLECTION, {
    vector,
    limit,
    with_payload: true,
    ...(mustConditions.length > 0 ? { filter: { must: mustConditions } } : {}),
  });

  return results.map((r) => ({ ...r.payload, similarity: r.score }));
}
