"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { NativeSelect } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  ArrowLeft,
  Sparkles,
  Loader2,
  AlertTriangle,
  CheckCircle,
  XCircle,
  FileText,
  BookOpen,
} from "lucide-react";
import Link from "next/link";
import type { ArticleTemplate, GeneratedCitation } from "@/lib/types";
import type { SubstanceRow } from "@/lib/substances/schema";
import { AdminPharmacologyTabs } from "@/components/admin-pharmacology-tabs";

interface GenerateResult {
  id?: string;
  content_mdx: string;
  status: "draft" | "blocked";
  blocked_reasons: string[];
  citations: GeneratedCitation[];
  db_error?: string;
}

export default function SubstanceDetailPage() {
  const params = useParams();
  const substanceId = params.id as string;

  const [substance, setSubstance] = useState<SubstanceRow | null>(null);
  const [templates, setTemplates] = useState<ArticleTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  // Generator state
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [language, setLanguage] = useState("de");
  const [tone, setTone] = useState("scientific");
  const [length, setLength] = useState("medium");
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<GenerateResult | null>(null);
  const [mapping, setMapping] = useState(false);
  const [mappedArticleId, setMappedArticleId] = useState<string | null>(null);

  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 5000);
    return () => clearTimeout(timer);
  }, [toast]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      // Load substance
      const { getSubstanceById } = await import("@/lib/substances/db");
      const sub = await getSubstanceById(substanceId);
      setSubstance(sub);

      // Load templates from DB
      try {
        const { createClient } = await import("@/lib/supabase/client");
        const supabase = createClient();
        const { data } = await supabase
          .from("article_templates")
          .select("*")
          .eq("enabled", true)
          .order("name");
        if (data && data.length > 0) {
          setTemplates(data as ArticleTemplate[]);
          setSelectedTemplate(data[0].key);
        }
      } catch {
        // Templates table may not exist yet — show empty
        setTemplates([]);
      }
    } catch {
      setToast({ message: "Substanz konnte nicht geladen werden.", type: "error" });
    } finally {
      setLoading(false);
    }
  }, [substanceId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function handleGenerate() {
    if (!selectedTemplate) {
      setToast({ message: "Bitte ein Template auswählen.", type: "error" });
      return;
    }

    setGenerating(true);
    setResult(null);
    setMappedArticleId(null);

    try {
      const res = await fetch("/api/admin/ai/generate-article", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          substanceId,
          templateKey: selectedTemplate,
          language,
          tone,
          length,
        }),
      });

      const data = await res.json();

      if (data.error) {
        setToast({ message: data.error, type: "error" });
      } else {
        setResult(data as GenerateResult);
        if (data.status === "blocked") {
          setToast({
            message: `Artikel wurde geblockt: ${data.blocked_reasons.join(", ")}`,
            type: "error",
          });
        } else {
          setToast({ message: "AI-Entwurf erfolgreich erstellt.", type: "success" });
        }
      }
    } catch {
      setToast({ message: "Generierung fehlgeschlagen.", type: "error" });
    } finally {
      setGenerating(false);
    }
  }

  async function handleMapToArticle() {
    if (!result?.id) {
      setToast({ message: "Kein gespeicherter Entwurf vorhanden.", type: "error" });
      return;
    }

    setMapping(true);
    try {
      const res = await fetch("/api/admin/ai/map-to-article", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ generatedArticleId: result.id }),
      });

      const data = await res.json();

      if (data.error) {
        setToast({ message: data.error, type: "error" });
      } else {
        setMappedArticleId(data.article_id);
        setToast({ message: `Artikel "${data.title}" erstellt (Draft).`, type: "success" });
      }
    } catch {
      setToast({ message: "Übernahme fehlgeschlagen.", type: "error" });
    } finally {
      setMapping(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-neutral-400" />
        <span className="ml-2 text-neutral-500">Laden…</span>
      </div>
    );
  }

  if (!substance) {
    return (
      <div className="py-12 text-center">
        <p className="text-neutral-500">Substanz nicht gefunden.</p>
        <Link href="/admin/substances">
          <Button variant="outline" className="mt-4">Zurück zur Übersicht</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed right-4 top-4 z-50 max-w-md rounded-md px-4 py-3 text-sm font-medium shadow-lg ${
            toast.type === "success"
              ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
              : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
          }`}
        >
          {toast.message}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/admin/substances">
          <Button variant="outline" size="sm">
            <ArrowLeft className="mr-1 h-4 w-4" />
            Zurück
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50">
            {substance.name}
          </h1>
          <p className="mt-0.5 text-sm text-neutral-500">{substance.slug}</p>
        </div>
        <Badge variant="secondary" className="ml-auto">
          {substance.status}
        </Badge>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Substance Info */}
        <div className="space-y-6 lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Übersicht</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {substance.categories.length > 0 && (
                <div>
                  <span className="font-medium text-neutral-700 dark:text-neutral-300">Kategorien:</span>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {substance.categories.map((c) => (
                      <Badge key={c} variant="secondary" className="text-xs">{c}</Badge>
                    ))}
                  </div>
                </div>
              )}
              {substance.summary && (
                <div>
                  <span className="font-medium text-neutral-700 dark:text-neutral-300">Zusammenfassung:</span>
                  <p className="mt-1 text-neutral-600 dark:text-neutral-400">{substance.summary}</p>
                </div>
              )}
              {substance.mechanism && (
                <div>
                  <span className="font-medium text-neutral-700 dark:text-neutral-300">Mechanismus:</span>
                  <p className="mt-1 text-neutral-600 dark:text-neutral-400">{substance.mechanism}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Article Generator */}
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-cyan-500" />
                Artikelgenerator
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {templates.length === 0 ? (
                <p className="text-sm text-neutral-500">
                  Keine Templates verfügbar. Bitte die Migration 00009_article_templates.sql ausführen.
                </p>
              ) : (
                <>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                        Template
                      </label>
                      <NativeSelect
                        value={selectedTemplate}
                        onValueChange={setSelectedTemplate}
                      >
                        {templates.map((t) => (
                          <option key={t.key} value={t.key}>
                            {t.name}
                          </option>
                        ))}
                      </NativeSelect>
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                        Sprache
                      </label>
                      <NativeSelect value={language} onValueChange={setLanguage}>
                        <option value="de">Deutsch</option>
                        <option value="en">English</option>
                      </NativeSelect>
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                        Ton
                      </label>
                      <NativeSelect value={tone} onValueChange={setTone}>
                        <option value="scientific">Wissenschaftlich</option>
                        <option value="friendly">Verständlich</option>
                        <option value="clinical">Klinisch</option>
                      </NativeSelect>
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                        Länge
                      </label>
                      <NativeSelect value={length} onValueChange={setLength}>
                        <option value="short">Kurz (~500 Wörter)</option>
                        <option value="medium">Mittel (~1000 Wörter)</option>
                        <option value="long">Ausführlich (~2000 Wörter)</option>
                      </NativeSelect>
                    </div>
                  </div>

                  {/* Template description */}
                  {selectedTemplate && (
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">
                      {templates.find((t) => t.key === selectedTemplate)?.description}
                    </p>
                  )}

                  <Button
                    onClick={handleGenerate}
                    disabled={generating || !selectedTemplate}
                    className="w-full sm:w-auto"
                  >
                    {generating ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Generiert…
                      </>
                    ) : (
                      <>
                        <Sparkles className="mr-2 h-4 w-4" />
                        Mit ChatGPT generieren
                      </>
                    )}
                  </Button>
                </>
              )}
            </CardContent>
          </Card>

          {/* Result */}
          {result && (
            <Card
              className={
                result.status === "blocked"
                  ? "border-red-500/30"
                  : "border-green-500/30"
              }
            >
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm">
                  {result.status === "blocked" ? (
                    <>
                      <XCircle className="h-5 w-5 text-red-500" />
                      Entwurf geblockt
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-5 w-5 text-green-500" />
                      Entwurf erstellt
                    </>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Blocked reasons */}
                {result.status === "blocked" && result.blocked_reasons.length > 0 && (
                  <div className="rounded-md bg-red-50 p-3 dark:bg-red-900/20">
                    <div className="flex items-center gap-2 text-sm font-medium text-red-700 dark:text-red-400">
                      <AlertTriangle className="h-4 w-4" />
                      Inhaltsfilter hat problematische Passagen gefunden:
                    </div>
                    <ul className="mt-2 space-y-1">
                      {result.blocked_reasons.map((r, i) => (
                        <li key={i} className="text-xs text-red-600 dark:text-red-400">
                          • {r}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Content preview */}
                <Tabs defaultValue="preview">
                  <TabsList>
                    <TabsTrigger value="preview">Vorschau</TabsTrigger>
                    <TabsTrigger value="mdx">MDX Quelltext</TabsTrigger>
                  </TabsList>
                  <TabsContent value="preview">
                    <div role="region" aria-label="Artikelvorschau" className="prose prose-neutral dark:prose-invert max-w-none rounded-md border border-neutral-200 p-4 dark:border-neutral-800 max-h-[500px] overflow-y-auto">
                      {result.content_mdx.split("\n").map((line, i) => {
                        if (line.startsWith("### "))
                          return <h3 key={i} className="mt-4 mb-2 text-lg font-semibold">{line.slice(4)}</h3>;
                        if (line.startsWith("## "))
                          return <h2 key={i} className="mt-6 mb-2 text-xl font-bold">{line.slice(3)}</h2>;
                        if (line.startsWith("# "))
                          return <h1 key={i} className="mt-6 mb-2 text-2xl font-bold">{line.slice(2)}</h1>;
                        if (line.startsWith("> "))
                          return (
                            <blockquote key={i} className="border-l-4 border-amber-400 bg-amber-50 pl-4 py-2 my-2 dark:bg-amber-900/20 dark:border-amber-600">
                              {line.slice(2)}
                            </blockquote>
                          );
                        if (line.startsWith("- "))
                          return <li key={i} className="ml-4">{line.slice(2)}</li>;
                        if (line.trim() === "") return <br key={i} />;
                        return <p key={i}>{line}</p>;
                      })}
                    </div>
                  </TabsContent>
                  <TabsContent value="mdx">
                    <pre className="max-h-[500px] overflow-auto rounded-md border border-neutral-200 bg-neutral-50 p-4 text-xs dark:border-neutral-800 dark:bg-neutral-900">
                      {result.content_mdx}
                    </pre>
                  </TabsContent>
                </Tabs>

                {/* Citations */}
                {result.citations.length > 0 && (
                  <div>
                    <h4 className="flex items-center gap-2 text-sm font-medium text-neutral-700 dark:text-neutral-300">
                      <BookOpen className="h-4 w-4" />
                      Quellen / Attribution
                    </h4>
                    <ul className="mt-2 space-y-1">
                      {result.citations.map((c, i) => (
                        <li key={i} className="text-xs text-neutral-600 dark:text-neutral-400">
                          [{i + 1}] {c.title}
                          {c.url && (
                            <>
                              {" – "}
                              <a
                                href={c.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-cyan-600 hover:underline dark:text-cyan-400"
                              >
                                {c.url}
                              </a>
                            </>
                          )}
                          {c.license && (
                            <span className="ml-1 text-neutral-400">({c.license})</span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Action buttons */}
                <div className="flex flex-wrap gap-2">
                  {result.status === "draft" && result.id && !mappedArticleId && (
                    <Button onClick={handleMapToArticle} disabled={mapping}>
                      {mapping ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Übernehme…
                        </>
                      ) : (
                        <>
                          <FileText className="mr-2 h-4 w-4" />
                          In Artikel übernehmen
                        </>
                      )}
                    </Button>
                  )}
                  {mappedArticleId && (
                    <Link href={`/admin/articles/${mappedArticleId}`}>
                      <Button variant="outline">
                        <FileText className="mr-2 h-4 w-4" />
                        Zum Artikel
                      </Button>
                    </Link>
                  )}
                  <Button variant="outline" onClick={handleGenerate} disabled={generating}>
                    Neu generieren
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Pharmacology Section */}
      <div className="mt-8">
        <AdminPharmacologyTabs substanceId={substanceId} />
      </div>
    </div>
  );
}
