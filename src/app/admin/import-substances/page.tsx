"use client";

import { useState, useCallback, useMemo, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Globe, Database, Loader2, CheckCircle, AlertTriangle,
  Download, Play, Eye, FileText, Filter, RotateCcw,
  ChevronDown, ChevronRight, Trash2,
} from "lucide-react";
import {
  type ImportFilters,
  DEFAULT_FILTERS,
  CLASS_QIDS,
  buildSparqlQuery,
  computePsychoactiveConfidence,
} from "@/lib/connectors/wikidata-query-builder";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface WikidataItem {
  qid: string;
  pubchem_cid?: number;
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
type TabId = "query" | "vorschau" | "import" | "log";
type PreviewFilter = "all" | "with-pubchem" | "without-pubchem";

// ---------------------------------------------------------------------------
// German labels for substance classes
// ---------------------------------------------------------------------------

const CLASS_LABELS: Record<string, string> = {
  stimulant: "Stimulanzien",
  empathogen: "Empathogene",
  psychedelic: "Psychedelika",
  dissociative: "Dissoziativa",
  opioid: "Opioide",
  depressant: "Depressiva",
  deliriant: "Deliriantien",
  cannabinoid: "Cannabinoide",
  antidepressant: "Antidepressiva",
  antipsychotic: "Antipsychotika",
  anxiolytic: "Anxiolytika",
  analgesic: "Analgetika",
};

// ---------------------------------------------------------------------------
// SPARQL fetcher (client-side)
// ---------------------------------------------------------------------------

const SPARQL_ENDPOINT = "https://query.wikidata.org/sparql";

async function fetchWikidata(filters: ImportFilters): Promise<WikidataItem[]> {
  const query = buildSparqlQuery(filters);
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
    if (!qid || seen.has(qid)) continue;
    seen.add(qid);
    const cid = b.pubchemCID ? parseInt(b.pubchemCID.value, 10) : undefined;
    items.push({
      qid,
      pubchem_cid: cid != null && !isNaN(cid) ? cid : undefined,
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
// Tabs
// ---------------------------------------------------------------------------

const TABS: { id: TabId; label: string }[] = [
  { id: "query", label: "Query" },
  { id: "vorschau", label: "Vorschau" },
  { id: "import", label: "Import" },
  { id: "log", label: "Log" },
];

// ---------------------------------------------------------------------------
// Error step parser
// ---------------------------------------------------------------------------

function parseErrorStep(error: string | undefined): { step: string; message: string } | null {
  if (!error) return null;
  const match = error.match(/^(wikidata|pubchem|ai|db):(.+)/);
  if (match) return { step: match[1], message: match[2].trim() };
  return { step: "", message: error };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ImportSubstancesPage() {
  // Tabs
  const [activeTab, setActiveTab] = useState<TabId>("query");

  // Filters
  const [filters, setFilters] = useState<ImportFilters>(DEFAULT_FILTERS);
  const [showFilters, setShowFilters] = useState(false);

  // Pipeline state
  const [step, setStep] = useState<PipelineStep>("idle");
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

  // Preview filter
  const [previewFilter, setPreviewFilter] = useState<PreviewFilter>("all");

  const addLog = useCallback((msg: string) => {
    setLogs((prev) => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
  }, []);

  const updateFilter = useCallback(<K extends keyof ImportFilters>(key: K, value: ImportFilters[K]) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }, []);

  const toggleSubstanceClass = useCallback((cls: string) => {
    setFilters((prev) => {
      const classes = prev.substanceClasses.includes(cls)
        ? prev.substanceClasses.filter((c) => c !== cls)
        : [...prev.substanceClasses, cls];
      return { ...prev, substanceClasses: classes };
    });
  }, []);

  // Step 1: Fetch from Wikidata
  const handleFetchWikidata = useCallback(async () => {
    setStep("wikidata");
    setError(null);
    setLogs([]);
    setAllResults([]);
    setProgress(null);
    addLog(`Starte Wikidata SPARQL-Abfrage (limit=${filters.limit})…`);

    try {
      const items = await fetchWikidata(filters);
      setWikidataItems(items);
      addLog(`✓ ${items.length} Substanzen von Wikidata geladen.`);
      setStep("idle");
      setActiveTab("vorschau");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unbekannter Fehler";
      addLog(`✗ Fehler: ${msg}`);
      setError(msg);
      setStep("error");
    }
  }, [filters, addLog]);

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
    setActiveTab("import");
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
    setPreviewFilter("all");
    abortRef.current = false;
    setActiveTab("query");
  }, []);

  const handleExportJson = useCallback(() => {
    const blob = new Blob([JSON.stringify(wikidataItems, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `wikidata-items-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [wikidataItems]);

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

  // Filter import results for display
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

  // Filter preview items
  const filteredPreviewItems = useMemo(() => {
    if (previewFilter === "with-pubchem") return wikidataItems.filter((i) => i.pubchem_cid != null);
    if (previewFilter === "without-pubchem") return wikidataItems.filter((i) => i.pubchem_cid == null);
    return wikidataItems;
  }, [wikidataItems, previewFilter]);

  const failedCount = allResults.filter(
    (r) => r.db_status === "failed" || r.status === "failed",
  ).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-50">
            Import-Pipeline
          </h1>
          <p className="text-sm text-neutral-500">
            Resilient Import Engine — Wikidata + PubChem + AI Enrichment
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={step === "done" ? "default" : step === "error" ? "destructive" : "secondary"}>
            {step === "idle" && "Bereit"}
            {step === "wikidata" && "Wikidata…"}
            {step === "importing" && "Pipeline läuft…"}
            {step === "done" && "Fertig"}
            {step === "error" && "Fehler"}
          </Badge>
          <Button onClick={handleReset} variant="outline" size="sm" disabled={isRunning}>
            Zurücksetzen
          </Button>
        </div>
      </div>

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

      {/* Tab bar */}
      <div className="flex gap-1 border-b border-neutral-200 dark:border-neutral-700">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? "border-b-2 border-violet-600 text-violet-600 dark:border-violet-400 dark:text-violet-400"
                : "text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
            }`}
          >
            {tab.label}
            {tab.id === "vorschau" && wikidataItems.length > 0 && (
              <Badge variant="secondary" className="ml-2 text-[10px]">{wikidataItems.length}</Badge>
            )}
            {tab.id === "import" && allResults.length > 0 && (
              <Badge variant="secondary" className="ml-2 text-[10px]">{allResults.length}</Badge>
            )}
            {tab.id === "log" && logs.length > 0 && (
              <Badge variant="secondary" className="ml-2 text-[10px]">{logs.length}</Badge>
            )}
          </button>
        ))}
      </div>

      {/* ================================================================= */}
      {/* QUERY TAB                                                         */}
      {/* ================================================================= */}
      {activeTab === "query" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Globe className="h-4 w-4" />
              SPARQL-Abfrage konfigurieren
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Basic controls */}
            <div className="flex flex-wrap items-end gap-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-neutral-600 dark:text-neutral-400">
                  Limit (max. Substanzen)
                </label>
                <Input
                  type="number"
                  min={1}
                  max={5000}
                  value={filters.limit}
                  onChange={(e) => updateFilter("limit", Number(e.target.value))}
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
            </div>

            {/* Advanced filters toggle */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-1 text-sm font-medium text-violet-600 hover:text-violet-700 dark:text-violet-400 dark:hover:text-violet-300"
            >
              {showFilters ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              Erweiterte Filter
            </button>

            {showFilters && (
              <div className="space-y-4 rounded-lg border border-neutral-200 p-4 dark:border-neutral-700">
                {/* Scope section */}
                <div>
                  <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-neutral-500">Umfang</h4>
                  <div className="flex flex-wrap gap-4">
                    {(
                      [
                        ["includePharmaceuticals", "Pharmazeutika einschließen"],
                        ["includeNPS", "NPS einschließen"],
                        ["includeCombinations", "Kombinationen einschließen"],
                        ["requirePubChemCID", "PubChem-CID erforderlich"],
                        ["requirePsychoactive", "Psychoaktiv erforderlich"],
                      ] as const
                    ).map(([key, label]) => (
                      <div key={key} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id={key}
                          checked={filters[key]}
                          onChange={(e) => updateFilter(key, e.target.checked)}
                          disabled={isRunning}
                          className="h-4 w-4"
                        />
                        <label htmlFor={key} className="text-sm text-neutral-600 dark:text-neutral-400">
                          {label}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Substance classes section */}
                <div>
                  <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-neutral-500">Substanzklassen</h4>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                    {Object.keys(CLASS_QIDS).map((cls) => (
                      <div key={cls} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id={`cls-${cls}`}
                          checked={filters.substanceClasses.includes(cls)}
                          onChange={() => toggleSubstanceClass(cls)}
                          disabled={isRunning}
                          className="h-4 w-4"
                        />
                        <label htmlFor={`cls-${cls}`} className="text-sm text-neutral-600 dark:text-neutral-400">
                          {CLASS_LABELS[cls] ?? cls}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Quality section */}
                <div>
                  <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-neutral-500">Qualität</h4>
                  <div className="flex flex-wrap gap-4">
                    {(
                      [
                        ["excludeSalts", "Salze ausschließen"],
                        ["excludeHormones", "Hormone ausschließen"],
                        ["excludeNonPsychoactive", "Nicht-psychoaktive ausschließen"],
                      ] as const
                    ).map(([key, label]) => (
                      <div key={key} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id={key}
                          checked={filters[key]}
                          onChange={(e) => updateFilter(key, e.target.checked)}
                          disabled={isRunning}
                          className="h-4 w-4"
                        />
                        <label htmlFor={key} className="text-sm text-neutral-600 dark:text-neutral-400">
                          {label}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Legal section */}
                <div>
                  <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-neutral-500">Rechtliches</h4>
                  <div className="flex flex-wrap gap-4">
                    {(
                      [
                        ["hasUNScheduling", "UN-Scheduling vorhanden"],
                        ["germanyLegalStatusKnown", "Rechtsstatus in Deutschland bekannt"],
                      ] as const
                    ).map(([key, label]) => (
                      <div key={key} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id={key}
                          checked={filters[key]}
                          onChange={(e) => updateFilter(key, e.target.checked)}
                          disabled={isRunning}
                          className="h-4 w-4"
                        />
                        <label htmlFor={key} className="text-sm text-neutral-600 dark:text-neutral-400">
                          {label}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Fetch button */}
            <div>
              <Button onClick={handleFetchWikidata} disabled={isRunning} size="sm">
                {step === "wikidata" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                Wikidata laden
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ================================================================= */}
      {/* VORSCHAU TAB                                                      */}
      {/* ================================================================= */}
      {activeTab === "vorschau" && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                <Database className="h-4 w-4" />
                Wikidata-Vorschau ({filteredPreviewItems.length}
                {previewFilter !== "all" ? ` von ${wikidataItems.length}` : ""})
              </CardTitle>
              <Button
                onClick={handleExportJson}
                disabled={wikidataItems.length === 0}
                size="sm"
                variant="outline"
              >
                <FileText className="mr-1 h-3 w-3" />
                Export JSON
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {wikidataItems.length === 0 ? (
              <p className="py-8 text-center text-sm text-neutral-500">
                Noch keine Daten geladen. Wechsle zum &quot;Query&quot;-Tab, um Substanzen abzurufen.
              </p>
            ) : (
              <>
                {/* Preview filter buttons */}
                <div className="mb-4 flex gap-2">
                  {(
                    [
                      ["all", "Alle"],
                      ["with-pubchem", "Mit PubChem"],
                      ["without-pubchem", "Ohne PubChem"],
                    ] as [PreviewFilter, string][]
                  ).map(([key, label]) => (
                    <Button
                      key={key}
                      variant={previewFilter === key ? "default" : "outline"}
                      size="sm"
                      onClick={() => setPreviewFilter(key)}
                    >
                      {label}
                    </Button>
                  ))}
                </div>

                <div className="max-h-96 overflow-auto">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-neutral-50 dark:bg-neutral-900">
                      <tr className="text-left text-xs text-neutral-500">
                        <th className="p-2">#</th>
                        <th className="p-2">Label</th>
                        <th className="p-2">QID</th>
                        <th className="p-2">PubChem CID</th>
                        <th className="p-2">Psychoaktiv-Konfidenz</th>
                        <th className="p-2">Beschreibung</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredPreviewItems.slice(0, 200).map((item, idx) => {
                        const { score } = computePsychoactiveConfidence({
                          description: item.description,
                          pubchem_cid: item.pubchem_cid,
                        });
                        return (
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
                              {item.pubchem_cid != null ? (
                                <a
                                  href={`https://pubchem.ncbi.nlm.nih.gov/compound/${item.pubchem_cid}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-violet-500 hover:underline"
                                >
                                  {item.pubchem_cid}
                                </a>
                              ) : (
                                <span className="text-neutral-400">–</span>
                              )}
                            </td>
                            <td className="p-2">
                              <ConfidenceChip score={score} />
                            </td>
                            <td className="p-2 max-w-xs truncate text-neutral-500">{item.description || "–"}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  {filteredPreviewItems.length > 200 && (
                    <p className="p-2 text-center text-xs text-neutral-400">
                      … und {filteredPreviewItems.length - 200} weitere
                    </p>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* ================================================================= */}
      {/* IMPORT TAB                                                        */}
      {/* ================================================================= */}
      {activeTab === "import" && (
        <div className="space-y-6">
          {/* Import controls */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Play className="h-4 w-4" />
                Import-Steuerung
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="imp-dryRun"
                    checked={dryRun}
                    onChange={(e) => setDryRun(e.target.checked)}
                    disabled={isRunning}
                    className="h-4 w-4"
                  />
                  <label htmlFor="imp-dryRun" className="text-sm text-neutral-600 dark:text-neutral-400">
                    Dry-Run (keine DB-Schreibvorgänge)
                  </label>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="imp-skipAi"
                    checked={skipAi}
                    onChange={(e) => setSkipAi(e.target.checked)}
                    disabled={isRunning}
                    className="h-4 w-4"
                  />
                  <label htmlFor="imp-skipAi" className="text-sm text-neutral-600 dark:text-neutral-400">
                    AI überspringen
                  </label>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="imp-skipPubChem"
                    checked={skipPubChem}
                    onChange={(e) => setSkipPubChem(e.target.checked)}
                    disabled={isRunning}
                    className="h-4 w-4"
                  />
                  <label htmlFor="imp-skipPubChem" className="text-sm text-neutral-600 dark:text-neutral-400">
                    PubChem überspringen
                  </label>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  onClick={handleRunImport}
                  disabled={isRunning || wikidataItems.length === 0}
                  size="sm"
                  variant={dryRun ? "secondary" : "default"}
                >
                  {step === "importing" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : dryRun ? <Eye className="mr-2 h-4 w-4" /> : <Play className="mr-2 h-4 w-4" />}
                  {dryRun ? "Dry-Run starten" : "Importieren"} ({wikidataItems.length} Items)
                </Button>
                {failedCount > 0 && step === "done" && (
                  <Button onClick={handleRetryFailed} size="sm" variant="outline">
                    <RotateCcw className="mr-2 h-4 w-4" />
                    {failedCount} Fehlgeschlagene wiederholen
                  </Button>
                )}
              </div>
              {wikidataItems.length === 0 && (
                <p className="text-sm text-neutral-500">
                  Noch keine Daten geladen. Wechsle zum &quot;Query&quot;-Tab, um Substanzen abzurufen.
                </p>
              )}
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
                    {showNeedsReview ? "Alle zeigen" : "Prüfung nötig"}
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
                      {displayItems.slice(0, 200).map((item, idx) => {
                        const parsed = parseErrorStep(item.reason || item.error);
                        return (
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
                            <td className="p-2 max-w-xs">
                              {parsed ? (
                                <span className="text-xs text-red-500">
                                  {parsed.step && (
                                    <Badge variant="secondary" className="mr-1 text-[10px] bg-red-50 text-red-600 dark:bg-red-900 dark:text-red-300">
                                      {parsed.step}
                                    </Badge>
                                  )}
                                  <span className="truncate">{parsed.message}</span>
                                </span>
                              ) : (
                                <span className="text-xs text-neutral-400">–</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
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
        </div>
      )}

      {/* ================================================================= */}
      {/* LOG TAB                                                           */}
      {/* ================================================================= */}
      {activeTab === "log" && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Logs ({logs.length})</CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setLogs([])}
                disabled={logs.length === 0}
              >
                <Trash2 className="mr-1 h-3 w-3" />
                Logs löschen
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {logs.length === 0 ? (
              <p className="py-8 text-center text-sm text-neutral-500">
                Noch keine Logs vorhanden.
              </p>
            ) : (
              <div className="max-h-96 overflow-auto rounded bg-neutral-900 p-3 font-mono text-xs text-neutral-300">
                {logs.map((log, i) => (
                  <div key={i}>{log}</div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
