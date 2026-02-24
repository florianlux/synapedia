/**
 * Sanitize payloads before inserting into public.substances.
 *
 * Prevents PostgREST "schema cache" errors caused by sending columns
 * that do not exist in the database table.
 *
 * Unknown keys are not discarded — they are stored in the `meta` jsonb
 * column so no data is lost.
 *
 * The allowlist mirrors the columns from migrations 00004 + 00005 + 00007.
 * If columns are added/removed later, update this set.
 */

/** All known columns of public.substances (migrations 00004 + 00005 + 00007). */
export const STATIC_SUBSTANCES_COLUMNS: ReadonlySet<string> = new Set([
  // 00004_substances.sql
  "id",
  "name",
  "slug",
  "categories",
  "summary",
  "mechanism",
  "effects",
  "risks",
  "interactions",
  "dependence",
  "legality",
  "citations",
  "confidence",
  "status",
  "created_at",
  // 00005_enrichment_system.sql
  "external_ids",
  "canonical_name",
  "tags",
  "related_slugs",
  "enrichment",
  // 00007_bulk_import_meta.sql
  "meta",
]);

/**
 * Remove any keys from `payload` that are not columns in public.substances.
 * Unknown keys are merged into the `meta` jsonb field instead of being lost.
 *
 * @returns A new object containing only allowed keys, with extras in `meta`.
 */
export function sanitizeSubstancePayload<T extends Record<string, unknown>>(
  payload: T,
  allowedColumns?: ReadonlySet<string>,
): Partial<T> {
  const columns = allowedColumns ?? STATIC_SUBSTANCES_COLUMNS;
  const clean: Record<string, unknown> = {};
  const extras: Record<string, unknown> = {};

  for (const key of Object.keys(payload)) {
    if (columns.has(key)) {
      clean[key] = payload[key];
    } else {
      extras[key] = payload[key];
    }
  }

  // Merge extras into meta (preserving any existing meta from the payload)
  if (Object.keys(extras).length > 0) {
    const existingMeta =
      typeof clean.meta === "object" && clean.meta !== null
        ? (clean.meta as Record<string, unknown>)
        : {};
    clean.meta = { ...existingMeta, ...extras };

    if (process.env.NODE_ENV !== "production") {
      console.warn(
        `[sanitizeSubstancePayload] Moved unknown columns to meta: ${Object.keys(extras).join(", ")}`,
      );
    }
  }

  return clean as Partial<T>;
}

/**
 * Pick the best onConflict column for upsert based on available columns.
 *
 * Preference order: canonical_name → slug → name.
 */
export function pickOnConflict(
  allowedColumns: ReadonlySet<string>,
): string {
  if (allowedColumns.has("canonical_name")) return "canonical_name";
  if (allowedColumns.has("slug")) return "slug";
  return "name";
}
