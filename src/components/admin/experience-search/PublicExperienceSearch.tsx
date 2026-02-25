"use client";

import { useState, useCallback } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Search,
  ExternalLink,
  Plus,
  Trash2,
} from "lucide-react";
import {
  type SearchConfig,
  type GeneratedQuery,
  generateQueries,
} from "@/lib/search/experienceQuery";

/**
 * Simplified public Experience Search widget for the Start Page.
 * Only rendered when NEXT_PUBLIC_ENABLE_PUBLIC_EXPERIENCE_SEARCH=true.
 * Fixed to "Combination Experiences (Safety)" mode with combo terms required.
 */
export function PublicExperienceSearch() {
  const [substances, setSubstances] = useState<string[]>(["", ""]);
  const [useReddit, setUseReddit] = useState(true);
  const [useGoogle, setUseGoogle] = useState(true);
  const [results, setResults] = useState<GeneratedQuery[]>([]);
  const [generated, setGenerated] = useState(false);

  const addSubstance = useCallback(() => {
    if (substances.length < 3) setSubstances((prev) => [...prev, ""]);
  }, [substances.length]);

  const removeSubstance = useCallback((idx: number) => {
    setSubstances((prev) => prev.filter((_, i) => i !== idx));
  }, []);

  const updateSubstance = useCallback((idx: number, value: string) => {
    setSubstances((prev) => prev.map((s, i) => (i === idx ? value : s)));
  }, []);

  const handleGenerate = useCallback(() => {
    const sources: string[] = [];
    if (useReddit) sources.push("reddit");
    if (useGoogle) sources.push("google");

    const config: SearchConfig = {
      substances,
      sources,
      mode: "combination",
      language: "DE",
      requireComboTerms: true,
      safesearch: true,
      partymode: false,
    };
    const result = generateQueries(config);
    setResults(result.queries.filter((q) => !q.pairwise));
    setGenerated(true);
  }, [substances, useReddit, useGoogle]);

  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-950">
      <h3 className="mb-3 flex items-center gap-2 text-base font-semibold">
        <Search className="h-4 w-4 text-cyan-500" />
        Erfahrungssuche (Kombination)
      </h3>
      <div className="space-y-2 mb-3">
        {substances.map((s, idx) => (
          <div key={idx} className="flex items-center gap-2">
            <Input
              value={s}
              onChange={(e) => updateSubstance(idx, e.target.value)}
              placeholder="z.B. MDMA"
              className="flex-1"
            />
            {substances.length > 1 && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => removeSubstance(idx)}
                aria-label="Entfernen"
              >
                <Trash2 className="h-4 w-4 text-red-500" />
              </Button>
            )}
          </div>
        ))}
        {substances.length < 3 && (
          <Button variant="outline" size="sm" onClick={addSubstance}>
            <Plus className="mr-1 h-3 w-3" />
            Substanz
          </Button>
        )}
      </div>

      <div className="flex gap-4 mb-3 text-sm">
        <label className="flex items-center gap-1.5 cursor-pointer">
          <input
            type="checkbox"
            checked={useReddit}
            onChange={(e) => setUseReddit(e.target.checked)}
            className="accent-cyan-600"
          />
          Reddit
        </label>
        <label className="flex items-center gap-1.5 cursor-pointer">
          <input
            type="checkbox"
            checked={useGoogle}
            onChange={(e) => setUseGoogle(e.target.checked)}
            className="accent-cyan-600"
          />
          Google
        </label>
      </div>

      <Button size="sm" onClick={handleGenerate} className="w-full">
        <Search className="mr-1 h-3 w-3" />
        Suchen
      </Button>

      {generated && results.length > 0 && (
        <div className="mt-4 space-y-2">
          {results.map((q, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between rounded border border-neutral-200 p-2 text-xs dark:border-neutral-800"
            >
              <div className="flex items-center gap-2 min-w-0">
                <Badge variant="secondary" className="text-xs shrink-0">
                  {q.source}
                </Badge>
                <span className="truncate font-mono text-neutral-600 dark:text-neutral-400">
                  {q.query}
                </span>
              </div>
              <a
                href={q.url}
                target="_blank"
                rel="noopener noreferrer"
                className={buttonVariants({ variant: "ghost", size: "sm" }) + " shrink-0 ml-2"}
              >
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
