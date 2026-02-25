/**
 * Safer-Use Companion – AI-powered harm-reduction chat logic.
 *
 * Uses OpenAI or Anthropic (same provider abstraction as the rest of the
 * platform) to produce structured, empathetic risk-assessment responses.
 *
 * IMPORTANT: This module NEVER provides dosage clearances, procurement
 * instructions, or medical diagnoses. It focuses exclusively on risk
 * education, interaction warnings, harm reduction, and emergency referrals.
 */

import { getAiProvider } from "./provider";
import type {
  SaferUseChatRequest,
  SaferUseChatResponse,
  SaferUseRiskLevel,
} from "@/lib/types";

// ---------------------------------------------------------------------------
// System prompt – injected as the "system" role for every request
// ---------------------------------------------------------------------------

const SAFER_USE_SYSTEM_PROMPT = `Du bist "Synapedia Safer-Use Companion", ein empathischer, nicht-urteilender Harm-Reduction Chat-Agent.

ZIEL
Nutzer:innen helfen, Risiken ihres aktuellen Konsums besser einzuschätzen und sicherere Entscheidungen zu treffen.

VERBOTEN
- Medizinische Diagnosen stellen
- Individuelle Dosierungsfreigaben geben ("machbar", "safe", "noch ok")
- Anleitungen zur Beschaffung/Herstellung/optimierten Einnahme illegaler Substanzen
- Sagen, dass eine Kombination "sicher" oder "okay" sei

ERLAUBT & GEFORDERT
- Risikoaufklärung
- Interaktionswarnungen
- Schadensminimierung (Harm Reduction)
- Hinweise auf professionelle Hilfe

AUFGABEN (Priorität von oben nach unten)
1) Sicherheits-Screening: Erkenne kritische Muster (Opioid + Benzo + Alkohol; Stimulanz + MAOI; serotonerge Kombis; unbekannte Substanzen; sehr hohe Dosis; i.v. Nutzung; Atemdepression; Brustschmerz; Krampfanfälle; Delir; Suizidalität).
2) Interaktionswarnungen: Liste die gefährlichsten Interaktionen (max 5), kurz begründet (Atemdepression, Serotoninsyndrom, QT-Verlängerung, Hyperthermie, Krampf-Schwelle, Blutdruck, Dehydrierung).
3) Risikostufe: GRÜN (niedrig) / GELB (moderat) / ORANGE (hoch) / ROT (akut).
   - GRÜN nur wenn KEINE riskanten Kombis / Red Flags / Unklarheiten.
   - Im Zweifel mindestens GELB.
4) Konkrete Harm-Reduction-Schritte (ohne Konsum zu optimieren).
5) Notfallhinweise: Bei ROT oder bestimmten Symptomen IMMER "Ruf 112" + "Geh nicht allein".
6) Kommunikation: Empathisch, ruhig, nicht beschämend. Kurze Absätze, klare Bulletpoints.
7) Wenn Nutzer nach "wie viel ist okay" fragt → freundlich erklären, dass du keine Dosierungsfreigaben gibst, aber Risiken erklären kannst.

AUSGABEFORMAT
Antworte IMMER in validem JSON mit diesem Schema:
{
  "assessment": "Kurze Einordnung (1–2 Sätze)",
  "risk_level": "GRÜN|GELB|ORANGE|ROT",
  "interactions": ["Interaktion 1 mit Begründung", "..."],
  "harm_reduction": ["Schritt 1", "Schritt 2", "..."],
  "emergency": "Notfallhinweis oder null wenn nicht ROT",
  "disclaimer": "Standardhinweis, dass dies keine medizinische Beratung ersetzt"
}

Wichtig: Nur valides JSON. Keine Markdown-Code-Blöcke. Sprache: Deutsch.`;

// ---------------------------------------------------------------------------
// Build the user prompt from the structured request
// ---------------------------------------------------------------------------

function buildUserPrompt(req: SaferUseChatRequest): string {
  const profile = req.user_profile;
  const log = req.intake_log;

  let prompt = "NUTZERPROFIL:\n";
  prompt += `- Altersgruppe: ${profile.age_range}\n`;
  prompt += `- Gewicht: ${profile.weight_kg ? `${profile.weight_kg} kg` : "unbekannt"}\n`;
  prompt += `- Toleranz: ${profile.tolerance}\n`;
  prompt += `- Vorerkrankungen: ${profile.conditions.length > 0 ? profile.conditions.join(", ") : "keine angegeben"}\n`;
  prompt += `- Regelmäßige Medikamente: ${profile.regular_meds.length > 0 ? profile.regular_meds.join(", ") : "keine angegeben"}\n`;

  prompt += "\nEINNAHME-LOG:\n";
  if (log.length === 0) {
    prompt += "- Keine Substanzen angegeben\n";
  } else {
    for (const entry of log) {
      prompt += `- ${entry.substance}`;
      if (entry.dose_mg !== null) prompt += `, ${entry.dose_mg} mg`;
      prompt += `, ${entry.route}`;
      if (entry.time_taken) prompt += `, Zeitpunkt: ${entry.time_taken}`;
      if (entry.notes) prompt += ` (${entry.notes})`;
      prompt += "\n";
    }
  }

  prompt += `\nFRAGE DER NUTZERIN / DES NUTZERS:\n${req.user_message}`;

  return prompt;
}

