/**
 * Content filter for harm-reduction compliance.
 *
 * Blocks content that contains consumption instructions, sourcing info,
 * synthesis guides, or dosage instructions ("how-to" patterns).
 */

const BLOCKED_PATTERNS = [
  /\bhow\s+to\s+(consume|use|take|snort|smoke|inject|ingest|buy|get|obtain|order|synthesize|make|cook|extract|prepare|dose)\b/i,
  /\b(buy|purchase|order|source|vendor|shop|marketplace)\s+(from|at|on|online)\b/i,
  /\b(synthesis|synthesize|synthesise|cook|manufacture)\s+(guide|instructions|steps|method|recipe)\b/i,
  /\b(inject|snort|smoke|boof|plug)\s+(it|this|the)\b/i,
  /\bdosage\s+(guide|instructions|recommendation|chart)\b/i,
  /\brecommended\s+dos(e|age|ing)\b/i,
  /\btake\s+\d+\s*(mg|g|ug|µg|ml|tab|pill|cap)\b/i,
  /\bstart\s+with\s+\d+\s*(mg|g|ug|µg)\b/i,
];

export interface ContentFilterResult {
  passed: boolean;
  violations: string[];
}

/**
 * Checks a text for blocked how-to / consumption patterns.
 * Returns { passed: true } if clean, or { passed: false, violations } if blocked.
 */
export function checkContent(text: string): ContentFilterResult {
  const violations: string[] = [];

  for (const pattern of BLOCKED_PATTERNS) {
    const match = text.match(pattern);
    if (match) {
      violations.push(`Blocked pattern: "${match[0]}"`);
    }
  }

  return {
    passed: violations.length === 0,
    violations,
  };
}
