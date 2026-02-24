"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { NativeSelect } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Save, Sparkles, GitBranch, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { demoArticles } from "@/lib/demo-data";
import type { Article, ArticleStatus, RiskLevel, EvidenceStrength } from "@/lib/types";

export default function ArticleEditorPage() {
  const params = useParams();
  const articleId = params.id as string;

  const [article, setArticle] = useState<Article | null>(null);
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [slug, setSlug] = useState("");
  const [summary, setSummary] = useState("");
  const [category, setCategory] = useState("");
  const [riskLevel, setRiskLevel] = useState<RiskLevel>("moderate");
  const [evidenceStrength, setEvidenceStrength] = useState<EvidenceStrength>("moderate");
  const [status, setStatus] = useState<ArticleStatus>("draft");
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [aiRunning, setAiRunning] = useState(false);
  const [aiOutput, setAiOutput] = useState<Record<string, unknown> | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  useEffect(() => {
    function loadFromDemo() {
      const demo = demoArticles.find((a) => a.id === articleId);
      if (demo) loadArticleData(demo);
    }

    function loadArticleData(a: Article) {
      setArticle(a);
      setTitle(a.title);
      setSubtitle(a.subtitle ?? "");
      setSlug(a.slug);
      setSummary(a.summary);
      setCategory(a.category ?? "");
      setRiskLevel(a.risk_level);
      setEvidenceStrength(a.evidence_strength);
      setStatus(a.status);
      setContent(a.content_mdx);
    }

    // Try DB first, then demo
    import("@/lib/db/articles")
      .then(({ getArticles }) => getArticles())
      .then((articles) => {
        const found = articles.find((a) => a.id === articleId);
        if (found) loadArticleData(found);
        else loadFromDemo();
      })
      .catch(() => loadFromDemo());
  }, [articleId]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(timer);
  }, [toast]);

  async function handleSave() {
    if (!title || !slug || !summary) {
      setToast({ message: "Titel, Slug und Zusammenfassung sind Pflichtfelder.", type: "error" });
      return;
    }

    setSaving(true);
    try {
      const { updateArticle } = await import("@/lib/db/articles");
      await updateArticle(articleId, {
        title,
        subtitle: subtitle || null,
        slug,
        summary,
        content_mdx: content,
        status,
        risk_level: riskLevel,
        evidence_strength: evidenceStrength,
        category: category || null,
      });
      setToast({ message: "Artikel erfolgreich gespeichert.", type: "success" });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Speichern fehlgeschlagen.";
      setToast({ message, type: "error" });
    } finally {
      setSaving(false);
    }
  }

  async function handleAutofill() {
    setAiRunning(true);
    setAiOutput(null);
    try {
      const res = await fetch("/api/admin/ai/autofill", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, subtitle, category, existingDraft: content }),
      });
      const data = await res.json();
      if (data.error) {
        setToast({ message: data.error, type: "error" });
      } else {
        setAiOutput(data.output);
        setToast({ message: "AI-Entwurf erstellt. Prüfe die Ergebnisse.", type: "success" });
      }
    } catch {
      setToast({ message: "AI-Autofill fehlgeschlagen.", type: "error" });
    } finally {
      setAiRunning(false);
    }
  }

  async function handleApplyAi() {
    if (!aiOutput) return;
    try {
      const res = await fetch("/api/admin/ai/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ articleId, outputJson: aiOutput }),
      });
      const data = await res.json();
      if (data.error) {
        setToast({ message: data.error, type: "error" });
      } else {
        setToast({ message: "AI-Daten in Artikel übernommen.", type: "success" });
        setAiOutput(null);
      }
    } catch {
      setToast({ message: "Übernahme fehlgeschlagen.", type: "error" });
    }
  }

  if (!article) {
    return (
      <div className="py-12 text-center text-neutral-500">
        Artikel wird geladen…
      </div>
    );
  }

  return (
    <div className="space-y-8">
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

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/admin/articles">
            <Button variant="outline" size="sm">
              <ArrowLeft className="mr-1 h-4 w-4" />
              Zurück
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50">
              {title || "Artikel bearbeiten"}
            </h1>
            <p className="mt-0.5 text-sm text-neutral-500">{slug}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleAutofill} disabled={aiRunning || !title}>
            <Sparkles className="mr-2 h-4 w-4" />
            {aiRunning ? "AI läuft…" : "AI Autofill"}
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            <Save className="mr-2 h-4 w-4" />
            {saving ? "Speichert…" : "Speichern"}
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main editor */}
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Grundinformationen</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">Titel</label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">Untertitel</label>
                <Input value={subtitle} onChange={(e) => setSubtitle(e.target.value)} />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">Zusammenfassung</label>
                <Textarea value={summary} onChange={(e) => setSummary(e.target.value)} rows={3} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Inhalt (MDX)</CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="editor">
                <TabsList>
                  <TabsTrigger value="editor">Editor</TabsTrigger>
                  <TabsTrigger value="preview">Vorschau</TabsTrigger>
                </TabsList>
                <TabsContent value="editor">
                  <Textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    rows={20}
                    className="min-h-[400px] font-mono text-sm"
                  />
                </TabsContent>
                <TabsContent value="preview">
                  <div className="prose prose-neutral dark:prose-invert min-h-[400px] max-w-none rounded-md border border-neutral-200 p-4 dark:border-neutral-800">
                    {content ? (
                      content.split("\n").map((line, i) => {
                        if (line.startsWith("### ")) return <h3 key={i} className="mt-4 mb-2 text-lg font-semibold">{line.slice(4)}</h3>;
                        if (line.startsWith("## ")) return <h2 key={i} className="mt-6 mb-2 text-xl font-bold">{line.slice(3)}</h2>;
                        if (line.startsWith("- ")) return <li key={i} className="ml-4">{line.slice(2)}</li>;
                        if (line.trim() === "") return <br key={i} />;
                        return <p key={i}>{line}</p>;
                      })
                    ) : (
                      <p className="text-neutral-400">Noch kein Inhalt vorhanden.</p>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          {/* AI Signal Review */}
          {aiOutput && (
            <Card className="border-cyan-500/30">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-cyan-500" />
                  AI-Entwurf Review
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {aiOutput.sections && Array.isArray(aiOutput.sections) ? (
                  <div className="space-y-3">
                    {(aiOutput.sections as { key: string; title: string; blocks: { content: string }[] }[]).map((section, idx) => (
                      <div key={idx} className="rounded-lg border border-cyan-500/20 bg-cyan-50/5 p-4">
                        <div className="mb-2 flex items-center justify-between">
                          <h4 className="font-medium text-neutral-900 dark:text-neutral-50">{section.title}</h4>
                          <Badge variant="info">AI</Badge>
                        </div>
                        {section.blocks?.map((block, bi) => (
                          <p key={bi} className="text-sm text-neutral-600 dark:text-neutral-400">
                            {block.content?.substring(0, 200)}…
                          </p>
                        ))}
                      </div>
                    ))}
                  </div>
                ) : null}
                <div className="flex gap-2">
                  <Button onClick={handleApplyAi} size="sm">
                    Alle übernehmen
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setAiOutput(null)}>
                    Verwerfen
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Metadaten</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">Kategorie</label>
                <Input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="z.B. Tryptamine" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">Risikoeinschätzung</label>
                <NativeSelect value={riskLevel} onValueChange={(v) => setRiskLevel(v as RiskLevel)}>
                  <option value="low">Niedriges Risiko</option>
                  <option value="moderate">Moderates Risiko</option>
                  <option value="high">Hohes Risiko</option>
                </NativeSelect>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">Evidenzstärke</label>
                <NativeSelect value={evidenceStrength} onValueChange={(v) => setEvidenceStrength(v as EvidenceStrength)}>
                  <option value="weak">Schwache Evidenz</option>
                  <option value="moderate">Moderate Evidenz</option>
                  <option value="strong">Starke Evidenz</option>
                </NativeSelect>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">Status</label>
                <NativeSelect value={status} onValueChange={(v) => setStatus(v as ArticleStatus)}>
                  <option value="draft">Entwurf</option>
                  <option value="review">In Review</option>
                  <option value="published">Veröffentlicht</option>
                </NativeSelect>
              </div>
            </CardContent>
          </Card>

          {/* Knowledge Graph Panel */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <GitBranch className="h-4 w-4 text-violet-500" />
                Knowledge Graph
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-neutral-500 dark:text-neutral-400">
                Beziehungen und Verknüpfungen dieses Artikels.
              </p>
              <p className="mt-2 text-xs text-neutral-400">
                Graph-Kanten werden bei AI-Autofill automatisch vorgeschlagen.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
