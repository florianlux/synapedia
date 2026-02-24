/**
 * Sanitize payloads before inserting into Supabase tables.
 *
 * Prevents PostgREST "Could not find the …" / "schema cache" errors
 * caused by sending columns that do not exist in the database table.
 *
 * Each allowlist mirrors the columns from migrations 00004 + 00005.
 * If columns are added/removed later, update the corresponding set.
 */

/* ------------------------------------------------------------------ */
/*  Column allowlists                                                 */
/* ------------------------------------------------------------------ */

/** public.substances (migrations 00004 + 00005). */
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
  // 00008_substances_jsonb_columns.sql
  "meta",
]);

/** public.substance_sources (migration 00004). */
const SUBSTANCE_SOURCES_COLUMNS: ReadonlySet<string> = new Set([
  "id",
  "substance_id",
  "source_name",
  "source_url",
  "source_type",
  "retrieved_at",
  "snippet",
  "snippet_hash",
  "license_note",
  "confidence",
]);

/** public.substance_aliases (migration 00005). */
const SUBSTANCE_ALIASES_COLUMNS: ReadonlySet<string> = new Set([
  "id",
  "substance_id",
  "alias",
  "alias_type",
  "source",
  "created_at",
]);

/** public.enrichment_jobs (migration 00005). */
const ENRICHMENT_JOBS_COLUMNS: ReadonlySet<string> = new Set([
  "id",
  "substance_id",
  "phase",
  "status",
  "error_message",
  "attempts",
  "created_at",
  "updated_at",
]);

/** public.import_logs (migration 00005). */
const IMPORT_LOGS_COLUMNS: ReadonlySet<string> = new Set([
  "id",
  "admin_user",
  "source_type",
  "source_detail",
  "total_count",
  "created_count",
  "skipped_count",
  "error_count",
  "created_at",
]);

/* ------------------------------------------------------------------ */
/*  Generic sanitizer                                                 */
/* ------------------------------------------------------------------ */

function sanitizePayload<T extends Record<string, unknown>>(
  tableName: string,
  allowedColumns: ReadonlySet<string>,
  payload: T,
  allowedColumns?: ReadonlySet<string>,
): Partial<T> {
  const columns = allowedColumns ?? STATIC_SUBSTANCES_COLUMNS;
  const clean: Record<string, unknown> = {};
  const extras: Record<string, unknown> = {};

  for (const key of Object.keys(payload)) {
    if (allowedColumns.has(key)) {
      clean[key] = payload[key];
    } else {
      extras[key] = payload[key];
    }
  }

  if (discarded.length > 0 && process.env.NODE_ENV !== "production") {
    console.warn(
      `[sanitize:${tableName}] Discarded unknown columns: ${discarded.join(", ")}`,
    );
  }

  return clean as Partial<T>;
}

/* ------------------------------------------------------------------ */
/*  Public helpers (one per table)                                    */
/* ------------------------------------------------------------------ */

export function sanitizeSubstancePayload<T extends Record<string, unknown>>(
  payload: T,
): Partial<T> {
  return sanitizePayload("substances", SUBSTANCES_COLUMNS, payload);
}

export function sanitizeSourcePayload<T extends Record<string, unknown>>(
  payload: T,
): Partial<T> {
  return sanitizePayload("substance_sources", SUBSTANCE_SOURCES_COLUMNS, payload);
}

export function sanitizeAliasPayload<T extends Record<string, unknown>>(
  payload: T,
): Partial<T> {
  return sanitizePayload("substance_aliases", SUBSTANCE_ALIASES_COLUMNS, payload);
}

export function sanitizeEnrichmentJobPayload<T extends Record<string, unknown>>(
  payload: T,
): Partial<T> {
  return sanitizePayload("enrichment_jobs", ENRICHMENT_JOBS_COLUMNS, payload);
}

export function sanitizeImportLogPayload<T extends Record<string, unknown>>(
  payload: T,
): Partial<T> {
  return sanitizePayload("import_logs", IMPORT_LOGS_COLUMNS, payload);
}
