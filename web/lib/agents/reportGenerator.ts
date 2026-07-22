import { generateStructured } from "../gemini";

const SYSTEM_PROMPT = `### Capacity and Role
You are the Report Generator Agent, the final synthesis step of a bank-grade fraud investigation swarm. Your output is read directly by a human fraud analyst and retained as the AI explainability record for regulators.
### Insight
You are given three structured findings: a KYCSummary, an AnomalyReport, and a FraudCaseSearchResult, each with its own evidence list.
### Statement
Return ONLY a JSON object matching the InvestigationReport schema. Hard constraints:
1. evidence_citations MUST only reference evidence_ids that appear verbatim in one of the three input evidence lists. Never invent one.
2. fraud_probability must be internally consistent with the cited evidence.
3. recommended_action must be one of: ESCALATE_SAR, CONFIRM_FRAUD, CLEAR_FALSE_POSITIVE, MANUAL_REVIEW.
4. narrative must be structured as: one sentence summary of the fraud type and key risk, then 2-3 bullet points (starting with •) naming specific evidence_ids and what each shows, then one sentence stating the recommended action and why.
### Personality
Written like a senior compliance investigator: measured, evidence-first, willing to say "insufficient evidence" rather than overstate confidence.
### Experiment (few-shot)
Example: sanctions_status=NO_HIT, anomaly_score=88 with a HIGH severity new-geography pattern, top similar case 92% similar CONFIRMED_FRAUD MULE_ACCOUNT. Expected: fraud_probability 80-95, recommended_action="ESCALATE_SAR", confidence="HIGH".`;

export async function reportGenerator(caseId: string, kyc: any, anomaly: any, caseSearch: any) {
  const mockFactory = () => {
    const allEvidence = [...(kyc.evidence || []), ...(anomaly.evidence || []), ...(caseSearch.evidence || [])];
    const topMatch = caseSearch.matches?.[0];

    const scoreComponents = [
      anomaly.anomaly_score ?? 0,
      topMatch ? Math.round(topMatch.similarity * 100) : 30,
      kyc.sanctions_status !== "NO_HIT" ? 80 : 20,
    ];
    const probability = Math.min(97, Math.max(5, Math.round(scoreComponents.reduce((a, b) => a + b, 0) / scoreComponents.length)));

    let action: string, confidence: string;
    if (probability >= 75) { action = "ESCALATE_SAR"; confidence = "HIGH"; }
    else if (probability >= 50) { action = "MANUAL_REVIEW"; confidence = "MEDIUM"; }
    else { action = "CLEAR_FALSE_POSITIVE"; confidence = "MEDIUM"; }

    const flaggedTxnEvidence = anomaly.evidence?.[0];
    const parts = [
      `Investigation of case ${caseId}: transaction analysis produced an anomaly score of ${anomaly.anomaly_score ?? 0}/100` +
        (flaggedTxnEvidence ? ` (see ${flaggedTxnEvidence.evidence_id})` : "") + ".",
    ];
    if (topMatch) {
      parts.push(`The pattern is ${Math.round(topMatch.similarity * 100)}% similar to historical case ${topMatch.case_id} (${topMatch.fraud_type}, verdict: ${topMatch.analyst_verdict}).`);
    }
    parts.push(`KYC screening returned sanctions_status=${kyc.sanctions_status} with identity_score=${kyc.identity_score}.`);
    parts.push(`Recommended action: ${action.replace(/_/g, " ")}.`);

    return {
      case_id: caseId,
      fraud_probability: probability,
      recommended_action: action,
      narrative: parts.join(" "),
      evidence_citations: allEvidence,
      confidence,
    };
  };

  const { data, tokens } = await generateStructured(
    process.env.GROQ_MODEL_PRO || "openai/gpt-oss-120b",
    SYSTEM_PROMPT,
    JSON.stringify({ kyc_summary: kyc, anomaly_report: anomaly, case_search_result: caseSearch }),
    mockFactory
  );
  return { result: data, tokens };
}
