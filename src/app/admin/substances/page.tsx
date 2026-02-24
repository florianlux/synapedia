"use client";

import { useState, useEffect, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { NativeSelect } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Search, Upload, FlaskConical, CheckCircle, AlertTriangle, XCircle, Eye } from "lucide-react";
import type { SubstanceRow } from "@/lib/substances/schema";
import { SUBSTANCE_SEED_LIST } from "@/lib/substances/seed-list";

type StatusFilter = "draft" | "review" | "published" | "";

interface BulkResult {
  name: string;
  slug: string;
  status: "created" | "skipped" | "error";
  message?: string;
}

interface BulkSummary {
  total: number;
  created: number;
  skipped: number;
  errors: number;
}

export default function AdminSubstances() {
  const [substances, setSubstances] = useState<SubstanceRow[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("");
  const [loading, setLoading] = useState(true);

  // Bulk import state
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkNames, setBulkNames] = useState("");
  const [bulkFetchSources, setBulkFetchSources] = useState(true);
  const [bulkGenerateDraft, setBulkGenerateDraft] = useState(true);
  const [bulkQueueReddit, setBulkQueueReddit] = useState(true);
  const [bulkRunning, setBulkRunning] = useState(false);
  const [bulkResults, setBulkResults] = useState<BulkResult[] | null>(null);
  const [bulkSummary, setBulkSummary] = useState<BulkSummary | null>(null);
  const [bulkError, setBulkError] = useState<string | null>(null);

  // Review detail state
  const [reviewSubstance, setReviewSubstance] = useState<SubstanceRow | null>(null);
  const [showReviewModal, setShowReviewModal] = useState(false);

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

  const filtered = substances.filter((s) => {
    if (search && !s.name.toLowerCase().includes(search.toLowerCase()) && !s.slug.includes(search.toLowerCase())) {
      return false;
    }
    if (statusFilter && s.status !== statusFilter) return false;
    return true;
  });

  const handleBulkImport = async () => {
    setBulkRunning(true);
    setBulkResults(null);
    setBulkSummary(null);
    setBulkError(null);

    const names = bulkNames
      .split("\n")
      .map((n) => n.trim())
      .filter((n) => n.length > 0);

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
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setBulkError(data.error || "Import fehlgeschlagen.");
      } else {
        setBulkResults(data.results);
        setBulkSummary(data.summary);
        // Reload substances
        loadSubstances();
      }
    } catch (err) {
      setBulkError(err instanceof Error ? err.message : "Netzwerkfehler.");
    } finally {
      setBulkRunning(false);
    }
  };

  const handleLoadSeedList = () => {
    setBulkNames(SUBSTANCE_SEED_LIST.join("\n"));
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
        <Button onClick={() => setShowBulkModal(true)}>
          <Upload className="mr-2 h-4 w-4" />
          Bulk Import (HQ)
        </Button>
      </div>

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
                              className="h-full rounded-full bg-cyan-500"
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
              Bulk Import (HQ)
            </DialogTitle>
            <DialogDescription>
              Gib eine Liste von Substanznamen ein (eine pro Zeile). Jede Substanz wird als Draft mit Quellenreferenzen erstellt.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-4">
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
              <div className="mt-1 flex items-center justify-between">
                <span className="text-xs text-neutral-500">
                  {bulkNames.split("\n").filter((n) => n.trim()).length} Substanzen
                </span>
                <Button variant="ghost" size="sm" onClick={handleLoadSeedList}>
                  120 Seed-Liste laden
                </Button>
              </div>
            </div>

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
            </div>

            {bulkError && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
                <XCircle className="mr-1.5 inline h-4 w-4" />
                {bulkError}
              </div>
            )}

            {bulkSummary && (
              <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-4 dark:border-neutral-700 dark:bg-neutral-900">
                <p className="text-sm font-medium mb-2">Import-Ergebnis</p>
                <div className="grid grid-cols-4 gap-2 text-center text-sm">
                  <div>
                    <p className="text-lg font-bold text-neutral-900 dark:text-neutral-50">{bulkSummary.total}</p>
                    <p className="text-xs text-neutral-500">Gesamt</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-green-600">{bulkSummary.created}</p>
                    <p className="text-xs text-neutral-500">Erstellt</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-yellow-600">{bulkSummary.skipped}</p>
                    <p className="text-xs text-neutral-500">Übersprungen</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-red-600">{bulkSummary.errors}</p>
                    <p className="text-xs text-neutral-500">Fehler</p>
                  </div>
                </div>
              </div>
            )}

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
                      <tr key={i} className="border-b border-neutral-100 dark:border-neutral-800">
                        <td className="px-2 py-1">{r.name}</td>
                        <td className="px-2 py-1">
                          {r.status === "created" && <CheckCircle className="inline h-3 w-3 text-green-500" />}
                          {r.status === "skipped" && <AlertTriangle className="inline h-3 w-3 text-yellow-500" />}
                          {r.status === "error" && <XCircle className="inline h-3 w-3 text-red-500" />}
                          {" "}{r.status}
                        </td>
                        <td className="px-2 py-1 text-neutral-500">{r.message ?? ""}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
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
              onClick={handleBulkImport}
              disabled={bulkRunning || bulkNames.trim().length === 0}
            >
              {bulkRunning ? "Importiert…" : "Run HQ Bulk Import"}
            </Button>
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
                </DialogDescription>
              </DialogHeader>

              <div className="mt-4 space-y-4">
                {/* Confidence overview */}
                <div>
                  <p className="text-sm font-medium mb-2 text-neutral-700 dark:text-neutral-300">Confidence pro Abschnitt</p>
                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries(reviewSubstance.confidence ?? {}).map(([section, value]) => (
                      <div key={section} className="flex items-center gap-2 text-sm">
                        <span className="w-28 text-neutral-600 dark:text-neutral-400 capitalize">{section}</span>
                        <div className="h-2 flex-1 overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-700">
                          <div
                            className="h-full rounded-full bg-cyan-500"
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
