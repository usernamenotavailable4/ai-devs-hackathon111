/**
 * Lyzr orchestrator dispatch-planning brain -- same role as
 * services/orchestrator/lyzr_client.py in the reference build. Here it
 * runs in-process (no Pub/Sub) since Vercel functions can't host a
 * long-running subscriber; the orchestrator's job of *deciding which
 * agents to run* is the same regardless of how the dispatch is carried out.
 */
export async function getDispatchPlan(caseInput: Record<string, any>): Promise<{ dispatch: string[]; reasoning: string }> {
  const defaultPlan = {
    dispatch: ["kyc_retriever", "transaction_analyzer", "fraud_case_search"],
    reasoning: "Default plan: full investigation swarm for every flagged case.",
  };

  const apiKey = process.env.LYZR_API_KEY;
  const agentId = process.env.LYZR_ORCHESTRATOR_AGENT_ID;
  if (!apiKey || !agentId) return defaultPlan;

  try {
    const resp = await fetch(`${process.env.LYZR_API_BASE || "https://agent-prod.studio.lyzr.ai"}/agents/${agentId}/chat`, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        message: `Given this flagged case, return a JSON dispatch plan of which worker agents to invoke (kyc_retriever, transaction_analyzer, fraud_case_search): ${JSON.stringify(caseInput)}`,
      }),
    });
    const data = await resp.json();
    return data?.plan || defaultPlan;
  } catch {
    return defaultPlan;
  }
}
