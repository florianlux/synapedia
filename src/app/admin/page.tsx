import { allArticles } from "@/lib/articles";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { isAiEnabled } from "@/lib/ai/provider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, Eye, PenLine, Clock, Brain, Sparkles, GitBranch, AlertTriangle, KeyRound, Activity } from "lucide-react";
import Link from "next/link";
import type { Article } from "@/lib/types";

async function getArticlesData(): Promise<Article[]> {
  if (isSupabaseConfigured()) {
    try {
      const { getArticles } = await import("@/lib/db/articles");
      return await getArticles();
    } catch {
      // Fallback to demo
    }
  }
  return allArticles;
}

export default async function AdminDashboard() {
  const articles = await getArticlesData();
  const aiEnabled = isAiEnabled();
  const supabaseConfigured = isSupabaseConfigured();

  const total = articles.length;
  const published = articles.filter((a) => a.status === "published").length;
  const drafts = articles.filter((a) => a.status === "draft").length;
  const review = articles.filter((a) => a.status === "review").length;

  // Compute completeness: articles with content_mdx > 200 chars considered "complete"
  const complete = articles.filter((a) => a.content_mdx && a.content_mdx.length > 200).length;
  const incomplete = total - complete;

  // Group by category for brain map
  const categoryMap = new Map<string, Article[]>();
  for (const a of articles) {
    const cat = a.category ?? "Unkategorisiert";
    if (!categoryMap.has(cat)) categoryMap.set(cat, []);
    categoryMap.get(cat)!.push(a);
  }

  const stats = [
    { label: "Artikel gesamt", value: total, icon: FileText, color: "text-cyan-500" },
    { label: "Veröffentlicht", value: published, icon: Eye, color: "text-green-500" },
    { label: "Entwürfe", value: drafts, icon: PenLine, color: "text-yellow-500" },
    { label: "In Review", value: review, icon: Clock, color: "text-violet-500" },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50">
          Content Studio
        </h1>
        <p className="mt-1 text-neutral-500 dark:text-neutral-400">
          Produktions-Cockpit – Übersicht aller Inhalte und Aktivitäten.
        </p>
      </div>

      {/* Status badges */}
      <div className="flex flex-wrap gap-2">
        <Badge variant={supabaseConfigured ? "default" : "secondary"}>
          {supabaseConfigured ? "Supabase verbunden" : "Demo-Modus"}
        </Badge>
        <Badge variant={aiEnabled ? "default" : "secondary"}>
          <Sparkles className="mr-1 h-3 w-3" />
          {aiEnabled ? "AI aktiv" : "AI deaktiviert"}
        </Badge>
      </div>

      {/* Stats grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-neutral-500 dark:text-neutral-400">
                {stat.label}
              </CardTitle>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-neutral-900 dark:text-neutral-50">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Content Coverage Brain Map */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-violet-500" />
            Content Coverage Map
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from(categoryMap.entries()).map(([cat, catArticles]) => (
              <div
                key={cat}
                className="rounded-lg border border-neutral-200 p-4 dark:border-neutral-800"
              >
                <h3 className="mb-2 font-medium text-neutral-900 dark:text-neutral-50">{cat}</h3>
                <div className="flex flex-wrap gap-1.5">
                  {catArticles.map((a) => {
                    const color =
                      a.status === "published"
                        ? "bg-green-500"
                        : a.status === "review"
                        ? "bg-violet-500"
                        : "bg-yellow-500";
                    return (
                      <Link
                        key={a.id}
                        href={`/articles/${a.slug}`}
                        title={`${a.title} (${a.status})`}
                        className={`flex h-8 w-8 items-center justify-center rounded-full ${color} text-[10px] font-bold text-white transition-opacity hover:opacity-100`}
                      >
                        {a.title.substring(0, 2)}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Widgets row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <AlertTriangle className="h-4 w-4 text-yellow-500" />
              Nächste Aufgaben
            </CardTitle>
          </CardHeader>
          <CardContent>
            {incomplete > 0 ? (
              <div className="space-y-2">
                <p className="text-sm text-neutral-600 dark:text-neutral-400">
                  <span className="font-bold text-yellow-500">{incomplete}</span> Artikel brauchen mehr Inhalt
                </p>
                <Link
                  href="/admin/articles"
                  className="inline-block text-xs text-cyan-600 hover:underline dark:text-cyan-400"
                >
                  Fehlende Inhalte generieren →
                </Link>
              </div>
            ) : (
              <p className="text-sm text-green-500">Alle Artikel vollständig!</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Sparkles className="h-4 w-4 text-cyan-500" />
              AI Jobs
            </CardTitle>
          </CardHeader>
          <CardContent>
            {aiEnabled ? (
              <p className="text-sm text-neutral-600 dark:text-neutral-400">
                AI bereit für Autofill-Aufträge
              </p>
            ) : (
              <p className="text-sm text-neutral-500">
                Setze OPENAI_API_KEY oder ANTHROPIC_API_KEY
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <GitBranch className="h-4 w-4 text-violet-500" />
              Knowledge Graph
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              {total} Substanzen indexiert
            </p>
          </CardContent>
        </Card>

        <Link href="/admin/secrets" className="block">
          <Card className="transition-colors hover:border-cyan-300 dark:hover:border-cyan-700">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm">
                <KeyRound className="h-4 w-4 text-cyan-500" />
                Secrets Register
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-neutral-600 dark:text-neutral-400">
                Metadaten-Verwaltung für Secrets und Tokens
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/admin/dev-activity" className="block">
          <Card className="transition-colors hover:border-violet-300 dark:hover:border-violet-700">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Activity className="h-4 w-4 text-violet-500" />
                Dev Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-neutral-600 dark:text-neutral-400">
                GitHub PRs, Commits und Workflows
              </p>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Recent articles */}
      <Card>
        <CardHeader>
          <CardTitle>Letzte Artikel</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {articles.slice(0, 10).map((article) => (
              <div
                key={article.id}
                className="flex items-center justify-between rounded-lg border border-neutral-200 p-4 dark:border-neutral-800"
              >
                <div>
                  <Link
                    href={`/articles/${article.slug}`}
                    className="font-medium text-neutral-900 hover:text-cyan-500 dark:text-neutral-50"
                  >
                    {article.title}
                  </Link>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">{article.subtitle}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={article.risk_level}>{article.risk_level}</Badge>
                  <Badge variant="secondary">{article.status}</Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
