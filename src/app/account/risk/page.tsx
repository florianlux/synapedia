"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClientSafe } from "@/lib/supabase/client";
import { computeRiskOverlay } from "@/lib/risk/compute";
import { RiskOverlayCard } from "@/components/risk/RiskOverlayCard";
import type { DosingLogEntry, RiskOverlayResult } from "@/lib/risk/models";

function todayAt(hours: number, minutes: number): string {
  const d = new Date();
  d.setHours(hours, minutes, 0, 0);
  return d.toISOString();
}

const DEMO_ENTRIES: DosingLogEntry[] = [
  { id: "demo-1", substance: "phenibut", dose_mg: 800, dose_g: null, route: "oral", notes: null, taken_at: todayAt(18, 0) },
  { id: "demo-2", substance: "a-pvp", dose_mg: null, dose_g: null, route: "vaporized", notes: null, taken_at: todayAt(3, 0) },
  { id: "demo-3", substance: "2-map-237", dose_mg: 60, dose_g: null, route: null, notes: null, taken_at: todayAt(3, 30) },
  { id: "demo-4", substance: "kratom", dose_mg: null, dose_g: 5, route: "oral", notes: null, taken_at: todayAt(8, 0) },
];

function RiskPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClientSafe();

  const [loading, setLoading] = useState(true);
  const [entries, setEntries] = useState<DosingLogEntry[]>([]);
  const [result, setResult] = useState<RiskOverlayResult | null>(null);
  const [demoLoaded, setDemoLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isDemo = searchParams.get("demo") === "1";

  useEffect(() => {
    async function load() {
      if (!supabase) {
        router.push("/auth/login");
        return;
      }
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/auth/login");
        return;
      }

      if (isDemo) {
        setEntries(DEMO_ENTRIES);
        setResult(computeRiskOverlay(DEMO_ENTRIES));
        setDemoLoaded(true);
        setLoading(false);
        return;
      }

      const now = new Date();
      const from = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
      const to = now.toISOString();

      try {
        const res = await fetch(`/api/dosing-logs?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`);
        if (res.ok) {
          const data: DosingLogEntry[] = await res.json();
          setEntries(data);
          if (data.length > 0) {
            setResult(computeRiskOverlay(data));
          }
        } else {
          setError("Daten konnten nicht geladen werden. Bitte versuche es erneut.");
        }
      } catch (err) {
        console.error("Failed to fetch dosing logs:", err);
        setError("Verbindungsfehler. Bitte prüfe deine Internetverbindung.");
      }

      setLoading(false);
    }
    load();
  }, [supabase, router, isDemo]);

  function loadDemo() {
    setEntries(DEMO_ENTRIES);
    setResult(computeRiskOverlay(DEMO_ENTRIES));
    setDemoLoaded(true);
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16">
        <p className="text-neutral-500">Laden…</p>
      </div>
    );
  }

  const hasEntries = entries.length > 0;

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="mb-6 text-2xl font-bold text-neutral-900 dark:text-neutral-50">
        Risiko-Overlay (letzte 24&nbsp;h)
      </h1>

      {error && (
        <p className="mb-4 rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
          {error}
        </p>
      )}

      {hasEntries && result ? (
        <>
          {demoLoaded && (
            <p className="mb-4 rounded-md border border-yellow-300 bg-yellow-50 px-3 py-2 text-sm text-yellow-800 dark:border-yellow-800 dark:bg-yellow-950 dark:text-yellow-300">
              Demo-Daten geladen – diese Einträge werden nicht gespeichert.
            </p>
          )}
          <RiskOverlayCard result={result} />
        </>
      ) : (
        <div className="rounded-lg border border-dashed border-neutral-300 p-8 text-center dark:border-neutral-700">
          <p className="mb-2 text-neutral-600 dark:text-neutral-400">
            Keine Einträge in den letzten 24&nbsp;Stunden.
          </p>
          <p className="mb-4 text-sm text-neutral-500 dark:text-neutral-500">
            Füge Einträge im{" "}
            <Link href="/account/logs" className="text-cyan-600 underline hover:text-cyan-700 dark:text-cyan-400">
              Protokoll
            </Link>{" "}
            hinzu, um eine Risikoanalyse zu erhalten.
          </p>
          <button
            onClick={loadDemo}
            className="rounded-md bg-cyan-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-cyan-700"
          >
            Demo-Daten laden
          </button>
        </div>
      )}

      <div className="mt-6">
        <Link
          href="/account"
          className="text-sm text-cyan-600 hover:text-cyan-700 dark:text-cyan-400 dark:hover:text-cyan-300"
        >
          ← Zurück zum Konto
        </Link>
      </div>
    </div>
  );
}

export default function RiskPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-2xl px-4 py-16"><p className="text-neutral-500">Laden…</p></div>}>
      <RiskPageInner />
    </Suspense>
  );
}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDemo]);

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <div className="mb-6">
        <Link
          href="/account/logs"
          className="inline-flex items-center gap-1 text-sm text-neutral-500 transition-colors hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200"
        >
          <ArrowLeft className="h-4 w-4" />
          Zurück zum Protokoll
        </Link>
      </div>

      <div className="mb-8">
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-50">
          🛡️ Risiko-Overlay (Harm Reduction)
        </h1>
        <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">
          Heuristische Risikoanalyse basierend auf deinen Einträgen der letzten 24 Stunden.
          <br />
          <strong>Keine medizinische Beratung. Keine Dosierungsempfehlungen.</strong>
        </p>
      </div>

      {isDemo && (
        <div className="mb-6 rounded-lg border border-amber-300 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950/30">
          <div className="flex items-center gap-2">
            <FlaskConical className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            <span className="font-medium text-amber-800 dark:text-amber-300">
              Demo-Modus
            </span>
          </div>
          <p className="mt-1 text-sm text-amber-700 dark:text-amber-400">
            Zeigt eine Beispiel-Analyse mit Testdaten (Phenibut, α-PVP, 2-MAP-237, Kratom).
          </p>
        </div>
      )}

      {loading ? (
        <p className="text-neutral-500">Analyse wird berechnet…</p>
      ) : logCount === 0 && !isDemo ? (
        <div className="rounded-lg border border-dashed border-neutral-300 p-8 text-center dark:border-neutral-700">
          <p className="text-neutral-500 dark:text-neutral-400">
            Keine Einträge in den letzten 24 Stunden.
          </p>
          <div className="mt-4 flex flex-col items-center gap-2">
            <Link
              href="/account/logs"
              className="rounded-md bg-cyan-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-cyan-700"
            >
              Einträge hinzufügen
            </Link>
            <Link
              href="/account/risk?demo=1"
              className="text-sm text-cyan-600 hover:underline dark:text-cyan-400"
            >
              Demo-Daten anzeigen
            </Link>
          </div>
        </div>
      ) : result ? (
        <>
          <p className="mb-4 text-sm text-neutral-500 dark:text-neutral-400">
            {logCount} Einträge analysiert.
          </p>
          <RiskOverlayCard result={result} />
        </>
      ) : null}
    </div>
  );
}
