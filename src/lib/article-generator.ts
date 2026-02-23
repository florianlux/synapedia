/**
 * Article MDX generator for substances.
 *
 * Generates harm-reduction-oriented MDX content from structured substance data.
 * MUST NOT include consumption instructions, dosage recommendations, or "how-to" content.
 */

import type { Substance } from "@/lib/types";

interface SubstanceParsedData {
  effects?: string[];
  interactions?: {
    uncertain?: string[];
    unsafe?: string[];
    dangerous?: string[];
  };
  addiction_potential?: string | null;
  toxicity?: string[];
  tolerance?: {
    full?: string | null;
    half?: string | null;
    zero?: string | null;
  } | null;
}

/**
 * Generate harm-reduction MDX article content from a substance record.
 */
export function generateArticleMdx(
  substance: Substance,
  parsedData?: SubstanceParsedData | null
): string {
  const sections: string[] = [];

  // Header
  sections.push(`# ${substance.name}`);
  sections.push(
    `> ⚠️ Bildungs- & Forschungskontext. Keine Konsumanleitung, keine Dosierungsempfehlung.`
  );
  sections.push("");

  // Summary
  sections.push("## Kurzfazit");
  sections.push(
    substance.summary
      ? substance.summary.slice(0, 500)
      : `${substance.name} ist eine psychoaktive Substanz. Wissenschaftliche Daten werden derzeit zusammengetragen.`
  );
  sections.push("");

  // Classification
  sections.push("## Einordnung");
  sections.push(
    `- **Substanzklasse (chemisch):** ${substance.class_primary ?? "Nicht klassifiziert"}`
  );
  sections.push(
    `- **Substanzklasse (psychoaktiv):** ${substance.class_secondary ?? "Nicht klassifiziert"}`
  );
  if (substance.aliases.length > 0) {
    sections.push(
      `- **Andere Bezeichnungen:** ${substance.aliases.join(", ")}`
    );
  }
  sections.push("");

  // Mechanism (high-level, abstract)
  sections.push("## Wirkmechanismus (High-Level)");
  sections.push(
    "Detaillierte pharmakologische Informationen werden aus Fachliteratur zusammengetragen. " +
      "Dieser Abschnitt beschreibt Rezeptorfamilien und Wirkmechanismen auf abstraktem Niveau."
  );
  sections.push("");

  // Reported effects
  if (parsedData?.effects && parsedData.effects.length > 0) {
    sections.push("## Berichtete Effekte (qualitativ)");
    sections.push(
      "Die folgenden Effekte wurden in der wissenschaftlichen Literatur und Nutzererfahrungen berichtet:"
    );
    for (const effect of parsedData.effects.slice(0, 15)) {
      sections.push(`- ${effect}`);
    }
    sections.push("");
  }

  // Risks
  sections.push("## Risiken & Nebenwirkungen");
  if (parsedData?.toxicity && parsedData.toxicity.length > 0) {
    for (const item of parsedData.toxicity) {
      sections.push(`- ${item}`);
    }
  }
  if (parsedData?.addiction_potential) {
    sections.push(`- **Abhängigkeitspotenzial:** ${parsedData.addiction_potential}`);
  }
  sections.push(
    "- Personen mit Vorerkrankungen und vulnerable Gruppen sind besonders gefährdet."
  );
  sections.push(
    "- Bei unerwünschten Reaktionen sofort medizinische Hilfe in Anspruch nehmen."
  );
  sections.push("");

  // Interactions
  sections.push("## Interaktionen (Allgemein)");
  if (parsedData?.interactions) {
    const { dangerous = [], unsafe = [], uncertain = [] } = parsedData.interactions;
    if (dangerous.length > 0) {
      sections.push(`- **Gefährlich in Kombination mit:** ${dangerous.join(", ")}`);
    }
    if (unsafe.length > 0) {
      sections.push(`- **Unsicher in Kombination mit:** ${unsafe.join(", ")}`);
    }
    if (uncertain.length > 0) {
      sections.push(
        `- **Unklare Interaktionen mit:** ${uncertain.join(", ")}`
      );
    }
  }
  sections.push(
    "- Diese Liste ist nicht vollständig. Kombination mit anderen Substanzen kann riskant sein."
  );
  sections.push("");

  // Legal status
  sections.push("## Rechtsstatus");
  sections.push(
    "Der Rechtsstatus variiert je nach Land und Jurisdiktion. " +
      "Dieser Abschnitt stellt keine Rechtsberatung dar. " +
      "Informieren Sie sich bei den zuständigen Behörden Ihres Landes."
  );
  sections.push("");

  // Sources
  sections.push("## Quellen & Lizenz");
  sections.push(
    `- PsychonautWiki (CC BY-SA 4.0) — [Quelle](${substance.source_license_url ?? "https://psychonautwiki.org/wiki/Copyrights"})`
  );
  if (substance.imported_at) {
    sections.push(`- Importiert am: ${new Date(substance.imported_at).toLocaleDateString("de-DE")}`);
  }
  sections.push("");

  // Footer
  sections.push("---");
  sections.push(
    "> **Hinweis:** Keine medizinische Beratung. Bei akuten Problemen: lokale Notrufnummer / medizinische Hilfe."
  );

  return sections.join("\n");
}
