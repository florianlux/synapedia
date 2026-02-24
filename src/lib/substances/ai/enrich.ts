/**
 * AI Enrichment Module for the Resilient Import Engine.
 *
 * Produces structured JSON enrichment data for a substance using
 * OpenAI or Anthropic. Falls back gracefully when no AI provider
 * is configured — the import run is never blocked.
 */

import { getAiProvider } from "@/lib/ai/provider";
import { contentSafetyFilter } from "../content-safety";

/* ---------- Types ---------- */

export interface AiEnrichmentResult {
  overview: string;
  effects: string;
  risks: string;
  harm_reduction: string;
  interactions: string;
  dosage_notes: string;
  legal_status_notes: string;
  sources: string[];
}

export type AiStatus = "ok" | "failed" | "skipped";

export interface AiEnrichmentOutcome {
  status: AiStatus;
  data: AiEnrichmentResult | null;
  error?: string;
}

/* ---------- System prompt ---------- */

const SYSTEM_PROMPT = `Du bist ein wissenschaftlicher Redaktionsassistent für Synapedia, eine deutschsprachige Wissensplattform über psychoaktive Substanzen.

REGELN:
- Schreibe ausschließlich wissenschaftlich-neutral und harm-reduction-orientiert
- KEINE konkreten Dosierungsanleitungen oder Konsumanleitungen
- KEINE Beschaffungshinweise
- Nutze qualitative Beschreibungen bei Dosierungen (z.B. "niedrig", "moderat", "hoch") ohne konkrete Mengen
- Alle Informationen müssen auf wissenschaftlichen Quellen basierbar sein
- Antworte IMMER in validem JSON gemäß dem angeforderten Schema
- Sprache: Deutsch`;

/* ---------- User prompt builder ---------- */

function buildEnrichPrompt(
  name: string,
  description: string,
  context?: { molecularFormula?: string; synonyms?: string[] },
): string {
  const contextParts: string[] = [];
  if (context?.molecularFormula) contextParts.push(`Summenformel: ${context.molecularFormula}`);
  if (context?.synonyms?.length) contextParts.push(`Synonyme: ${context.synonyms.slice(0, 5).join(", ")}`);

  return `Erstelle eine strukturierte wissenschaftliche Zusammenfassung für die Substanz "${name}".
${description ? `Beschreibung: ${description}` : ""}
${contextParts.length > 0 ? contextParts.join("\n") : ""}

Antworte als JSON-Objekt mit folgendem Schema:
{
  "overview": "Kurze wissenschaftliche Übersicht (2-3 Sätze)",
  "effects": "Pharmakologische Wirkungen (qualitativ, ohne Dosierung)",
  "risks": "Bekannte Risiken und Nebenwirkungen",
  "harm_reduction": "Harm-Reduction-Hinweise (allgemein, keine Konsumanleitungen)",
  "interactions": "Bekannte Wechselwirkungen mit anderen Substanzen",
  "dosage_notes": "Allgemeine Sicherheitshinweise zur Dosierung (qualitativ: niedrig/moderat/hoch, KEINE konkreten Mengen)",
  "legal_status_notes": "Allgemeine rechtliche Einordnung (nicht jurisdiktionsspezifisch)",
  "sources": ["Liste von Referenzen/Datenbanken als Strings"]
}

WICHTIG: Nur validiertes JSON zurückgeben. Keine Markdown-Codeblöcke.`;
}

/* ---------- AI provider calls ---------- */

async function callOpenAI(userPrompt: string): Promise<AiEnrichmentResult> {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.3,
      response_format: { type: "json_object" },
    }),
    signal: AbortSignal.timeout(12_000),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`OpenAI API error: ${response.status} ${err}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error("Leere Antwort von OpenAI.");
  return JSON.parse(content) as AiEnrichmentResult;
}

async function callAnthropic(userPrompt: string): Promise<AiEnrichmentResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY not configured");

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userPrompt }],
    }),
    signal: AbortSignal.timeout(12_000),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Anthropic API error: ${response.status} ${err}`);
  }

  const data = await response.json();
  const content = data.content?.[0]?.text;
  if (!content) throw new Error("Leere Antwort von Anthropic.");
  const cleaned = content.replace(/^```json?\s*\n?/i, "").replace(/\n?```\s*$/i, "");
  return JSON.parse(cleaned) as AiEnrichmentResult;
}

/* ---------- Safety validation ---------- */

function validateAndFilter(result: AiEnrichmentResult): { valid: boolean; filtered: AiEnrichmentResult } {
  const fields: (keyof AiEnrichmentResult)[] = [
    "overview", "effects", "risks", "harm_reduction",
    "interactions", "dosage_notes", "legal_status_notes",
  ];

  let hasUnsafe = false;
  const filtered = { ...result };

  for (const field of fields) {
    const value = filtered[field];
    if (typeof value === "string") {
      const check = contentSafetyFilter(value);
      if (check.hasFlaggedContent) {
        hasUnsafe = true;
        (filtered as Record<string, unknown>)[field] = check.clean;
      }
    }
  }

  // Ensure sources is an array
  if (!Array.isArray(filtered.sources)) {
    filtered.sources = [];
  }

  return { valid: !hasUnsafe, filtered };
}

/* ---------- Public API ---------- */

/**
 * Run AI enrichment for a substance. Never throws — returns status + data.
 */
export async function runAiEnrichment(
  name: string,
  description: string,
  context?: { molecularFormula?: string; synonyms?: string[] },
): Promise<AiEnrichmentOutcome> {
  const provider = getAiProvider();

  if (provider === "none") {
    return { status: "skipped", data: null, error: "No AI provider configured" };
  }

  try {
    const prompt = buildEnrichPrompt(name, description, context);
    const raw = provider === "openai"
      ? await callOpenAI(prompt)
      : await callAnthropic(prompt);

    const { valid, filtered } = validateAndFilter(raw);

    if (!valid) {
      // Content was filtered but we still return the cleaned data
      return { status: "failed", data: filtered, error: "Content safety filter applied" };
    }

    return { status: "ok", data: filtered };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown AI error";
    console.error(`[AI Enrich] Error for ${name}:`, message);
    return { status: "failed", data: null, error: message };
  }
}
