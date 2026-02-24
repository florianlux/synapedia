"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Save, Plus, Trash2, GripVertical, ArrowLeft } from "lucide-react";
import Link from "next/link";
import type { TemplateSection, TemplateLink } from "@/lib/types";

export default function NewTemplatePage() {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [sections, setSections] = useState<TemplateSection[]>([
    { key: "kurzfazit", title: "Kurzfazit", required: true },
  ]);
  const [links, setLinks] = useState<TemplateLink[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(timer);
  }, [toast]);

  function handleNameChange(value: string) {
    setName(value);
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

  function addSection() {
    setSections([...sections, { key: `section-${sections.length + 1}`, title: "", required: false }]);
  }

  function updateSection(idx: number, field: keyof TemplateSection, value: string | boolean) {
    const updated = [...sections];
    if (field === "title" && typeof value === "string") {
      updated[idx] = {
        ...updated[idx],
        title: value,
        key: value
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/(^-|-$)/g, "") || updated[idx].key,
      };
    } else if (field === "required" && typeof value === "boolean") {
      updated[idx] = { ...updated[idx], required: value };
    }
    setSections(updated);
  }

  function removeSection(idx: number) {
    setSections(sections.filter((_, i) => i !== idx));
  }

  function addLink() {
    setLinks([...links, { from: "", to: "", relation: "related" }]);
  }

  function updateLink(idx: number, field: keyof TemplateLink, value: string) {
    const updated = [...links];
    updated[idx] = { ...updated[idx], [field]: value };
    setLinks(updated);
  }

  function removeLink(idx: number) {
    setLinks(links.filter((_, i) => i !== idx));
  }

  async function handleSave() {
    if (!name || !slug || sections.length === 0) {
      setToast({ message: "Name und mindestens eine Sektion sind erforderlich.", type: "error" });
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const { createTemplate } = await import("@/lib/db/templates");
      await createTemplate({
        name,
        slug,
        schema_json: { sections, links },
      });
      setToast({ message: "Template erfolgreich erstellt.", type: "success" });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Speichern fehlgeschlagen.";
      setError(message);
      setToast({ message, type: "error" });
    } finally {
      setSaving(false);
    }
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
          <Link href="/admin/templates">
            <Button variant="outline" size="sm">
              <ArrowLeft className="mr-1 h-4 w-4" />
              Zurück
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50">
              Neues Template
            </h1>
            <p className="mt-0.5 text-sm text-neutral-500">Neural Blueprint erstellen</p>
          </div>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          <Save className="mr-2 h-4 w-4" />
          {saving ? "Speichert…" : "Speichern"}
        </Button>
      </div>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
          <p className="text-sm font-medium text-red-800 dark:text-red-200">{error}</p>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Grundinformationen</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">Name</label>
                <Input value={name} onChange={(e) => handleNameChange(e.target.value)} placeholder="z.B. Substanz-Standard" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">Slug</label>
                <Input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="wird-automatisch-generiert" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Sektionen</CardTitle>
              <Button variant="outline" size="sm" onClick={addSection}>
                <Plus className="mr-1 h-3 w-3" />
                Hinzufügen
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {sections.map((section, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-3 rounded-lg border border-neutral-200 p-3 dark:border-neutral-800"
                >
                  <GripVertical className="h-4 w-4 shrink-0 text-neutral-400" />
                  <Input
                    value={section.title}
                    onChange={(e) => updateSection(idx, "title", e.target.value)}
                    placeholder="Sektions-Titel"
                    className="flex-1"
                  />
                  <label className="flex items-center gap-1.5 text-xs text-neutral-500">
                    <input
                      type="checkbox"
                      checked={section.required}
                      onChange={(e) => updateSection(idx, "required", e.target.checked)}
                      className="rounded"
                    />
                    Pflicht
                  </label>
                  <Button variant="outline" size="sm" onClick={() => removeSection(idx)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Links / Synapses */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Verknüpfungen (Synapsen)</CardTitle>
              <Button variant="outline" size="sm" onClick={addLink}>
                <Plus className="mr-1 h-3 w-3" />
                Hinzufügen
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {links.length === 0 && (
                <p className="text-sm text-neutral-500">Noch keine Verknüpfungen definiert.</p>
              )}
              {links.map((link, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-2 rounded-lg border border-neutral-200 p-3 dark:border-neutral-800"
                >
                  <Input
                    value={link.from}
                    onChange={(e) => updateLink(idx, "from", e.target.value)}
                    placeholder="Von (key)"
                    className="flex-1"
                  />
                  <span className="text-neutral-400">→</span>
                  <Input
                    value={link.to}
                    onChange={(e) => updateLink(idx, "to", e.target.value)}
                    placeholder="Zu (key)"
                    className="flex-1"
                  />
                  <Input
                    value={link.relation}
                    onChange={(e) => updateLink(idx, "relation", e.target.value)}
                    placeholder="Relation"
                    className="w-28"
                  />
                  <Button variant="outline" size="sm" onClick={() => removeLink(idx)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Preview sidebar */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle>Vorschau</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-3 text-sm text-neutral-500">Artikel-Struktur nach diesem Template:</p>
              <div className="space-y-2">
                {sections.map((s) => (
                  <div key={s.key} className="flex items-center gap-2">
                    <div className={`h-2 w-2 rounded-full ${s.required ? "bg-cyan-500" : "bg-neutral-400"}`} />
                    <span className="text-sm text-neutral-700 dark:text-neutral-300">{s.title || "(Ohne Titel)"}</span>
                    {s.required && <Badge variant="default" className="text-[10px]">Pflicht</Badge>}
                  </div>
                ))}
              </div>
              {links.length > 0 && (
                <div className="mt-4 border-t border-neutral-200 pt-3 dark:border-neutral-800">
                  <p className="mb-2 text-xs font-medium text-neutral-500">Synapsen:</p>
                  {links.map((l, i) => (
                    <p key={i} className="text-xs text-neutral-400">
                      {l.from} → {l.to} ({l.relation})
                    </p>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
