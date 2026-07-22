/**
 * In-process Sanctions & PEP screen -- same fixture-backed contract as
 * services/mock_sanctions_api in the reference build, just called as a
 * function instead of a separate HTTP service (no benefit to a network hop
 * for a static 200-row fixture inside one serverless function).
 */
import { sanctionsWatchlist } from "./fixtures";

function diceCoefficient(a: string, b: string): number {
  const bigrams = (s: string) => {
    const out = new Set<string>();
    const lower = s.toLowerCase();
    for (let i = 0; i < lower.length - 1; i++) out.add(lower.slice(i, i + 2));
    return out;
  };
  const setA = bigrams(a);
  const setB = bigrams(b);
  if (setA.size === 0 || setB.size === 0) return a.toLowerCase() === b.toLowerCase() ? 1 : 0;
  let overlap = 0;
  for (const bg of setA) if (setB.has(bg)) overlap++;
  return (2 * overlap) / (setA.size + setB.size);
}

export function screenName(name: string) {
  const matches: any[] = [];
  for (const entry of sanctionsWatchlist as any[]) {
    const candidates = [entry.name, ...entry.aliases];
    const best = Math.max(...candidates.map((c) => diceCoefficient(name, c)));
    if (best >= 0.85) matches.push({ ...entry, match_score: Math.round(best * 100) / 100, match_strength: "HIGH" });
    else if (best >= 0.65) matches.push({ ...entry, match_score: Math.round(best * 100) / 100, match_strength: "PARTIAL" });
  }
  matches.sort((a, b) => b.match_score - a.match_score);
  const top5 = matches.slice(0, 5);
  const status = top5.length === 0 ? "NO_HIT" : top5[0].match_strength === "HIGH" ? "HIT" : "PARTIAL_HIT";
  return { status, matches: top5 };
}
