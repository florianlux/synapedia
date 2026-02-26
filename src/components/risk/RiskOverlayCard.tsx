"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { AlertTriangle, Shield, Clock, Heart } from "lucide-react";
import type { RiskLevel, RiskOverlayResult } from "@/lib/risk/models";

const levelLabel: Record<RiskLevel, string> = {
  low: "Niedrig",
  moderate: "Moderat",
  high: "Hoch",
  critical: "Kritisch",
};

const levelBadgeClass: Record<RiskLevel, string> = {
  low: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  moderate:
    "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
  high: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300",
  critical:
    "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300 animate-pulse",
};

function formatTime(iso: string): string {
  const date = new Date(iso);
  if (isNaN(date.getTime())) return iso;
  return date.toLocaleTimeString("de-DE", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

interface RiskOverlayCardProps {
  result: RiskOverlayResult;
}

export function RiskOverlayCard({ result }: RiskOverlayCardProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />
            <CardTitle>Risiko-Übersicht</CardTitle>
          </div>
          <Badge
            className={`px-3 py-1 text-sm ${levelBadgeClass[result.overall_level]}`}
          >
            {levelLabel[result.overall_level]}
          </Badge>
        </div>
        <CardDescription>
          Automatische Einschätzung basierend auf deinem Protokoll
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Stack Counters */}
        {result.stacks.length > 0 && (
          <section>
            <h3 className="mb-3 text-sm font-semibold text-neutral-700 dark:text-neutral-300">
              Substanz-Stacking
            </h3>
            <div className="grid gap-3 sm:grid-cols-2">
              {result.stacks.map((stack) => (
                <div
                  key={stack.type}
                  className="rounded-md border border-neutral-200 p-3 dark:border-neutral-800"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{stack.type}</span>
                    <Badge
                      className={`text-xs ${levelBadgeClass[stack.level]}`}
                    >
                      {levelLabel[stack.level]}
                    </Badge>
                  </div>
                  <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                    {stack.rationale}
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Warnings */}
        {result.warnings.length > 0 && (
          <>
            <Separator />
            <section>
              <h3 className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-neutral-700 dark:text-neutral-300">
                <AlertTriangle className="h-4 w-4 text-orange-500" />
                Warnungen
              </h3>
              <div className="rounded-md border border-orange-200 bg-orange-50 p-3 dark:border-orange-900 dark:bg-orange-950">
                <ul className="space-y-1.5">
                  {result.warnings.map((warning, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-2 text-sm text-orange-800 dark:text-orange-300"
                    >
                      <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                      {warning}
                    </li>
                  ))}
                </ul>
              </div>
            </section>
          </>
        )}

        {/* Rebound Timeline */}
        {result.rebound.length > 0 && (
          <>
            <Separator />
            <section>
              <h3 className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-neutral-700 dark:text-neutral-300">
                <Clock className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />
                Rebound-Zeitfenster
              </h3>
              <div className="space-y-2">
                {result.rebound.map((window, i) => (
                  <div
                    key={i}
                    className="rounded-md border border-neutral-200 p-3 dark:border-neutral-800"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">
                        {formatTime(window.window_start)} –{" "}
                        {formatTime(window.window_end)}
                      </span>
                      <span className="text-xs text-neutral-500 dark:text-neutral-400">
                        {window.risks.join(", ")}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                      {window.rationale}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          </>
        )}

        {/* Red Flags */}
        <Separator />
        <section>
          <h3 className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-red-700 dark:text-red-400">
            <Heart className="h-4 w-4" />
            Notfall
          </h3>
          <div className="rounded-md border border-red-300 bg-red-50 p-3 dark:border-red-900 dark:bg-red-950">
            <p className="mb-2 text-sm font-semibold text-red-800 dark:text-red-300">
              🚨 Sofort 112 rufen bei:
            </p>
            <ul className="list-inside list-disc space-y-1 text-sm text-red-700 dark:text-red-400">
              <li>Brustschmerzen</li>
              <li>Schwere Atemnot</li>
              <li>Bewusstlosigkeit</li>
              <li>Verwirrtheit</li>
              <li>Blaue Lippen / Fingernägel</li>
              <li>Krampfanfälle</li>
            </ul>
          </div>
        </section>

        {/* Disclaimer */}
        <Separator />
        <section className="space-y-1.5">
          {result.notes.map((note, i) => (
            <p
              key={i}
              className="text-xs text-neutral-500 dark:text-neutral-400"
            >
              {note}
            </p>
          ))}
          <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
            Dieses Tool ersetzt keine ärztliche Beratung.
          </p>
        </section>
      </CardContent>
    </Card>
  );
}
