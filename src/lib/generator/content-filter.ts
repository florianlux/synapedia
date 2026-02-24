/**
 * Content filter for the Content Creator system.
 * Scans generated MDX for prohibited content (dosage, how-to, purchase, synthesis).
 * Returns blocked status + reasons. If blocked, publish is disabled.
 */

const BLOCKED_PATTERNS: { pattern: RegExp; reason: string }[] = [
  // Dosage / consumption
  { pattern: /\b(snort(ing)?|schnupf(en|t))\b/i, reason: "Konsum-Hinweis: Schnupfen/Snorting" },
  { pattern: /\b(smok(e|ing)|rauch(en|t)|vap(e|ing|oris))\b/i, reason: "Konsum-Hinweis: Rauchen/Smoking" },
  { pattern: /\b(inject(ing|ion)?|injizier(en|ung)?|spritz(en|t))\b/i, reason: "Konsum-Hinweis: Injizieren" },
  { pattern: /\b(boof(ing)?|rektal\s+(einnehm|verabreich))\b/i, reason: "Konsum-Hinweis: Rektale Verabreichung" },
  { pattern: /\b(how\s+to\s+take|wie\s+(man|du)\s+(nimmt|nehmen|konsumier))\b/i, reason: "How-to Konsumanleitung" },
  { pattern: /\b(best\s+dose|beste\s+dosis|optimale\s+dosis)\b/i, reason: "Dosierungsempfehlung" },
  { pattern: /\b(to\s+get\s+high|um\s+high\s+zu\s+werden)\b/i, reason: "Konsumzweck-Hinweis" },
  { pattern: /\b(\d+\s*mg\b.*?(einnehm|nehmen|take|dose|per\s+kg))/i, reason: "Spezifische Dosierungsangabe" },
  { pattern: /\b(threshold|light|common|strong|heavy)\s+(dose|dosage|dosis)\b/i, reason: "Dosierungsstufen" },
  { pattern: /\b(Schwellendosis|leichte\s+Dosis|starke\s+Dosis)\b/i, reason: "Dosierungsstufen (DE)" },
  // Synthesis / production
  { pattern: /\b(synthesize|synthes[ie]|herstell(en|ung)|cook(ing)?|zubereitung)\b/i, reason: "Synthese/Herstellungs-Anleitung" },
  { pattern: /\b(extract(ion|ing)?|extrahier(en|ung)?)\b/i, reason: "Extraktions-Anleitung" },
  { pattern: /\b(recipe|rezept\s+zur\s+herstellung)\b/i, reason: "Herstellungsrezept" },
  // Purchase / sourcing
  { pattern: /\b(vendor|dealer|händler)\b/i, reason: "Bezugsquellen-Hinweis" },
  { pattern: /\b(buy|kaufen|bestellen|order|purchase)\b/i, reason: "Kauf-Hinweis" },
  { pattern: /\b(darknet|clearnet|marketplace)\b/i, reason: "Marktplatz-Hinweis" },
];

export interface ContentFilterResult {
  blocked: boolean;
  reasons: string[];
  cleanContent: string;
}

/**
 * Scan MDX content for prohibited patterns.
 * Returns blocked=true if any pattern matches.
 */
export function filterContent(mdx: string): ContentFilterResult {
  if (!mdx) return { blocked: false, reasons: [], cleanContent: "" };

  const reasons: string[] = [];
  const lines = mdx.split("\n");
  const cleanLines: string[] = [];

  for (const line of lines) {
    let flagged = false;
    for (const { pattern, reason } of BLOCKED_PATTERNS) {
      if (pattern.test(line)) {
        if (!reasons.includes(reason)) {
          reasons.push(reason);
        }
        flagged = true;
        break;
      }
    }
    if (!flagged) {
      cleanLines.push(line);
    }
  }

  return {
    blocked: reasons.length > 0,
    reasons,
    cleanContent: cleanLines.join("\n"),
  };
}