// ---------------------------------------------------------------------------
// Provider calls (OpenAI / Anthropic)
// ---------------------------------------------------------------------------

async function callOpenAI(userPrompt: string): Promise<SaferUseChatResponse> {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: SAFER_USE_SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.3,
      response_format: { type: "json_object" },
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenAI API error: ${res.status} ${err}`);
  }

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error("Leere Antwort von OpenAI.");

  return JSON.parse(content) as SaferUseChatResponse;
}

async function callAnthropic(userPrompt: string): Promise<SaferUseChatResponse> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY!,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      system: SAFER_USE_SYSTEM_PROMPT,
      messages: [{ role: "user", content: userPrompt }],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Anthropic API error: ${res.status} ${err}`);
  }

  const data = await res.json();
  const content = data.content?.[0]?.text;
  if (!content) throw new Error("Leere Antwort von Anthropic.");

  const cleaned = content.replace(/^```json?\s*\n?/i, "").replace(/\n?```\s*$/i, "");
  return JSON.parse(cleaned) as SaferUseChatResponse;
}

// ---------------------------------------------------------------------------
// Deterministic fallback when no AI provider is configured
// ---------------------------------------------------------------------------

function buildFallbackResponse(req: SaferUseChatRequest): SaferUseChatResponse {
  const substances = req.intake_log.map((e) => e.substance.toLowerCase());
  const meds = req.user_profile.regular_meds.map((m) => m.toLowerCase());
  const conditions = req.user_profile.conditions.map((c) => c.toLowerCase());
  const hasIV = req.intake_log.some((e) => e.route === "iv");
  const hasAlcohol = substances.some((s) =>
    ["alkohol", "alcohol", "ethanol"].includes(s)
  );

  const interactions: string[] = [];
  let riskLevel: SaferUseRiskLevel = "GRÜN";

  // --- Opioid + Benzo + Alcohol ---
  const opioidTerms = ["opioid", "heroin", "morphin", "fentanyl", "codein", "tramadol", "oxycodon", "methadon", "buprenorphin"];
  const benzoTerms = ["benzo", "benzodiazepine", "diazepam", "alprazolam", "lorazepam", "clonazepam", "xanax", "valium"];
  const hasOpioid = substances.some((s) => opioidTerms.some((t) => s.includes(t))) || meds.some((m) => opioidTerms.some((t) => m.includes(t)));
  const hasBenzo = substances.some((s) => benzoTerms.some((t) => s.includes(t))) || meds.some((m) => benzoTerms.some((t) => m.includes(t)));

  if (hasOpioid && hasBenzo) {
    interactions.push("Opioid + Benzodiazepin: Hohes Risiko für additive Atemdepression und ZNS-Depression.");
    riskLevel = "ROT";
  }
  if (hasOpioid && hasAlcohol) {
    interactions.push("Opioid + Alkohol: Hohes Risiko für Atemdepression.");
    riskLevel = "ROT";
  }
  if (hasBenzo && hasAlcohol) {
    interactions.push("Benzodiazepin + Alkohol: Additive ZNS-Depression, Atemdepression möglich.");
    riskLevel = riskLevel === "ROT" ? "ROT" : "ORANGE";
  }

  // --- Serotonergic combinations ---
  const serotonergicTerms = ["mdma", "ecstasy", "mda"];
  const ssriTerms = ["ssri", "sertralin", "fluoxetin", "citalopram", "escitalopram", "paroxetin", "fluvoxamin"];
  const maoiTerms = ["maoi", "mao-hemmer", "moclobemid", "tranylcypromin", "phenelzin"];
  const hasSerotonergic = substances.some((s) => serotonergicTerms.some((t) => s.includes(t)));
  const hasSSRI = substances.some((s) => ssriTerms.some((t) => s.includes(t))) || meds.some((m) => ssriTerms.some((t) => m.includes(t)));
  const hasMAOI = substances.some((s) => maoiTerms.some((t) => s.includes(t))) || meds.some((m) => maoiTerms.some((t) => m.includes(t)));

  if (hasSerotonergic && hasSSRI) {
    interactions.push("MDMA/MDA + SSRI: Risiko für Serotoninsyndrom bei serotonerger Überaktivierung.");
    riskLevel = riskLevel === "ROT" ? "ROT" : "ORANGE";
  }
  if (hasSerotonergic && hasMAOI) {
    interactions.push("MDMA/MDA + MAO-Hemmer: Lebensbedrohliches Risiko für Serotoninsyndrom.");
    riskLevel = "ROT";
  }

  // --- Stimulant + Heart disease ---
  const stimulantTerms = ["amphetamin", "methamphetamin", "kokain", "cocaine", "speed", "crystal"];
  const hasStimulant = substances.some((s) => stimulantTerms.some((t) => s.includes(t)));
  const hasHeartCondition = conditions.some((c) => ["heart_disease", "herzkrankheit"].includes(c));

  if (hasStimulant && hasHeartCondition) {
    interactions.push("Stimulanz bei Herzerkrankung: Erhöhtes Risiko für kardiovaskuläre Komplikationen (Blutdruck, Herzfrequenz).");
    riskLevel = riskLevel === "ROT" ? "ROT" : "ORANGE";
  }

  // --- IV use ---
  if (hasIV) {
    interactions.push("Intravenöser Konsum: Deutlich erhöhtes Risiko für Überdosierung, Infektionen und Gefäßschäden.");
    if (riskLevel === "GRÜN") riskLevel = "GELB";
  }

  // --- Unknown substances ---
  const hasUnknown = substances.some((s) => ["unbekannt", "unknown", "rc", "research chemical"].includes(s));
  if (hasUnknown) {
    interactions.push("Unbekannte Substanz: Ohne Identifikation ist eine Risikoabschätzung kaum möglich. Drug-Checking-Angebote nutzen.");
    if (riskLevel === "GRÜN") riskLevel = "GELB";
  }

  // Default: if any substance at all and no specific interactions detected, at least GELB
  if (req.intake_log.length > 0 && riskLevel === "GRÜN" && interactions.length === 0) {
    riskLevel = "GELB";
  }

  // Harm reduction tips
  const harm_reduction: string[] = [];
  harm_reduction.push("Sei nicht allein – informiere eine Vertrauensperson über deinen Konsum.");
  if (req.intake_log.length > 1) {
    harm_reduction.push("Mischkonsum erhöht grundsätzlich das Risiko. Vermeide es, weitere Substanzen hinzuzufügen.");
  }
  harm_reduction.push("Achte auf ausreichende Flüssigkeitszufuhr (Wasser, keine alkoholhaltigen Getränke).");
  harm_reduction.push("Beobachte deinen Körper auf Warnzeichen: Atemnot, Brustschmerz, Krampfanfälle, starke Übelkeit, Verwirrtheit.");
  if (hasIV) {
    harm_reduction.push("Verwende ausschließlich steriles Besteck und teile niemals Nadeln.");
  }
  harm_reduction.push("Nutze Drug-Checking-Angebote, wenn verfügbar, um die Reinheit und Identität zu prüfen.");

  // Emergency note
  let emergency: string | null = null;
  if (riskLevel === "ROT") {
    emergency =
      "🚨 ACHTUNG: Die beschriebene Kombination / Situation birgt akute Gefahren. " +
      "Bei Atemnot, Bewusstlosigkeit, Krampfanfällen, Brustschmerz oder starker Verwirrtheit " +
      "sofort den Notruf 112 anrufen. Bleib nicht allein – lass jemanden bei dir.";
  }

  // Assessment
  let assessment: string;
  if (riskLevel === "ROT") {
    assessment =
      "Die beschriebene Situation enthält mindestens eine potenziell lebensbedrohliche Kombination oder ein kritisches Muster. Bitte nimm die Warnungen ernst und ziehe professionelle Hilfe in Betracht.";
  } else if (riskLevel === "ORANGE") {
    assessment =
      "Es liegen riskante Kombinationen oder Risikofaktoren vor, die deine Gesundheit ernsthaft gefährden können. Besondere Vorsicht ist geboten.";
  } else if (riskLevel === "GELB") {
    assessment =
      "Es sind moderate Risiken oder Unklarheiten vorhanden. Eine genaue Einschätzung erfordert Vorsicht und Aufmerksamkeit auf körperliche Signale.";
  } else {
    assessment =
      "Auf Basis der angegebenen Informationen wurden keine akut kritischen Muster erkannt. Dennoch gilt: Jeder Substanzkonsum birgt Risiken.";
  }

  return {
    assessment,
    risk_level: riskLevel,
    interactions: interactions.length > 0 ? interactions : ["Keine spezifischen Interaktionen auf Basis der Angaben erkannt."],
    harm_reduction,
    emergency,
    disclaimer:
      "Diese Einschätzung ersetzt keine ärztliche oder toxikologische Beratung. Bei gesundheitlichen Problemen wende dich an den Notruf 112 oder eine Suchtberatungsstelle.",
  };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function runSaferUseChat(
  req: SaferUseChatRequest
): Promise<SaferUseChatResponse> {
  const provider = getAiProvider();

  if (provider === "none") {
    // Deterministic fallback – works without any AI key
    return buildFallbackResponse(req);
  }

  const userPrompt = buildUserPrompt(req);

  try {
    if (provider === "openai") {
      return await callOpenAI(userPrompt);
    }
    return await callAnthropic(userPrompt);
  } catch {
    // If AI call fails, fall back to deterministic response
    return buildFallbackResponse(req);
  }
}
