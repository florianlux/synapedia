/**
 * Slugify helper for the masterlist pipeline.
 *
 * Rules:
 *  - ä→ae, ö→oe, ü→ue, ß→ss, α→alpha (uppercase variants too)
 *  - lowercase, trim
 *  - spaces / underscores → hyphen
 *  - strip everything except a-z, 0-9, hyphen
 *  - collapse consecutive hyphens, trim leading/trailing hyphens
 *  - keep digits and letters
 */
export function slugify(title: string): string {
  return title
    .trim()
    .toLowerCase()
    .replace(/[äÄ]/g, "ae")
    .replace(/[öÖ]/g, "oe")
    .replace(/[üÜ]/g, "ue")
    .replace(/ß/g, "ss")
    .replace(/α/g, "alpha")
    .replace(/[\s_]+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-{2,}/g, "-")
    .replace(/^-+|-+$/g, "");
}
