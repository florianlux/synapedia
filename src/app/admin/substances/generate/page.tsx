"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Loader2, Sparkles, Eye, CheckCircle, AlertTriangle } from "lucide-react";

interface GeneratedRecord {
  id?: string;
  name: string;
  slug: string;
  summary: string;
  mechanism: string;
  categories: string[];
  effects: { positive: string[]; neutral: string[]; negative: string[] };
  risks: { acute: string[]; chronic: string[]; contraindications: string[] };
  interactions: { high_risk_pairs: string[]; notes: string[] };
  dependence: { potential: string; notes: string[] };
  legality: { germany: string; notes: string[] };
}

export default function GenerateSubstancePage() {
  /* ---- Form state ---- */
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [notes, setNotes] = useState("");
  const [strictHR, setStrictHR] = useState(true);

  /* ---- UI state ---- */
  const [loading, setLoading] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [result, setResult] = useState<GeneratedRecord | null>(null);
  const [isPreview, setIsPreview] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(timer);
  }, [toast]);

  /* ---- Handlers ---- */

  async function handleGenerate(previewOnly: boolean) {
    if (!name.trim()) {
      setToast({ message: "Bitte einen Substanznamen eingeben.", type: "error" });
      return;
    }

    const setLoadingFn = previewOnly ? setPreviewLoading : setLoading;
    setLoadingFn(true);
    setResult(null);

    try {
      const res = await fetch("/api/admin/substances/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          category: category.trim() || undefined,
          notes: notes.trim() || undefined,
          strictHR,
          previewOnly,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.ok) {
        const errorMsg = data.error || `Fehler: ${res.status}`;
        setToast({ message: errorMsg, type: "error" });
        return;
      }

      setResult(data.record);
      setIsPreview(!!data.preview);

      if (data.preview) {
        setToast({ message: "Vorschau generiert.", type: "success" });
      } else {
        setToast({ message: `„${data.record.name}" erstellt!`, type: "success" });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Netzwerkfehler.";
      setToast({ message: msg, type: "error" });
    } finally {
      setLoadingFn(false);
    }
  }

  /* ---- Render ---- */
  return (
    <>
      {/* Toast */}
      {toast && (
        <div
          className={`fixed right-4 top-4 z-50 rounded-md px-4 py-3 text-sm font-medium shadow-lg ${
            toast.type === "success"
              ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
              : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
          }`}
        >
          {toast.message}
        </div>
      )}

      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Link href="/admin/substances">
            <Button variant="outline" size="sm">
              <ArrowLeft className="mr-1 h-4 w-4" />
              Zurück
            </Button>
          </Link>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-50">
            Auto-Generate Substanz
          </h1>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Input card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Sparkles className="h-5 w-5 text-violet-500" />
              Eingabe
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Name */}
            <div>
              <label htmlFor="gen-name" className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                Substanzname <span className="text-red-500">*</span>
              </label>
              <Input
                id="gen-name"
                placeholder="z.B. Psilocybin, MDMA, Ketamin…"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={loading || previewLoading}
              />
            </div>

            {/* Category */}
            <div>
              <label htmlFor="gen-category" className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                Kategorie (optional)
              </label>
              <Input
                id="gen-category"
                placeholder="z.B. Psychedelika, Stimulantien…"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                disabled={loading || previewLoading}
              />
            </div>

            {/* Notes */}
            <div>
              <label htmlFor="gen-notes" className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                Notizen (optional)
              </label>
              <Textarea
                id="gen-notes"
                placeholder="Zusätzliche Hinweise für die AI…"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                disabled={loading || previewLoading}
                rows={3}
              />
            </div>

            {/* Strict HR toggle */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                role="switch"
                aria-checked={strictHR}
                onClick={() => setStrictHR(!strictHR)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                  strictHR ? "bg-violet-600" : "bg-neutral-300 dark:bg-neutral-600"
                }`}
                disabled={loading || previewLoading}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                    strictHR ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
              <span className="text-sm text-neutral-700 dark:text-neutral-300">
                Strikte Harm Reduction
              </span>
            </div>

            {/* Action buttons */}
            <div className="flex flex-col gap-2 pt-2 sm:flex-row">
              <Button
                onClick={() => handleGenerate(false)}
                disabled={loading || previewLoading || !name.trim()}
                className="w-full sm:w-auto"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generiere…
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Generate &amp; Save
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={() => handleGenerate(true)}
                disabled={loading || previewLoading || !name.trim()}
                className="w-full sm:w-auto"
              >
                {previewLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Vorschau…
                  </>
                ) : (
                  <>
                    <Eye className="mr-2 h-4 w-4" />
                    Vorschau
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Result card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              {result ? (
                isPreview ? (
                  <>
                    <Eye className="h-5 w-5 text-amber-500" />
                    Vorschau
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    Erstellt
                  </>
                )
              ) : (
                "Ergebnis"
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!result && !loading && !previewLoading && (
              <p className="text-sm text-neutral-500 dark:text-neutral-400">
                {`Gib einen Substanznamen ein und klicke auf "Generate & Save" oder "Vorschau".`}
              </p>
            )}

            {(loading || previewLoading) && !result && (
              <div className="flex items-center gap-2 text-sm text-neutral-500">
                <Loader2 className="h-4 w-4 animate-spin" />
                AI generiert Substanzdaten…
              </div>
            )}

            {result && (
              <div className="space-y-4">
                {/* Name + Slug */}
                <div>
                  <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-50">
                    {result.name}
                  </h3>
                  {result.slug && (
                    <p className="text-xs text-neutral-500">Slug: {result.slug}</p>
                  )}
                </div>

                {/* Categories */}
                {result.categories && result.categories.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {result.categories.map((c) => (
                      <Badge key={c} variant="secondary">{c}</Badge>
                    ))}
                  </div>
                )}

                {/* Summary */}
                {result.summary && (
                  <div>
                    <h4 className="mb-1 text-sm font-medium text-neutral-700 dark:text-neutral-300">Zusammenfassung</h4>
                    <p className="text-sm text-neutral-600 dark:text-neutral-400">{result.summary}</p>
                  </div>
                )}

                {/* Effects */}
                {result.effects && (
                  <div>
                    <h4 className="mb-1 text-sm font-medium text-neutral-700 dark:text-neutral-300">Effekte</h4>
                    <div className="space-y-1 text-xs">
                      {result.effects.positive?.length > 0 && (
                        <p><span className="font-medium text-green-600 dark:text-green-400">Positiv:</span> {result.effects.positive.join(", ")}</p>
                      )}
                      {result.effects.neutral?.length > 0 && (
                        <p><span className="font-medium text-neutral-500">Neutral:</span> {result.effects.neutral.join(", ")}</p>
                      )}
                      {result.effects.negative?.length > 0 && (
                        <p><span className="font-medium text-red-600 dark:text-red-400">Negativ:</span> {result.effects.negative.join(", ")}</p>
                      )}
                    </div>
                  </div>
                )}

                {/* Risks */}
                {result.risks && (result.risks.acute?.length > 0 || result.risks.chronic?.length > 0 || result.risks.contraindications?.length > 0) && (
                  <div>
                    <h4 className="mb-1 flex items-center gap-1 text-sm font-medium text-neutral-700 dark:text-neutral-300">
                      <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                      Risiken
                    </h4>
                    <div className="space-y-1 text-xs">
                      {result.risks.acute?.length > 0 && (
                        <p><span className="font-medium">Akut:</span> {result.risks.acute.join(", ")}</p>
                      )}
                      {result.risks.chronic?.length > 0 && (
                        <p><span className="font-medium">Chronisch:</span> {result.risks.chronic.join(", ")}</p>
                      )}
                      {result.risks.contraindications?.length > 0 && (
                        <p><span className="font-medium">Kontraindikationen:</span> {result.risks.contraindications.join(", ")}</p>
                      )}
                    </div>
                  </div>
                )}

                {/* Interactions */}
                {result.interactions?.high_risk_pairs?.length > 0 && (
                  <div>
                    <h4 className="mb-1 text-sm font-medium text-neutral-700 dark:text-neutral-300">Wechselwirkungen (Hochrisiko)</h4>
                    <p className="text-xs text-neutral-600 dark:text-neutral-400">{result.interactions.high_risk_pairs.join(", ")}</p>
                  </div>
                )}

                {/* Legal Status */}
                {result.legality && (
                  <div>
                    <h4 className="mb-1 text-sm font-medium text-neutral-700 dark:text-neutral-300">Rechtsstatus (DE)</h4>
                    <Badge variant={result.legality.germany === "controlled" ? "high" : result.legality.germany === "legal" ? "low" : "unknown"}>
                      {result.legality.germany}
                    </Badge>
                  </div>
                )}

                {/* Actions */}
                {!isPreview && result.id && (
                  <div className="pt-2">
                    <Link href={`/admin/substances/${result.id}`}>
                      <Button size="sm" className="w-full sm:w-auto">
                        Substanz bearbeiten →
                      </Button>
                    </Link>
                  </div>
                )}

                {isPreview && (
                  <div className="pt-2">
                    <Button
                      onClick={() => handleGenerate(false)}
                      disabled={loading}
                      className="w-full sm:w-auto"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Speichere…
                        </>
                      ) : (
                        <>
                          <Sparkles className="mr-2 h-4 w-4" />
                          Jetzt speichern
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
