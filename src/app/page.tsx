import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { SearchBar } from "@/components/search-bar";
import { BrandWordmark } from "@/components/BrandWordmark";
import { demoArticles, demoTags, demoArticleTags } from "@/lib/demo-data";
import { riskLabels, evidenceLabels } from "@/lib/types";
import { PublicExperienceSearch } from "@/components/admin/experience-search/PublicExperienceSearch";

const showPublicSearch =
  process.env.NEXT_PUBLIC_ENABLE_PUBLIC_EXPERIENCE_SEARCH === "true";

export default function Home() {
  const articles = demoArticles.filter((a) => a.status === "published");

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      {/* Hero */}
      <section className="brand-hero-glow mb-12 text-center">
        <BrandWordmark as="h1" className="relative z-10 text-4xl font-bold tracking-tight sm:text-5xl text-neutral-900 dark:text-neutral-50" />
        <p className="relative z-10 mt-4 text-lg text-neutral-600 dark:text-neutral-400">
          Wissenschaftliche Aufklärungsplattform für psychoaktive Substanzen
        </p>

        <div className="relative z-10 mt-8 flex justify-center">
          <SearchBar articles={articles} />
        </div>
      </section>

      {/* Disclaimer */}
      <div className="mb-10 flex items-start gap-3 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-700 dark:bg-amber-950/30 dark:text-amber-300">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
        <p>
          <strong>Hinweis:</strong> Diese Plattform dient ausschließlich der
          wissenschaftlichen Aufklärung. Die Inhalte ersetzen keine ärztliche
          Beratung und stellen keine Aufforderung zum Konsum dar. Bei
          gesundheitlichen Fragen wenden Sie sich an medizinisches Fachpersonal.
        </p>
      </div>

      {/* Public Experience Search (feature-flagged) */}
      {showPublicSearch && (
        <section className="mb-10">
          <PublicExperienceSearch />
        </section>
      )}

      {/* Article Grid */}
      <section>
        <h2 className="mb-6 text-2xl font-semibold">Substanzen</h2>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {articles.map((article) => {
            const tagIds = demoArticleTags[article.id] ?? [];
            const tags = demoTags.filter((t) => tagIds.includes(t.id));

            return (
              <Link key={article.id} href={`/articles/${article.slug}`}>
                <Card className="h-full transition-shadow hover:shadow-md">
                  <CardHeader>
                    <CardTitle className="text-xl">{article.title}</CardTitle>
                    {article.subtitle && (
                      <CardDescription>{article.subtitle}</CardDescription>
                    )}
                  </CardHeader>
                  <CardContent>
                    <p className="mb-4 text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">
                      {article.summary}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant={article.risk_level}>
                        {riskLabels[article.risk_level]}
                      </Badge>
                      <Badge variant="info">
                        {evidenceLabels[article.evidence_strength]}
                      </Badge>
                      {article.category && (
                        <Badge variant="outline">{article.category}</Badge>
                      )}
                    </div>
                  </CardContent>
                  {tags.length > 0 && (
                    <CardFooter>
                      <div className="flex flex-wrap gap-1.5">
                        {tags.map((tag) => (
                          <Badge
                            key={tag.id}
                            variant="secondary"
                            className="text-xs"
                          >
                            {tag.name}
                          </Badge>
                        ))}
                      </div>
                    </CardFooter>
                  )}
                </Card>
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}
