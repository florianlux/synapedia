/**
 * AI-powered substance generation for Synapedia.
 * Generates a structured SubstanceDraft using the configured AI provider (OpenAI or Anthropic).
 * Enforces harm-reduction compliance — no actionable dosage instructions.
 */

import { z } from "zod";
import { getAiProvider } from "./provider";
import {
  EffectsSchema,
  RisksSchema,
  InteractionsSchema,
  DependenceSchema,
  LegalitySchema,
  type SubstanceDraft,
} from "@/lib/substances/schema";

/* ---------- Input / Output schemas ---------- */

export const GenerateSubstanceInputSchema = z.object({
  name: z.string().min(1, "Name ist erforderlich.").max(200),
  category: z.string().max(100).optional(),
  notes: z.string().max(1000).optional(),
  strictHR: z.boolean().default(true),
});

export type GenerateSubstanceInput = z.infer<typeof GenerateSubstanceInputSchema>;

/** Schema for AI-generated JSON — validated before DB insert */
const AiSubstanceOutputSchema = z.object({
  name: z.string().min(1),
  summary: z.string().default(""),
  mechanism: z.string().default(""),
  categories: z.array(z.string()).default([]),
  effects: EffectsSchema.default({ positive: [], neutral: [], negative: [] }),
  risks: RisksSchema.default({ acute: [], chronic: [], contraindications: [] }),
  interactions: InteractionsSchema.default({ high_risk_pairs: [], notes: [] }),
  dependence: DependenceSchema.default({ potential: "unknown", notes: [] }),
  legality: LegalitySchema.default({ germany: "unknown", notes: [] }),
  tags: z.array(z.string()).default([]),
  harm_reduction: z.string().default(""),
  image_prompt: z.string().default(""),
});

/* ---------- System prompt ---------- */

const SYSTEM_PROMPT = `Du bist ein wissenschaftlicher Redaktionsassistent für Synapedia, eine deutschsprachige Wissensplattform über psychoaktive Substanzen.

STRENGE REGELN:
- Schreibe ausschließlich wissenschaftlich-neutral und harm-reduction-orientiert.
- KEINE konkreten Dosierungsanleitungen, KEINE mg-Angaben, KEINE "nimm X"-Anweisungen.
- KEINE Beschaffungshinweise, KEINE Vendor- oder Marktplatz-Referenzen.
- KEINE Syntheseanleitungen oder Herstellungsschritte.
- KEINE Konsumanleitungen (wie man eine Substanz einnimmt/raucht/schnupft/injiziert).
- Nutze qualitative Beschreibungen (z.B. "niedrig", "moderat", "hoch") ohne konkrete Mengenangaben.
- Alle Informationen müssen auf wissenschaftlichen Erkenntnissen basieren.
- Antworte IMMER in validem JSON gemäß dem angeforderten Schema.
- Sprache: Deutsch.`;

/* ---------- Build user prompt ---------- */

function buildPrompt(input: GenerateSubstanceInput): string {
  const hrNote = input.strictHR
    ? "\nWICHTIG: Strenge Harm-Reduction — keinerlei Dosierungen, keine Konsumtipps, nur Sicherheitshinweise."
    : "";

  return `Erstelle einen strukturierten Substanz-Datensatz für die Substanz: "${input.name}"
${input.category ? `Kategorie: ${input.category}` : ""}
${input.notes ? `Zusätzliche Hinweise: ${input.notes}` : ""}
${hrNote}

Antworte als JSON-Objekt mit GENAU diesem Schema:
{
  "name": "Offizieller Name der Substanz",
  "summary": "Kurze wissenschaftliche Zusammenfassung (2-3 Sätze)",
  "mechanism": "Wirkmechanismus (pharmakologisch)",
  "categories": ["Kategorie1", "Kategorie2"],
  "effects": {
    "positive": ["Effekt1", "Effekt2"],
    "neutral": ["Effekt1"],
    "negative": ["Effekt1", "Effekt2"]
  },
  "risks": {
    "acute": ["Risiko1"],
    "chronic": ["Risiko1"],
    "contraindications": ["Kontraindikation1"]
  },
  "interactions": {
    "high_risk_pairs": ["Substanz1", "Substanz2"],
    "notes": ["Hinweis zu Wechselwirkungen"]
  },
  "dependence": {
    "potential": "low|medium|high|unknown",
    "notes": ["Hinweis"]
  },
  "legality": {
    "germany": "legal|controlled|unknown",
    "notes": ["Hinweis zum rechtlichen Status"]
  },
  "tags": ["tag1", "tag2"],
  "harm_reduction": "Allgemeine Sicherheitshinweise ohne konkrete Dosierungen",
  "image_prompt": "Beschreibung für ein wissenschaftliches Illustrationsbild"
}

WICHTIG: Nur validiertes JSON zurückgeben. Keine Markdown-Codeblöcke. Keine Kommentare außerhalb des JSON.`;
}

/* ---------- AI Calls ---------- */

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

  const cleaned = content.replace(/^```json?\s*\n?/i, "").replace(/\n?```\s*$/i, "");
  return JSON.parse(cleaned) as Record<string, unknown>;
}

/* ---------- Main generation function ---------- */

/**
 * Generate a structured SubstanceDraft using AI.
 * Validates the output with Zod. Retries once on invalid output.
 */
export async function generateSubstance(
  input: GenerateSubstanceInput,
): Promise<SubstanceDraft> {
  const provider = getAiProvider();
  if (provider === "none") {
    throw new Error("Kein AI-Provider konfiguriert. Setze OPENAI_API_KEY oder ANTHROPIC_API_KEY.");
  }

  const userPrompt = buildPrompt(input);
  const callAi = provider === "openai" ? callOpenAI : callAnthropic;

  let raw: Record<string, unknown>;
  let lastError: string | undefined;

  // Try up to 2 times (initial + single retry)
  for (let attempt = 0; attempt < 2; attempt++) {
    raw = await callAi(attempt === 0 ? userPrompt : userPrompt + "\n\nDein letzter Versuch war ungültig. Bitte korrigiere das JSON.");
    const parsed = AiSubstanceOutputSchema.safeParse(raw);
    if (parsed.success) {
      // Map AI output to SubstanceDraft shape
      const ai = parsed.data;
      return {
        name: ai.name,
        slug: "", // Will be set by the API route
        categories: ai.categories,
        summary: ai.summary,
        mechanism: ai.mechanism,
        effects: ai.effects,
        risks: ai.risks,
        interactions: ai.interactions,
        dependence: ai.dependence,
        legality: ai.legality,
        citations: {},
        confidence: {},
      };
    }
    lastError = parsed.error.flatten().fieldErrors
      ? JSON.stringify(parsed.error.flatten().fieldErrors)
      : parsed.error.message;
    console.error(`[generateSubstance] Attempt ${attempt + 1} validation failed:`, lastError);
  }

  throw new Error(`AI-Ausgabe konnte nicht validiert werden: ${lastError}`);
}
