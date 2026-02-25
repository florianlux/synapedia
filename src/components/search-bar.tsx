"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import type { Article } from "@/lib/types";

export function SearchBar({ articles }: { articles: Article[] }) {
  const [query, setQuery] = useState("");

  const results = useMemo(() => {
    if (query.length < 2) return [];
    const q = query.toLowerCase();
    return articles.filter(
      (a) =>
        a.title.toLowerCase().includes(q) ||
        a.summary.toLowerCase().includes(q)
    );
  }, [query, articles]);

  return (
    <div className="ds-search-container relative w-full max-w-xl">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500" />
        <Input
          type="text"
          placeholder="Substanz suchen…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-10 pr-10 rounded-xl"
        />
        {query && (
          <button
            onClick={() => setQuery("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 ds-transition"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
      {results.length > 0 && (
        <div className="ds-search-dropdown absolute z-50 mt-2 w-full rounded-lg border border-neutral-200 bg-white shadow-lg dark:border-neutral-800 dark:bg-neutral-950">
          {results.map((article) => (
            <Link
              key={article.id}
              href={`/articles/${article.slug}`}
              onClick={() => setQuery("")}
              className="block px-4 py-3 ds-transition hover:bg-neutral-100 dark:hover:bg-neutral-900"
            >
              <p className="font-medium">{article.title}</p>
              <p className="text-sm text-neutral-500 dark:text-neutral-400 line-clamp-1">
                {article.summary}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
