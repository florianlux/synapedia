/**
 * Shared slugify helper.
 *
 * Rules:
 * - lowercase, trim
 * - German umlauts: ä→ae, ö→oe, ü→ue, ß→ss
 * - spaces / underscores → hyphen
 * - strip everything except a-z, 0-9, hyphen
 * - collapse consecutive hyphens, trim leading/trailing hyphens
 */
export function slugify(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .replace(/[\s_]+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-{2,}/g, "-")
    .replace(/^-+|-+$/g, "");
}
