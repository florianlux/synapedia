/**
 * Slug normalisation utility.
 *
 * Rules:
 *  - lowercase, trim
 *  - spaces / underscores → hyphen
 *  - German umlauts: ä→ae, ö→oe, ü→ue, ß→ss
 *  - Greek alpha: α/Α → alpha
 *  - remove parenthetical content
 *  - remove all chars outside [a-z0-9-]
 *  - collapse multiple hyphens
 *  - strip leading / trailing hyphens
 */
export function slugify(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/\s*\(.*?\)\s*/g, " ")
    .replace(/[äÄ]/g, "ae")
    .replace(/[öÖ]/g, "oe")
    .replace(/[üÜ]/g, "ue")
    .replace(/ß/g, "ss")
    .replace(/[αΑ]/g, "alpha")
    .replace(/[\s_]+/g, "-")
    .replace(/[^a-z0-9-]+/g, "")
    .replace(/-{2,}/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Alias used by legacy code. */
export { slugify as nameToSlug };
