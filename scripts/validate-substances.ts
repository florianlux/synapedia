/**
 * Validate that data/substances.ts is parseable and structurally correct.
 *
 * Usage:
 *   npx tsx scripts/validate-substances.ts
 *
 * Exits with code 0 on success, 1 on failure.
 */

import { substances, type SubstanceEntry } from "../data/substances";

interface ValidationError {
  index: number;
  field: string;
  message: string;
}

function validate(entries: SubstanceEntry[]): ValidationError[] {
  const errors: ValidationError[] = [];
  const slugs = new Set<string>();
  const ids = new Set<string>();

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];

    // Required string fields
    for (const field of ["id", "slug", "title", "class_primary", "risk_level", "summary"] as const) {
      if (typeof entry[field] !== "string" || (entry[field] as string).length === 0) {
        errors.push({ index: i, field, message: `"${field}" must be a non-empty string` });
      }
    }

    // Required array fields
    for (const field of ["class_secondary", "mechanisms", "receptors", "tags"] as const) {
      if (!Array.isArray(entry[field])) {
        errors.push({ index: i, field, message: `"${field}" must be an array` });
      }
    }

    // Sources must be an array of { label, url }
    if (!Array.isArray(entry.sources)) {
      errors.push({ index: i, field: "sources", message: `"sources" must be an array` });
    } else {
      for (let j = 0; j < entry.sources.length; j++) {
        const src = entry.sources[j];
        if (typeof src.label !== "string" || typeof src.url !== "string") {
          errors.push({ index: i, field: `sources[${j}]`, message: "each source must have label and url strings" });
        }
      }
    }

    // Unique slug
    if (slugs.has(entry.slug)) {
      errors.push({ index: i, field: "slug", message: `duplicate slug: "${entry.slug}"` });
    }
    slugs.add(entry.slug);

    // Unique id
    if (ids.has(entry.id)) {
      errors.push({ index: i, field: "id", message: `duplicate id: "${entry.id}"` });
    }
    ids.add(entry.id);

    // risk_level must be one of the known values
    if (!["low", "moderate", "high"].includes(entry.risk_level)) {
      errors.push({ index: i, field: "risk_level", message: `unknown risk_level: "${entry.risk_level}"` });
    }
  }

  return errors;
}

// --- Main ---
console.log(`Validating ${substances.length} substance entries…`);

const errors = validate(substances);

if (errors.length > 0) {
  console.error(`\n✗ ${errors.length} validation error(s):\n`);
  for (const err of errors) {
    console.error(`  [${err.index}] ${err.field}: ${err.message}`);
  }
  process.exit(1);
} else {
  console.log(`✓ All ${substances.length} entries are valid.`);
  process.exit(0);
}
