/**
 * Slugify helper for the masterlist pipeline.
 *
 * Rules:
 *  - ä→ae, ö→oe, ü→ue, ß→ss
 *  - α/Α → alpha
 *  - lowercase, trim
 *  - remove parenthetical content
 *  - normalize unicode (strip diacritics)
 *  - spaces / underscores → hyphen
 *  - strip everything except a-z, 0-9, hyphen
 *  - collapse consecutive hyphens
 *  - trim leading/trailing hyphens
 */

export function slugify(input: string): string {
  if (!input || typeof input !== "string") return "";

  const slug = input
    .trim()
    .normalize("NFKD") // normalize accents
    .replace(/\s*\(.*?\)\s*/g, " ")
    .replace(/[äÄ]/g, "ae")
    .replace(/[öÖ]/g, "oe")
    .replace(/[üÜ]/g, "ue")
    .replace(/ß/g, "ss")
    .replace(/[αΑ]/g, "alpha")
    .toLowerCase()
    .replace(/[\s_]+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-{2,}/g, "-")
    .replace(/^-+|-+$/g, "");

  return slug || "unknown";
}