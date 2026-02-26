"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { RiskOverlayResult, OverallRiskLevel } from "@/lib/risk/models";

const LEVEL_LABELS: Record<OverallRiskLevel, string> = {
  low: "Niedrig",
  moderate: "Moderat",
  high: "Hoch",
  critical: "Kritisch",
};

const LEVEL_BADGE_VARIANT: Record<OverallRiskLevel, "low" | "moderate" | "high" | "critical"> = {
  low: "low",
  moderate: "moderate",
  high: "high",
  critical: "critical",
};

interface RiskOverlayCardProps {
  result: RiskOverlayResult;
}

export function RiskOverlayCard({ result }: RiskOverlayCardProps) {
  return (
    <div className="space-y-6">
      {/* Overall Risk Level */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Gesamt-Risikoeinschätzung</CardTitle>
            <Badge variant={LEVEL_BADGE_VARIANT[result.overall_level]} className="text-sm px-3 py-1">
              {LEVEL_LABELS[result.overall_level]}
            </Badge>
          </div>
          <CardDescription>
            Heuristische Einschätzung basierend auf deinen Einträgen der letzten 24 Stunden.
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Stack Counters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Substanzklassen-Übersicht</CardTitle>
          <CardDescription>
            Aktive Einnahmen pro Kategorie im relevanten Zeitfenster.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {result.stacks.map((stack) => (
              <div
                key={stack.type}
                className="flex items-start justify-between gap-4 rounded-lg border border-neutral-200 p-3 dark:border-neutral-800"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-neutral-900 dark:text-neutral-50">
                      {stack.type}
                    </span>
                    <Badge variant={LEVEL_BADGE_VARIANT[stack.level]}>
                      {LEVEL_LABELS[stack.level]}
                    </Badge>
                    {stack.count > 0 && (
                      <span className="text-xs text-neutral-500 dark:text-neutral-400">
                        ({stack.count}×)
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
                    {stack.rationale}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Warnings */}
      {result.warnings.length > 0 && (
        <Card className="border-red-200 dark:border-red-900">
          <CardHeader>
            <CardTitle className="text-lg text-red-700 dark:text-red-400">
              ⚠️ Warnungen
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {result.warnings.map((warning, i) => (
                <li
                  key={i}
                  className="rounded-md bg-red-50 p-3 text-sm text-red-800 dark:bg-red-950/50 dark:text-red-300"
                >
                  {warning}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Rebound Timeline */}
      {result.rebound.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Rebound / Nacheffekte – Zeitfenster</CardTitle>
            <CardDescription>
              Grobe Schätzungen mit hoher Unsicherheit. Keine exakten Vorhersagen.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {result.rebound.map((rb, i) => (
                <div
                  key={i}
                  className="rounded-lg border border-neutral-200 p-3 dark:border-neutral-800"
                >
                  <div className="flex items-center gap-2 text-sm font-medium text-neutral-900 dark:text-neutral-50">
                    <span className="inline-block rounded bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800 dark:bg-amber-900 dark:text-amber-300">
                      {rb.window_start} — {rb.window_end}
                    </span>
                  </div>
                  {rb.risks.length > 0 && (
                    <ul className="mt-2 list-inside list-disc text-sm text-neutral-600 dark:text-neutral-400">
                      {rb.risks.map((risk, j) => (
                        <li key={j}>{risk}</li>
                      ))}
                    </ul>
                  )}
                  <p className="mt-2 text-xs text-neutral-500 dark:text-neutral-500">
                    {rb.rationale}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Red Flags – Emergency Section */}
      <Card className="border-red-300 bg-red-50 dark:border-red-900 dark:bg-red-950/30">
        <CardHeader>
          <CardTitle className="text-lg text-red-700 dark:text-red-400">
            🚨 Notruf-Warnsignale (Red Flags)
          </CardTitle>
          <CardDescription className="text-red-600 dark:text-red-400">
            Bei diesen Symptomen sofort Notruf 112 wählen:
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="grid gap-2 sm:grid-cols-2">
            {[
              "Schwere Atemnot oder Atemaussetzer",
              "Brustschmerzen oder starkes Herzrasen",
              "Blaue Lippen oder Fingerspitzen (Zyanose)",
              "Bewusstlosigkeit oder Nicht-Ansprechbarkeit",
              "Starke Verwirrung oder Desorientierung",
              "Krampfanfälle",
              "Starkes unkontrollierbares Zittern",
              "Suizidgedanken oder schwere Angst",
            ].map((flag) => (
              <li
                key={flag}
                className="flex items-start gap-2 text-sm text-red-800 dark:text-red-300"
              >
                <span className="mt-0.5 text-red-500">•</span>
                {flag}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {/* Disclaimers & Notes */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">📋 Hinweise &amp; Disclaimer</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {result.notes.map((note, i) => (
              <li
                key={i}
                className="text-sm text-neutral-600 dark:text-neutral-400"
              >
                {note}
              </li>
            ))}
            <li className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
              Diese Analyse dient ausschließlich der Aufklärung und Schadensminimierung (Harm Reduction).
              Sie stellt keine medizinische Beratung dar und ersetzt keinen Arztbesuch.
            </li>
            <li className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
              Es werden keine Dosierungsempfehlungen oder Konsumhinweise gegeben.
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
