"use client";

import { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Globe, Database, Loader2, CheckCircle, XCircle, AlertTriangle,
  Download, Play, Eye, FileText,
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

interface PubChemEnrichment {
  cid: number;
  synonyms: string[];
  molecular_formula?: string;
  molecular_weight?: number;
}

interface ImportResult {
  label: string;
  qid: string;
  status: "created" | "updated" | "skipped" | "failed";
  error?: string;
}

interface ImportSummary {
  total: number;
  created: number;
  updated: number;
  skipped: number;
  failed: number;
}

type PipelineStep = "idle" | "wikidata" | "pubchem" | "preview" | "importing" | "done" | "error";

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
// PubChem enrichment (client-side, rate-limited)
// ---------------------------------------------------------------------------

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function enrichFromPubChem(
  items: WikidataItem[],
  onProgress: (done: number, total: number) => void,
): Promise<Record<number, PubChemEnrichment>> {
  const enrichments: Record<number, PubChemEnrichment> = {};
  const BATCH_DELAY = 350; // ~3 req/sec

  for (let i = 0; i < items.length; i++) {
    const cid = items[i].pubchem_cid;
    try {
      const res = await fetch(
        `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/${cid}/synonyms/JSON`,
      );
      if (res.ok) {
        const data = await res.json();
        const synonyms = data?.InformationList?.Information?.[0]?.Synonym ?? [];
        enrichments[cid] = { cid, synonyms: synonyms.slice(0, 20) };
      } else {
        enrichments[cid] = { cid, synonyms: [] };
      }
    } catch {
      enrichments[cid] = { cid, synonyms: [] };
    }
    onProgress(i + 1, items.length);
    if (i < items.length - 1) await sleep(BATCH_DELAY);
  }
  return enrichments;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ImportSubstancesPage() {
  const [step, setStep] = useState<PipelineStep>("idle");
  const [limit, setLimit] = useState(100);
  const [dryRun, setDryRun] = useState(true);
  const [logs, setLogs] = useState<string[]>([]);
  const [wikidataItems, setWikidataItems] = useState<WikidataItem[]>([]);
  const [enrichments, setEnrichments] = useState<Record<number, PubChemEnrichment>>({});
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [results, setResults] = useState<ImportResult[]>([]);
  const [summary, setSummary] = useState<ImportSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  const addLog = useCallback((msg: string) => {
    setLogs((prev) => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
  }, []);

  // Step 1: Fetch from Wikidata
  const handleFetchWikidata = useCallback(async () => {
    setStep("wikidata");
    setError(null);
    setLogs([]);
    addLog(`Starte Wikidata SPARQL-Abfrage (limit=${limit})…`);

    try {
      const items = await fetchWikidata(limit);
      setWikidataItems(items);
      addLog(`✓ ${items.length} Substanzen von Wikidata geladen.`);
      setStep("preview");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unbekannter Fehler";
      addLog(`✗ Fehler: ${msg}`);
      setError(msg);
      setStep("error");
    }
  }, [limit, addLog]);

  // Step 2: Enrich from PubChem
  const handleEnrichPubChem = useCallback(async () => {
    if (wikidataItems.length === 0) return;
    setStep("pubchem");
    addLog(`Starte PubChem-Anreicherung für ${wikidataItems.length} CIDs…`);

    try {
      const result = await enrichFromPubChem(wikidataItems, (done, total) => {
        setProgress({ done, total });
      });
      setEnrichments(result);
      addLog(`✓ ${Object.keys(result).length} CIDs angereichert.`);
      setStep("preview");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unbekannter Fehler";
      addLog(`✗ PubChem-Fehler: ${msg}`);
      setError(msg);
      setStep("error");
    }
  }, [wikidataItems, addLog]);

  // Step 3: Import to DB
  const handleImport = useCallback(async () => {
    if (wikidataItems.length === 0) return;
    setStep("importing");
    addLog(`Starte Import (dryRun=${dryRun})…`);

    try {
      const res = await fetch("/api/admin/import-substances", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: wikidataItems,
          enrichments,
          dryRun,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || `HTTP ${res.status}`);
      }

      if (dryRun) {
        addLog(`✓ Dry-Run: ${data.count} Substanzen würden importiert.`);
        setStep("preview");
      } else {
        setSummary(data.summary);
        setResults(data.results ?? []);
        addLog(`✓ Import abgeschlossen: ${data.summary.created} erstellt, ${data.summary.updated} aktualisiert, ${data.summary.failed} fehlgeschlagen.`);
        setStep("done");
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unbekannter Fehler";
      addLog(`✗ Import-Fehler: ${msg}`);
      setError(msg);
      setStep("error");
    }
  }, [wikidataItems, enrichments, dryRun, addLog]);

  const handleReset = useCallback(() => {
    setStep("idle");
    setLogs([]);
    setWikidataItems([]);
    setEnrichments({});
    setResults([]);
    setSummary(null);
    setError(null);
    setProgress({ done: 0, total: 0 });
  }, []);

  const isRunning = step === "wikidata" || step === "pubchem" || step === "importing";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-50">
            Import-Pipeline
          </h1>
          <p className="text-sm text-neutral-500">
            Automatischer Import von Substanz-Metadaten via Wikidata + PubChem
          </p>
        </div>
        <Badge variant={step === "done" ? "default" : step === "error" ? "destructive" : "secondary"}>
          {step === "idle" && "Bereit"}
          {step === "wikidata" && "Wikidata…"}
          {step === "pubchem" && "PubChem…"}
          {step === "preview" && "Vorschau"}
          {step === "importing" && "Importiert…"}
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
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={handleFetchWikidata} disabled={isRunning} size="sm">
              {step === "wikidata" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
              1. Wikidata laden
            </Button>
            <Button
              onClick={handleEnrichPubChem}
              disabled={isRunning || wikidataItems.length === 0}
              size="sm"
              variant="secondary"
            >
              {step === "pubchem" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Database className="mr-2 h-4 w-4" />}
              2. PubChem anreichern
            </Button>
            <Button
              onClick={handleImport}
              disabled={isRunning || wikidataItems.length === 0}
              size="sm"
              variant={dryRun ? "secondary" : "default"}
            >
              {step === "importing" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : dryRun ? <Eye className="mr-2 h-4 w-4" /> : <Play className="mr-2 h-4 w-4" />}
              3. {dryRun ? "Dry-Run" : "Importieren"}
            </Button>
            <Button onClick={handleReset} variant="outline" size="sm" disabled={isRunning}>
              Zurücksetzen
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Progress bar for PubChem */}
      {step === "pubchem" && progress.total > 0 && (
        <Card>
          <CardContent className="py-4">
            <div className="mb-2 flex justify-between text-xs text-neutral-500">
              <span>PubChem-Anreicherung</span>
              <span>{progress.done} / {progress.total}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-700">
              <div
                className="h-full rounded-full bg-violet-500 transition-all"
                style={{ width: `${(progress.done / progress.total) * 100}%` }}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary */}
      {summary && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CheckCircle className="h-4 w-4 text-green-500" />
              Import-Ergebnis
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
              <div className="text-center">
                <div className="text-2xl font-bold">{summary.total}</div>
                <div className="text-xs text-neutral-500">Gesamt</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{summary.created}</div>
                <div className="text-xs text-neutral-500">Erstellt</div>
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
            </div>
          </CardContent>
        </Card>
      )}

      {/* Preview table */}
      {wikidataItems.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="h-4 w-4" />
              Substanzen ({wikidataItems.length})
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
                    <th className="p-2">Synonyme</th>
                    {results.length > 0 && <th className="p-2">Status</th>}
                  </tr>
                </thead>
                <tbody>
                  {wikidataItems.slice(0, 200).map((item, idx) => {
                    const result = results.find((r) => r.qid === item.qid);
                    const enrichment = enrichments[item.pubchem_cid];
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
                          <a
                            href={`https://pubchem.ncbi.nlm.nih.gov/compound/${item.pubchem_cid}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-violet-500 hover:underline"
                          >
                            {item.pubchem_cid}
                          </a>
                        </td>
                        <td className="p-2 text-neutral-500">
                          {enrichment ? enrichment.synonyms.length : "–"}
                        </td>
                        {results.length > 0 && (
                          <td className="p-2">
                            {result?.status === "created" && (
                              <Badge variant="default" className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
                                <CheckCircle className="mr-1 h-3 w-3" /> Erstellt
                              </Badge>
                            )}
                            {result?.status === "updated" && (
                              <Badge variant="secondary">Aktualisiert</Badge>
                            )}
                            {result?.status === "skipped" && (
                              <Badge variant="secondary" className="text-neutral-400">Übersprungen</Badge>
                            )}
                            {result?.status === "failed" && (
                              <Badge variant="destructive">
                                <XCircle className="mr-1 h-3 w-3" /> Fehler
                              </Badge>
                            )}
                          </td>
                        )}
                      </tr>
                    );
                  })}
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
