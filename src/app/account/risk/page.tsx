"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, FlaskConical } from "lucide-react";
import { createClientSafe } from "@/lib/supabase/client";
import { computeRiskOverlay } from "@/lib/risk/compute";
import type { RiskLogEntry, RiskOverlayResult } from "@/lib/risk/models";
import type { UserLog } from "@/lib/types";
import { RiskOverlayCard } from "@/components/risk/RiskOverlayCard";

/** Demo dataset for testing (activated via ?demo=1) */
function getDemoLogs(now: Date): RiskLogEntry[] {
  const today = now.toISOString().slice(0, 10);
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);

  return [
    {
      substance: "phenibut",
      dose_value: 800,
      dose_unit: "mg",
      route: "oral",
      taken_at: `${yesterday}T18:00:00.000Z`,
    },
    {
      substance: "a-pvp",
      dose_value: null,
      dose_unit: null,
      route: "vaporized",
      taken_at: `${today}T03:00:00.000Z`,
    },
    {
      substance: "2-map-237",
      dose_value: 60,
      dose_unit: "mg",
      route: null,
      taken_at: `${today}T03:30:00.000Z`,
    },
    {
      substance: "kratom",
      dose_value: 5,
      dose_unit: "g",
      route: "oral",
      taken_at: `${today}T08:00:00.000Z`,
    },
  ];
}

/** Convert UserLog entries to RiskLogEntry format */
function toRiskEntries(logs: UserLog[]): RiskLogEntry[] {
  return logs.map((log) => ({
    substance: log.substance_name || "unbekannt",
    dose_value: log.dose_value ?? null,
    dose_unit: log.dose_unit ?? null,
    route: log.route ?? null,
    taken_at: log.occurred_at,
  }));
}

export default function RiskOverlayPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isDemo = searchParams.get("demo") === "1";
  const supabase = createClientSafe();

  const [result, setResult] = useState<RiskOverlayResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [logCount, setLogCount] = useState(0);

  useEffect(() => {
    async function load() {
      const now = new Date();

      if (isDemo) {
        const demoLogs = getDemoLogs(now);
        setLogCount(demoLogs.length);
        setResult(computeRiskOverlay(demoLogs, now));
        setLoading(false);
        return;
      }

      if (!supabase) {
        router.push("/auth/login");
        return;
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push("/auth/login");
        return;
      }

      // Fetch last 24h logs from user_logs
      const since = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
      const { data } = await supabase
        .from("user_logs")
        .select("*")
        .eq("user_id", user.id)
        .gte("occurred_at", since)
        .order("occurred_at", { ascending: false });

      const logs = (data as UserLog[]) || [];
      setLogCount(logs.length);

      if (logs.length === 0) {
        setResult(computeRiskOverlay([], now));
      } else {
        setResult(computeRiskOverlay(toRiskEntries(logs), now));
      }

      setLoading(false);
    }
    load();
  }, [supabase, router, isDemo]);

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
