import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import substancesJson from "@/../data/substances.json";
import {
  generateSubstanceContentMdx,
  type SubstanceData,
} from "@/lib/generator/substance-content";
import { generateArticleContentMdx } from "@/lib/generator/article-content";
import { getAllArticlesAsync } from "@/lib/articles";

const substances = substancesJson as SubstanceData[];

/**
 * POST /api/admin/generate-content
 *
 * Generates deterministic scientific MDX content for a single substance/article
 * or for all that lack content.
 *
 * Body:
 *   { type: "substance", slug: string }    – generate for one substance
 *   { type: "substance", bulk: true }       – generate for all substances
 *   { type: "article", slug: string }       – generate for one article
 *   { type: "article", bulk: true }         – generate for all articles with missing content
 */
export async function POST(request: NextRequest) {
  const authenticated = await isAdminAuthenticated(request);
  if (!authenticated) {
    return NextResponse.json(
      { error: "Nicht autorisiert." },
      { status: 401 }
    );
  }

  let body: { type?: string; slug?: string; bulk?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Ungültiger Request-Body." },
      { status: 400 }
    );
  }

  const { type, slug, bulk } = body;

  if (type !== "substance" && type !== "article") {
    return NextResponse.json(
      { error: "type muss 'substance' oder 'article' sein." },
      { status: 400 }
    );
  }

  // --- Article content generation ---
  if (type === "article") {
    const allArticles = await getAllArticlesAsync();
    if (bulk) {
      const articlesWithMissingContent = allArticles.filter(
        (a) => !a.content_mdx || a.content_mdx.trim().length === 0
      );

      const results = articlesWithMissingContent.map((a) => ({
        slug: a.slug,
        title: a.title,
        content_mdx: generateArticleContentMdx(a),
      }));

      for (const r of results) {
        revalidatePath(`/articles/${r.slug}`);
      }
      revalidatePath("/articles");

      return NextResponse.json({
        success: true,
        generated: results.length,
        slugs: results.map((r) => r.slug),
      });
    }

    if (!slug) {
      return NextResponse.json(
        { error: "slug ist erforderlich (oder bulk: true setzen)." },
        { status: 400 }
      );
    }

    const article = allArticles.find((a) => a.slug === slug);
    if (!article) {
      return NextResponse.json(
        { error: `Artikel mit slug '${slug}' nicht gefunden.` },
        { status: 404 }
      );
    }

    const contentMdx = generateArticleContentMdx(article);
    revalidatePath(`/articles/${slug}`);

    return NextResponse.json({
      success: true,
      slug: article.slug,
      title: article.title,
      content_mdx: contentMdx,
    });
  }

  // --- Substance content generation ---
  if (bulk) {
    const results = substances.map((s) => ({
      slug: s.slug,
      title: s.title,
      content_mdx: generateSubstanceContentMdx(s),
    }));

    // Revalidate all article routes
    for (const r of results) {
      revalidatePath(`/articles/${r.slug}`);
    }
    revalidatePath("/articles");

    return NextResponse.json({
      success: true,
      generated: results.length,
      slugs: results.map((r) => r.slug),
    });
  }

  if (!slug) {
    return NextResponse.json(
      { error: "slug ist erforderlich (oder bulk: true setzen)." },
      { status: 400 }
    );
  }

  const substance = substances.find((s) => s.slug === slug);
  if (!substance) {
    return NextResponse.json(
      { error: `Substanz mit slug '${slug}' nicht gefunden.` },
      { status: 404 }
    );
  }

  const contentMdx = generateSubstanceContentMdx(substance);

  revalidatePath(`/articles/${slug}`);

  return NextResponse.json({
    success: true,
    slug: substance.slug,
    title: substance.title,
    content_mdx: contentMdx,
  });
}
