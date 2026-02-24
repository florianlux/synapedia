/**
 * Content Safety Filter
 * Detects and strips prohibited content: dosage instructions, how-to-use guides, purchase info.
 * Returns cleaned text + list of violations found.
 */

const PROHIBITED_PATTERNS: { pattern: RegExp; category: string }[] = [
  // Dosage / consumption instructions (DE + EN)
  { pattern: /\b(dosier|dosierung|dosis|dose|dosage|dosages)\b/i, category: "dosage" },
  { pattern: /\b(einnehm|einnahme|konsumier|konsumhinweis|verabreich)\b/i, category: "consumption" },
  { pattern: /\b(how\s+to\s+(take|use|consume|ingest|inject|smoke|snort|insufflat))\b/i, category: "how-to-use" },
  { pattern: /\b(wie\s+(man|du)\s+(nimmt|nehmen|konsumier|einnimmt|raucht|schnupft|injizier|spritzt))\b/i, category: "how-to-use" },
  { pattern: /\b(route\s+of\s+administration|administration\s+route|ROA)\b/i, category: "administration" },
  { pattern: /\b(oral|intraven(ö|o)s|intranasal|sublingual|rektal|intramuskulär)\s+(einnehmen|nehmen|verabreich)/i, category: "administration" },
  { pattern: /\b(mg\s*\/\s*kg|milligram(m)?\s+pro\s+kilogramm)\b/i, category: "dosage" },
  { pattern: /\b(threshold|light|common|strong|heavy)\s+(dose|dosage)\b/i, category: "dosage" },
  { pattern: /\b(Schwellendosis|leichte\s+Dosis|mittlere\s+Dosis|starke\s+Dosis)\b/i, category: "dosage" },
  // Purchase / sourcing info
  { pattern: /\b(kaufen|bestellen|order|buy|purchase|beziehen|beschaffen|erwerben)\b/i, category: "purchase" },
  { pattern: /\b(vendor|dealer|h(ä|ae)ndler|shop|darknet|clearnet|marketplace)\b/i, category: "purchase" },
  { pattern: /\b(Bezugsquelle|Bezugsinfo|sourcing)\b/i, category: "purchase" },
  // Preparation / synthesis
  { pattern: /\b(synthes[ie]|herstell|kochen|cook|extract|extrahier|herstellung|zubereitung)\b/i, category: "synthesis" },
  { pattern: /\b(recipe|rezept|anleitung\s+zur\s+herstellung)\b/i, category: "synthesis" },
];

export interface SafetyCheckResult {
  clean: string;
  violations: { category: string; match: string; index: number }[];
  hasFlaggedContent: boolean;
}

/**
 * Check text for prohibited content and return cleaned version.
 * Flagged sentences are removed entirely.
 */
export function contentSafetyFilter(text: string): SafetyCheckResult {
  if (!text) {
    return { clean: "", violations: [], hasFlaggedContent: false };
  }

  const violations: SafetyCheckResult["violations"] = [];
  const sentences = text.split(/(?<=[.!?])\s+/);
  const cleanSentences: string[] = [];

  for (const sentence of sentences) {
    let flagged = false;
    for (const { pattern, category } of PROHIBITED_PATTERNS) {
      const match = sentence.match(pattern);
      if (match) {
        violations.push({
          category,
          match: match[0],
          index: text.indexOf(sentence),
        });
        flagged = true;
        break;
      }
    }
    if (!flagged) {
      cleanSentences.push(sentence);
    }
  }

  return {
    clean: cleanSentences.join(" ").trim(),
    violations,
    hasFlaggedContent: violations.length > 0,
  };
}

/**
 * Validate a SubstanceDraft for quality gates:
 * - citations must exist for non-empty mechanism/risks/interactions
 * - confidence must be present
 * - no prohibited content in any text field
 */
export interface QualityGateResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export function validateQualityGates(draft: {
  mechanism?: string;
  risks?: { acute?: string[]; chronic?: string[]; contraindications?: string[] };
  interactions?: { high_risk_pairs?: string[]; notes?: string[] };
  citations?: Record<string, string[]>;
  confidence?: Record<string, number>;
  summary?: string;
}): QualityGateResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check citations for non-empty sections
  const citations = draft.citations ?? {};

  if (draft.mechanism && draft.mechanism.length > 0) {
    if (!citations["mechanism"] || citations["mechanism"].length === 0) {
      errors.push("Missing citations for mechanism section");
    }
  }

  const risks = draft.risks ?? {};
  const hasRisks = (risks.acute?.length ?? 0) > 0 || (risks.chronic?.length ?? 0) > 0 || (risks.contraindications?.length ?? 0) > 0;
  if (hasRisks && (!citations["risks"] || citations["risks"].length === 0)) {
    errors.push("Missing citations for risks section");
  }

  const interactions = draft.interactions ?? {};
  const hasInteractions = (interactions.high_risk_pairs?.length ?? 0) > 0 || (interactions.notes?.length ?? 0) > 0;
  if (hasInteractions && (!citations["interactions"] || citations["interactions"].length === 0)) {
    errors.push("Missing citations for interactions section");
  }

  // Confidence must be present
  if (!draft.confidence || Object.keys(draft.confidence).length === 0) {
    errors.push("Confidence scores missing");
  }

  // Check for prohibited content
  const textFields = [
    draft.summary ?? "",
    draft.mechanism ?? "",
    ...(risks.acute ?? []),
    ...(risks.chronic ?? []),
    ...(risks.contraindications ?? []),
    ...(interactions.notes ?? []),
  ];

  for (const text of textFields) {
    const result = contentSafetyFilter(text);
    if (result.hasFlaggedContent) {
      for (const v of result.violations) {
        warnings.push(`Prohibited content (${v.category}): "${v.match}"`);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}
