import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { compileMDX } from "next-mdx-remote/rsc";
import { Badge } from "@/components/ui/badge";
import { RiskBanner } from "@/components/risk-banner";
import { SourceBox } from "@/components/source-box";
import { TableOfContents, type TocHeading } from "@/components/table-of-contents";
import {
  demoArticles,
  demoTags,
  demoArticleTags,
  demoSources,
} from "@/lib/demo-data";
import type { EvidenceStrength } from "@/lib/types";

const evidenceLabels: Record<EvidenceStrength, string> = {
  weak: "Schwache Evidenz",
  moderate: "Moderate Evidenz",
  strong: "Starke Evidenz",
};

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

// Custom MDX components that add IDs to headings for TOC linking
function createHeadingComponent(level: 2 | 3) {
  const Tag = `h${level}` as const;
  return function HeadingComponent({ children }: { children?: React.ReactNode }) {
    const text = typeof children === "string" ? children : String(children ?? "");
    const id = slugify(text);
    return <Tag id={id}>{children}</Tag>;
  };
}

const mdxComponents = {
  h2: createHeadingComponent(2),
  h3: createHeadingComponent(3),
};

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
      {/* Back link */}
      <Link
        href="/"
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
            {article.risk_level === "low"
              ? "Niedriges Risiko"
              : article.risk_level === "moderate"
                ? "Moderates Risiko"
                : "Hohes Risiko"}
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
    </div>
  );
}
