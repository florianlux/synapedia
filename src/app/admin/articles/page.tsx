"use client";

import { useState, useEffect } from "react";
import { allArticles } from "@/lib/articles";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/select";
import { Plus, Search, Sparkles, RefreshCw } from "lucide-react";
import Link from "next/link";
import type { Article, ArticleStatus } from "@/lib/types";

export default function AdminArticles() {
  const [articles, setArticles] = useState<Article[]>(allArticles);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<ArticleStatus | "">("");
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [generatingSlug, setGeneratingSlug] = useState<string | null>(null);
  const [generateMsg, setGenerateMsg] = useState("");

  useEffect(() => {
    // Try loading from DB, fallback to demo
    import("@/lib/db/articles")
      .then(({ getArticles }) => getArticles())
      .then(setArticles)
      .catch(() => setArticles(allArticles))
      .finally(() => setLoading(false));
  }, []);

  async function handleBulkGenerate() {
    setGenerating(true);
    setGenerateMsg("");
    try {
      const res = await fetch("/api/admin/generate-content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "substance", bulk: true }),
      });
      const data = await res.json();
      if (res.ok) {
        setGenerateMsg(`✅ ${data.generated} Artikel-Inhalte generiert.`);
      } else {
        setGenerateMsg(`❌ Fehler: ${data.error}`);
      }
    } catch {
      setGenerateMsg("❌ Netzwerkfehler beim Generieren.");
    } finally {
      setGenerating(false);
    }
  }

  async function handleGenerateSingle(slug: string) {
    setGeneratingSlug(slug);
    setGenerateMsg("");
    try {
      const res = await fetch("/api/admin/generate-content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "article", slug }),
      });
      const data = await res.json();
      if (res.ok) {
        setGenerateMsg(`✅ Inhalt für „${data.title}" generiert.`);
      } else {
        setGenerateMsg(`❌ Fehler: ${data.error}`);
      }
    } catch {
      setGenerateMsg("❌ Netzwerkfehler beim Generieren.");
    } finally {
      setGeneratingSlug(null);
    }
  }

  const filtered = articles.filter((a) => {
    if (search && !a.title.toLowerCase().includes(search.toLowerCase()) && !a.slug.includes(search.toLowerCase())) {
      return false;
    }
    if (statusFilter && a.status !== statusFilter) return false;
    return true;
  });

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50">Artikel</h1>
          <p className="mt-1 text-neutral-500 dark:text-neutral-400">Alle Artikel verwalten und bearbeiten.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleBulkGenerate} disabled={generating}>
            <Sparkles className="mr-2 h-4 w-4" />
            {generating ? "Generiere…" : "Fehlende Inhalte generieren"}
          </Button>
          <Link href="/admin/articles/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Neuer Artikel
            </Button>
          </Link>
        </div>
      </div>

      {/* Generation status */}
      {generateMsg && (
        <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3 text-sm dark:border-neutral-800 dark:bg-neutral-900">
          {generateMsg}
        </div>
      )}

      {/* Search & Filter */}
      <div className="flex flex-wrap gap-3">
        <div className="relative min-w-[200px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
          <Input
            placeholder="Artikel suchen…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <NativeSelect
          value={statusFilter}
          onValueChange={(v) => setStatusFilter(v as ArticleStatus | "")}
          className="w-40"
        >
          <option value="">Alle Status</option>
          <option value="draft">Entwurf</option>
          <option value="review">In Review</option>
          <option value="published">Veröffentlicht</option>
        </NativeSelect>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            {loading ? "Laden…" : `${filtered.length} Artikel`}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-200 text-left dark:border-neutral-800">
                  <th className="pb-3 pr-4 font-medium text-neutral-500 dark:text-neutral-400">Titel</th>
                  <th className="pb-3 pr-4 font-medium text-neutral-500 dark:text-neutral-400">Status</th>
                  <th className="pb-3 pr-4 font-medium text-neutral-500 dark:text-neutral-400">Risiko</th>
                  <th className="pb-3 pr-4 font-medium text-neutral-500 dark:text-neutral-400">Kategorie</th>
                  <th className="pb-3 pr-4 font-medium text-neutral-500 dark:text-neutral-400">Inhalt</th>
                  <th className="pb-3 font-medium text-neutral-500 dark:text-neutral-400">Aktualisiert</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((article) => (
                  <tr
                    key={article.id}
                    className="border-b border-neutral-100 dark:border-neutral-800/50"
                  >
                    <td className="py-3 pr-4">
                      <Link
                        href={`/admin/articles/${article.id}`}
                        className="font-medium text-neutral-900 hover:text-cyan-500 dark:text-neutral-50"
                      >
                        {article.title}
                      </Link>
                      {article.subtitle && (
                        <p className="text-xs text-neutral-500 dark:text-neutral-400">{article.subtitle}</p>
                      )}
                    </td>
                    <td className="py-3 pr-4">
                      <Badge variant="secondary">{article.status}</Badge>
                    </td>
                    <td className="py-3 pr-4">
                      <Badge variant={article.risk_level}>{article.risk_level}</Badge>
                    </td>
                    <td className="py-3 pr-4 text-neutral-600 dark:text-neutral-400">
                      {article.category ?? "–"}
                    </td>
                    <td className="py-3 pr-4">
                      {article.content_mdx && article.content_mdx.trim().length > 0 ? (
                        <Badge variant="default" className="text-xs">Vollständig</Badge>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <Badge variant="secondary" className="text-xs">Fehlt</Badge>
                          <button
                            onClick={() => handleGenerateSingle(article.slug)}
                            disabled={generatingSlug === article.slug}
                            className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs text-cyan-600 hover:bg-cyan-50 dark:text-cyan-400 dark:hover:bg-cyan-950 disabled:opacity-50"
                            title="Inhalt generieren"
                          >
                            {generatingSlug === article.slug ? (
                              <RefreshCw className="h-3 w-3 animate-spin" />
                            ) : (
                              <Sparkles className="h-3 w-3" />
                            )}
                          </button>
                        </div>
                      )}
                    </td>
                    <td className="py-3 text-neutral-600 dark:text-neutral-400">
                      {new Date(article.updated_at).toLocaleDateString("de-DE")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
