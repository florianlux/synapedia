/**
 * Template-based MDX article generator.
 * Takes substance data + template and produces a scientific MDX article.
 * Deterministic — no LLM needed. Uses structured data from connectors.
 */

import type { WikidataSubstanceData } from "@/lib/connectors/wikidata";
import type { PubChemCompoundData } from "@/lib/connectors/pubchem";
import { filterContent, type ContentFilterResult } from "./content-filter";

export interface GeneratorInput {
  substanceName: string;
  slug: string;
  wikidata?: WikidataSubstanceData | null;
  pubchem?: PubChemCompoundData | null;
  riskLevel?: string;
  metadata?: Record<string, unknown>;
}

export interface GeneratorOutput {
  contentMdx: string;
  citations: Array<{ source: string; url: string; license: string; retrievedAt: string }>;
  filterResult: ContentFilterResult;
}

/**
 * Default harm-reduction article template.
 * Generates a complete MDX article from structured data.
 */
export function generateArticleMdx(input: GeneratorInput): GeneratorOutput {
  const { substanceName, wikidata, pubchem } = input;

  const citations: GeneratorOutput["citations"] = [];

  // Build sections
  const sections: string[] = [];

  // Title
  sections.push(`# ${substanceName}\n`);

  // Disclaimer
  sections.push(`> **Hinweis:** Dieser Artikel dient ausschließlich der wissenschaftlichen Aufklärung und Schadensminimierung (Harm Reduction). Er stellt keine medizinische Beratung dar und enthält keine Anleitungen zum Konsum. Bei gesundheitlichen Fragen wenden Sie sich an medizinisches Fachpersonal.\n`);

  // Kurzüberblick
  sections.push("## Kurzüberblick\n");
  const descParts: string[] = [];
  if (wikidata?.description) {
    descParts.push(wikidata.description);
  }
  if (pubchem?.description) {
    descParts.push(pubchem.description);
  }
  if (descParts.length > 0) {
    sections.push(descParts.join(" ") + "\n");
  } else {
    sections.push(`${substanceName} ist eine chemische Substanz, die in der wissenschaftlichen Forschung untersucht wird.\n`);
  }

  // Chemie & Identifikatoren
  sections.push("## Chemie & Identifikatoren\n");
  const identRows: string[] = [];
  identRows.push("| Eigenschaft | Wert |");
  identRows.push("|---|---|");

  if (pubchem?.molecularFormula) identRows.push(`| Summenformel | ${pubchem.molecularFormula} |`);
  if (pubchem?.molecularWeight) identRows.push(`| Molekulargewicht | ${pubchem.molecularWeight} g/mol |`);
  if (pubchem?.iupacName) identRows.push(`| IUPAC-Name | ${pubchem.iupacName} |`);
  if (pubchem?.inchiKey) identRows.push(`| InChIKey | ${pubchem.inchiKey} |`);
  if (wikidata?.cas) identRows.push(`| CAS-Nummer | ${wikidata.cas} |`);
  if (pubchem?.cid) identRows.push(`| PubChem CID | [${pubchem.cid}](https://pubchem.ncbi.nlm.nih.gov/compound/${pubchem.cid}) |`);
  if (wikidata?.wikidataId) identRows.push(`| Wikidata | [${wikidata.wikidataId}](https://www.wikidata.org/wiki/${wikidata.wikidataId}) |`);

  if (identRows.length > 2) {
    sections.push(identRows.join("\n") + "\n");
  } else {
    sections.push("Keine chemischen Identifikatoren verfügbar.\n");
  }

  // Einordnung (Klassifikation)
  sections.push("## Einordnung\n");
  if (wikidata?.classLabels && wikidata.classLabels.length > 0) {
    sections.push(`${substanceName} wird klassifiziert als: ${wikidata.classLabels.join(", ")}.\n`);
  } else {
    sections.push("Die genaue Klassifikation dieser Substanz wird derzeit recherchiert.\n");
  }

  // Aliases
  const allAliases = new Set<string>();
  wikidata?.aliases?.forEach((a) => allAliases.add(a));
  pubchem?.synonyms?.slice(0, 10).forEach((s) => allAliases.add(s));
  if (allAliases.size > 0) {
    sections.push(`**Bekannte Bezeichnungen:** ${Array.from(allAliases).join(", ")}\n`);
  }

  // Pharmakologie
  sections.push("## Pharmakologie\n");
  if (pubchem?.pharmacology) {
    sections.push(pubchem.pharmacology + "\n");
  } else {
    sections.push("Detaillierte pharmakologische Daten werden aus weiteren Quellen ergänzt.\n");
  }

  // Risiken & Nebenwirkungen
  sections.push("## Risiken & Nebenwirkungen\n");
  sections.push("Wie bei allen psychoaktiven Substanzen bestehen potenzielle Risiken. Die individuelle Reaktion kann stark variieren und wird von zahlreichen Faktoren beeinflusst. Weitere Informationen zu substanzspezifischen Risiken werden aus der wissenschaftlichen Literatur ergänzt.\n");

  // Interaktionen
  sections.push("## Interaktionen\n");
  sections.push("Wechselwirkungen mit anderen Substanzen oder Medikamenten sind möglich und können unvorhersehbare Effekte haben. Detaillierte Interaktionsdaten werden aus Fachdatenbanken ergänzt.\n");

  // Forschungslage
  sections.push("## Forschungslage\n");
  sections.push("Der aktuelle Forschungsstand wird fortlaufend aktualisiert. Die hier dargestellten Informationen basieren auf öffentlich zugänglichen wissenschaftlichen Datenbanken.\n");

  // Rechtlicher Status
  sections.push("## Rechtlicher Status\n");
  sections.push("Der rechtliche Status variiert je nach Land und Rechtsordnung. Diese Information ist keine Rechtsberatung.\n");

  // Quellen & Attribution
  sections.push("## Quellen & Attribution\n");
  if (wikidata) {
    citations.push({
      source: "Wikidata",
      url: wikidata.sourceUrl,
      license: "CC0 1.0",
      retrievedAt: wikidata.retrievedAt,
    });
    sections.push(`- **Wikidata** (${wikidata.wikidataId}): [${wikidata.sourceUrl}](${wikidata.sourceUrl}) — Lizenz: CC0 1.0 — Abgerufen: ${new Date(wikidata.retrievedAt).toLocaleDateString("de-DE")}`);
  }
  if (pubchem) {
    citations.push({
      source: "PubChem",
      url: pubchem.sourceUrl,
      license: "Public Domain",
      retrievedAt: pubchem.retrievedAt,
    });
    sections.push(`- **PubChem** (CID ${pubchem.cid}): [${pubchem.sourceUrl}](${pubchem.sourceUrl}) — Lizenz: Public Domain — Abgerufen: ${new Date(pubchem.retrievedAt).toLocaleDateString("de-DE")}`);
  }
  if (citations.length === 0) {
    sections.push("Quellenangaben werden nach der Datenerfassung ergänzt.");
  }

  sections.push(""); // trailing newline

  const contentMdx = sections.join("\n");

  // Run content filter
  const filterResult = filterContent(contentMdx);

  return {
    contentMdx: filterResult.blocked ? filterResult.cleanContent : contentMdx,
    citations,
    filterResult,
  };
}
