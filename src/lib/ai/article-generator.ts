/**
 * AI Article Generator for Synapedia.
 * Takes substance data + template → generates MDX article draft.
 * Server-side only. Uses OpenAI Chat Completions API.
 */

import type { ArticleTemplate, GeneratedCitation } from "@/lib/types";
import type { SubstanceRow } from "@/lib/substances/schema";

// --- Content Safety Patterns (for post-generation filtering) ---

const BLOCKED_PATTERNS: { pattern: RegExp; reason: string }[] = [
  { pattern: /\b(how\s+to\s+(consume|take|use|ingest|inject|smoke|snort|insufflat|buy|purchase|synthesize|extract))\b/i, reason: "consumption/procurement instruction" },
  { pattern: /\b(wie\s+(man|du)\s+(konsumier|einnimmt|nimmt|raucht|schnupft|injizier|spritzt|kauft|bestellt|synthetisier|extrahier))/i, reason: "Konsumanleitung/Beschaffung" },
  { pattern: /\b(vendor|dealer|darknet|marketplace|clearnet\s+shop)\b/i, reason: "vendor/procurement reference" },
  { pattern: /\b(synthes(e|is)\s*(anleitung|guide|recipe|rezept))\b/i, reason: "synthesis instruction" },
  { pattern: /\b(extraktions?\s*(anleitung|guide|methode|verfahren))\b/i, reason: "extraction instruction" },
  { pattern: /\b(dosierung(s?)\s*(anleitung|empfehlung|guide))\b/i, reason: "dosage instruction" },
  { pattern: /\|\s*\d+\s*m?g\s*[-–]\s*\d+\s*m?g\s*\|/i, reason: "dosage table with mg ranges" },
  { pattern: /\b(inject(ing)?|injizier(en)?)\s+(in|into|in\s+die|in\s+den)/i, reason: "injection instruction" },
  { pattern: /\b(snort(ing)?|schnupf(en)?|insuffl)\s+(the|das|die|eine)/i, reason: "insufflation instruction" },
  { pattern: /\b(smok(e|ing)|rauch(en)?|vap(e|ing))\s+(the|das|die|eine|it)/i, reason: "smoking instruction" },
];

export interface ContentFilterResult {
  passed: boolean;
  reasons: string[];
}

export function filterArticleContent(mdx: string): ContentFilterResult {
  const reasons: string[] = [];
  for (const { pattern, reason } of BLOCKED_PATTERNS) {
    if (pattern.test(mdx)) {
      reasons.push(reason);
    }
  }
  return { passed: reasons.length === 0, reasons };
}

// --- Template placeholder replacement ---

export interface GenerateArticleInput {
  substance: SubstanceRow;
  sources: Array<{
    source_name: string;
    source_url: string;
    source_type: string;
    snippet: string;
    license_note: string;
    confidence: number;
  }>;
  template: ArticleTemplate;
  language: string;
  tone: string;
  length: string;
}

function buildSubstanceJson(substance: SubstanceRow): string {
  // Strip to essential fields, limit size
  const slim = {
    name: substance.name,
    slug: substance.slug,
    categories: substance.categories,
    summary: substance.summary,
    mechanism: substance.mechanism,
    effects: substance.effects,
    risks: substance.risks,
    interactions: substance.interactions,
    dependence: substance.dependence,
    legality: substance.legality,
  };
  const json = JSON.stringify(slim, null, 2);
  // Limit to ~3000 chars
  return json.length > 3000 ? json.slice(0, 3000) + "\n..." : json;
}

function buildSourcesJson(sources: GenerateArticleInput["sources"]): string {
  const slim = sources.map((s) => ({
    name: s.source_name,
    url: s.source_url,
    type: s.source_type,
    license: s.license_note || undefined,
    confidence: s.confidence,
    snippet: s.snippet ? s.snippet.slice(0, 200) : undefined,
  }));
  return JSON.stringify(slim, null, 2);
}

function buildCitationsJson(substance: SubstanceRow): string {
  return JSON.stringify(substance.citations || {}, null, 2);
}

export function buildPrompts(input: GenerateArticleInput): {
  systemPrompt: string;
  userPrompt: string;
  citations: GeneratedCitation[];
} {
  const { substance, sources, template, language, tone, length } = input;

  const systemPrompt = template.prompt_system;

  let userPrompt = template.prompt_user;
  userPrompt = userPrompt.replace("{{SUBSTANCE_JSON}}", buildSubstanceJson(substance));
  userPrompt = userPrompt.replace("{{SOURCES_JSON}}", buildSourcesJson(sources));
  userPrompt = userPrompt.replace("{{CITATIONS_JSON}}", buildCitationsJson(substance));
  userPrompt = userPrompt.replace("{{LANGUAGE}}", language === "en" ? "English" : "Deutsch");
  userPrompt = userPrompt.replace("{{TONE}}", tone);

  const lengthLabels: Record<string, string> = {
    short: "kurz (~500 Wörter)",
    long: "ausführlich (~2000 Wörter)",
    medium: "mittel (~1000 Wörter)",
  };
  userPrompt = userPrompt.replace("{{LENGTH}}", lengthLabels[length] || lengthLabels.medium);

  // Build citations from sources
  const citations: GeneratedCitation[] = sources.map((s) => ({
    url: s.source_url,
    title: s.source_name,
    license: s.license_note || undefined,
  }));

  return { systemPrompt, userPrompt, citations };
}

// --- OpenAI Call ---

export async function callOpenAIForArticle(
  systemPrompt: string,
  userPrompt: string,
): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY ist nicht konfiguriert.");
  }

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.4,
      max_tokens: 4096,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`OpenAI API Fehler: ${response.status} ${err}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("Leere Antwort von OpenAI.");
  }

  return content as string;
}
