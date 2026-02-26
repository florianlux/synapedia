import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { compileMDX } from "next-mdx-remote/rsc";
import { Badge } from "@/components/ui/badge";
import { RiskBanner } from "@/components/risk-banner";
import { SourceBox } from "@/components/source-box";
import { TableOfContents, type TocHeading } from "@/components/table-of-contents";
import { JsonLd } from "@/components/json-ld";
import {
  demoArticles,
  demoTags,
  demoArticleTags,
  demoSources,
} from "@/lib/demo-data";
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
  const article = demoArticles.find((a) => a.slug === slug);
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
  const article = demoArticles.find((a) => a.slug === slug);
  if (!article) notFound();

  const headings = extractHeadings(article.content_mdx);
  const tagIds = demoArticleTags[article.id] ?? [];
  const tags = demoTags.filter((t) => tagIds.includes(t.id));
  const sources = demoSources[article.id] ?? [];

  const { content } = await compileMDX({
    source: article.content_mdx,
    components: mdxComponents,
  });

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
          {content}
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
    </div>
  );
}
