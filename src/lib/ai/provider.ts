/**
 * AI Provider abstraction for Synapedia Content Studio.
 * Supports OpenAI and Anthropic. Falls back gracefully when no keys are set.
 */

export type AiProvider = "openai" | "anthropic" | "none";

export function getAiProvider(): AiProvider {
  if (process.env.OPENAI_API_KEY) return "openai";
  if (process.env.ANTHROPIC_API_KEY) return "anthropic";
  return "none";
}

export function isAiEnabled(): boolean {
  return getAiProvider() !== "none";
}

const SYSTEM_PROMPT = `Du bist ein wissenschaftlicher Redaktionsassistent für Synapedia, eine deutschsprachige Wissensplattform über psychoaktive Substanzen.

REGELN:
- Schreibe ausschließlich wissenschaftlich-neutral und harm-reduction-orientiert
- KEINE konkreten Dosierungsanleitungen oder Konsumanleitungen
- KEINE Beschaffungshinweise
- Nutze qualitative Beschreibungen bei Dosierungen (z.B. "niedrig", "moderat", "hoch") ohne konkrete Mengen
- Alle Informationen müssen auf wissenschaftlichen Quellen basierbar sein
- Antworte IMMER in validem JSON gemäß dem angeforderten Schema
- Sprache: Deutsch`;

interface AutofillInput {
  title: string;
  subtitle?: string;
  category?: string;
  templateSections?: { key: string; title: string; aiHints?: string }[];
  existingDraft?: string;
}

export async function runAutofill(input: AutofillInput): Promise<Record<string, unknown>> {
  const provider = getAiProvider();
  if (provider === "none") {
    throw new Error("Kein AI-Provider konfiguriert. Setze OPENAI_API_KEY oder ANTHROPIC_API_KEY.");
  }

  const userPrompt = buildAutofillPrompt(input);

  if (provider === "openai") {
    return callOpenAI(userPrompt);
  }
  return callAnthropic(userPrompt);
}

function buildAutofillPrompt(input: AutofillInput): string {
  const sections = input.templateSections
    ? input.templateSections
        .map((s) => `- ${s.key}: "${s.title}"${s.aiHints ? ` (Hinweis: ${s.aiHints})` : ""}`)
        .join("\n")
    : "";

  return `Erstelle einen strukturierten Entwurf für einen Substanz-Artikel.

Substanz: ${input.title}${input.subtitle ? ` (${input.subtitle})` : ""}${input.category ? `\nKategorie: ${input.category}` : ""}${sections ? `\n\nTemplate-Sektionen:\n${sections}` : ""}${input.existingDraft ? `\n\nBestehender Entwurf:\n${input.existingDraft}` : ""}

Antworte als JSON-Objekt mit folgendem Schema:
{
  "quickFacts": { "class": "...", "receptor": "...", "riskLevel": "...", "evidenceStrength": "..." },
  "sections": [{ "key": "...", "title": "...", "blocks": [{ "type": "markdown", "content": "..." }] }],
  "dosage": { "qualitative_only": true, "notes": ["..."] },
  "duration": { "onset": "...", "peak": "...", "total": "..." },
  "warnings": ["..."],
  "interactions": [{ "substance": "...", "severity": "...", "description": "..." }],
  "suggestedGraphEdges": [{ "from_type": "...", "from_key": "...", "to_type": "...", "to_key": "...", "relation": "..." }],
  "suggestedMediaRoles": [{ "role": "...", "description": "..." }]
}

WICHTIG: Nur validiertes JSON zurückgeben. Keine Markdown-Codeblöcke.`;
}

async function callOpenAI(userPrompt: string): Promise<Record<string, unknown>> {
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
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`OpenAI API error: ${response.status} ${err}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error("Leere Antwort von OpenAI.");

  return JSON.parse(content) as Record<string, unknown>;
}

async function callAnthropic(userPrompt: string): Promise<Record<string, unknown>> {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY!,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userPrompt }],
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Anthropic API error: ${response.status} ${err}`);
  }

  const data = await response.json();
  const content = data.content?.[0]?.text;
  if (!content) throw new Error("Leere Antwort von Anthropic.");

  // Strip markdown code fences if present
  const cleaned = content.replace(/^```json?\s*\n?/i, "").replace(/\n?```\s*$/i, "");
  return JSON.parse(cleaned) as Record<string, unknown>;
}
