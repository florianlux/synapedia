/**
 * Type normalization helpers for substance payloads.
 *
 * Prevents "invalid input syntax for type numeric" errors caused by
 * {} / [] / "" / "N/A" values leaking into numeric DB columns.
 *
 * Used BEFORE every Supabase insert / upsert / update on public.substances.
 */

/* ============ Primitive helpers ============ */

/**
 * Coerce an unknown value to `number | null`.
 *
 * Rules (in order):
 *  1. null / undefined              → null
 *  2. {} (empty object) or []       → null
 *  3. "" / "N/A" / "-"              → null
 *  4. already a finite number       → that number
 *  5. string that parses to a float → parseFloat result
 *  6. anything else (NaN, object…)  → null
 */
export function toNullableNumber(input: unknown): number | null {
  if (input === null || input === undefined) return null;

  // Empty object {} or array []
  if (typeof input === "object") {
    if (Array.isArray(input)) return null;
    if (Object.keys(input as Record<string, unknown>).length === 0) return null;
    // Non-empty objects are not numbers
    return null;
  }

  if (typeof input === "boolean") return null;

  if (typeof input === "number") {
    return Number.isFinite(input) ? input : null;
  }

  if (typeof input === "string") {
    const trimmed = input.trim();
    if (trimmed === "" || trimmed === "N/A" || trimmed === "-") return null;
    const parsed = parseFloat(trimmed);
    // Reject partial numeric strings like "12px" — the entire string must be a number
    if (!Number.isFinite(parsed)) return null;
    if (String(parsed) !== trimmed && trimmed !== String(parsed) + ".0") {
      // Allow minor formatting differences but reject "12px", "3.14abc" etc.
      const strict = Number(trimmed);
      return Number.isFinite(strict) ? strict : null;
    }
    return parsed;
  }

  return null;
}

/**
 * Coerce an unknown value to `string[]`.
 *
 * Rules:
 *  1. null / undefined / {} → []
 *  2. string               → [string] (single-element array)
 *  3. array                → map each element to String, filter blanks
 *  4. anything else        → []
 */
export function toTextArray(input: unknown): string[] {
  if (input === null || input === undefined) return [];

  if (typeof input === "string") return input ? [input] : [];

  if (Array.isArray(input)) {
    return input
      .map((v) => (typeof v === "string" ? v : v != null ? String(v) : ""))
      .filter((v) => v !== "");
  }

  // {} or other objects → empty array
  if (typeof input === "object") return [];

  return [];
}

/* ============ Column type map ============ */

/**
 * Known column types for public.substances.
 * Derived from migrations 00004 through 00010.
 */
const NUMERIC_COLUMNS: ReadonlySet<string> = new Set([
  // 00004 – substance_sources.confidence is on a different table,
  //         but confidence_score on substances is integer (00010)
  "confidence_score",
  // 00009
  "pubchem_cid",
]);

const TEXT_ARRAY_COLUMNS: ReadonlySet<string> = new Set([
  // 00005
  "tags",
  "related_slugs",
]);

const JSONB_COLUMNS: ReadonlySet<string> = new Set([
  // 00004
  "effects",
  "risks",
  "interactions",
  "dependence",
  "legality",
  "citations",
  "confidence",
  // 00005
  "external_ids",
  "enrichment",
  // 00008 converted categories to jsonb
  "categories",
  // 00007 / 00008
  "meta",
]);

const TEXT_COLUMNS: ReadonlySet<string> = new Set([
  "name",
  "slug",
  "canonical_name",
  "summary",
  "mechanism",
  "status",
  "wikidata_qid",
  "wikidata_status",
  "pubchem_status",
  "ai_status",
  "import_run_id",
]);

/* ============ Payload sanitiser ============ */

/**
 * Return true if `val` is a "junk" value that should never be written
 * to a non-JSONB column: empty objects, empty arrays, or N/A strings.
 */
function isJunkValue(val: unknown): boolean {
  if (val === null || val === undefined) return false; // already safe
  if (typeof val === "object" && !Array.isArray(val) && Object.keys(val as Record<string, unknown>).length === 0) return true;
  if (Array.isArray(val) && val.length === 0) return false; // empty array can be valid for text[]
  if (typeof val === "string") {
    const t = val.trim();
    if (t === "N/A" || t === "-") return true;
  }
  return false;
}

/**
 * Normalise every value in a substance payload so that:
 *  - Numeric columns get `number | null`
 *  - Text array columns get `string[]`
 *  - JSONB columns keep their value (but {} / [] on numeric fields are caught)
 *  - Text columns get `string | null`
 *  - Unknown columns are left as-is (sanitizeSubstancePayload handles them)
 *
 * Also logs a warning when a numeric field receives a non-number.
 */
export function sanitizeSubstanceValues<T extends Record<string, unknown>>(
  payload: T,
): T {
  const out: Record<string, unknown> = { ...payload };

  for (const [key, val] of Object.entries(out)) {
    // ── Numeric columns ──
    if (NUMERIC_COLUMNS.has(key)) {
      const coerced = toNullableNumber(val);
      // Log a warning when a meaningful (non-null, non-empty) value could not be
      // converted — empty strings are expected "no value" and do not warrant a log.
      if (val != null && val !== "" && coerced === null) {
        console.warn(
          `[sanitizeSubstanceValues] Numeric field "${key}" received non-number: typeof=${typeof val}, sample=${JSON.stringify(val).slice(0, 80)}`,
        );
      }
      out[key] = coerced;
      continue;
    }

    // ── Text array columns ──
    if (TEXT_ARRAY_COLUMNS.has(key)) {
      out[key] = toTextArray(val);
      continue;
    }

    // ── JSONB columns — keep as-is (Postgres accepts any jsonb) ──
    if (JSONB_COLUMNS.has(key)) {
      continue;
    }

    // ── Text columns — convert junk to null ──
    if (TEXT_COLUMNS.has(key)) {
      if (isJunkValue(val)) {
        out[key] = null;
      } else if (typeof val === "object" && val !== null) {
        // An object in a text column is always wrong
        console.warn(
          `[sanitizeSubstanceValues] Text field "${key}" received object: typeof=${typeof val}, sample=${JSON.stringify(val).slice(0, 80)}`,
        );
        out[key] = null;
      }
      continue;
    }

    // Unknown columns: apply a generic safety check –
    // if the column is not in any known set, ensure we don't send {}
    // to what might be a numeric column we didn't catalogue.
    if (isJunkValue(val)) {
      out[key] = null;
    }
  }

  return out as T;
}
