/**
 * Same hashed bag-of-words embedding scheme as the Python reference build
 * (services/agents/common/embeddings.py), ported to TS so the Vercel
 * deployment needs no external embedding service.
 *
 * Deliberately NOT swapped for a live Gemini embedding call even when
 * GROQ_API_KEY is set: the fraud case corpus (fixtures +
 * write-back memory) must be embedded in the same vector space as the
 * query at search time, and re-embedding the whole corpus via a live API
 * call on every request would be slow and wasteful for a ~30-doc demo
 * corpus. The docker-compose reference build's Qdrant path is where the
 * real Gemini embedding swap-in lives (services/agents/common/embeddings.py).
 */
import crypto from "node:crypto";

export const DIM = 128;

function hashedBagOfWordsEmbedding(text: string): number[] {
  const vec = new Array(DIM).fill(0);
  const words = text.toLowerCase().match(/[a-z]+/g) || [];
  for (const w of words) {
    const digest = crypto.createHash("md5").update(w).digest("hex");
    const idx = parseInt(digest.slice(0, 8), 16) % DIM;
    vec[idx] += 1;
  }
  const norm = Math.sqrt(vec.reduce((s, v) => s + v * v, 0));
  return norm > 0 ? vec.map((v) => v / norm) : vec;
}

export async function embed(text: string): Promise<number[]> {
  return hashedBagOfWordsEmbedding(text);
}

export function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}
