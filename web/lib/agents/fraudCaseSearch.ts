import { generateStructured } from "../gemini";
import { embed, cosineSimilarity } from "../embeddings";
import { historicalFraudCases } from "../fixtures";
import { listMemoryCases } from "../db";

const SYSTEM_PROMPT = `### Capacity and Role
You are the Fraud Case Search Agent. You are given the current case's narrative plus a list of semantically/metadata-matched historical cases.
### Insight
Summarize which historical cases are most relevant and why, and what their resolved verdicts imply for the current investigation.
### Statement
Return ONLY a JSON object matching the FraudCaseSearchResult schema. Every match must be one of the case_ids actually provided to you -- never invent one.
### Personality
Analytical librarian: precise about degree of similarity, honest when matches are weak.
### Experiment (few-shot)
Example: 3 historical cases at similarity 0.92, 0.81, 0.60, all CONFIRMED_FRAUD MULE_ACCOUNT. Expected: matches sorted descending, notes name the top precedent by case_id.`;

function amountBracket(amount: number) {
  if (amount < 1000) return "UNDER_1K";
  if (amount < 10000) return "1K_10K";
  if (amount < 50000) return "10K_50K";
  return "OVER_50K";
}

export async function fraudCaseSearch(caseId: string, narrative: string, metadataFilter: Record<string, string> = {}) {
  const queryVector = await embed(narrative || caseId);

  const corpus = [
    ...(historicalFraudCases as any[]).map((c) => ({
      case_id: c.case_id, narrative: c.narrative, fraud_type: c.fraud_type,
      amount_bracket: amountBracket(c.amount), channel: c.channel, geography: c.geography,
      resolution_date: c.resolution_date, analyst_verdict: c.analyst_verdict,
    })),
    ...(await listMemoryCases()).map((c: any) => ({
      case_id: c.case_id, narrative: c.narrative, fraud_type: c.fraud_type,
      amount_bracket: c.amount_bracket, channel: c.channel, geography: c.geography,
      resolution_date: c.resolution_date, analyst_verdict: c.analyst_verdict, embedding: c.embedding,
    })),
  ];

  const filtered = corpus.filter((c) =>
    Object.entries(metadataFilter).every(([k, v]) => !v || (c as any)[k] === v)
  );
  const pool = filtered.length ? filtered : corpus;

  const scored = await Promise.all(
    pool.map(async (c: any) => ({
      ...c,
      similarity: cosineSimilarity(queryVector, c.embedding ? (typeof c.embedding === "string" ? JSON.parse(c.embedding) : c.embedding) : await embed(c.narrative)),
    }))
  );
  scored.sort((a, b) => b.similarity - a.similarity);
  const hits = scored.slice(0, 5).map((h) => ({
    case_id: h.case_id, similarity: Math.round(h.similarity * 1000) / 1000,
    fraud_type: h.fraud_type, analyst_verdict: h.analyst_verdict, resolution_date: h.resolution_date,
  }));

  const mockFactory = () => {
    const evidence = hits.map((h) => ({ evidence_id: h.case_id, source: "Fraud Case Memory", detail: `${h.fraud_type} case, ${Math.round(h.similarity * 100)}% similar, verdict=${h.analyst_verdict}` }));
    const top = hits[0];
    const notes = top
      ? `Most similar precedent: ${top.case_id} (${Math.round(top.similarity * 100)}% similar, ${top.fraud_type}).`
      : "No sufficiently similar historical cases found.";
    return { query_case_id: caseId, matches: hits, evidence, notes };
  };

  const { data, tokens } = await generateStructured(
    process.env.GROQ_MODEL_FLASH || "openai/gpt-oss-20b",
    SYSTEM_PROMPT,
    JSON.stringify({ query_case_id: caseId, narrative, hits }),
    mockFactory
  );
  return { result: data, tokens };
}
