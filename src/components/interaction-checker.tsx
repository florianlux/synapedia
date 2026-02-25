"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { AlertTriangle, Search, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

interface Substance {
  id: string;
  slug: string;
  title: string;
  class_primary: string;
  [key: string]: unknown;
}

interface Source {
  label: string;
  url: string;
}

interface Interaction {
  a: string;
  b: string;
  risk: string;
  headline: string;
  mechanism_conflict: string[];
  explanation: string;
  harm_reduction: string[];
  sources: Source[];
  last_reviewed: string;
}

type RiskFilter = "all" | "high" | "moderate" | "unknown";

const riskLabels: Record<string, string> = {
  high: "Hoch",
  moderate: "Moderat",
  low: "Niedrig",
  unknown: "Unbekannt",
};

const riskVariant: Record<string, "high" | "moderate" | "low" | "unknown"> = {
  high: "high",
  moderate: "moderate",
  low: "low",
  unknown: "unknown",
};

interface InteractionCheckerProps {
  substances: Substance[];
  interactions: Interaction[];
}

function SubstanceSearch({
  label,
  substances,
  selected,
  onSelect,
}: {
  label: string;
  substances: Substance[];
  selected: Substance | null;
  onSelect: (s: Substance | null) => void;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    if (query.length < 1) return [];
    const q = query.toLowerCase();
    return substances.filter(
      (s) =>
        s.title.toLowerCase().includes(q) ||
        s.class_primary.toLowerCase().includes(q)
    );
  }, [query, substances]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={wrapperRef} className="relative flex-1">
      <label className="mb-1.5 block text-sm font-medium text-neutral-400">
        {label}
      </label>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500" />
        <Input
          placeholder="Substanz suchen…"
          className="pl-9"
          value={selected ? selected.title : query}
          onChange={(e) => {
            if (selected) onSelect(null);
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => {
            if (!selected && query.length >= 1) setOpen(true);
          }}
        />
      </div>
      {open && filtered.length > 0 && !selected && (
        <ul className="ds-search-dropdown absolute z-20 mt-1 max-h-60 w-full overflow-auto rounded-md border border-neutral-700 bg-neutral-900 shadow-lg">
          {filtered.map((s) => (
            <li key={s.id}>
              <button
                type="button"
                className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-neutral-800 ds-transition"
                onClick={() => {
                  onSelect(s);
                  setQuery(s.title);
                  setOpen(false);
                }}
              >
                <span className="font-medium text-neutral-100">{s.title}</span>
                <span className="text-xs text-neutral-500">
                  {s.class_primary}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function InteractionChecker({
  substances,
  interactions,
}: InteractionCheckerProps) {
  const [subA, setSubA] = useState<Substance | null>(null);
  const [subB, setSubB] = useState<Substance | null>(null);
  const [riskFilter, setRiskFilter] = useState<RiskFilter>("all");

  const result = useMemo<Interaction | null | "none">(() => {
    if (!subA || !subB) return null;
    const [lo, hi] = [subA.id, subB.id].sort();
    const match = interactions.find((i) => {
      const [a, b] = [i.a, i.b].sort();
      return a === lo && b === hi;
    });
    return match ?? "none";
  }, [subA, subB, interactions]);

  const filteredResult = useMemo(() => {
    if (result === null || result === "none") return result;
    if (riskFilter === "all") return result;
    return result.risk === riskFilter ? result : "none";
  }, [result, riskFilter]);

  const filters: { key: RiskFilter; label: string }[] = [
    { key: "all", label: "Alle" },
    { key: "high", label: "Hoch" },
    { key: "moderate", label: "Moderat" },
    { key: "unknown", label: "Unbekannt" },
  ];

  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <h1 className="mb-6 text-4xl font-bold tracking-tight font-[family-name:var(--ds-font-heading)]">
        Interaktions-Checker
      </h1>

      {/* Disclaimer */}
      <div className="mb-10 flex items-start gap-3 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-700 dark:bg-amber-950/30 dark:text-amber-300">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
        <p>
          <strong>Hinweis:</strong> Dieses Tool dient ausschließlich der
          wissenschaftlichen Aufklärung. Die Ergebnisse ersetzen keine ärztliche
          Beratung und stellen keine Aufforderung zum Konsum dar.
        </p>
      </div>

      {/* Search Fields */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row">
        <SubstanceSearch
          label="Substanz A"
          substances={substances}
          selected={subA}
          onSelect={setSubA}
        />
        <SubstanceSearch
          label="Substanz B"
          substances={substances}
          selected={subB}
          onSelect={setSubB}
        />
      </div>

      {/* Risk Filter Chips */}
      <div className="mb-8 flex flex-wrap gap-2">
        {filters.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setRiskFilter(f.key)}
            className={`rounded-full border px-3 py-1 text-sm font-medium transition-colors ${
              riskFilter === f.key
                ? "border-cyan-500 bg-cyan-500/10 text-cyan-400"
                : "border-neutral-700 text-neutral-400 hover:border-neutral-500"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Results */}
      {filteredResult === null && (
        <p className="text-center text-neutral-500">
          Wähle zwei Substanzen, um mögliche Interaktionen zu prüfen.
        </p>
      )}

      {filteredResult === "none" && (
        <Card>
          <CardContent className="p-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-neutral-500" />
              <p className="text-neutral-400">
                Keine kuratierte Interaktion vorhanden. Risiko unbekannt. Bitte
                Quellen prüfen.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {filteredResult !== null && filteredResult !== "none" && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <Badge variant={riskVariant[filteredResult.risk] ?? "unknown"}>
                {riskLabels[filteredResult.risk] ?? filteredResult.risk}
              </Badge>
              <CardTitle className="text-xl">
                {filteredResult.headline}
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Mechanism */}
            <section className="ds-mechanism-box">
              <h3 className="ds-mechanism-title">
                Mechanismus
              </h3>
              <ul>
                {filteredResult.mechanism_conflict.map((m) => (
                  <li key={m}>{m}</li>
                ))}
              </ul>
            </section>

            {/* Explanation */}
            <section>
              <h3 className="ds-section-label">
                Erklärung
              </h3>
              <p className="text-sm leading-relaxed text-neutral-300">
                {filteredResult.explanation}
              </p>
            </section>

            {/* Harm Reduction */}
            <section>
              <h3 className="ds-section-label">
                Harm Reduction
              </h3>
              <ul className="list-inside list-disc space-y-1 text-sm text-neutral-300">
                {filteredResult.harm_reduction.map((h) => (
                  <li key={h}>{h}</li>
                ))}
              </ul>
            </section>

            {/* Sources */}
            <section>
              <h3 className="ds-section-label">
                Quellen
              </h3>
              <ul className="space-y-1">
                {filteredResult.sources.map((src) => (
                  <li key={src.url}>
                    <a
                      href={src.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-sm text-cyan-400 hover:underline"
                    >
                      {src.label}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </li>
                ))}
              </ul>
            </section>

            {/* Last Reviewed */}
            <p className="text-xs text-neutral-600">
              Zuletzt geprüft: {filteredResult.last_reviewed}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
