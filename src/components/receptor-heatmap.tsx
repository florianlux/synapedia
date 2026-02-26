"use client";

import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronRight, Info, ExternalLink } from "lucide-react";
import type { AffinityWithTarget } from "@/lib/types";

interface ReceptorHeatmapProps {
  affinities: AffinityWithTarget[];
}

const FAMILY_LABELS: Record<string, string> = {
  opioid: "Opioide",
  serotonin: "Serotonin",
  dopamine: "Dopamin",
  glutamate: "Glutamat",
  gaba: "GABA",
  transporter: "Transporter",
  cannabinoid: "Cannabinoide",
  adrenergic: "Adrenerg",
  sigma: "Sigma",
  other: "Andere",
};

const EFFECT_LABELS: Record<string, string> = {
  agonist: "Agonist",
  antagonist: "Antagonist",
  partial_agonist: "Partialagonist",
  inhibitor: "Inhibitor",
  releaser: "Releaser",
  modulator: "Modulator",
  unknown: "Unbekannt",
};

const CONFIDENCE_LABELS: Record<string, string> = {
  literature: "Literatur",
  clinical: "Klinisch",
  estimate: "Schätzung",
  low: "Gering",
};

function strengthToColor(strength: number): string {
  const hue = 210;
  const sat = 70 + strength * 20;
  const light = 90 - strength * 55;
  return `hsl(${hue}, ${sat}%, ${light}%)`;
}

interface SidePanelProps {
  affinity: AffinityWithTarget;
  onClose: () => void;
}

