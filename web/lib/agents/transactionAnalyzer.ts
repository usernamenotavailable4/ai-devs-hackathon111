import { generateStructured } from "../gemini";
import { findTransactionsForAccount } from "../fixtures";

const SYSTEM_PROMPT = `### Capacity and Role
You are the Transaction Analyzer Agent. You reason over pre-computed behavioral statistics for one account -- never over raw PII.
### Insight
Identify deviations from the account's own historical baseline: amount z-score, new counterparty/geography/channel, rapid succession of near-threshold transfers (structuring).
### Statement
Return ONLY a JSON object matching the AnomalyReport schema. Every pattern must cite the specific transaction_id evidence that supports it.
### Personality
Quantitative, skeptical of coincidence, calibrated.
### Experiment (few-shot)
Example: flagged txn amount = 15x the account's median txn amount, to a brand-new counterparty and geography never seen before. Expected: anomaly_score >= 80, citing the flagged transaction_id.`;

function mean(nums: number[]) { return nums.reduce((a, b) => a + b, 0) / (nums.length || 1); }
function pstdev(nums: number[]) {
  const m = mean(nums);
  return Math.sqrt(mean(nums.map((n) => (n - m) ** 2)));
}

export async function transactionAnalyzer(accountId: string, flaggedTransactionId?: string) {
  const allTxns = findTransactionsForAccount(accountId);
  const normal = allTxns.filter((t: any) => !t.flagged);
  const amounts = normal.map((t: any) => t.amount);
  const baselineMean = mean(amounts);
  const baselineStdev = pstdev(amounts) || 1;
  const knownGeos = new Set(normal.map((t: any) => t.geography));
  const knownCounterparties = new Set(normal.map((t: any) => t.counterparty));

  const flagged = allTxns.find((t: any) => t.transaction_id === flaggedTransactionId)
    || allTxns.find((t: any) => t.flagged);

  const zScore = flagged ? (flagged.amount - baselineMean) / baselineStdev : null;
  const stats = {
    baseline_mean_amount: Math.round(baselineMean * 100) / 100,
    baseline_stdev_amount: Math.round(baselineStdev * 100) / 100,
    flagged_transaction: flagged || null,
    z_score: zScore !== null ? Math.round(zScore * 100) / 100 : null,
    is_new_geography: !!(flagged && !knownGeos.has(flagged.geography)),
    is_new_counterparty: !!(flagged && !knownCounterparties.has(flagged.counterparty)),
    total_historical_txns: allTxns.length,
  };

  const mockFactory = () => {
    const z = stats.z_score || 0;
    const severity = Math.abs(z) > 3 || stats.is_new_geography ? "HIGH" : Math.abs(z) > 1.5 ? "MEDIUM" : "LOW";
    const score = Math.min(100, Math.max(10, Math.round(50 + z * 10)));
    const patterns: any[] = [];
    const evidence: any[] = [];

    if (flagged) {
      patterns.push({ pattern_type: "AMOUNT_DEVIATION", description: `Transaction amount is ${z >= 0 ? "+" : ""}${z.toFixed(1)} std deviations from account baseline (mean=$${stats.baseline_mean_amount}).`, severity });
      if (stats.is_new_geography) patterns.push({ pattern_type: "NEW_GEOGRAPHY", description: `Destination geography '${flagged.geography}' never seen in this account's history.`, severity: "HIGH" });
      if (stats.is_new_counterparty) patterns.push({ pattern_type: "NEW_COUNTERPARTY", description: `Counterparty '${flagged.counterparty}' never seen in this account's history.`, severity: "MEDIUM" });
      evidence.push({ evidence_id: flagged.transaction_id, source: "Transaction History DB", detail: flagged.flag_reason || "Flagged transaction under review" });
    }

    return {
      account_id: accountId,
      anomaly_score: score,
      patterns: patterns.length ? patterns : [{ pattern_type: "NONE", description: "No significant deviation found.", severity: "LOW" }],
      evidence,
      notes: `Analyzed ${stats.total_historical_txns} historical transactions.`,
    };
  };

  const { data, tokens } = await generateStructured(
    process.env.GROQ_MODEL_FLASH || "openai/gpt-oss-20b",
    SYSTEM_PROMPT,
    JSON.stringify(stats),
    mockFactory
  );
  return { result: data, tokens };
}
