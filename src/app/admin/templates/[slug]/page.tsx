"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Save, Plus, Trash2, GripVertical, ArrowLeft } from "lucide-react";
import Link from "next/link";
import type { Template, TemplateSection, TemplateLink } from "@/lib/types";

export default function EditTemplatePage() {
  const params = useParams();
  const templateSlug = params.slug as string;

  const [template, setTemplate] = useState<Template | null>(null);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [sections, setSections] = useState<TemplateSection[]>([]);
  const [links, setLinks] = useState<TemplateLink[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  useEffect(() => {
    import("@/lib/db/templates")
      .then(({ getTemplateBySlug }) => getTemplateBySlug(templateSlug))
      .then((tpl) => {
        setTemplate(tpl);
        setName(tpl.name);
        setSlug(tpl.slug);
        setSections(tpl.schema_json.sections ?? []);
        setLinks(tpl.schema_json.links ?? []);
      })
      .catch(() => {
        setError("Template konnte nicht geladen werden.");
      });
  }, [templateSlug]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(timer);
  }, [toast]);

  function addSection() {
    setSections([...sections, { key: `section-${sections.length + 1}`, title: "", required: false }]);
  }

  function updateSection(idx: number, field: keyof TemplateSection, value: string | boolean) {
    const updated = [...sections];
    if (field === "title" && typeof value === "string") {
      updated[idx] = {
        ...updated[idx],
        title: value,
        key: value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || updated[idx].key,
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
    if (!template || !name || !slug) {
      setToast({ message: "Name und Slug sind erforderlich.", type: "error" });
      return;
    }

    setSaving(true);
    try {
      const { updateTemplate } = await import("@/lib/db/templates");
      await updateTemplate(template.id, {
        name,
        slug,
        schema_json: { sections, links },
      });
      setToast({ message: "Template erfolgreich gespeichert.", type: "success" });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Speichern fehlgeschlagen.";
      setToast({ message, type: "error" });
    } finally {
      setSaving(false);
    }
  }

  if (error) {
    return (
      <div className="py-12 text-center">
        <p className="text-red-600 dark:text-red-400">{error}</p>
        <Link href="/admin/templates">
          <Button variant="outline" className="mt-4">
            <ArrowLeft className="mr-1 h-4 w-4" />
            Zurück zur Übersicht
          </Button>
        </Link>
      </div>
    );
  }

  if (!template) {
    return <div className="py-12 text-center text-neutral-500">Template wird geladen…</div>;
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
            <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50">{name}</h1>
            <p className="mt-0.5 text-sm text-neutral-500">{slug}</p>
          </div>
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
                <label className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">Name</label>
                <Input value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">Slug</label>
                <Input value={slug} onChange={(e) => setSlug(e.target.value)} />
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
                <div key={idx} className="flex items-center gap-3 rounded-lg border border-neutral-200 p-3 dark:border-neutral-800">
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
                <p className="text-sm text-neutral-500">Noch keine Verknüpfungen.</p>
              )}
              {links.map((link, idx) => (
                <div key={idx} className="flex items-center gap-2 rounded-lg border border-neutral-200 p-3 dark:border-neutral-800">
                  <Input value={link.from} onChange={(e) => updateLink(idx, "from", e.target.value)} placeholder="Von" className="flex-1" />
                  <span className="text-neutral-400">→</span>
                  <Input value={link.to} onChange={(e) => updateLink(idx, "to", e.target.value)} placeholder="Zu" className="flex-1" />
                  <Input value={link.relation} onChange={(e) => updateLink(idx, "relation", e.target.value)} placeholder="Relation" className="w-28" />
                  <Button variant="outline" size="sm" onClick={() => removeLink(idx)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <div>
          <Card>
            <CardHeader>
              <CardTitle>Vorschau</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-3 text-sm text-neutral-500">Struktur:</p>
              <div className="space-y-2">
                {sections.map((s) => (
                  <div key={s.key} className="flex items-center gap-2">
                    <div className={`h-2 w-2 rounded-full ${s.required ? "bg-cyan-500" : "bg-neutral-400"}`} />
                    <span className="text-sm text-neutral-700 dark:text-neutral-300">{s.title || "(Ohne Titel)"}</span>
                    {s.required && <Badge variant="default" className="text-[10px]">Pflicht</Badge>}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
