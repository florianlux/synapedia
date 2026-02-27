import {
  fallbackGroups,
  classToGroupSlug,
  type SubstanceGroup,
} from "@/lib/fallbackGroups";
import substances from "@/../data/substances.json";

// Re-export the interface for convenience
export type { SubstanceGroup };

/**
 * Simple substance shape from data/substances.json used on group pages.
 */
export interface SubstanceListItem {
  id: string;
  slug: string;
  title: string;
  class_primary: string;
  risk_level: string;
  summary: string;
  tags: string[];
}

/**
 * A group with the count of substances it contains.
 */
export interface SubstanceGroupWithCount extends SubstanceGroup {
  substance_count: number;
}

// ---------------------------------------------------------------------------
// Helpers – derive groups & substance lists from the static JSON fallback
// ---------------------------------------------------------------------------

function getGroupsWithCounts(): SubstanceGroupWithCount[] {
  const subs = substances as SubstanceListItem[];

  return fallbackGroups.map((group) => {
    const count = subs.filter(
      (s) => classToGroupSlug(s.class_primary) === group.slug
    ).length;
    return { ...group, substance_count: count };
  });
}

function getGroupBySlug(slug: string): SubstanceGroup | undefined {
  return fallbackGroups.find((g) => g.slug === slug);
}

function getSubstancesForGroup(groupSlug: string): SubstanceListItem[] {
  const subs = substances as SubstanceListItem[];
  return subs
    .filter((s) => classToGroupSlug(s.class_primary) === groupSlug)
    .sort((a, b) => a.title.localeCompare(b.title, "de"));
}

// ---------------------------------------------------------------------------
// Public API – currently uses static fallback; can be extended with Supabase
// ---------------------------------------------------------------------------

/** Fetch all groups ordered by sort_order, name. */
export async function fetchGroups(): Promise<SubstanceGroupWithCount[]> {
  // In the future this can try Supabase first and fall back to static data.
  return getGroupsWithCounts().sort(
    (a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name, "de")
  );
}

/** Fetch a single group by its slug. Returns undefined if not found. */
export async function fetchGroupBySlug(
  slug: string
): Promise<SubstanceGroup | undefined> {
  return getGroupBySlug(slug);
}

/** Fetch substances belonging to a group (by group slug). */
export async function fetchSubstancesByGroup(
  groupSlug: string
): Promise<SubstanceListItem[]> {
  return getSubstancesForGroup(groupSlug);
}
