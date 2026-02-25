"use client";

import { useMemo, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp, BarChart2, AlertTriangle } from "lucide-react";
import { computeDoseResponseCurve } from "@/lib/pkpd-math";
import type { Pharmacodynamics } from "@/lib/types";

interface DoseResponseChartProps {
  pdParams: Pharmacodynamics[];
}

const CONFIDENCE_WARNING: Record<string, boolean> = {
  estimate: true,
  low: true,
};

export function DoseResponseChart({ pdParams }: DoseResponseChartProps) {
  const [scienceMode, setScienceMode] = useState(false);
  const [selectedPD, setSelectedPD] = useState<Pharmacodynamics | null>(
    pdParams.length > 0 ? pdParams[0] : null
  );

  const pd = selectedPD ?? pdParams[0];

  const curveData = useMemo(() => {
    if (!pd?.ec50_mg) return [];
    const max = pd.ec50_mg * 8;
    return computeDoseResponseCurve(pd, [0, max]);
  }, [pd]);

  if (pdParams.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <BarChart2 className="h-4 w-4" />
            Dosis-Wirkungs-Modell
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-neutral-500">
            Keine pharmakodynamischen Daten verfügbar.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <BarChart2 className="h-4 w-4" />
            Dosis-Wirkungs-Modell (Emax/Hill)
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setScienceMode((v) => !v)}
          >
            {scienceMode ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            Gleichungen
          </Button>
        </div>

        {pdParams.length > 1 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {pdParams.map((p) => (
              <button
                key={p.id}
                onClick={() => setSelectedPD(p)}
                className={`rounded-full border px-3 py-1 text-xs font-medium transition-all ${
                  selectedPD?.id === p.id
                    ? "border-blue-500 bg-blue-500 text-white"
                    : "border-neutral-300 text-neutral-500 dark:border-neutral-600"
                }`}
              >
                {p.route ?? "Allgemein"}
              </button>
            ))}
          </div>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        {pd && CONFIDENCE_WARNING[pd.confidence_level] && (
          <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-900/20">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
            <p className="text-xs text-amber-700 dark:text-amber-300">
              Dieses Modell basiert auf Schätzungen. Es handelt sich um ein rein
              wissenschaftliches Bildungsmodell ohne medizinische Empfehlung.
            </p>
          </div>
        )}

        {curveData.length > 0 ? (
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={curveData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey="dose"
                label={{ value: "Dosis (mg)", position: "insideBottom", offset: -2, fontSize: 11 }}
                tick={{ fontSize: 11 }}
              />
              <YAxis
                domain={[0, 100]}
                label={{ value: "Effekt (%)", angle: -90, position: "insideLeft", fontSize: 11 }}
                tick={{ fontSize: 11 }}
              />
              <Tooltip
                formatter={(value: number | undefined) => [
                  value !== undefined ? `${value.toFixed(1)}%` : "",
                  "Effekt",
                ]}
                labelFormatter={(d) => `${d} mg`}
              />
              {pd?.ec50_mg && (
                <ReferenceLine
                  x={pd.ec50_mg}
                  stroke="#6b7280"
                  strokeDasharray="4 4"
                  label={{ value: "ED₅₀", fontSize: 10, fill: "#6b7280" }}
                />
              )}
              <Line
                type="monotone"
                dataKey="effect"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={false}
                name="Effekt"
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-sm text-neutral-500">
            Keine EC50-Daten für die Dosis-Wirkungs-Kurve verfügbar.
          </p>
        )}

        {scienceMode && pd && (
          <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-4 dark:border-neutral-700 dark:bg-neutral-900">
            <h4 className="mb-3 text-sm font-semibold">Modellgleichung</h4>
            <p className="mb-3 font-mono text-xs text-neutral-600 dark:text-neutral-400">
              E(D) = E₀ + (Emax · Dʰ) / (ED₅₀ʰ + Dʰ)
            </p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs sm:grid-cols-3">
              <span className="text-neutral-500">Emax</span>
              <span className="font-mono">{pd.emax}%</span>
              {pd.ec50_mg !== null && (
                <>
                  <span className="text-neutral-500">ED₅₀</span>
                  <span className="font-mono">{pd.ec50_mg} mg</span>
                </>
              )}
              <span className="text-neutral-500">Hill (h)</span>
              <span className="font-mono">{pd.hill_h}</span>
              <span className="text-neutral-500">E₀ (Baseline)</span>
              <span className="font-mono">{pd.baseline_e0}%</span>
              {pd.therapeutic_index !== null && (
                <>
                  <span className="text-neutral-500">Therapeut. Index</span>
                  <span className="font-mono">{pd.therapeutic_index}</span>
                </>
              )}
            </div>
            {pd.notes && (
              <p className="mt-2 text-xs italic text-neutral-500">{pd.notes}</p>
            )}
            {pd.sources.length > 0 && (
              <div className="mt-2 text-xs text-neutral-500">
                Quellen: {pd.sources.map((s) => s.title).join("; ")}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
