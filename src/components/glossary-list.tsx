"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";

interface GlossaryEntry {
  term: string;
  slug: string;
  definition: string;
  detail: string;
  see_also: string[];
  sources: { label: string; url: string }[];
}

interface GlossaryListProps {
  entries: GlossaryEntry[];
}

export function GlossaryList({ entries }: GlossaryListProps) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    if (!query.trim()) return entries;
    const q = query.toLowerCase();
    return entries.filter(
      (e) =>
        e.term.toLowerCase().includes(q) ||
        e.definition.toLowerCase().includes(q)
    );
  }, [entries, query]);

  const grouped = useMemo(() => {
    const groups: Record<string, GlossaryEntry[]> = {};
    for (const entry of filtered) {
      const letter = entry.term[0].toUpperCase();
      if (!groups[letter]) groups[letter] = [];
      groups[letter].push(entry);
    }
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
  }, [filtered]);

  const availableLetters = useMemo(
    () => new Set(grouped.map(([letter]) => letter)),
    [grouped]
  );

  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

  return (
    <>
      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500" />
        <Input
          placeholder="Begriff suchen…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* A-Z Navigation */}
      <nav className="sticky top-16 z-10 -mx-4 mb-8 flex flex-wrap gap-1 bg-[var(--ds-bg-primary)]/80 px-4 py-3 backdrop-blur-sm">
        {alphabet.map((letter) => {
          const isAvailable = availableLetters.has(letter);
          return isAvailable ? (
            <a
              key={letter}
              href={`#letter-${letter}`}
              className="flex h-8 w-8 items-center justify-center rounded text-sm font-medium text-cyan-500 ds-transition hover:bg-cyan-500/10 hover:text-cyan-400"
            >
              {letter}
            </a>
          ) : (
            <span
              key={letter}
              className="flex h-8 w-8 items-center justify-center rounded text-sm text-neutral-700"
            >
              {letter}
            </span>
          );
        })}
      </nav>

      {/* Grouped terms */}
      {grouped.length === 0 && (
        <p className="py-12 text-center text-neutral-500">
          Keine Begriffe gefunden.
        </p>
      )}

      {grouped.map(([letter, terms]) => (
        <section key={letter} id={`letter-${letter}`} className="mb-10">
          <h2 className="mb-4 border-b border-neutral-800 pb-2 text-2xl font-bold text-cyan-500 font-[family-name:var(--ds-font-heading)]">
            {letter}
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {terms.map((entry) => (
              <Card key={entry.slug} className="ds-card-lift ds-glow-on-hover">
                <CardHeader>
                  <CardTitle className="text-lg">{entry.term}</CardTitle>
                  <CardDescription className="line-clamp-2">
                    {entry.definition}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Link
                    href={`/glossary/${entry.slug}`}
                    className="text-sm font-medium text-cyan-500 transition-colors hover:text-cyan-400"
                  >
                    Mehr →
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      ))}
    </>
  );
}
