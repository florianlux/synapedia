import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ArrowRight, AlertTriangle } from "lucide-react";
import { compileMDX } from "next-mdx-remote/rsc";
import { Badge } from "@/components/ui/badge";
import { RiskBanner } from "@/components/risk-banner";
import { SourceBox } from "@/components/source-box";
import { TableOfContents, type TocHeading } from "@/components/table-of-contents";
import { JsonLd } from "@/components/json-ld";
import {
  getAllArticlesAsync,
  demoTags,
  allArticleTags,
  allSources,
  getArticleBySlugWithFallback,
} from "@/lib/articles";
import { riskLabels, evidenceLabels } from "@/lib/types";
import { SubstancePharmacologySection } from "@/components/substance-pharmacology";
import { getSeoDocument } from "@/lib/db/seo";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[äöüß]/g, (c) =>
      c === "ä" ? "ae" : c === "ö" ? "oe" : c === "ü" ? "ue" : "ss"
    )
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function extractHeadings(mdx: string): TocHeading[] {
  const headingRegex = /^(#{2,3})\s+(.+)$/gm;
  const headings: TocHeading[] = [];
  let match;
  while ((match = headingRegex.exec(mdx)) !== null) {
    headings.push({
      id: slugify(match[2]),
      text: match[2],
      level: match[1].length,
    });
  }
  return headings;
}

function extractText(node: React.ReactNode): string {
  if (typeof node === "string") return node;
  if (typeof node === "number") return String(node);
  if (!node) return "";
  if (Array.isArray(node)) return node.map(extractText).join("");
  if (typeof node === "object" && "props" in node) {
    return extractText((node as React.ReactElement<{ children?: React.ReactNode }>).props.children);
  }
  return "";
}

// Custom MDX components that add IDs to headings for TOC linking
function createHeadingComponent(level: 2 | 3) {
  const Tag = `h${level}` as const;
  return function HeadingComponent({ children }: { children?: React.ReactNode }) {
    const text = extractText(children);
    const id = slugify(text);
    return <Tag id={id}>{children}</Tag>;
  };
}

const mdxComponents = {
  h2: createHeadingComponent(2),
  h3: createHeadingComponent(3),
};

const BASE_URL = "https://synapedia.com";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const article = await getArticleBySlugWithFallback(slug);
  if (!article) return {};

  // Try to load SEO override from seo_documents
  const seo = await getSeoDocument(slug, "article");

  const title = seo?.title ?? `${article.title} – Synapedia`;
  const description = seo?.description ?? article.summary;
  const canonical = seo?.canonical_url ?? `${BASE_URL}/articles/${slug}`;

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title: seo?.og_title ?? title,
      description: seo?.og_description ?? description,
      url: canonical,
      type: "article",
      siteName: "Synapedia",
      locale: "de_DE",
      ...(seo?.og_image_url ? { images: [{ url: seo.og_image_url }] } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title: seo?.og_title ?? title,
      description: seo?.og_description ?? description,
    },
    robots: seo?.robots ?? "index, follow",
    ...(seo?.keywords ? { keywords: seo.keywords } : {}),
  };
}

