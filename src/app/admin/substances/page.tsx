"use client";

import { useState, useEffect, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { NativeSelect } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Search, Upload, FlaskConical, CheckCircle, AlertTriangle,
  XCircle, Eye, Loader2, Database, FileText, Globe, Package,
} from "lucide-react";
import type { SubstanceRow } from "@/lib/substances/schema";
import { SEED_PACKS, getAllSeedNames, getSeedPackNames } from "@/lib/substances/seed-packs";

type StatusFilter = "draft" | "review" | "published" | "";
type ImportMode = "seed_pack" | "paste" | "csv" | "fetch";

/* ---------- PubChem enrichment helpers ---------- */

async function fetchPubChemSynonyms(
  cid: string,
): Promise<{ synonyms: string[]; status: "ok" | "not_found" | "error"; error?: string }> {
  try {
    const res = await fetch(
      `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/${cid}/synonyms/JSON`,
    );
    if (res.status === 404) {
      return { synonyms: [], status: "not_found" };
    }
    if (!res.ok) {
      return { synonyms: [], status: "error", error: `HTTP ${res.status}` };
    }
    const data = await res.json();
    const synonyms: string[] =
      data?.InformationList?.Information?.[0]?.Synonym ?? [];
    return { synonyms, status: "ok" };
  } catch (err) {
    return {
      synonyms: [],
      status: "error",
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

async function enrichWithPubChem(
  s: SubstanceRow,
): Promise<SubstanceRow> {
  const cid = s.external_ids?.pubchem_cid;
  if (!cid) {
    return { ...s, pubchem_status: "skipped" };
  }
  const result = await fetchPubChemSynonyms(String(cid));
  return {
    ...s,
    pubchem_synonyms: result.synonyms,
    pubchem_status: result.status,
    ...(result.error ? { pubchem_error: result.error } : {}),
  };
}

async function enrichAllWithPubChem(
  items: SubstanceRow[],
  onProgress?: (done: number, total: number) => void,
): Promise<SubstanceRow[]> {
  const enriched: SubstanceRow[] = [];
  for (let i = 0; i < items.length; i++) {
    const result = await enrichWithPubChem(items[i]);
    enriched.push(result);
    onProgress?.(i + 1, items.length);
  }
  return enriched;
}

interface BulkResult {
  name: string;
  slug: string;
  status: "created" | "updated" | "skipped" | "failed" | "error";
  error?: string;
  message?: string;
}

interface BulkSummary {
  total: number;
  created: number;
  updated: number;
  skipped: number;
  failed: number;
}

interface EnrichmentJobSummary {
  total: number;
  queued: number;
  running: number;
  done: number;
  error: number;
}

export default function AdminSubstances() {
  const [substances, setSubstances] = useState<SubstanceRow[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("");
  const [loading, setLoading] = useState(true);

  // Bulk import state
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [importMode, setImportMode] = useState<ImportMode>("paste");
  const [bulkNames, setBulkNames] = useState("");
  const [csvContent, setCsvContent] = useState("");
  const [selectedSeedPack, setSelectedSeedPack] = useState("");
  const [fetchCategory, setFetchCategory] = useState("");
  const [bulkFetchSources, setBulkFetchSources] = useState(true);
  const [bulkGenerateDraft, setBulkGenerateDraft] = useState(true);
  const [bulkQueueReddit, setBulkQueueReddit] = useState(true);
  const [queueEnrichment, setQueueEnrichment] = useState(false);
  const [bulkRunning, setBulkRunning] = useState(false);
  const [bulkResults, setBulkResults] = useState<BulkResult[] | null>(null);
  const [bulkSummary, setBulkSummary] = useState<BulkSummary | null>(null);
  const [bulkError, setBulkError] = useState<string | null>(null);

  // Queue status
  const [enrichmentSummary, setEnrichmentSummary] = useState<EnrichmentJobSummary | null>(null);
  const [showQueueStatus, setShowQueueStatus] = useState(false);

  // Preview list
  const [previewNames, setPreviewNames] = useState<string[]>([]);

  // Review detail state
  const [reviewSubstance, setReviewSubstance] = useState<SubstanceRow | null>(null);
  const [showReviewModal, setShowReviewModal] = useState(false);

  // PubChem enrichment state
  const [isPubChemRunning, setIsPubChemRunning] = useState(false);
  const [pubChemProgress, setPubChemProgress] = useState({ done: 0, total: 0 });

  const loadSubstances = useCallback(async () => {
    try {
      const { getSubstances } = await import("@/lib/substances/db");
      const data = await getSubstances();
      setSubstances(data);
    } catch {
      setSubstances([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSubstances();
  }, [loadSubstances]);

  // Update preview when input changes
  useEffect(() => {
    let names: string[] = [];
    if (importMode === "paste") {
      names = bulkNames.split("\n").map((n) => n.trim()).filter((n) => n.length > 0);
    } else if (importMode === "seed_pack") {
      names = selectedSeedPack === "__all__" ? getAllSeedNames() : getSeedPackNames(selectedSeedPack);
    } else if (importMode === "csv") {
      names = csvContent.split("\n").slice(0, 20).map((l) => l.split(/[,\t]/)[0]?.trim()).filter(Boolean);
    }
    setPreviewNames(names.slice(0, 50));
  }, [importMode, bulkNames, selectedSeedPack, csvContent]);

  const filtered = substances.filter((s) => {
    if (search && !s.name.toLowerCase().includes(search.toLowerCase()) && !s.slug.includes(search.toLowerCase())) {
      return false;
    }
    if (statusFilter && s.status !== statusFilter) return false;
    return true;
  });

  const getImportNames = (): string[] => {
    switch (importMode) {
      case "paste":
        return bulkNames.split("\n").map((n) => n.trim()).filter((n) => n.length > 0);
      case "seed_pack":
        return selectedSeedPack === "__all__" ? getAllSeedNames() : getSeedPackNames(selectedSeedPack);
      case "csv":
        return csvContent.split("\n").map((l) => l.split(/[,\t]/)[0]?.trim()).filter(Boolean);
      case "fetch":
        return fetchCategory ? [fetchCategory] : [];
      default:
        return [];
    }
  };

  const handleBulkImport = async (overrideNames?: string[]) => {
    setBulkRunning(true);
    if (!overrideNames) {
      setBulkResults(null);
      setBulkSummary(null);
    }
    setBulkError(null);

    const names = overrideNames ?? getImportNames();

    if (names.length === 0) {
      setBulkError("Keine Substanznamen eingegeben.");
      setBulkRunning(false);
      return;
    }

    try {
      const res = await fetch("/api/admin/substances/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          names,
          options: {
            fetchSources: bulkFetchSources,
            generateDraft: bulkGenerateDraft,
            queueRedditScan: bulkQueueReddit,
          },
          importSource: importMode,
          importDetail: importMode === "seed_pack" ? selectedSeedPack : "",
          queueEnrichment,
          csvContent: importMode === "csv" ? csvContent : "",
        }),
      });

      if (!res.ok) {
        let errorMessage = "Import fehlgeschlagen.";
        try {
          const errData = await res.json();
          errorMessage = errData.error || errorMessage;
        } catch {
          // Response was not JSON (e.g. HTML redirect)
        }
        setBulkError(errorMessage);
      } else {
        const data = await res.json();
        if (overrideNames && bulkResults) {
          // Merge retry results into existing results
          const retried = new Set(overrideNames);
          const kept = bulkResults.filter(
            (r) => !retried.has(r.name),
          );
          const merged = [...kept, ...data.results];
          setBulkResults(merged);
          setBulkSummary({
            total: merged.length,
            created: merged.filter((r: BulkResult) => r.status === "created").length,
            updated: merged.filter((r: BulkResult) => r.status === "updated").length,
            skipped: merged.filter((r: BulkResult) => r.status === "skipped").length,
            failed: merged.filter((r: BulkResult) => r.status === "failed" || r.status === "error").length,
          });
        } else {
          setBulkResults(data.results);
          setBulkSummary(data.summary);
        }
        loadSubstances();
      }
    } catch (err) {
      setBulkError(err instanceof Error ? err.message : "Netzwerkfehler.");
    } finally {
      setBulkRunning(false);
    }
  };

  const handleRetryFailed = () => {
    if (!bulkResults) return;
    const failedNames = bulkResults
      .filter((r) => r.status === "error")
      .map((r) => r.name);
    if (failedNames.length === 0) return;
    handleBulkImport(failedNames);
  };

  const handleRunEnrichment = async () => {
    // Trigger enrichment for all queued jobs
    try {
      const res = await fetch("/api/admin/substances/enrich");
      if (res.ok) {
        const data = await res.json();
        setEnrichmentSummary(data.summary);
        setShowQueueStatus(true);
      }
    } catch (err) {
      console.error("Failed to fetch enrichment status:", err);
    }
  };

  const handlePubChemEnrich = async () => {
    setIsPubChemRunning(true);
    setPubChemProgress({ done: 0, total: substances.length });
    try {
      const enriched = await enrichAllWithPubChem(substances, (done, total) => {
        setPubChemProgress({ done, total });
      });
      setSubstances(enriched);
    } finally {
      setIsPubChemRunning(false);
    }
  };

  const handleStatusChange = async (id: string, newStatus: "draft" | "review" | "published") => {
    try {
      const { updateSubstanceStatus } = await import("@/lib/substances/db");
      await updateSubstanceStatus(id, newStatus);
      setSubstances((prev) =>
        prev.map((s) => (s.id === id ? { ...s, status: newStatus } : s))
      );
      if (reviewSubstance?.id === id) {
        setReviewSubstance({ ...reviewSubstance, status: newStatus });
      }
    } catch (err) {
      console.error("Status update failed:", err);
    }
  };

  const openReview = (substance: SubstanceRow) => {
    setReviewSubstance(substance);
    setShowReviewModal(true);
  };

  const getConfidenceAvg = (confidence: Record<string, number>): number => {
    const values = Object.values(confidence);
    if (values.length === 0) return 0;
    return values.reduce((a, b) => a + b, 0) / values.length;
  };

  const getMissingCitations = (s: SubstanceRow): string[] => {
    const missing: string[] = [];
    const citations = s.citations ?? {};
    if (s.mechanism && (!citations["mechanism"] || citations["mechanism"].length === 0)) {
      missing.push("mechanism");
    }
    const risks = s.risks ?? { acute: [], chronic: [], contraindications: [] };
    if ((risks.acute?.length > 0 || risks.chronic?.length > 0) && (!citations["risks"] || citations["risks"].length === 0)) {
      missing.push("risks");
    }
    const interactions = s.interactions ?? { high_risk_pairs: [], notes: [] };
    if ((interactions.high_risk_pairs?.length > 0) && (!citations["interactions"] || citations["interactions"].length === 0)) {
      missing.push("interactions");
    }
    return missing;
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50">
            Substanzen
          </h1>
          <p className="mt-1 text-neutral-500 dark:text-neutral-400">
            Substanz-Datenbank verwalten, importieren und reviewen.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={handleRunEnrichment}>
            <Database className="mr-2 h-4 w-4" />
            Queue Status
          </Button>
          <Button
            variant="ghost"
            onClick={handlePubChemEnrich}
            disabled={isPubChemRunning || substances.length === 0}
          >
            {isPubChemRunning ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin motion-reduce:animate-none" />
                PubChem ({pubChemProgress.done}/{pubChemProgress.total})
              </>
            ) : (
              <>
                <FlaskConical className="mr-2 h-4 w-4" />
                PubChem Enrich
              </>
            )}
          </Button>
          <Button onClick={() => setShowBulkModal(true)}>
            <Upload className="mr-2 h-4 w-4" />
            Bulk Import
          </Button>
        </div>
      </div>

      {/* Enrichment Queue Status Banner */}
      {showQueueStatus && enrichmentSummary && (
        <Card>
          <CardContent className="py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4 text-sm">
                <span className="font-medium">Enrichment Queue:</span>
                <span className="text-cyan-600">{enrichmentSummary.queued} queued</span>
                <span className="text-blue-600">{enrichmentSummary.running} running</span>
                <span className="text-green-600">{enrichmentSummary.done} done</span>
                {enrichmentSummary.error > 0 && (
                  <span className="text-red-600">{enrichmentSummary.error} errors</span>
                )}
              </div>
              <Button variant="ghost" size="sm" onClick={() => setShowQueueStatus(false)}>
                ×
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search & Filter */}
      <div className="flex flex-wrap gap-3">
        <div className="relative min-w-[200px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
          <Input
            placeholder="Substanz suchen…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <NativeSelect
          value={statusFilter}
          onValueChange={(v) => setStatusFilter(v as StatusFilter)}
          className="w-40"
        >
          <option value="">Alle Status</option>
          <option value="draft">Entwurf</option>
          <option value="review">In Review</option>
          <option value="published">Veröffentlicht</option>
        </NativeSelect>
      </div>

      {/* Substances Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            {loading ? "Laden…" : `${filtered.length} Substanzen`}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-200 text-left dark:border-neutral-800">
                  <th className="pb-3 pr-4 font-medium text-neutral-500 dark:text-neutral-400">Name</th>
                  <th className="pb-3 pr-4 font-medium text-neutral-500 dark:text-neutral-400">Status</th>
                  <th className="pb-3 pr-4 font-medium text-neutral-500 dark:text-neutral-400">Kategorien</th>
                  <th className="pb-3 pr-4 font-medium text-neutral-500 dark:text-neutral-400">Confidence</th>
                  <th className="pb-3 font-medium text-neutral-500 dark:text-neutral-400">Aktionen</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((substance) => {
                  const avgConf = getConfidenceAvg(substance.confidence ?? {});
                  const missing = getMissingCitations(substance);
                  return (
                    <tr
                      key={substance.id}
                      className="border-b border-neutral-100 dark:border-neutral-800/50"
                    >
                      <td className="py-3 pr-4">
                        <button
                          onClick={() => openReview(substance)}
                          className="text-left font-medium text-neutral-900 hover:text-cyan-500 dark:text-neutral-50"
                        >
                          {substance.name}
                        </button>
                        <p className="text-xs text-neutral-500 dark:text-neutral-400">/{substance.slug}</p>
                        {substance.tags && substance.tags.length > 0 && (
                          <div className="mt-0.5 flex flex-wrap gap-1">
                            {substance.tags.map((tag) => (
                              <Badge key={tag} variant="secondary" className="text-[10px] px-1 py-0">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="py-3 pr-4">
                        <Badge variant="secondary">{substance.status}</Badge>
                      </td>
                      <td className="py-3 pr-4 text-neutral-600 dark:text-neutral-400">
                        {substance.categories?.length > 0 ? substance.categories.join(", ") : "–"}
                      </td>
                      <td className="py-3 pr-4">
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-16 overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-700">
                            <div
                              className="h-full rounded-full bg-cyan-500 transition-[width] duration-300 motion-reduce:transition-none"
                              style={{ width: `${avgConf * 100}%` }}
                            />
                          </div>
                          <span className="text-xs text-neutral-500">{Math.round(avgConf * 100)}%</span>
                          {missing.length > 0 && (
                            <span title={`Fehlende Quellen: ${missing.join(", ")}`}>
                              <AlertTriangle className="h-3.5 w-3.5 text-yellow-500" />
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3">
                        <Button variant="ghost" size="sm" onClick={() => openReview(substance)}>
                          <Eye className="mr-1 h-3.5 w-3.5" />
                          Review
                        </Button>
                      </td>
                    </tr>
                  );
                })}
                {!loading && filtered.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-neutral-500">
                      Keine Substanzen gefunden. Starte einen Bulk Import.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Bulk Import Modal */}
      <Dialog open={showBulkModal} onOpenChange={setShowBulkModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogClose onClose={() => setShowBulkModal(false)} />
          <DialogHeader>
            <DialogTitle>
              <FlaskConical className="mr-2 inline h-5 w-5 text-cyan-500" />
              Bulk Import
            </DialogTitle>
            <DialogDescription>
              Importiere Substanzen über verschiedene Quellen. Jede Substanz wird als Draft erstellt.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            {/* Import Mode Tabs */}
            <Tabs defaultValue="paste" value={importMode} onValueChange={(v) => setImportMode(v as ImportMode)}>
              <TabsList className="w-full grid grid-cols-4">
                <TabsTrigger value="seed_pack">
                  <Package className="mr-1 h-3.5 w-3.5" />
                  Seed Pack
                </TabsTrigger>
                <TabsTrigger value="paste">
                  <FileText className="mr-1 h-3.5 w-3.5" />
                  Paste
                </TabsTrigger>
                <TabsTrigger value="csv">
                  <Upload className="mr-1 h-3.5 w-3.5" />
                  CSV/TSV
                </TabsTrigger>
                <TabsTrigger value="fetch">
                  <Globe className="mr-1 h-3.5 w-3.5" />
                  Fetch
                </TabsTrigger>
              </TabsList>

              {/* Seed Pack Tab */}
              <TabsContent value="seed_pack">
                <div className="space-y-3">
                  <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300 block">
                    Seed Pack auswählen
                  </label>
                  <NativeSelect
                    value={selectedSeedPack}
                    onValueChange={setSelectedSeedPack}
                    className="w-full"
                  >
                    <option value="">Pack wählen…</option>
                    <option value="__all__">Alle Packs ({getAllSeedNames().length} Substanzen)</option>
                    {SEED_PACKS.map((pack) => (
                      <option key={pack.id} value={pack.id}>
                        {pack.label} ({pack.substances.length})
                      </option>
                    ))}
                  </NativeSelect>
                  {selectedSeedPack && (
                    <p className="text-xs text-neutral-500">
                      {selectedSeedPack === "__all__"
                        ? `${getAllSeedNames().length} Substanzen aus allen Packs`
                        : `${getSeedPackNames(selectedSeedPack).length} Substanzen: ${SEED_PACKS.find(p => p.id === selectedSeedPack)?.description}`}
                    </p>
                  )}
                </div>
              </TabsContent>

              {/* Paste Tab */}
              <TabsContent value="paste">
                <div>
                  <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1 block">
                    Substanznamen (eine pro Zeile)
                  </label>
                  <Textarea
                    placeholder={"Psilocybin\nLSD\nMDMA\nKetamin\n…"}
                    value={bulkNames}
                    onChange={(e) => setBulkNames(e.target.value)}
                    className="min-h-[200px] font-mono text-sm"
                  />
                  <span className="text-xs text-neutral-500 mt-1 block">
                    {bulkNames.split("\n").filter((n) => n.trim()).length} Substanzen
                  </span>
                </div>
              </TabsContent>

              {/* CSV Tab */}
              <TabsContent value="csv">
                <div className="space-y-3">
                  <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300 block">
                    CSV/TSV einfügen (Spalten: name, synonyms, notes)
                  </label>
                  <Textarea
                    placeholder={"name,synonyms,notes\nPsilocybin,Magic Mushrooms;Shrooms,Serotonin-Agonist\nLSD,Acid;Lucy,"}
                    value={csvContent}
                    onChange={(e) => setCsvContent(e.target.value)}
                    className="min-h-[200px] font-mono text-sm"
                  />
                  <p className="text-xs text-neutral-500">
                    Synonyme mit Semikolon trennen. Erste Zeile wird als Header erkannt falls &quot;name&quot; enthalten.
                  </p>
                </div>
              </TabsContent>

              {/* Fetch Tab */}
              <TabsContent value="fetch">
                <div className="space-y-3">
                  <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300 block">
                    Wikidata-Kategorie-ID oder PubChem-Suche
                  </label>
                  <Input
                    placeholder="z.B. Q21174726 (psychoactive drugs) oder Substanzname"
                    value={fetchCategory}
                    onChange={(e) => setFetchCategory(e.target.value)}
                  />
                  <p className="text-xs text-neutral-500">
                    Gib eine Wikidata-Entity-ID ein (Q...) um Substanzen aus der Kategorie abzurufen,
                    oder einen Namen für PubChem-Lookup.
                  </p>
                </div>
              </TabsContent>
            </Tabs>

            {/* Live Preview */}
            {previewNames.length > 0 && (
              <div className="rounded-lg border border-neutral-200 dark:border-neutral-700 p-3">
                <p className="text-xs font-medium text-neutral-500 mb-2">
                  Vorschau ({previewNames.length}{previewNames.length === 50 ? "+" : ""} Substanzen)
                </p>
                <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                  {previewNames.map((name, i) => (
                    <Badge key={i} variant="secondary" className="text-xs">
                      {name}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Options */}
            <div className="space-y-2">
              <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Optionen</p>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={bulkFetchSources}
                  onChange={(e) => setBulkFetchSources(e.target.checked)}
                  className="rounded"
                />
                Quellenreferenzen erstellen
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={bulkGenerateDraft}
                  onChange={(e) => setBulkGenerateDraft(e.target.checked)}
                  className="rounded"
                />
                Draft generieren
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={bulkQueueReddit}
                  onChange={(e) => setBulkQueueReddit(e.target.checked)}
                  className="rounded"
                />
                Reddit-Scan in Queue
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={queueEnrichment}
                  onChange={(e) => setQueueEnrichment(e.target.checked)}
                  className="rounded"
                />
                Enrichment in Background-Queue (PubChem + ChEMBL)
              </label>
            </div>

            {/* Error */}
            {bulkError && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
                <XCircle className="mr-1.5 inline h-4 w-4" />
                {bulkError}
              </div>
            )}

            {/* Summary */}
            {bulkSummary && (
              <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-4 dark:border-neutral-700 dark:bg-neutral-900">
                <p className="text-sm font-medium mb-2">Import-Ergebnis</p>
                <div className="grid grid-cols-5 gap-2 text-center text-sm">
                  <div>
                    <p className="text-lg font-bold text-neutral-900 dark:text-neutral-50">{bulkSummary.total}</p>
                    <p className="text-xs text-neutral-500">Gesamt</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-green-600">{bulkSummary.created}</p>
                    <p className="text-xs text-neutral-500">Erstellt</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-blue-600">{bulkSummary.updated ?? 0}</p>
                    <p className="text-xs text-neutral-500">Aktualisiert</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-yellow-600">{bulkSummary.skipped}</p>
                    <p className="text-xs text-neutral-500">Übersprungen</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-red-600">{bulkSummary.failed ?? 0}</p>
                    <p className="text-xs text-neutral-500">Fehler</p>
                  </div>
                </div>
              </div>
            )}

            {/* Per-item results with status chips and error details */}
            {bulkResults && (
              <div className="max-h-48 overflow-y-auto rounded border border-neutral-200 dark:border-neutral-700">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b bg-neutral-50 dark:bg-neutral-900">
                      <th className="px-2 py-1 text-left">Name</th>
                      <th className="px-2 py-1 text-left">Status</th>
                      <th className="px-2 py-1 text-left">Info</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bulkResults.map((r, i) => (
                      <tr key={i} className={`border-b border-neutral-100 dark:border-neutral-800 ${r.status === "failed" || r.status === "error" ? "bg-red-50 dark:bg-red-950/30" : ""}`}>
                        <td className="px-2 py-1">{r.name}</td>
                        <td className="px-2 py-1">
                          <StatusChip status={r.status} />
                        </td>
                        <td className={`px-2 py-1 ${r.status === "failed" || r.status === "error" ? "text-red-600 dark:text-red-400" : "text-neutral-500"}`}>{r.error ?? r.message ?? ""}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Retry failed button */}
            {bulkResults && bulkResults.some((r) => r.status === "failed" || r.status === "error") && !bulkRunning && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const failedNames = bulkResults
                    .filter((r) => r.status === "failed" || r.status === "error")
                    .map((r) => r.name);
                  setBulkNames(failedNames.join("\n"));
                  setImportMode("paste");
                  setBulkResults(null);
                  setBulkSummary(null);
                  setBulkError(null);
                }}
                className="text-red-600 border-red-300 hover:bg-red-50 dark:hover:bg-red-950/30"
              >
                <AlertTriangle className="h-3 w-3 mr-1" />
                {bulkResults.filter((r) => r.status === "failed" || r.status === "error").length} Fehlgeschlagene erneut versuchen
              </Button>
            )}
          </div>

          <DialogFooter className="mt-4">
            <Button
              variant="ghost"
              onClick={() => setShowBulkModal(false)}
            >
              Schließen
            </Button>
            <Button
              onClick={() => handleBulkImport()}
              disabled={bulkRunning || getImportNames().length === 0}
            >
              {bulkRunning ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin motion-reduce:animate-none" />
                  Importiert…
                </>
              ) : (
                `Import (${getImportNames().length})`
              )}
            </Button>
            {bulkResults && bulkResults.some((r) => r.status === "error") && (
              <Button
                variant="outline"
                onClick={handleRetryFailed}
                disabled={bulkRunning}
              >
                <AlertTriangle className="mr-2 h-4 w-4" />
                Fehlgeschlagene wiederholen ({bulkResults.filter((r) => r.status === "error").length})
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Review Modal */}
      <Dialog open={showReviewModal} onOpenChange={setShowReviewModal}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogClose onClose={() => setShowReviewModal(false)} />
          {reviewSubstance && (
            <>
              <DialogHeader>
                <DialogTitle>{reviewSubstance.name}</DialogTitle>
                <DialogDescription>
                  /{reviewSubstance.slug} · Status: {reviewSubstance.status}
                  {reviewSubstance.tags && reviewSubstance.tags.length > 0 && (
                    <span className="ml-2">
                      · Tags: {reviewSubstance.tags.join(", ")}
                    </span>
                  )}
                </DialogDescription>
              </DialogHeader>

              <div className="mt-4 space-y-4">
                {/* Enrichment info */}
                {reviewSubstance.enrichment && Object.keys(reviewSubstance.enrichment).length > 0 && (
                  <div className="rounded-lg border border-cyan-200 bg-cyan-50 p-3 text-sm dark:border-cyan-800 dark:bg-cyan-950">
                    <Database className="mr-1.5 inline h-4 w-4 text-cyan-600" />
                    <span className="font-medium">Enriched</span>
                    {reviewSubstance.external_ids?.pubchem_cid && (
                      <span className="ml-2 text-xs text-neutral-500">
                        PubChem CID: {String(reviewSubstance.external_ids.pubchem_cid)}
                      </span>
                    )}
                  </div>
                )}

                {/* Confidence overview */}
                <div>
                  <p className="text-sm font-medium mb-2 text-neutral-700 dark:text-neutral-300">Confidence pro Abschnitt</p>
                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries(reviewSubstance.confidence ?? {}).map(([section, value]) => (
                      <div key={section} className="flex items-center gap-2 text-sm">
                        <span className="w-28 text-neutral-600 dark:text-neutral-400 capitalize">{section}</span>
                        <div className="h-2 flex-1 overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-700">
                          <div
                            className="h-full rounded-full bg-cyan-500 transition-[width] duration-300 motion-reduce:transition-none"
                            style={{ width: `${(value as number) * 100}%` }}
                          />
                        </div>
                        <span className="w-10 text-right text-xs text-neutral-500">
                          {Math.round((value as number) * 100)}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Missing citations warning */}
                {getMissingCitations(reviewSubstance).length > 0 && (
                  <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-800 dark:border-yellow-800 dark:bg-yellow-950 dark:text-yellow-300">
                    <AlertTriangle className="mr-1.5 inline h-4 w-4" />
                    Fehlende Quellen: {getMissingCitations(reviewSubstance).join(", ")}
                  </div>
                )}

                {/* Related substances */}
                {reviewSubstance.related_slugs && reviewSubstance.related_slugs.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Verwandte Substanzen</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {reviewSubstance.related_slugs.map((slug) => (
                        <Badge key={slug} variant="secondary" className="text-xs">{slug}</Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Sections */}
                <ReviewSection title="Zusammenfassung" content={reviewSubstance.summary} />
                <ReviewSection title="Wirkmechanismus" content={reviewSubstance.mechanism} />
                <ReviewSection
                  title="Effekte"
                  content={reviewSubstance.effects ? JSON.stringify(reviewSubstance.effects, null, 2) : ""}
                />
                <ReviewSection
                  title="Risiken"
                  content={reviewSubstance.risks ? JSON.stringify(reviewSubstance.risks, null, 2) : ""}
                />
                <ReviewSection
                  title="Interaktionen"
                  content={reviewSubstance.interactions ? JSON.stringify(reviewSubstance.interactions, null, 2) : ""}
                />
                <ReviewSection
                  title="Abhängigkeitspotenzial"
                  content={reviewSubstance.dependence ? JSON.stringify(reviewSubstance.dependence, null, 2) : ""}
                />
                <ReviewSection
                  title="Legalität"
                  content={reviewSubstance.legality ? JSON.stringify(reviewSubstance.legality, null, 2) : ""}
                />

                {/* Citations list */}
                {reviewSubstance.citations && Object.keys(reviewSubstance.citations).length > 0 && (
                  <div>
                    <p className="text-sm font-medium mb-1 text-neutral-700 dark:text-neutral-300">Quellenverweise</p>
                    <pre className="rounded bg-neutral-100 p-2 text-xs dark:bg-neutral-900 overflow-x-auto">
                      {JSON.stringify(reviewSubstance.citations, null, 2)}
                    </pre>
                  </div>
                )}
              </div>

              <DialogFooter className="mt-4 gap-2">
                {reviewSubstance.status === "draft" && (
                  <Button
                    variant="ghost"
                    onClick={() => handleStatusChange(reviewSubstance.id, "review")}
                  >
                    Promote to Review
                  </Button>
                )}
                {(reviewSubstance.status === "draft" || reviewSubstance.status === "review") && (
                  <Button
                    onClick={() => handleStatusChange(reviewSubstance.id, "published")}
                  >
                    Publish
                  </Button>
                )}
                <Button variant="ghost" onClick={() => setShowReviewModal(false)}>
                  Schließen
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ---------- Helper Components ---------- */

function StatusChip({ status }: { status: "created" | "updated" | "skipped" | "failed" | "error" }) {
  const configs: Record<string, { icon: typeof CheckCircle; color: string; bg: string; label: string }> = {
    created: { icon: CheckCircle, color: "text-green-600", bg: "bg-green-50 dark:bg-green-950", label: "Erstellt" },
    updated: { icon: CheckCircle, color: "text-blue-600", bg: "bg-blue-50 dark:bg-blue-950", label: "Aktualisiert" },
    skipped: { icon: AlertTriangle, color: "text-yellow-600", bg: "bg-yellow-50 dark:bg-yellow-950", label: "Übersprungen" },
    failed: { icon: XCircle, color: "text-red-600", bg: "bg-red-50 dark:bg-red-950", label: "Fehlgeschlagen" },
    error: { icon: XCircle, color: "text-red-600", bg: "bg-red-50 dark:bg-red-950", label: "Fehler" },
  };

  const config = configs[status] ?? configs.error;
  const Icon = config.icon;

  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${config.color} ${config.bg}`}>
      <Icon className="h-3 w-3" />
      {config.label}
    </span>
  );
}

function ReviewSection({ title, content }: { title: string; content: string }) {
  if (!content || content === "{}" || content === "[]") {
    return (
      <div>
        <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300">{title}</p>
        <p className="text-sm text-neutral-400 italic">Insufficient evidence</p>
      </div>
    );
  }
  return (
    <div>
      <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300">{title}</p>
      <p className="text-sm text-neutral-600 dark:text-neutral-400 whitespace-pre-wrap">{content}</p>
    </div>
  );
}
