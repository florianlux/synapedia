/**
 * Entity Dictionary – maps entity names + synonyms → entity metadata.
 *
 * Features:
 * - In-memory LRU-style cache (per server instance, TTL-based)
 * - Builds a map of lowercase name/synonym → EntityDictionaryEntry
 * - Used by the contextual linking engine to detect entity mentions
 */

import type { EntityDictionaryEntry } from "./types";

// ---------------------------------------------------------------------------
// Cache management
// ---------------------------------------------------------------------------

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

interface DictionaryCache {
  entries: Map<string, EntityDictionaryEntry>;
  builtAt: number;
}

let _cache: DictionaryCache | null = null;

/** Clear the in-memory entity dictionary cache (useful for tests & admin refresh). */
export function clearEntityDictionaryCache(): void {
  _cache = null;
}

// ---------------------------------------------------------------------------
// Build dictionary from raw entity list
// ---------------------------------------------------------------------------

/**
 * Build a dictionary mapping lowercase name/synonyms to entity entries.
 * Longer names are given priority so "MDMA-unterstützte Therapie" matches
 * before "MDMA" when the linking engine scans text.
 */
export function buildEntityDictionary(
  entities: EntityDictionaryEntry[],
): Map<string, EntityDictionaryEntry> {
  const dict = new Map<string, EntityDictionaryEntry>();

  // Sort entities so that longer names are inserted last → they win in map
  // (but we actually want longest-match-first during *scanning*, so the map
  //  just serves as a fast lookup; ordering is handled by the linking engine)
  for (const entity of entities) {
    const keys = [entity.name, ...entity.slug ? [entity.slug] : []];

    // Add synonyms
    for (const syn of (entity as EntityDictionaryEntry & { synonyms?: string[] }).synonyms ?? []) {
      if (syn.trim()) keys.push(syn.trim());
    }

    for (const key of keys) {
      const lower = key.toLowerCase();
      // Don't overwrite an entry with a higher evidence score
      const existing = dict.get(lower);
      if (!existing || entity.evidence_score > existing.evidence_score) {
        dict.set(lower, entity);
      }
    }
  }

  return dict;
}

// ---------------------------------------------------------------------------
// Get / refresh the cached dictionary
// ---------------------------------------------------------------------------

/**
 * Get the entity dictionary. If a `loader` is provided AND the cache is
 * stale or empty, the loader is invoked to fetch fresh entities (e.g. from
 * Supabase). If no loader is given, an empty dictionary is returned on miss.
 */
export async function getEntityDictionary(
  loader?: () => Promise<(EntityDictionaryEntry & { synonyms?: string[] })[]>,
): Promise<Map<string, EntityDictionaryEntry>> {
  const now = Date.now();

  if (_cache && now - _cache.builtAt < CACHE_TTL_MS) {
    return _cache.entries;
  }

  if (!loader) {
    return _cache?.entries ?? new Map();
  }

  const entities = await loader();
  const dict = buildEntityDictionary(entities);
  _cache = { entries: dict, builtAt: now };
  return dict;
}
