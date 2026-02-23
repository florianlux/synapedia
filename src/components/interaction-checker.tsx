"use client";

import { useState, useMemo } from "react";
import { AlertTriangle, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  SubstanceSearch,
  type SubstanceOption,
} from "@/components/substance-search";

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
  substances: SubstanceOption[];
  interactions: Interaction[];
}

export function InteractionChecker({
  substances,
  interactions,
}: InteractionCheckerProps) {
  const [subA, setSubA] = useState<SubstanceOption | null>(null);
  const [subB, setSubB] = useState<SubstanceOption | null>(null);
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
      <h1 className="mb-6 text-4xl font-bold tracking-tight">
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
            <section>
              <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-neutral-500">
                Mechanismus
              </h3>
              <ul className="list-inside list-disc space-y-1 text-sm text-neutral-300">
                {filteredResult.mechanism_conflict.map((m) => (
                  <li key={m}>{m}</li>
                ))}
              </ul>
            </section>

            {/* Explanation */}
            <section>
              <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-neutral-500">
                Erklärung
              </h3>
              <p className="text-sm leading-relaxed text-neutral-300">
                {filteredResult.explanation}
              </p>
            </section>

            {/* Harm Reduction */}
            <section>
              <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-neutral-500">
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
              <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-neutral-500">
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
