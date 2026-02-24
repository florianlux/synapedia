/**
 * Sanitize payloads before inserting into public.substances.
 *
 * Prevents PostgREST "schema cache" errors caused by sending columns
 * that do not exist in the database table.
 *
 * The allowlist mirrors the columns from migrations 00004 + 00005.
 * If columns are added/removed later, update this set.
 */

/** All known columns of public.substances (migrations 00004 + 00005). */
const SUBSTANCES_COLUMNS: ReadonlySet<string> = new Set([
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
]);

/**
 * Remove any keys from `payload` that are not columns in public.substances.
 * In development mode, logs discarded keys to the console.
 *
 * @returns A new object containing only allowed keys.
 */
export function sanitizeSubstancePayload<T extends Record<string, unknown>>(
  payload: T,
): Partial<T> {
  const clean: Record<string, unknown> = {};
  const discarded: string[] = [];

  for (const key of Object.keys(payload)) {
    if (SUBSTANCES_COLUMNS.has(key)) {
      clean[key] = payload[key];
    } else {
      discarded.push(key);
    }
  }

  if (discarded.length > 0 && process.env.NODE_ENV !== "production") {
    console.warn(
      `[sanitizeSubstancePayload] Discarded unknown columns: ${discarded.join(", ")}`,
    );
  }

  return clean as Partial<T>;
}
