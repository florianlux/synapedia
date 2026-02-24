/**
 * Sanitize payloads before inserting into public.substances.
 *
 * Prevents PostgREST "schema cache" errors caused by sending columns
 * that do not exist in the database table.
 *
 * At runtime, callers may pass a pre-fetched column set obtained from
 * getAllowedColumns() (see sanitize-server.ts). When no set is provided
 * the static fallback allowlist (mirroring migrations 00004 + 00005) is used.
 */

/** Static fallback – mirrors columns from migrations 00004 + 00005. */
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
]);

/**
 * Remove any keys from `payload` that are not columns in public.substances.
 * In development mode, logs discarded keys to the console.
 *
 * @param payload         – row object to sanitize
 * @param allowedColumns  – optional pre-fetched column set (avoids extra await)
 * @returns A new object containing only allowed keys.
 */
export function sanitizeSubstancePayload<T extends Record<string, unknown>>(
  payload: T,
  allowedColumns?: ReadonlySet<string>,
): Partial<T> {
  const columns = allowedColumns ?? STATIC_SUBSTANCES_COLUMNS;
  const clean: Record<string, unknown> = {};
  const discarded: string[] = [];

  for (const key of Object.keys(payload)) {
    if (columns.has(key)) {
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
