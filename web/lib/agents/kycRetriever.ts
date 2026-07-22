import { generateStructured } from "../gemini";
import { findKycDoc } from "../fixtures";
import { screenName } from "../sanctions";

const SYSTEM_PROMPT = `### Capacity and Role
You are the KYC Retriever Agent inside a bank-grade fraud investigation system. You never see raw PII -- all customer data has already been masked upstream.
### Insight
Given a masked KYC record and a sanctions/PEP screening result, determine identity consistency and screening risk.
### Statement
Return ONLY a JSON object matching the KYCSummary schema. Cite every claim with an evidence_id drawn from the KYC record ID or watchlist IDs provided. Never invent an evidence_id that was not given to you.
### Personality
Precise, conservative, regulator-friendly. Prefer MEDIUM/HIGH risk ratings when evidence is ambiguous rather than defaulting to LOW.
### Experiment (few-shot)
Example input: KYC record fully verified, no sanctions hits. Example output: identity_score=95, kyc_risk_rating="LOW", sanctions_status="NO_HIT".`;

export async function kycRetriever(customerId: string) {
  const kycRecord = findKycDoc(customerId);
  if (!kycRecord) throw new Error(`No KYC record for ${customerId}`);

  const screening = screenName(kycRecord.full_name);

  const mockFactory = () => {
    const matches = screening.matches.map((m: any) => m.watchlist_id);
    let risk = kycRecord.kyc_risk_rating;
    if (screening.status === "HIT") risk = "HIGH";
    return {
      customer_id: customerId,
      identity_score: screening.status === "NO_HIT" ? 92 : 55,
      kyc_risk_rating: risk,
      sanctions_status: screening.status,
      sanctions_matches: matches,
      evidence: [
        { evidence_id: `KYC-${customerId}`, source: "KYC Document Store", detail: `Document status: ${kycRecord.document_status}, ID type: ${kycRecord.id_type}` },
        ...matches.map((wid: string) => ({ evidence_id: wid, source: "Sanctions & PEP API", detail: `Screening match: ${screening.status}` })),
      ],
      notes: `Automated screen: ${screening.status}. KYC risk rating from onboarding: ${kycRecord.kyc_risk_rating}.`,
    };
  };

  const { data, tokens } = await generateStructured(
    process.env.GROQ_MODEL_FLASH || "openai/gpt-oss-20b",
    SYSTEM_PROMPT,
    JSON.stringify({ kyc_record: kycRecord, screening }),
    mockFactory
  );
  return { result: data, tokens };
}
