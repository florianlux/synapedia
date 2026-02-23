"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Search, X, Filter, ChevronDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import type { Article, Tag, RiskLevel } from "@/lib/types";
import { riskLabels, evidenceLabels } from "@/lib/types";

interface ArticleBrowserProps {
  articles: Article[];
  tags: Tag[];
  articleTags: Record<string, string[]>;
}

export function ArticleBrowser({
  articles,
  tags,
  articleTags,
}: ArticleBrowserProps) {
  const [query, setQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedReceptor, setSelectedReceptor] = useState("");
  const [selectedLegalStatus, setSelectedLegalStatus] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);

  const categories = useMemo(
    () =>
      Array.from(
        new Set(articles.map((a) => a.category).filter(Boolean))
      ).sort() as string[],
    [articles]
  );

  const receptors = useMemo(
    () =>
      Array.from(
        new Set(articles.map((a) => a.receptor).filter(Boolean))
      ).sort() as string[],
    [articles]
  );

  const legalStatuses = useMemo(
    () =>
      Array.from(
        new Set(articles.map((a) => a.legal_status).filter(Boolean))
      ).sort() as string[],
    [articles]
  );

  const filtered = useMemo(() => {
    return articles.filter((article) => {
      // Search filter
      if (query.length >= 2) {
        const q = query.toLowerCase();
        const matchesSearch =
          article.title.toLowerCase().includes(q) ||
          article.summary.toLowerCase().includes(q) ||
          (article.subtitle?.toLowerCase().includes(q) ?? false) ||
          (article.category?.toLowerCase().includes(q) ?? false);
        if (!matchesSearch) return false;
      }

      // Category filter
      if (selectedCategory && article.category !== selectedCategory)
        return false;

      // Receptor filter
      if (selectedReceptor && article.receptor !== selectedReceptor)
        return false;

      // Legal status filter
      if (selectedLegalStatus && article.legal_status !== selectedLegalStatus)
        return false;

      // Tag filter
      if (selectedTags.length > 0) {
        const aTagIds = articleTags[article.id] ?? [];
        const hasAllTags = selectedTags.every((tagId) =>
          aTagIds.includes(tagId)
        );
        if (!hasAllTags) return false;
      }

      return true;
    });
  }, [
    articles,
    query,
    selectedCategory,
    selectedReceptor,
    selectedLegalStatus,
    selectedTags,
    articleTags,
  ]);

  const hasActiveFilters =
    selectedCategory ||
    selectedReceptor ||
    selectedLegalStatus ||
    selectedTags.length > 0;

  function clearFilters() {
    setSelectedCategory("");
    setSelectedReceptor("");
    setSelectedLegalStatus("");
    setSelectedTags([]);
  }

  function toggleTag(tagId: string) {
    setSelectedTags((prev) =>
      prev.includes(tagId)
        ? prev.filter((id) => id !== tagId)
        : [...prev, tagId]
    );
  }

  function getRiskIndicatorColor(level: RiskLevel): string {
    switch (level) {
      case "low":
        return "bg-green-500";
      case "moderate":
        return "bg-yellow-500";
      case "high":
        return "bg-red-500";
      default:
        return "bg-neutral-500";
    }
  }

  return (
    <div>
      {/* Search */}
      <div className="mb-6">
        <div className="relative">
          <Search
            className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500"
            aria-hidden="true"
          />
          <Input
            type="search"
            placeholder="Artikel durchsuchen…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-10 pr-10"
            aria-label="Artikel durchsuchen"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
              aria-label="Suche löschen"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Filter toggle */}
      <div className="mb-6">
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="inline-flex items-center gap-2 rounded-lg border border-neutral-200 px-4 py-2 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
          aria-expanded={showFilters}
          aria-controls="article-filters"
        >
          <Filter className="h-4 w-4" aria-hidden="true" />
          Filter
          <ChevronDown
            className={`h-4 w-4 transition-transform ${showFilters ? "rotate-180" : ""}`}
            aria-hidden="true"
          />
          {hasActiveFilters && (
            <span className="ml-1 flex h-5 w-5 items-center justify-center rounded-full bg-cyan-500 text-xs text-white">
              {
                [selectedCategory, selectedReceptor, selectedLegalStatus].filter(
                  Boolean
                ).length + (selectedTags.length > 0 ? 1 : 0)
              }
            </span>
          )}
        </button>

        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="ml-3 text-sm text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
          >
            Filter zurücksetzen
          </button>
        )}
      </div>

      {/* Filters panel */}
      {showFilters && (
        <div
          id="article-filters"
          className="mb-8 space-y-6 rounded-lg border border-neutral-200 bg-neutral-50 p-6 dark:border-neutral-800 dark:bg-neutral-900"
          role="region"
          aria-label="Filteroptionen"
        >
          <div className="grid gap-6 sm:grid-cols-3">
            {/* Category filter */}
            <div>
              <label
                htmlFor="filter-category"
                className="mb-2 block text-sm font-medium text-neutral-700 dark:text-neutral-300"
              >
                Substanzklasse
              </label>
              <select
                id="filter-category"
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
              >
                <option value="">Alle Klassen</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            {/* Receptor filter */}
            <div>
              <label
                htmlFor="filter-receptor"
                className="mb-2 block text-sm font-medium text-neutral-700 dark:text-neutral-300"
              >
                Rezeptor-Typ
              </label>
              <select
                id="filter-receptor"
                value={selectedReceptor}
                onChange={(e) => setSelectedReceptor(e.target.value)}
                className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
              >
                <option value="">Alle Rezeptoren</option>
                {receptors.map((rec) => (
                  <option key={rec} value={rec}>
                    {rec}
                  </option>
                ))}
              </select>
            </div>

            {/* Legal status filter */}
            <div>
              <label
                htmlFor="filter-legal"
                className="mb-2 block text-sm font-medium text-neutral-700 dark:text-neutral-300"
              >
                Legalstatus
              </label>
              <select
                id="filter-legal"
                value={selectedLegalStatus}
                onChange={(e) => setSelectedLegalStatus(e.target.value)}
                className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
              >
                <option value="">Alle Status</option>
                {legalStatuses.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Tag filter */}
          <div>
            <span className="mb-2 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
              Tags
            </span>
            <div className="flex flex-wrap gap-2" role="group" aria-label="Tag-Filter">
              {tags.map((tag) => (
                <button
                  key={tag.id}
                  onClick={() => toggleTag(tag.id)}
                  className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                    selectedTags.includes(tag.id)
                      ? "border-cyan-500 bg-cyan-500/10 text-cyan-600 dark:text-cyan-400"
                      : "border-neutral-300 text-neutral-600 hover:border-neutral-400 dark:border-neutral-600 dark:text-neutral-400 dark:hover:border-neutral-500"
                  }`}
                  aria-pressed={selectedTags.includes(tag.id)}
                >
                  {tag.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Results count */}
      <div className="mb-4 text-sm text-neutral-500 dark:text-neutral-400">
        {filtered.length}{" "}
        {filtered.length === 1 ? "Artikel" : "Artikel"} gefunden
      </div>

      {/* Article grid */}
      {filtered.length > 0 ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((article) => {
            const tagIds = articleTags[article.id] ?? [];
            const articleTagList = tags.filter((t) => tagIds.includes(t.id));

            return (
              <Link
                key={article.id}
                href={`/articles/${article.slug}`}
                className="group"
              >
                <Card className="h-full transition-shadow hover:shadow-md">
                  <CardHeader>
                    <div className="mb-2 flex items-center justify-between">
                      {article.category && (
                        <Badge variant="outline" className="text-xs">
                          {article.category}
                        </Badge>
                      )}
                      {/* Risk level indicator */}
                      <div
                        className="flex items-center gap-1.5"
                        title={riskLabels[article.risk_level]}
                      >
                        <span
                          className={`h-2.5 w-2.5 rounded-full ${getRiskIndicatorColor(article.risk_level)}`}
                          aria-hidden="true"
                        />
                        <span className="text-xs text-neutral-500 dark:text-neutral-400">
                          {riskLabels[article.risk_level]}
                        </span>
                      </div>
                    </div>
                    <CardTitle className="text-xl group-hover:text-cyan-500 transition-colors">
                      {article.title}
                    </CardTitle>
                    {article.subtitle && (
                      <CardDescription>{article.subtitle}</CardDescription>
                    )}
                  </CardHeader>
                  <CardContent>
                    <p className="mb-4 line-clamp-3 text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">
                      {article.summary}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant={article.risk_level}>
                        {riskLabels[article.risk_level]}
                      </Badge>
                      <Badge variant="info">
                        {evidenceLabels[article.evidence_strength]}
                      </Badge>
                    </div>
                    {article.receptor && (
                      <div className="mt-3 text-xs text-neutral-500 dark:text-neutral-400">
                        <span className="font-medium">Rezeptor:</span>{" "}
                        {article.receptor}
                      </div>
                    )}
                  </CardContent>
                  {articleTagList.length > 0 && (
                    <CardFooter>
                      <div className="flex flex-wrap gap-1.5">
                        {articleTagList.map((tag) => (
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
      ) : (
        <div className="py-12 text-center">
          <p className="text-lg text-neutral-500 dark:text-neutral-400">
            Keine Artikel gefunden.
          </p>
          <p className="mt-2 text-sm text-neutral-400 dark:text-neutral-500">
            Versuche andere Suchbegriffe oder Filter.
          </p>
        </div>
      )}
    </div>
  );
}