function SidePanel({ affinity, onClose }: SidePanelProps) {
  const { target } = affinity;
  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md overflow-y-auto bg-white shadow-2xl dark:bg-neutral-900 sm:w-96">
      <div className="flex items-center justify-between border-b border-neutral-200 p-4 dark:border-neutral-700">
        <h3 className="text-lg font-semibold">{target.name}</h3>
        <Button variant="ghost" size="sm" onClick={onClose}>✕</Button>
      </div>
      <div className="space-y-4 p-4">
        <Badge variant="outline">{FAMILY_LABELS[target.family] ?? target.family}</Badge>

        {target.description && (
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            {target.description}
          </p>
        )}

        <div className="rounded-lg border border-neutral-200 p-3 dark:border-neutral-700">
          <h4 className="mb-2 text-sm font-medium">Bindungsparameter</h4>
          <dl className="space-y-1 text-sm">
            <div className="flex justify-between">
              <dt className="text-neutral-500">Messtyp</dt>
              <dd className="font-mono">{affinity.measure_type}</dd>
            </div>
            {affinity.affinity_nm !== null && (
              <div className="flex justify-between">
                <dt className="text-neutral-500">Affinität</dt>
                <dd className="font-mono">{affinity.affinity_nm} nM</dd>
              </div>
            )}
            {affinity.effect_type && (
              <div className="flex justify-between">
                <dt className="text-neutral-500">Wirktyp</dt>
                <dd>{EFFECT_LABELS[affinity.effect_type] ?? affinity.effect_type}</dd>
              </div>
            )}
            {affinity.efficacy !== null && (
              <div className="flex justify-between">
                <dt className="text-neutral-500">Efficacy</dt>
                <dd>{affinity.efficacy}%</dd>
              </div>
            )}
            <div className="flex justify-between">
              <dt className="text-neutral-500">Konfidenz</dt>
              <dd>{CONFIDENCE_LABELS[affinity.confidence_level] ?? affinity.confidence_level}</dd>
            </div>
          </dl>
        </div>

        {affinity.notes && (
          <div>
            <h4 className="mb-1 text-sm font-medium">Hinweise</h4>
            <p className="text-sm text-neutral-600 dark:text-neutral-400">{affinity.notes}</p>
          </div>
        )}

        {affinity.sources.length > 0 && (
          <div>
            <h4 className="mb-2 text-sm font-medium">Quellen</h4>
            <ul className="space-y-2">
              {affinity.sources.map((src, i) => (
                <li key={i} className="text-xs text-neutral-600 dark:text-neutral-400">
                  [{i + 1}] {src.title}
                  {src.year && ` (${src.year})`}
                  {src.authors && ` – ${src.authors}`}
                  {src.url && (
                    <a
                      href={src.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ml-1 inline-flex items-center gap-0.5 text-blue-600 hover:underline dark:text-blue-400"
                    >
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                  {src.doi && (
                    <a
                      href={`https://doi.org/${src.doi}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ml-1 inline-flex items-center gap-0.5 text-blue-600 hover:underline dark:text-blue-400"
                    >
                      DOI
                    </a>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

export function ReceptorHeatmap({ affinities }: ReceptorHeatmapProps) {
  const [selectedAffinity, setSelectedAffinity] = useState<AffinityWithTarget | null>(null);
  const [collapsedFamilies, setCollapsedFamilies] = useState<Set<string>>(new Set());

  const grouped = useMemo(() => {
    const map = new Map<string, AffinityWithTarget[]>();
    for (const a of affinities) {
      const family = a.target?.family ?? "other";
      if (!map.has(family)) map.set(family, []);
      map.get(family)!.push(a);
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [affinities]);

  const toggleFamily = (family: string) => {
    setCollapsedFamilies((prev) => {
      const next = new Set(prev);
      if (next.has(family)) next.delete(family);
      else next.add(family);
      return next;
    });
  };

  if (affinities.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Info className="h-4 w-4" />
            Rezeptor-Bindungsprofil
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-neutral-500">
            Keine Bindungsaffinitätsdaten verfügbar.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Info className="h-4 w-4" />
            Rezeptor-Bindungsprofil
          </CardTitle>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            Klicke auf eine Zelle für Details. Intensität = Bindungsstärke (kleiner Ki/IC50 = stärkere Bindung).
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {grouped.map(([family, items]) => {
            const isCollapsed = collapsedFamilies.has(family);
            return (
              <div key={family}>
                <button
                  className="flex w-full items-center gap-2 py-1 text-sm font-semibold text-neutral-700 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-neutral-100"
                  onClick={() => toggleFamily(family)}
                >
                  {isCollapsed ? (
                    <ChevronRight className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                  {FAMILY_LABELS[family] ?? family}
                  <span className="ml-1 font-normal text-neutral-400">({items.length})</span>
                </button>
                {!isCollapsed && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {items.map((a) => (
                      <HeatmapCell
                        key={a.id}
                        affinity={a}
                        onClick={() => setSelectedAffinity(a)}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          {/* Legend */}
          <div className="mt-4 flex items-center gap-3 border-t border-neutral-200 pt-3 dark:border-neutral-700">
            <span className="text-xs text-neutral-500">Schwach</span>
            <div className="flex h-3 w-24 overflow-hidden rounded">
              {Array.from({ length: 10 }, (_, i) => (
                <div
                  key={i}
                  className="flex-1"
                  style={{ backgroundColor: strengthToColor(i / 9) }}
                />
              ))}
            </div>
            <span className="text-xs text-neutral-500">Stark</span>
          </div>
        </CardContent>
      </Card>

      {selectedAffinity && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm"
            onClick={() => setSelectedAffinity(null)}
          />
          <SidePanel
            affinity={selectedAffinity}
            onClose={() => setSelectedAffinity(null)}
          />
        </>
      )}
    </>
  );
}

interface HeatmapCellProps {
  affinity: AffinityWithTarget;
  onClick: () => void;
}

function HeatmapCell({ affinity, onClick }: HeatmapCellProps) {
  const bgColor = strengthToColor(affinity.strength);

  const label =
    affinity.affinity_nm !== null
      ? affinity.affinity_nm < 1
        ? `${(affinity.affinity_nm * 1000).toFixed(0)} pM`
        : affinity.affinity_nm < 1000
        ? `${affinity.affinity_nm.toFixed(0)} nM`
        : `${(affinity.affinity_nm / 1000).toFixed(1)} µM`
      : affinity.effect_type ?? "qual.";

  return (
    <button
      onClick={onClick}
      title={`${affinity.target.name}: ${affinity.measure_type} ${label} (${affinity.effect_type ?? ""})`}
      className="group flex flex-col items-center rounded-md border border-neutral-200 p-2 text-center transition-all hover:scale-105 hover:shadow-md dark:border-neutral-700"
    >
      <div
        className="mb-1 h-8 w-16 rounded"
        style={{ backgroundColor: bgColor }}
      />
      <span className="max-w-[70px] truncate text-xs font-medium leading-tight text-neutral-700 dark:text-neutral-300">
        {affinity.target.name}
      </span>
      <span className="text-[10px] text-neutral-500 dark:text-neutral-400">{label}</span>
      {affinity.effect_type && (
        <span className="mt-0.5 text-[9px] italic text-neutral-400">
          {EFFECT_LABELS[affinity.effect_type] ?? affinity.effect_type}
        </span>
      )}
    </button>
  );
}
