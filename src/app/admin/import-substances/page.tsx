"use client";

import { useState, useCallback, useMemo, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Globe, Database, Loader2, CheckCircle, AlertTriangle,
  Download, Play, Eye, FileText, Filter, RotateCcw,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface WikidataItem {
  qid: string;
  pubchem_cid: number;
  label: string;
  description: string;
}

type WikidataStatus = "ok" | "failed";
type PubChemStatus = "ok" | "not_found" | "error" | "skipped";
type AiStatus = "ok" | "failed" | "skipped";
type DbStatus = "inserted" | "updated" | "skipped" | "failed";

interface ImportItemResult {
  label: string;
  qid: string;
  slug?: string;
  status?: "inserted" | "updated" | "skipped" | "failed";
  reason?: string;
  wikidata_status: WikidataStatus;
  pubchem_status: PubChemStatus;
  ai_status: AiStatus;
  db_status: DbStatus;
  confidence_score: number;
  error?: string;
}

interface BatchApiResponse {
  ok: boolean;
  results: ImportItemResult[];
  error?: string;
}

interface BatchProgress {
  totalItems: number;
  processedItems: number;
  successCount: number;
  failCount: number;
  currentBatch: number;
  totalBatches: number;
}

type PipelineStep = "idle" | "wikidata" | "importing" | "done" | "error";

// ---------------------------------------------------------------------------
// SPARQL fetcher (client-side)
// ---------------------------------------------------------------------------

const SPARQL_ENDPOINT = "https://query.wikidata.org/sparql";

function buildSparqlQuery(limit: number): string {
  return `
SELECT DISTINCT ?item ?pubchemCID ?itemLabel ?itemDescription WHERE {
  {
    ?item wdt:P31/wdt:P279* wd:Q8386 .
  } UNION {
    ?item wdt:P31 wd:Q207011 .
  }
  ?item wdt:P662 ?pubchemCID .
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en,de" . }
}
ORDER BY ?itemLabel
LIMIT ${limit}
`.trim();
}

async function fetchWikidata(limit: number): Promise<WikidataItem[]> {
  const query = buildSparqlQuery(limit);
  const params = new URLSearchParams({ query, format: "json" });
  const res = await fetch(`${SPARQL_ENDPOINT}?${params.toString()}`, {
    headers: { Accept: "application/sparql-results+json" },
  });
  if (!res.ok) throw new Error(`Wikidata error: ${res.status}`);
  const data = await res.json();

  const seen = new Set<string>();
  const items: WikidataItem[] = [];
  for (const b of data.results.bindings) {
    const qid = b.item.value.replace("http://www.wikidata.org/entity/", "");
    const cid = parseInt(b.pubchemCID.value, 10);
    if (!qid || isNaN(cid) || seen.has(qid)) continue;
    seen.add(qid);
    items.push({
      qid,
      pubchem_cid: cid,
      label: b.itemLabel?.value ?? "",
      description: b.itemDescription?.value ?? "",
    });
  }
  return items;
}

// ---------------------------------------------------------------------------
// Status badge helpers
// ---------------------------------------------------------------------------

function StatusBadge({ status, type }: { status: string; type: "wikidata" | "pubchem" | "ai" | "db" }) {
  const colorMap: Record<string, string> = {
    ok: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
    inserted: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
    updated: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
    not_found: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300",
    skipped: "bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400",
    failed: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
    error: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
  };

  const prefix = type === "wikidata" ? "WD" : type === "pubchem" ? "PC" : type === "ai" ? "AI" : "DB";
  return (
    <Badge variant="secondary" className={`text-[10px] ${colorMap[status] ?? ""}`}>
      {prefix}: {status}
    </Badge>
  );
}

function ConfidenceChip({ score }: { score: number }) {
  const color = score >= 70
    ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
    : score >= 40
      ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300"
      : "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300";
  return (
    <Badge variant="secondary" className={`text-[10px] font-mono ${color}`}>
      {score}%
    </Badge>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ImportSubstancesPage() {
  const [step, setStep] = useState<PipelineStep>("idle");
  const [limit, setLimit] = useState(100);
  const [batchSize, setBatchSize] = useState(5);
  const [dryRun, setDryRun] = useState(true);
  const [skipAi, setSkipAi] = useState(false);
  const [skipPubChem, setSkipPubChem] = useState(false);
  const [showNeedsReview, setShowNeedsReview] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [wikidataItems, setWikidataItems] = useState<WikidataItem[]>([]);
  const [allResults, setAllResults] = useState<ImportItemResult[]>([]);
  const [progress, setProgress] = useState<BatchProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef(false);

  const addLog = useCallback((msg: string) => {
    setLogs((prev) => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
  }, []);

  // Step 1: Fetch from Wikidata
  const handleFetchWikidata = useCallback(async () => {
    setStep("wikidata");
    setError(null);
    setLogs([]);
    setAllResults([]);
    setProgress(null);
    addLog(`Starte Wikidata SPARQL-Abfrage (limit=${limit})…`);

    try {
      const items = await fetchWikidata(limit);
      setWikidataItems(items);
      addLog(`✓ ${items.length} Substanzen von Wikidata geladen.`);
      setStep("idle");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unbekannter Fehler";
      addLog(`✗ Fehler: ${msg}`);
      setError(msg);
      setStep("error");
    }
  }, [limit, addLog]);

  // Step 2: Run import pipeline with client-side batching
  const runBatchedImport = useCallback(async (itemsToImport: WikidataItem[]) => {
    if (itemsToImport.length === 0) return;
    setStep("importing");
    setError(null);
    abortRef.current = false;

    const totalItems = itemsToImport.length;
    const totalBatches = Math.ceil(totalItems / batchSize);
    const collectedResults: ImportItemResult[] = [];
    let successCount = 0;
    let failCount = 0;

    addLog(
      `Starte Import-Pipeline (${totalItems} Items, ${totalBatches} Batches à ${batchSize}, dryRun=${dryRun}, skipAi=${skipAi}, skipPubChem=${skipPubChem})…`,
    );

    setProgress({ totalItems, processedItems: 0, successCount: 0, failCount: 0, currentBatch: 0, totalBatches });

    for (let i = 0; i < totalBatches; i++) {
      if (abortRef.current) {
        addLog("⏹ Import abgebrochen.");
        break;
      }

      const batchItems = itemsToImport.slice(i * batchSize, (i + 1) * batchSize);
      const batchNum = i + 1;
      addLog(`Batch ${batchNum}/${totalBatches} (${batchItems.length} Items)…`);

      try {
        const res = await fetch("/api/admin/import-substances", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            items: batchItems,
            dryRun,
            skipAi,
            skipPubChem,
          }),
        });

        const data: BatchApiResponse = await res.json();

        if (!res.ok || !data.ok) {
          // Whole batch failed — mark all items as failed
          const failedResults: ImportItemResult[] = batchItems.map((item) => ({
            label: item.label,
            qid: item.qid,
            status: "failed" as const,
            reason: data.error || `HTTP ${res.status}`,
            wikidata_status: "ok" as WikidataStatus,
            pubchem_status: "skipped" as PubChemStatus,
            ai_status: "skipped" as AiStatus,
            db_status: "failed" as DbStatus,
            confidence_score: 0,
          }));
          collectedResults.push(...failedResults);
          failCount += batchItems.length;
          addLog(`✗ Batch ${batchNum} fehlgeschlagen: ${data.error || `HTTP ${res.status}`}`);
        } else {
          // Process individual results
          for (const r of data.results) {
            collectedResults.push(r);
            if (r.db_status === "failed" || r.status === "failed") {
              failCount++;
            } else {
              successCount++;
            }
          }
          addLog(`✓ Batch ${batchNum} abgeschlossen (${data.results.length} Items).`);
        }
      } catch (err) {
        // Network error for this batch
        const msg = err instanceof Error ? err.message : "Netzwerkfehler";
        const failedResults: ImportItemResult[] = batchItems.map((item) => ({
          label: item.label,
          qid: item.qid,
          status: "failed" as const,
          reason: msg,
          wikidata_status: "ok" as WikidataStatus,
          pubchem_status: "skipped" as PubChemStatus,
          ai_status: "skipped" as AiStatus,
          db_status: "failed" as DbStatus,
          confidence_score: 0,
        }));
        collectedResults.push(...failedResults);
        failCount += batchItems.length;
        addLog(`✗ Batch ${batchNum} Netzwerkfehler: ${msg}`);
      }

      // Update progress & results incrementally
      setProgress({
        totalItems,
        processedItems: Math.min((i + 1) * batchSize, totalItems),
        successCount,
        failCount,
        currentBatch: batchNum,
        totalBatches,
      });
      setAllResults([...collectedResults]);
    }

    addLog(
      `✓ Pipeline abgeschlossen: ${successCount} erfolgreich, ${failCount} fehlgeschlagen.`,
    );
    setStep("done");
  }, [batchSize, dryRun, skipAi, skipPubChem, addLog]);

  const handleRunImport = useCallback(async () => {
    setAllResults([]);
    setProgress(null);
    await runBatchedImport(wikidataItems);
  }, [wikidataItems, runBatchedImport]);

  const handleRetryFailed = useCallback(async () => {
    const failedQids = new Set(
      allResults
        .filter((r) => r.db_status === "failed" || r.status === "failed")
        .map((r) => r.qid),
    );
    const failedItems = wikidataItems.filter((item) => failedQids.has(item.qid));
    if (failedItems.length === 0) return;

    addLog(`Wiederhole ${failedItems.length} fehlgeschlagene Items…`);

    // Remove old failed results, keep successes
    setAllResults((prev) =>
      prev.filter((r) => r.db_status !== "failed" && r.status !== "failed"),
    );
    await runBatchedImport(failedItems);
  }, [allResults, wikidataItems, runBatchedImport, addLog]);

  const handleReset = useCallback(() => {
    setStep("idle");
    setLogs([]);
    setWikidataItems([]);
    setAllResults([]);
    setProgress(null);
    setError(null);
    setShowNeedsReview(false);
    abortRef.current = false;
  }, []);

  const isRunning = step === "wikidata" || step === "importing";

  // Compute summary from collected results
  const summary = useMemo(() => {
    if (allResults.length === 0) return null;
    return {
      total: allResults.length,
      inserted: allResults.filter((r) => r.db_status === "inserted").length,
      updated: allResults.filter((r) => r.db_status === "updated").length,
      skipped: allResults.filter((r) => r.db_status === "skipped").length,
      failed: allResults.filter((r) => r.db_status === "failed").length,
      pubchem_not_found: allResults.filter((r) => r.pubchem_status === "not_found").length,
      avg_confidence: allResults.length > 0
        ? Math.round(allResults.reduce((sum, r) => sum + (r.confidence_score ?? 0), 0) / allResults.length)
        : 0,
    };
  }, [allResults]);

  // Filter items that need review
  const displayItems = useMemo(() => {
    if (allResults.length === 0) return [];
    if (!showNeedsReview) return allResults;
    return allResults.filter(
      (item) =>
        (item.confidence_score ?? 0) < 70 ||
        item.ai_status !== "ok" ||
        item.db_status === "failed",
    );
  }, [allResults, showNeedsReview]);

  const failedCount = allResults.filter(
    (r) => r.db_status === "failed" || r.status === "failed",
  ).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-50">
            Import-Pipeline
          </h1>
          <p className="text-sm text-neutral-500">
            Resilient Import Engine — Wikidata + PubChem + AI Enrichment
          </p>
        </div>
        <Badge variant={step === "done" ? "default" : step === "error" ? "destructive" : "secondary"}>
          {step === "idle" && "Bereit"}
          {step === "wikidata" && "Wikidata…"}
          {step === "importing" && "Pipeline läuft…"}
          {step === "done" && "Fertig"}
          {step === "error" && "Fehler"}
        </Badge>
      </div>

      {/* Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Globe className="h-4 w-4" />
            Pipeline-Steuerung
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-end gap-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-600 dark:text-neutral-400">
                Limit (max. Substanzen)
              </label>
              <Input
                type="number"
                min={1}
                max={5000}
                value={limit}
                onChange={(e) => setLimit(Number(e.target.value))}
                className="w-28"
                disabled={isRunning}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-600 dark:text-neutral-400">
                Batch-Größe
              </label>
              <Input
                type="number"
                min={1}
                max={20}
                value={batchSize}
                onChange={(e) => setBatchSize(Math.max(1, Math.min(20, Number(e.target.value))))}
                className="w-28"
                disabled={isRunning}
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="dryRun"
                checked={dryRun}
                onChange={(e) => setDryRun(e.target.checked)}
                disabled={isRunning}
                className="h-4 w-4"
              />
              <label htmlFor="dryRun" className="text-sm text-neutral-600 dark:text-neutral-400">
                Dry-Run (keine DB-Schreibvorgänge)
              </label>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="skipAi"
                checked={skipAi}
                onChange={(e) => setSkipAi(e.target.checked)}
                disabled={isRunning}
                className="h-4 w-4"
              />
              <label htmlFor="skipAi" className="text-sm text-neutral-600 dark:text-neutral-400">
                AI überspringen
              </label>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="skipPubChem"
                checked={skipPubChem}
                onChange={(e) => setSkipPubChem(e.target.checked)}
                disabled={isRunning}
                className="h-4 w-4"
              />
              <label htmlFor="skipPubChem" className="text-sm text-neutral-600 dark:text-neutral-400">
                PubChem überspringen
              </label>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={handleFetchWikidata} disabled={isRunning} size="sm">
              {step === "wikidata" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
              1. Wikidata laden
            </Button>
            <Button
              onClick={handleRunImport}
              disabled={isRunning || wikidataItems.length === 0}
              size="sm"
              variant={dryRun ? "secondary" : "default"}
            >
              {step === "importing" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : dryRun ? <Eye className="mr-2 h-4 w-4" /> : <Play className="mr-2 h-4 w-4" />}
              2. {dryRun ? "Dry-Run" : "Importieren"} (PubChem + AI + DB)
            </Button>
            {failedCount > 0 && step === "done" && (
              <Button onClick={handleRetryFailed} size="sm" variant="outline">
                <RotateCcw className="mr-2 h-4 w-4" />
                {failedCount} Fehlgeschlagene wiederholen
              </Button>
            )}
            <Button onClick={handleReset} variant="outline" size="sm" disabled={isRunning}>
              Zurücksetzen
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Progress bar */}
      {progress && step === "importing" && (
        <Card>
          <CardContent className="py-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>
                  Batch {progress.currentBatch}/{progress.totalBatches} —{" "}
                  {progress.processedItems}/{progress.totalItems} Items
                </span>
                <span>
                  <span className="text-green-600">{progress.successCount} ✓</span>{" "}
                  <span className="text-red-600">{progress.failCount} ✗</span>
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-700">
                <div
                  className="h-full rounded-full bg-violet-600 transition-all duration-300"
                  style={{ width: `${Math.round((progress.processedItems / progress.totalItems) * 100)}%` }}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary cards */}
      {summary && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CheckCircle className="h-4 w-4 text-green-500" />
              Import-Ergebnis
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-7">
              <div className="text-center">
                <div className="text-2xl font-bold">{summary.total}</div>
                <div className="text-xs text-neutral-500">Gesamt</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{summary.inserted}</div>
                <div className="text-xs text-neutral-500">Eingefügt</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{summary.updated}</div>
                <div className="text-xs text-neutral-500">Aktualisiert</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-neutral-400">{summary.skipped}</div>
                <div className="text-xs text-neutral-500">Übersprungen</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">{summary.failed}</div>
                <div className="text-xs text-neutral-500">Fehler</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-600">{summary.pubchem_not_found}</div>
                <div className="text-xs text-neutral-500">PC nicht gefunden</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-violet-600">{summary.avg_confidence}%</div>
                <div className="text-xs text-neutral-500">Ø Konfidenz</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Results table */}
      {displayItems.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                <FileText className="h-4 w-4" />
                Ergebnisse ({displayItems.length}{showNeedsReview ? ` von ${allResults.length}` : ""})
              </CardTitle>
              <Button
                variant={showNeedsReview ? "default" : "outline"}
                size="sm"
                onClick={() => setShowNeedsReview(!showNeedsReview)}
              >
                <Filter className="mr-1 h-3 w-3" />
                {showNeedsReview ? "Alle zeigen" : "Needs Review"}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="max-h-96 overflow-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-neutral-50 dark:bg-neutral-900">
                  <tr className="text-left text-xs text-neutral-500">
                    <th className="p-2">#</th>
                    <th className="p-2">Label</th>
                    <th className="p-2">QID</th>
                    <th className="p-2">Status</th>
                    <th className="p-2">Konfidenz</th>
                    <th className="p-2">Fehler</th>
                  </tr>
                </thead>
                <tbody>
                  {displayItems.slice(0, 200).map((item, idx) => (
                    <tr key={item.qid} className="border-t border-neutral-100 dark:border-neutral-800">
                      <td className="p-2 text-neutral-400">{idx + 1}</td>
                      <td className="p-2 font-medium">{item.label}</td>
                      <td className="p-2">
                        <a
                          href={`https://www.wikidata.org/wiki/${item.qid}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-violet-500 hover:underline"
                        >
                          {item.qid}
                        </a>
                      </td>
                      <td className="p-2">
                        <div className="flex flex-wrap gap-1">
                          <StatusBadge status={item.wikidata_status} type="wikidata" />
                          <StatusBadge status={item.pubchem_status} type="pubchem" />
                          <StatusBadge status={item.ai_status} type="ai" />
                          <StatusBadge status={item.db_status} type="db" />
                        </div>
                      </td>
                      <td className="p-2">
                        <ConfidenceChip score={item.confidence_score ?? 0} />
                      </td>
                      <td className="p-2 text-xs text-red-500 max-w-xs truncate">
                        {item.reason || item.error || "–"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {displayItems.length > 200 && (
                <p className="p-2 text-center text-xs text-neutral-400">
                  … und {displayItems.length - 200} weitere
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Preview table (before import) */}
      {wikidataItems.length > 0 && allResults.length === 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Database className="h-4 w-4" />
              Wikidata-Vorschau ({wikidataItems.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="max-h-96 overflow-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-neutral-50 dark:bg-neutral-900">
                  <tr className="text-left text-xs text-neutral-500">
                    <th className="p-2">#</th>
                    <th className="p-2">Label</th>
                    <th className="p-2">QID</th>
                    <th className="p-2">PubChem CID</th>
                    <th className="p-2">Beschreibung</th>
                  </tr>
                </thead>
                <tbody>
                  {wikidataItems.slice(0, 200).map((item, idx) => (
                    <tr key={item.qid} className="border-t border-neutral-100 dark:border-neutral-800">
                      <td className="p-2 text-neutral-400">{idx + 1}</td>
                      <td className="p-2 font-medium">{item.label}</td>
                      <td className="p-2">
                        <a
                          href={`https://www.wikidata.org/wiki/${item.qid}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-violet-500 hover:underline"
                        >
                          {item.qid}
                        </a>
                      </td>
                      <td className="p-2">
                        <a
                          href={`https://pubchem.ncbi.nlm.nih.gov/compound/${item.pubchem_cid}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-violet-500 hover:underline"
                        >
                          {item.pubchem_cid}
                        </a>
                      </td>
                      <td className="p-2 text-neutral-500 truncate max-w-xs">{item.description || "–"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {wikidataItems.length > 200 && (
                <p className="p-2 text-center text-xs text-neutral-400">
                  … und {wikidataItems.length - 200} weitere
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error display */}
      {error && (
        <Card className="border-red-200 dark:border-red-800">
          <CardContent className="flex items-start gap-3 py-4">
            <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-500" />
            <div>
              <p className="font-medium text-red-700 dark:text-red-400">Fehler</p>
              <p className="text-sm text-red-600 dark:text-red-300">{error}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Log panel */}
      {logs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Logs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="max-h-48 overflow-auto rounded bg-neutral-900 p-3 font-mono text-xs text-neutral-300">
              {logs.map((log, i) => (
                <div key={i}>{log}</div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
