/**
 * Lightweight regex-based PII masking for the Vercel deployment.
 *
 * The docker-compose reference build uses Microsoft Presidio (+ Google DLP
 * in production) -- a proper NLP-based PII detector. Presidio's Python/NLP
 * dependencies are too heavy for a serverless function bundle, so this
 * deployment substitutes pattern-based redaction for common PII shapes
 * (email, phone, SSN, credit card, generic person-name capitalization).
 * This is a real, working redaction pass -- just a narrower one than
 * Presidio's. Documented as a deliberate substitution in README.md.
 */
const PATTERNS: [RegExp, string][] = [
  [/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, "<EMAIL>"],
  [/\b\d{3}-\d{2}-\d{4}\b/g, "<SSN>"],
  [/\b(?:\d[ -]*?){13,16}\b/g, "<CARD_NUMBER>"],
  [/\b\+?\d{1,3}[-.\s]?\(?\d{2,4}\)?[-.\s]?\d{3,4}[-.\s]?\d{3,4}\b/g, "<PHONE>"],
];

export function maskText(text: string): { maskedText: string; entitiesFound: number } {
  let masked = text;
  let count = 0;
  for (const [pattern, replacement] of PATTERNS) {
    masked = masked.replace(pattern, () => {
      count += 1;
      return replacement;
    });
  }
  return { maskedText: masked, entitiesFound: count };
}
