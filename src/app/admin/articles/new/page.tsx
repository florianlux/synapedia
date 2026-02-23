"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { NativeSelect } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Save } from "lucide-react";
import { createArticle, updateArticle } from "@/lib/db/articles";
import { getCategories } from "@/lib/db/categories";
import type { Category, ArticleStatus, RiskLevel, EvidenceStrength } from "@/lib/types";

export default function NewArticlePage() {
  const [articleId, setArticleId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [slug, setSlug] = useState("");
  const [summary, setSummary] = useState("");
  const [category, setCategory] = useState("");
  const [riskLevel, setRiskLevel] = useState<RiskLevel>("moderate");
  const [evidenceStrength, setEvidenceStrength] = useState<EvidenceStrength>("moderate");
  const [status, setStatus] = useState<ArticleStatus>("draft");
  const [content, setContent] = useState("");

  const [categories, setCategories] = useState<Category[]>([]);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  useEffect(() => {
    getCategories()
      .then(setCategories)
      .catch(() => {
        setToast({ message: "Kategorien konnten nicht geladen werden. Manuelle Eingabe möglich.", type: "error" });
      });
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(timer);
  }, [toast]);

  function handleTitleChange(value: string) {
    setTitle(value);
    setSlug(
      value
        .toLowerCase()
        .replace(/[äÄ]/g, "ae")
        .replace(/[öÖ]/g, "oe")
        .replace(/[üÜ]/g, "ue")
        .replace(/ß/g, "ss")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "")
    );
  }

  async function handleSave() {
    if (!title || !slug || !summary) {
      setToast({ message: "Titel, Slug und Zusammenfassung sind Pflichtfelder.", type: "error" });
      return;
    }

    setSaving(true);
    try {
      const payload = {
        title,
        subtitle: subtitle || null,
        slug,
        summary,
        content_mdx: content,
        status,
        risk_level: riskLevel,
        evidence_strength: evidenceStrength,
        category: category || null,
        receptor: null,
        legal_status: null,
      };

      if (articleId) {
        await updateArticle(articleId, payload);
        setToast({ message: "Artikel erfolgreich aktualisiert.", type: "success" });
      } else {
        const created = await createArticle(payload);
        setArticleId(created.id);
        setToast({ message: "Artikel erfolgreich erstellt.", type: "success" });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unbekannter Fehler.";
      setToast({ message, type: "error" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-8">
      {/* Toast notification */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 rounded-md px-4 py-3 text-sm font-medium shadow-lg transition-all ${
            toast.type === "success"
              ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
              : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
          }`}
        >
          {toast.message}
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50">
            {articleId ? "Artikel bearbeiten" : "Neuer Artikel"}
          </h1>
          <p className="mt-1 text-neutral-500 dark:text-neutral-400">
            {articleId
              ? "Bearbeite den bestehenden Artikel."
              : "Erstelle einen neuen Artikel für die Wissensdatenbank."}
          </p>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          <Save className="mr-2 h-4 w-4" />
          {saving ? "Speichert…" : "Speichern"}
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Grundinformationen</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                  Titel
                </label>
                <Input
                  value={title}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  placeholder="z.B. Psilocybin"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                  Untertitel
                </label>
                <Input
                  value={subtitle}
                  onChange={(e) => setSubtitle(e.target.value)}
                  placeholder="z.B. 4-Phosphoryloxy-N,N-dimethyltryptamin"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                  Slug
                </label>
                <Input
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  placeholder="wird-automatisch-generiert"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                  Zusammenfassung
                </label>
                <Textarea
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                  placeholder="Kurze wissenschaftliche Zusammenfassung des Artikels…"
                  rows={3}
                />
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
                    placeholder={"## Kurzfazit\n\nInhalt hier eingeben…"}
                    rows={20}
                    className="min-h-[400px] font-mono text-sm"
                  />
                </TabsContent>
                <TabsContent value="preview">
                  <div className="prose prose-neutral dark:prose-invert min-h-[400px] max-w-none rounded-md border border-neutral-200 p-4 dark:border-neutral-800">
                    {content ? (
                      content.split("\n").map((line, i) => {
                        if (line.startsWith("### "))
                          return (
                            <h3 key={i} className="mt-4 mb-2 text-lg font-semibold">
                              {line.slice(4)}
                            </h3>
                          );
                        if (line.startsWith("## "))
                          return (
                            <h2 key={i} className="mt-6 mb-2 text-xl font-bold">
                              {line.slice(3)}
                            </h2>
                          );
                        if (line.startsWith("# "))
                          return (
                            <h1 key={i} className="mt-6 mb-3 text-2xl font-bold">
                              {line.slice(2)}
                            </h1>
                          );
                        if (line.startsWith("- "))
                          return (
                            <li key={i} className="ml-4">
                              {line.slice(2)}
                            </li>
                          );
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
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Metadaten</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                  Kategorie
                </label>
                {categories.length > 0 ? (
                  <NativeSelect value={category} onValueChange={setCategory}>
                    <option value="">– Kategorie wählen –</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.name}>
                        {cat.name}
                      </option>
                    ))}
                  </NativeSelect>
                ) : (
                  <Input
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    placeholder="z.B. Tryptamine"
                  />
                )}
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                  Risikoeinschätzung
                </label>
                <NativeSelect value={riskLevel} onValueChange={(v) => setRiskLevel(v as RiskLevel)}>
                  <option value="low">Niedriges Risiko</option>
                  <option value="moderate">Moderates Risiko</option>
                  <option value="high">Hohes Risiko</option>
                </NativeSelect>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                  Evidenzstärke
                </label>
                <NativeSelect value={evidenceStrength} onValueChange={(v) => setEvidenceStrength(v as EvidenceStrength)}>
                  <option value="weak">Schwache Evidenz</option>
                  <option value="moderate">Moderate Evidenz</option>
                  <option value="strong">Starke Evidenz</option>
                </NativeSelect>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                  Status
                </label>
                <NativeSelect value={status} onValueChange={(v) => setStatus(v as ArticleStatus)}>
                  <option value="draft">Entwurf</option>
                  <option value="review">In Review</option>
                  <option value="published">Veröffentlicht</option>
                </NativeSelect>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