export default async function ArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const allArticlesResolved = await getAllArticlesAsync();
  const publishedArticles = allArticlesResolved.filter((a) => a.status === "published");
  const article = await getArticleBySlugWithFallback(slug);
  if (!article) notFound();

  const hasContent = !!(article.content_mdx && article.content_mdx.trim().length > 0);
  const headings = hasContent ? extractHeadings(article.content_mdx) : [];
  const tagIds = allArticleTags[article.id] ?? [];
  const tags = demoTags.filter((t) => tagIds.includes(t.id));
  const sources = allSources[article.id] ?? [];

  // Determine next/previous articles for navigation (only articles with content)
  const currentIndex = publishedArticles.findIndex((a) => a.slug === slug);
  const prevArticle = currentIndex > 0 ? publishedArticles[currentIndex - 1] : null;
  const nextArticle = currentIndex < publishedArticles.length - 1 ? publishedArticles[currentIndex + 1] : null;

  let content: React.ReactNode = null;
  if (hasContent) {
    try {
      const compiled = await compileMDX({
        source: article.content_mdx,
        components: mdxComponents,
      });
      content = compiled.content;
    } catch {
      // MDX compilation failed — treat as missing content
      content = null;
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      {/* Article JSON-LD */}
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Article",
          headline: article.title,
          description: article.summary,
          url: `${BASE_URL}/articles/${slug}`,
          inLanguage: "de",
          publisher: {
            "@type": "Organization",
            name: "Synapedia",
            url: BASE_URL,
          },
          datePublished: article.published_at ?? article.created_at,
          dateModified: article.updated_at,
        }}
      />
      {/* Back link */}
      <Link
        href="/articles"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-neutral-500 transition-colors hover:text-neutral-900 dark:hover:text-neutral-200"
      >
        <ArrowLeft className="h-4 w-4" />
        Zurück zur Übersicht
      </Link>

      {/* Risk Banner */}
      <div className="mb-6">
        <RiskBanner riskLevel={article.risk_level} />
      </div>

      {/* Header */}
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          {article.title}
        </h1>
        {article.subtitle && (
          <p className="mt-2 text-lg text-neutral-500 dark:text-neutral-400">
            {article.subtitle}
          </p>
        )}
        <div className="mt-4 flex flex-wrap gap-2">
          <Badge variant={article.risk_level}>
            {riskLabels[article.risk_level]}
          </Badge>
          <Badge variant="info">
            {evidenceLabels[article.evidence_strength]}
          </Badge>
          {article.category && (
            <Badge variant="outline">{article.category}</Badge>
          )}
          {tags.map((tag) => (
            <Badge key={tag.id} variant="secondary" className="text-xs">
              {tag.name}
            </Badge>
          ))}
        </div>
      </header>

      {/* Content with TOC sidebar */}
      <div className="flex gap-10">
        {/* Sticky TOC (desktop) */}
        <aside className="hidden w-64 shrink-0 lg:block">
          <div className="sticky top-24">
            <TableOfContents headings={headings} />
          </div>
        </aside>

        {/* Article content */}
        <article className="mdx-content min-w-0 flex-1">
          {content ? (
            content
          ) : (
            <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-6 dark:border-yellow-900 dark:bg-yellow-950">
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-yellow-600 dark:text-yellow-400" />
                <div>
                  <h2 className="text-lg font-semibold text-yellow-800 dark:text-yellow-200">
                    Inhalt noch nicht verfügbar
                  </h2>
                  <p className="mt-1 text-sm text-yellow-700 dark:text-yellow-300">
                    Der Artikelinhalt für <strong>{article.title}</strong> wurde noch nicht generiert.
                    Administratoren können den Inhalt über das Admin-Panel erstellen.
                  </p>
                </div>
              </div>
            </div>
          )}
          <SourceBox sources={sources} />
        </article>
      </div>

      {/* Pharmacology modules (only rendered when substance_id is set and Supabase is available) */}
      {article.substance_id && (
        <SubstancePharmacologySection
          substanceId={article.substance_id}
          substanceName={article.title}
        />
      )}

      {/* Next / Previous article navigation */}
      {(prevArticle || nextArticle) && (
        <nav className="mt-12 flex items-stretch gap-4 border-t border-neutral-200 pt-8 dark:border-neutral-800">
          {prevArticle ? (
            <Link
              href={`/articles/${prevArticle.slug}`}
              className="flex flex-1 items-center gap-2 rounded-lg border border-neutral-200 p-4 transition-colors hover:bg-neutral-50 dark:border-neutral-800 dark:hover:bg-neutral-900"
            >
              <ArrowLeft className="h-4 w-4 shrink-0 text-neutral-400" />
              <div className="min-w-0">
                <p className="text-xs text-neutral-500">Vorheriger Artikel</p>
                <p className="truncate font-medium">{prevArticle.title}</p>
              </div>
            </Link>
          ) : (
            <div className="flex-1" />
          )}
          {nextArticle ? (
            <Link
              href={`/articles/${nextArticle.slug}`}
              className="flex flex-1 items-center justify-end gap-2 rounded-lg border border-neutral-200 p-4 text-right transition-colors hover:bg-neutral-50 dark:border-neutral-800 dark:hover:bg-neutral-900"
            >
              <div className="min-w-0">
                <p className="text-xs text-neutral-500">Nächster Artikel</p>
                <p className="truncate font-medium">{nextArticle.title}</p>
              </div>
              <ArrowRight className="h-4 w-4 shrink-0 text-neutral-400" />
            </Link>
          ) : (
            <div className="flex-1" />
          )}
        </nav>
      )}
    </div>
  );
}
