/**
 * Slugify helper for the masterlist pipeline.
 *
 * Rules:
 *  - ä→ae, ö→oe, ü→ue, ß→ss (uppercase variants too)
 *  - α/Α → alpha (Greek alpha, lowercase and uppercase)
 *  - lowercase, trim
 *  - remove parenthetical content
 *  - spaces / underscores → hyphen
 *  - strip everything except a-z, 0-9, hyphen
 *  - collapse consecutive hyphens, trim leading/trailing hyphens
 */
export function slugify(title: string): string {
  return title
    .trim()
    .toLowerCase()
    .replace(/\s*\(.*?\)\s*/g, " ")
    .replace(/[äÄ]/g, "ae")
    .replace(/[öÖ]/g, "oe")
    .replace(/[üÜ]/g, "ue")
    .replace(/ß/g, "ss")
    .replace(/[αΑ]/g, "alpha")
    .replace(/[\s_]+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-{2,}/g, "-")
    .replace(/^-+|-+$/g, "");
}
