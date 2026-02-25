"use client";

import { useState, useCallback } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  Trash2,
  Search,
  Copy,
  ExternalLink,
  Download,
  ShieldCheck,
  PartyPopper,
  AlertTriangle,
} from "lucide-react";
import {
  type QueryMode,
  type Language,
  type SearchConfig,
  type GeneratedQuery,
  SOURCES,
  generateQueries,
  buildBundle,
} from "@/lib/search/experienceQuery";
import { buttonVariants } from "@/components/ui/button";

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ExperienceSearchForm() {
  // Substances (default 2 rows)
  const [substances, setSubstances] = useState<string[]>(["", ""]);

  // Sources
  const [selectedSources, setSelectedSources] = useState<string[]>([
    "reddit",
    "google",
  ]);

  // Mode
  const [mode, setMode] = useState<QueryMode>("combination");

  // Language
  const [language, setLanguage] = useState<Language>("DE");

  // Combo filter
  const [requireComboTerms, setRequireComboTerms] = useState(true);

  // Safety toggles
  const [safesearch, setSafesearch] = useState(true);
  const [partymode, setPartymode] = useState(false);

  // Results
  const [results, setResults] = useState<GeneratedQuery[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [generated, setGenerated] = useState(false);

  // Copy feedback
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

  // ---------- handlers ----------

  const addSubstance = useCallback(() => {
    setSubstances((prev) => [...prev, ""]);
  }, []);

  const removeSubstance = useCallback((idx: number) => {
    setSubstances((prev) => prev.filter((_, i) => i !== idx));
  }, []);

  const updateSubstance = useCallback((idx: number, value: string) => {
    setSubstances((prev) => prev.map((s, i) => (i === idx ? value : s)));
  }, []);

  const toggleSource = useCallback((id: string) => {
    setSelectedSources((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  }, []);

  const handleGenerate = useCallback(() => {
    const config: SearchConfig = {
      substances,
      sources: selectedSources,
      mode,
      language,
      requireComboTerms,
      safesearch,
      partymode,
    };
    const result = generateQueries(config);
    setResults(result.queries);
    setWarnings(result.warnings);
    setGenerated(true);
  }, [substances, selectedSources, mode, language, requireComboTerms, safesearch, partymode]);

  const handleCopy = useCallback(async (text: string, idx: number) => {
    await navigator.clipboard.writeText(text);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 1500);
  }, []);

  const handleExportJSON = useCallback(() => {
    const config: SearchConfig = {
      substances,
      sources: selectedSources,
      mode,
      language,
      requireComboTerms,
      safesearch,
      partymode,
    };
    const bundle = buildBundle(config, results);
    const blob = new Blob([JSON.stringify(bundle, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `search-bundle-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [substances, selectedSources, mode, language, requireComboTerms, safesearch, partymode, results]);

  // ---------- render ----------

  const modes: { value: QueryMode; label: string }[] = [
    { value: "combination", label: "Combination Experiences (Safety)" },
    { value: "safety", label: "Safety / Interactions" },
    { value: "experience", label: "Experience Reports" },
    { value: "medical", label: "Medical / Case Reports" },
  ];

  return (
    <div className="space-y-6">
      {/* ---------- Substances ---------- */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Search className="h-4 w-4 text-cyan-500" />
            Substances
          </CardTitle>
          <CardDescription>
            Add 2–6+ substances to search for combination experiences.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {substances.map((s, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <Input
                value={s}
                onChange={(e) => updateSubstance(idx, e.target.value)}
                placeholder="e.g., 3-FA"
                className="flex-1"
              />
              {substances.length > 1 && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeSubstance(idx)}
                  aria-label="Remove substance"
                >
                  <Trash2 className="h-4 w-4 text-red-500" />
                </Button>
              )}
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={addSubstance} className="mt-2">
            <Plus className="mr-1 h-4 w-4" />
            Add substance
          </Button>
        </CardContent>
      </Card>

      {/* ---------- Sources ---------- */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Sources</CardTitle>
          <CardDescription>Select which sources to search.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            {SOURCES.map((src) => (
              <label key={src.id} className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedSources.includes(src.id)}
                  onChange={() => toggleSource(src.id)}
                  className="h-4 w-4 rounded border-neutral-300 accent-cyan-600"
                />
                {src.label}
              </label>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* ---------- Query Mode ---------- */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Query Mode</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 sm:grid-cols-2">
            {modes.map((m) => (
              <label
                key={m.value}
                className={`flex items-center gap-2 rounded-lg border p-3 text-sm cursor-pointer transition-colors ${
                  mode === m.value
                    ? "border-cyan-500 bg-cyan-50 dark:bg-cyan-950/30"
                    : "border-neutral-200 dark:border-neutral-800"
                }`}
              >
                <input
                  type="radio"
                  name="queryMode"
                  value={m.value}
                  checked={mode === m.value}
                  onChange={() => setMode(m.value)}
                  className="accent-cyan-600"
                />
                {m.label}
              </label>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* ---------- Language & Combo Filter ---------- */}
      <div className="grid gap-6 sm:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Language</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              {(["DE", "EN"] as Language[]).map((l) => (
                <label key={l} className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="radio"
                    name="language"
                    value={l}
                    checked={language === l}
                    onChange={() => setLanguage(l)}
                    className="accent-cyan-600"
                  />
                  {l}
                </label>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Combo Filters</CardTitle>
          </CardHeader>
          <CardContent>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={requireComboTerms}
                onChange={(e) => setRequireComboTerms(e.target.checked)}
                className="h-4 w-4 rounded border-neutral-300 accent-cyan-600"
              />
              Require combo terms
            </label>
          </CardContent>
        </Card>
      </div>

      {/* ---------- Safety Toggles ---------- */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <ShieldCheck className="h-4 w-4 text-green-500" />
            Safety &amp; Party Mode
          </CardTitle>
          <CardDescription>
            Safesearch strips all dosing language. Partymode adds dose-related queries.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={safesearch}
              onChange={(e) => {
                setSafesearch(e.target.checked);
                if (e.target.checked) setPartymode(false);
              }}
              className="h-4 w-4 rounded border-neutral-300 accent-green-600"
            />
            <ShieldCheck className="h-4 w-4 text-green-500" />
            Safesearch (no dosing language — default ON)
          </label>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={partymode}
              onChange={(e) => {
                setPartymode(e.target.checked);
                if (e.target.checked) setSafesearch(false);
              }}
              className="h-4 w-4 rounded border-neutral-300 accent-violet-600"
            />
            <PartyPopper className="h-4 w-4 text-violet-500" />
            Partymode (includes dosing &amp; recipe queries)
          </label>
        </CardContent>
      </Card>

      {/* ---------- Generate Button ---------- */}
      <Button onClick={handleGenerate} className="w-full" size="lg">
        <Search className="mr-2 h-4 w-4" />
        Generate Search Queries
      </Button>

      {/* ---------- Warnings ---------- */}
      {warnings.length > 0 && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 dark:border-amber-700 dark:bg-amber-950/30">
          <div className="flex items-center gap-2 mb-2 text-amber-800 dark:text-amber-300 font-medium text-sm">
            <AlertTriangle className="h-4 w-4" />
            Warnings
          </div>
          <ul className="list-disc pl-5 text-sm text-amber-700 dark:text-amber-400 space-y-1">
            {warnings.map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        </div>
      )}

      {/* ---------- Results ---------- */}
      {generated && results.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between text-base">
              <span>Generated Queries ({results.length})</span>
              <Button variant="outline" size="sm" onClick={handleExportJSON}>
                <Download className="mr-1 h-4 w-4" />
                Export JSON
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {results.map((q, idx) => (
                <div
                  key={idx}
                  className="rounded-lg border border-neutral-200 p-3 dark:border-neutral-800"
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <Badge variant="secondary" className="text-xs">
                      {q.source}
                    </Badge>
                    {q.pairwise && (
                      <Badge variant="outline" className="text-xs">
                        pairwise
                      </Badge>
                    )}
                  </div>
                  <p className="mb-2 text-sm font-mono break-all text-neutral-700 dark:text-neutral-300">
                    {q.query}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleCopy(q.query, idx)}
                    >
                      <Copy className="mr-1 h-3 w-3" />
                      {copiedIdx === idx ? "Copied!" : "Copy"}
                    </Button>
                    <a
                      href={q.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={buttonVariants({ variant: "ghost", size: "sm" })}
                    >
                      <ExternalLink className="mr-1 h-3 w-3" />
                      Open
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {generated && results.length === 0 && (
        <p className="text-center text-sm text-neutral-500">
          No queries generated. Add at least one substance and select a source.
        </p>
      )}
    </div>
  );
}
