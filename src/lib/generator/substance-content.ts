/**
 * Generates structured scientific MDX content from substance data in
 * data/substances.json.  Used as a deterministic fallback when no
 * hand-written or AI-generated article exists yet.
 *
 * The output follows the same section structure as the curated demo
 * articles (Kurzfazit, Was ist …, Wirkmechanismus, Rezeptorprofil,
 * Risiken & Nebenwirkungen, Interaktionen, Rechtsstatus, Quellenlage).
 */

export interface SubstanceData {
  id: string;
  slug: string;
  title: string;
  class_primary: string;
  class_secondary: string[];
  mechanisms: string[];
  receptors: string[];
  tags: string[];
  risk_level: string;
  summary: string;
  sources: { label: string; url: string }[];
}

/**
 * Build a complete MDX article body from the structured JSON data.
 */
export function generateSubstanceContentMdx(substance: SubstanceData): string {
  const s = substance;
  const sections: string[] = [];

  // Kurzfazit
  sections.push(`## Kurzfazit\n`);
  sections.push(`${s.summary}\n`);

  // Was ist …?
  sections.push(`## Was ist ${s.title}?\n`);
  const classes = [s.class_primary, ...s.class_secondary].filter(Boolean);
  sections.push(
    `${s.title} gehört zur Substanzklasse der **${classes.join(" / ")}**. ` +
      `${s.summary}\n`
  );

  // Wirkmechanismus
  sections.push(`## Wirkmechanismus\n`);
  if (s.mechanisms.length > 0) {
    sections.push(
      `Der primäre Wirkmechanismus von ${s.title} umfasst: **${s.mechanisms.join(", ")}**. ` +
        `Die genauen molekularen Interaktionen werden fortlaufend in der wissenschaftlichen Literatur untersucht.\n`
    );
  } else {
    sections.push(
      `Der Wirkmechanismus von ${s.title} wird derzeit in der wissenschaftlichen Literatur untersucht.\n`
    );
  }

  // Rezeptorprofil
  sections.push(`## Rezeptorprofil\n`);
  if (s.receptors.length > 0) {
    sections.push(
      s.receptors
        .map((r) => `- **${r}**`)
        .join("\n") + "\n"
    );
  } else {
    sections.push(
      `Das Rezeptorprofil von ${s.title} wird derzeit erforscht.\n`
    );
  }

  // Risiken & Nebenwirkungen
  sections.push(`## Risiken & Nebenwirkungen\n`);
  sections.push(
    `Wie bei allen psychoaktiven Substanzen bestehen potenzielle Risiken. ` +
      `Die individuelle Reaktion kann stark variieren und wird von zahlreichen Faktoren beeinflusst, ` +
      `darunter Gesundheitszustand, gleichzeitige Einnahme anderer Substanzen und individuelle Disposition. ` +
      `Weitere substanzspezifische Risiken werden aus der wissenschaftlichen Literatur ergänzt.\n`
  );

  // Interaktionen
  sections.push(`## Interaktionen\n`);
  sections.push(
    `Wechselwirkungen mit anderen Substanzen oder Medikamenten sind möglich und können ` +
      `unvorhersehbare Effekte haben. Detaillierte Interaktionsdaten werden aus Fachdatenbanken ergänzt.\n`
  );

  // Rechtsstatus
  sections.push(`## Rechtsstatus\n`);
  sections.push(
    `Der rechtliche Status von ${s.title} variiert je nach Land und Rechtsordnung. ` +
      `*Dieser Abschnitt dient nur der Information und stellt keine Rechtsberatung dar.*\n`
  );

  // Quellenlage
  sections.push(`## Quellenlage\n`);
  if (s.sources.length > 0) {
    sections.push(
      `Die hier dargestellten Informationen basieren auf den folgenden Quellen:\n`
    );
    for (const src of s.sources) {
      sections.push(`- [${src.label}](${src.url})`);
    }
    sections.push("");
  } else {
    sections.push(
      `Quellenangaben werden nach der Datenerfassung ergänzt.\n`
    );
  }

  return sections.join("\n");
}
