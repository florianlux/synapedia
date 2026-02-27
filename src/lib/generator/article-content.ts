/**
 * Generates structured scientific MDX content for an article.
 *
 * Used as a deterministic fallback when no hand-written or AI-generated
 * content exists yet.  Mirrors the section structure used by the substance
 * content generator but works from Article data.
 */

import type { Article } from "@/lib/types";

/**
 * Build a complete MDX article body from an Article record.
 *
 * If the article already has content_mdx, returns that unchanged.
 * Otherwise generates a basic scaffold from the available metadata.
 */
export function generateArticleContentMdx(article: Article): string {
  // If existing content is present and non-trivial, return it as-is
  if (article.content_mdx && article.content_mdx.trim().length > 0) {
    return article.content_mdx;
  }

  const sections: string[] = [];

  // Kurzfazit
  sections.push(`## Kurzfazit\n`);
  sections.push(`${article.summary}\n`);

  // Was ist …?
  sections.push(`## Was ist ${article.title}?\n`);
  sections.push(
    `${article.title} ist eine Substanz` +
      (article.category ? ` aus der Kategorie **${article.category}**` : "") +
      `. ${article.summary}\n`,
  );

  // Wirkmechanismus
  sections.push(`## Wirkmechanismus\n`);
  if (article.receptor) {
    sections.push(
      `${article.title} wirkt primär über **${article.receptor}**. ` +
        `Die genauen molekularen Interaktionen werden fortlaufend in der wissenschaftlichen Literatur untersucht.\n`,
    );
  } else {
    sections.push(
      `Der Wirkmechanismus von ${article.title} wird derzeit in der wissenschaftlichen Literatur untersucht.\n`,
    );
  }

  // Risiken
  sections.push(`## Risiken & Nebenwirkungen\n`);
  sections.push(
    `Wie bei allen psychoaktiven Substanzen bestehen potenzielle Risiken. ` +
      `Die individuelle Reaktion kann stark variieren und wird von zahlreichen Faktoren beeinflusst, ` +
      `darunter Gesundheitszustand, gleichzeitige Einnahme anderer Substanzen und individuelle Disposition.\n`,
  );

  // Interaktionen
  sections.push(`## Interaktionen\n`);
  sections.push(
    `Wechselwirkungen mit anderen Substanzen oder Medikamenten sind möglich und können ` +
      `unvorhersehbare Effekte haben. Detaillierte Interaktionsdaten werden aus Fachdatenbanken ergänzt.\n`,
  );

  // Rechtsstatus
  sections.push(`## Rechtsstatus\n`);
  if (article.legal_status) {
    sections.push(
      `${article.title} ist in Deutschland eingestuft als: **${article.legal_status}**. ` +
        `*Dieser Abschnitt dient nur der Information und stellt keine Rechtsberatung dar.*\n`,
    );
  } else {
    sections.push(
      `Der rechtliche Status von ${article.title} variiert je nach Land und Rechtsordnung. ` +
        `*Dieser Abschnitt dient nur der Information und stellt keine Rechtsberatung dar.*\n`,
    );
  }

  // Quellenlage
  sections.push(`## Quellenlage\n`);
  sections.push(
    `Quellenangaben werden nach der Datenerfassung ergänzt.\n`,
  );

  return sections.join("\n");
}
