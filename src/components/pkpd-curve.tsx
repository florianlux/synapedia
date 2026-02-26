"use client";

import { useMemo, useState } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp, FlaskConical } from "lucide-react";
import { computePKCurve } from "@/lib/pkpd-math";
import type { PharmacokineticRoute, Pharmacodynamics } from "@/lib/types";

interface PKPDCurveProps {
  pkRoutes: PharmacokineticRoute[];
  pdParams: Pharmacodynamics[];
  substanceName?: string;
}

const ROUTE_COLORS: Record<string, string> = {
  oral: "#3b82f6",
  nasal: "#10b981",
  iv: "#ef4444",
  smoked: "#f59e0b",
  sublingual: "#8b5cf6",
};

const ROUTE_LABELS: Record<string, string> = {
  oral: "Oral",
  nasal: "Nasal",
  iv: "Intravenös",
  smoked: "Geraucht",
  sublingual: "Sublingual",
};

const CONFIDENCE_LABELS: Record<string, string> = {
  literature: "Literatur",
  clinical: "Klinisch",
  estimate: "Schätzung",
  low: "Gering",
};

export function PKPDCurve({ pkRoutes, pdParams, substanceName }: PKPDCurveProps) {
  const [activeRoutes, setActiveRoutes] = useState<Set<string>>(
    new Set(pkRoutes.map((r) => r.route))
  );
  const [scienceMode, setScienceMode] = useState(false);

  const toggleRoute = (route: string) => {
    setActiveRoutes((prev) => {
      const next = new Set(prev);
      if (next.has(route)) {
        if (next.size > 1) next.delete(route);
      } else {
        next.add(route);
      }
      return next;
    });
  };

  const curveData = useMemo(() => {
    const allPoints = new Map<number, Record<string, number>>();

    for (const pk of pkRoutes) {
      if (!activeRoutes.has(pk.route)) continue;
      const pd = pdParams.find((p) => !p.route || p.route === pk.route) ?? null;
      const points = computePKCurve(pk, pd);

      for (const p of points) {
        if (!allPoints.has(p.t)) allPoints.set(p.t, { t: p.t });
        const entry = allPoints.get(p.t)!;
        entry[`${pk.route}_mean`] = p.mean;
        entry[`${pk.route}_low`] = p.low;
        entry[`${pk.route}_high`] = p.high;
      }
    }

    return Array.from(allPoints.values()).sort((a, b) => a.t - b.t);
  }, [pkRoutes, pdParams, activeRoutes]);

  if (pkRoutes.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <FlaskConical className="h-4 w-4" />
            PK/PD-Kurve
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-neutral-500">
            Keine pharmakokinetischen Daten verfügbar.
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
            <FlaskConical className="h-4 w-4" />
            PK/PD-Zeitverlauf
            {substanceName && (
              <span className="text-sm font-normal text-neutral-500">{substanceName}</span>
            )}
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setScienceMode((v) => !v)}
          >
            {scienceMode ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            Wissenschaftsmodus
          </Button>
        </div>

        {/* Route toggles */}
        <div className="mt-2 flex flex-wrap gap-2">
          {pkRoutes.map((pk) => (
            <button
              key={pk.route}
              onClick={() => toggleRoute(pk.route)}
              className={`rounded-full border px-3 py-1 text-xs font-medium transition-all ${
                activeRoutes.has(pk.route)
                  ? "border-transparent text-white"
                  : "border-neutral-300 text-neutral-500 dark:border-neutral-600"
              }`}
              style={
                activeRoutes.has(pk.route)
                  ? { backgroundColor: ROUTE_COLORS[pk.route] ?? "#6b7280" }
                  : {}
              }
            >
              {ROUTE_LABELS[pk.route] ?? pk.route}
            </button>
          ))}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <p className="text-xs text-neutral-500 dark:text-neutral-400">
          Relatives Modell (1-Kompartiment PK + Emax-PD). Nicht für medizinische Entscheidungen geeignet.
          Schraffierter Bereich = Unsicherheitsband (min/max-Parametervarianz).
        </p>

        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={curveData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="t"
              label={{ value: "Zeit (min)", position: "insideBottom", offset: -2, fontSize: 11 }}
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
                "",
              ]}
              labelFormatter={(t) => `${t} min`}
            />

            {pkRoutes
              .filter((pk) => activeRoutes.has(pk.route))
              .flatMap((pk) => {
                const color = ROUTE_COLORS[pk.route] ?? "#6b7280";
                return [
                  <Area
                    key={`${pk.route}_high`}
                    type="monotone"
                    dataKey={`${pk.route}_high`}
                    stroke="none"
                    fill={color}
                    fillOpacity={0.12}
                    legendType="none"
                    isAnimationActive={false}
                  />,
                  <Area
                    key={`${pk.route}_low`}
                    type="monotone"
                    dataKey={`${pk.route}_low`}
                    stroke="none"
                    fill="white"
                    fillOpacity={1}
                    legendType="none"
                    isAnimationActive={false}
                  />,
                  <Area
                    key={`${pk.route}_mean`}
                    type="monotone"
                    dataKey={`${pk.route}_mean`}
                    stroke={color}
                    strokeWidth={2}
                    fill={color}
                    fillOpacity={0.08}
                    name={ROUTE_LABELS[pk.route] ?? pk.route}
                  />,
                ];
              })}
          </AreaChart>
        </ResponsiveContainer>

        {/* Science Mode panel */}
        {scienceMode && (
          <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-4 dark:border-neutral-700 dark:bg-neutral-900">
            <h4 className="mb-3 text-sm font-semibold">Modellparameter</h4>
            <div className="space-y-4">
              {pkRoutes
                .filter((pk) => activeRoutes.has(pk.route))
                .map((pk) => {
                  const ke = pk.ke_h ?? (pk.half_life_h ? Math.log(2) / pk.half_life_h : null);
                  return (
                    <div key={pk.route} className="space-y-2">
                      <h5 className="text-xs font-semibold uppercase text-neutral-500">
                        {ROUTE_LABELS[pk.route] ?? pk.route}
                      </h5>
                      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs sm:grid-cols-4">
                        {pk.half_life_h !== null && (
                          <>
                            <span className="text-neutral-500">Halbwertszeit</span>
                            <span className="font-mono">{pk.half_life_h} h</span>
                          </>
                        )}
                        {ke !== null && (
                          <>
                            <span className="text-neutral-500">k_e</span>
                            <span className="font-mono">{ke.toFixed(4)} h⁻¹</span>
                          </>
                        )}
                        {pk.ka_h !== null && (
                          <>
                            <span className="text-neutral-500">k_a</span>
                            <span className="font-mono">{pk.ka_h} h⁻¹</span>
                          </>
                        )}
                        {pk.tmax_min !== null && (
                          <>
                            <span className="text-neutral-500">t_max</span>
                            <span className="font-mono">{pk.tmax_min}–{pk.tmax_max ?? pk.tmax_min} min</span>
                          </>
                        )}
                        {pk.bioavailability_f !== null && (
                          <>
                            <span className="text-neutral-500">Bioverfügbarkeit</span>
                            <span className="font-mono">{(pk.bioavailability_f * 100).toFixed(0)}%</span>
                          </>
                        )}
                        <span className="text-neutral-500">Konfidenz</span>
                        <span>{CONFIDENCE_LABELS[pk.confidence_level] ?? pk.confidence_level}</span>
                      </div>
                      {pk.sources.length > 0 && (
                        <div className="mt-1 text-xs text-neutral-500">
                          Quellen: {pk.sources.map((s) => s.title).join("; ")}
                        </div>
                      )}
                      {pk.notes && (
                        <p className="text-xs italic text-neutral-500">{pk.notes}</p>
                      )}
                    </div>
                  );
                })}

              <div className="border-t border-neutral-200 pt-3 dark:border-neutral-700">
                <p className="font-mono text-xs text-neutral-600 dark:text-neutral-400">
                  Modell: C(t) ∝ (kₐ/(kₐ−kₑ)) · (e⁻ᵏₑᵗ − e⁻ᵏₐᵗ)<br />
                  kₑ = ln(2) / t½ · E(C) = E₀ + (Emax · Cʰ) / (EC50ʰ + Cʰ)
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
