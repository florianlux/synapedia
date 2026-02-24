/**
 * Server-only helpers for runtime DB column discovery.
 *
 * This module imports from @/lib/supabase/server (which uses next/headers)
 * and must only be imported from server components / API routes.
 */

import { createClient } from "@/lib/supabase/server";
import { STATIC_SUBSTANCES_COLUMNS } from "./sanitize";

/* ---------- Runtime column cache (10 min TTL) ---------- */

let cachedColumns: Set<string> | null = null;
let cacheTimestamp = 0;
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

/**
 * Fetch the actual column names of public.substances from
 * information_schema.columns. Returns null on failure so callers
 * can fall back to the static list.
 */
async function fetchSubstancesColumns(): Promise<Set<string> | null> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("information_schema.columns" as string)
      .select("column_name")
      .eq("table_schema", "public")
      .eq("table_name", "substances");

    if (error || !data) return null;

    return new Set(
      (data as { column_name: string }[]).map((r) => r.column_name),
    );
  } catch {
    return null;
  }
}

/**
 * Return the set of allowed column names.
 *
 * Tries the runtime cache first, falls back to the static allowlist.
 * The result is cached server-side for 10 minutes.
 */
export async function getAllowedColumns(): Promise<ReadonlySet<string>> {
  const now = Date.now();
  if (cachedColumns && now - cacheTimestamp < CACHE_TTL_MS) {
    return cachedColumns;
  }

  const live = await fetchSubstancesColumns();
  if (live && live.size > 0) {
    cachedColumns = live;
    cacheTimestamp = now;
    return live;
  }

  // Fallback – use static list
  return STATIC_SUBSTANCES_COLUMNS;
}
