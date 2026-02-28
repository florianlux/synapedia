/**
 * Unified article data source.
 *
 * Merges the curated demo articles with auto-generated articles for every
 * substance in data/substances.json that does not already have a hand-written
 * demo article.  This ensures that every substance linked from the groups
 * page has renderable content when visiting /articles/[slug].
 */

import type { Article } from "@/lib/types";
import {
  demoArticles,
  demoTags,
  demoArticleTags,
  demoSources,
} from "@/lib/demo-data";
import type { Source } from "@/lib/types";
import substancesJson from "@/../data/substances.json";
import {
  generateSubstanceContentMdx,
  type SubstanceData,
} from "@/lib/generator/substance-content";
import { isSupabaseConfigured } from "@/lib/supabase/config";

// Re-export demo helpers for consumers that still need them directly
export { demoTags, demoArticleTags, demoSources };

const substances = substancesJson as SubstanceData[];

/**
 * Build a deterministic demo article from a substances.json entry.
 */
function substanceToArticle(s: SubstanceData, index: number): Article {
  return {
    id: `generated-${index}`,
    slug: s.slug,
    title: s.title,
    subtitle: s.class_secondary.length > 0
      ? s.class_secondary.join(", ")
      : s.class_primary,
    summary: s.summary,
    content_mdx: generateSubstanceContentMdx(s),
    status: "published",
    risk_level: (s.risk_level as Article["risk_level"]) ?? "unknown",
    evidence_strength: "moderate",
    category: s.class_primary,
    receptor: s.receptors.length > 0 ? s.receptors.join(", ") : null,
    legal_status: null,
    substance_id: null,
    created_at: "2025-01-01T00:00:00Z",
    updated_at: "2025-01-01T00:00:00Z",
    published_at: "2025-01-01T00:00:00Z",
  };
}

/** Set of slugs that already have a curated demo article. */
const demoSlugs = new Set(demoArticles.map((a) => a.slug));

/** Generated articles for substances that lack a curated article. */
const generatedArticles: Article[] = substances
  .filter((s) => !demoSlugs.has(s.slug))
  .map((s, i) => substanceToArticle(s, i));

/**
 * Complete list of all articles — curated demo articles first, then
 * auto-generated ones.
 */
export const allArticles: Article[] = [...demoArticles, ...generatedArticles];

/**
 * Extended sources map — includes generated sources keyed by article id.
 */
export const allSources: Record<string, Source[]> = { ...demoSources };

for (const article of generatedArticles) {
  const substance = substances.find((s) => s.slug === article.slug);
  if (substance && substance.sources.length > 0) {
    allSources[article.id] = substance.sources.map((src, i) => ({
      id: `${article.id}-s${i}`,
      title: src.label,
      authors: null,
      journal: null,
      year: null,
      doi: null,
      url: src.url,
      source_type: "web",
    }));
  }
}

/**
 * Extended article-tags map for generated articles.
 */
export const allArticleTags: Record<string, string[]> = { ...demoArticleTags };
// Generated articles don't have curated tags, so their entries stay empty

/**
 * Fetch all articles, preferring Supabase when configured.
 *
 * In live mode the function queries `public.articles` and merges the result
 * with the static dataset so that every substance from substances.json still
 * has a renderable page even if it is not yet in the database.
 *
 * Falls back to the static `allArticles` when Supabase is unavailable.
 */
export async function getAllArticlesAsync(): Promise<Article[]> {
  if (isSupabaseConfigured()) {
    try {
      const { getArticles } = await import("@/lib/db/articles");
      const dbArticles = await getArticles();
      if (dbArticles && dbArticles.length > 0) {
        // DB articles take precedence; fill gaps with static data
        const dbSlugs = new Set(dbArticles.map((a) => a.slug));
        const missing = allArticles.filter((a) => !dbSlugs.has(a.slug));
        return [...dbArticles, ...missing];
      }
    } catch (err) {
      console.error("[getAllArticlesAsync] Supabase query failed, using static data", err);
    }
  }
  return allArticles;
}

/**
 * Retrieve a single article by slug.
 *
 * In live mode (Supabase configured) the function tries the database first
 * so that Supabase-stored articles with content_mdx are returned.
 * Falls back to the static allArticles array when Supabase is not available
 * or the article is not found in the database.
 */
export async function getArticleBySlugWithFallback(
  slug: string,
): Promise<Article | undefined> {
  // Try Supabase first when configured
  if (isSupabaseConfigured()) {
    try {
      const { getArticleBySlug } = await import("@/lib/db/articles");
      const dbArticle = await getArticleBySlug(slug);
      if (dbArticle) {
        // If the DB article has no content, try to fill from static data
        if (!dbArticle.content_mdx || dbArticle.content_mdx.trim().length === 0) {
          const staticArticle = allArticles.find((a) => a.slug === slug);
          if (staticArticle?.content_mdx) {
            return { ...dbArticle, content_mdx: staticArticle.content_mdx };
          }
        }
        return dbArticle;
      }
    } catch {
      // Supabase query failed — fall through to static data
    }
  }

  return allArticles.find((a) => a.slug === slug);
}
