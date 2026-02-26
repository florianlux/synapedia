"use client";

import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Globe, Plus, Pencil, Trash2, Search } from "lucide-react";

interface SeoEntry {
  id: string;
  slug: string;
  entity_type: string;
  title: string | null;
  description: string | null;
  canonical_url: string | null;
  og_title: string | null;
  og_description: string | null;
  og_image_url: string | null;
  robots: string;
  keywords: string[] | null;
  structured_data: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

const ENTITY_TYPES = ["", "article", "substance", "glossary", "page"];

const emptyForm: Partial<SeoEntry> = {
  slug: "",
  entity_type: "article",
  title: "",
  description: "",
  canonical_url: "",
  og_title: "",
  og_description: "",
  og_image_url: "",
  robots: "index, follow",
  keywords: [],
};

export default function SeoPage() {
  const [entries, setEntries] = useState<SeoEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [entityFilter, setEntityFilter] = useState("");
  const [search, setSearch] = useState("");

  // Dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<SeoEntry | null>(null);
  const [form, setForm] = useState<Partial<SeoEntry>>({ ...emptyForm });
  const [saving, setSaving] = useState(false);
  const [keywordsInput, setKeywordsInput] = useState("");

  // Delete confirm
  const [deleteTarget, setDeleteTarget] = useState<SeoEntry | null>(null);

  const fetchEntries = useCallback(async () => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams();
    if (entityFilter) params.set("entity_type", entityFilter);

    try {
      const res = await fetch(`/api/admin/seo?${params.toString()}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Fehler beim Laden.");
      setEntries(json.data);
      setTotal(json.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unbekannter Fehler.");
    } finally {
      setLoading(false);
    }
  }, [entityFilter]);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  function openCreate() {
    setEditing(null);
    setForm({ ...emptyForm });
    setKeywordsInput("");
    setDialogOpen(true);
  }

  function openEdit(entry: SeoEntry) {
    setEditing(entry);
    setForm({ ...entry });
    setKeywordsInput((entry.keywords ?? []).join(", "));
    setDialogOpen(true);
  }

  async function handleSave() {
    setSaving(true);
    try {
      const payload = {
        slug: form.slug,
        entity_type: form.entity_type || "article",
        title: form.title || null,
        description: form.description || null,
        canonical_url: form.canonical_url || null,
        og_title: form.og_title || null,
        og_description: form.og_description || null,
        og_image_url: form.og_image_url || null,
        robots: form.robots || "index, follow",
        keywords: keywordsInput
          ? keywordsInput.split(",").map((k) => k.trim()).filter(Boolean)
          : null,
      };

      const res = await fetch("/api/admin/seo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Fehler beim Speichern.");
      setDialogOpen(false);
      fetchEntries();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Fehler");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      const res = await fetch(`/api/admin/seo?id=${deleteTarget.id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Fehler beim Löschen.");
      setDeleteTarget(null);
      fetchEntries();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Fehler");
    }
  }

  // Client-side search filter for demo mode
  const filtered = search
    ? entries.filter((e) =>
        e.slug.toLowerCase().includes(search.toLowerCase())
      )
    : entries;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-3xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50">
          <Globe className="h-7 w-7 text-cyan-500" />
          SEO Dashboard
        </h1>
        <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
          SEO-Metadaten pro Seite verwalten — Title, Description, Open Graph,
          Robots, Keywords.
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <NativeSelect
          value={entityFilter}
          onValueChange={setEntityFilter}
          className="w-40"
        >
          <option value="">Alle Typen</option>
          {ENTITY_TYPES.filter(Boolean).map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </NativeSelect>
        <div className="relative min-w-[180px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
          <Input
            placeholder="Slug suchen…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" />
          SEO-Eintrag erstellen
        </Button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-800 dark:border-red-700 dark:bg-red-950 dark:text-red-300">
          {error}
        </div>
      )}

      {loading ? (
        <p className="text-sm text-neutral-500">Lade SEO-Einträge…</p>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-neutral-500">
            Keine SEO-Einträge gefunden.
          </CardContent>
        </Card>
      ) : (
        <>
          <p className="text-sm text-neutral-500">{total} Einträge</p>

          {/* Desktop table */}
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-200 text-left text-xs font-medium uppercase tracking-wider text-neutral-500 dark:border-neutral-800 dark:text-neutral-400">
                  <th className="px-3 py-2">Slug</th>
                  <th className="px-3 py-2">Typ</th>
                  <th className="px-3 py-2">Title</th>
                  <th className="px-3 py-2">Robots</th>
                  <th className="px-3 py-2">Aktualisiert</th>
                  <th className="px-3 py-2">Aktionen</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((e) => (
                  <tr
                    key={e.id}
                    className="border-b border-neutral-100 dark:border-neutral-800"
                  >
                    <td className="px-3 py-2 font-medium">{e.slug}</td>
                    <td className="px-3 py-2">
                      <Badge variant="secondary">{e.entity_type}</Badge>
                    </td>
                    <td className="max-w-[200px] truncate px-3 py-2 text-neutral-500">
                      {e.title || "–"}
                    </td>
                    <td className="px-3 py-2">
                      <Badge
                        variant={
                          e.robots.includes("noindex")
                            ? "destructive"
                            : "default"
                        }
                      >
                        {e.robots}
                      </Badge>
                    </td>
                    <td className="px-3 py-2 text-neutral-500">
                      {new Date(e.updated_at).toLocaleDateString("de-DE")}
                    </td>
                    <td className="flex gap-1 px-3 py-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEdit(e)}
                        title="Bearbeiten"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeleteTarget(e)}
                        title="Löschen"
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="space-y-3 md:hidden">
            {filtered.map((e) => (
              <Card key={e.id}>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center justify-between text-base">
                    <span className="truncate">{e.slug}</span>
                    <Badge variant="secondary">{e.entity_type}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-1 text-sm">
                  {e.title && (
                    <p>
                      <span className="text-neutral-500">Title:</span>{" "}
                      {e.title}
                    </p>
                  )}
                  {e.description && (
                    <p className="line-clamp-2">
                      <span className="text-neutral-500">Description:</span>{" "}
                      {e.description}
                    </p>
                  )}
                  <p>
                    <span className="text-neutral-500">Robots:</span>{" "}
                    <Badge
                      variant={
                        e.robots.includes("noindex")
                          ? "destructive"
                          : "default"
                      }
                    >
                      {e.robots}
                    </Badge>
                  </p>
                  <div className="flex gap-1 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEdit(e)}
                    >
                      <Pencil className="h-3 w-3" /> Bearbeiten
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setDeleteTarget(e)}
                    >
                      <Trash2 className="h-3 w-3 text-red-500" /> Löschen
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogClose onClose={() => setDialogOpen(false)} />
          <DialogHeader>
            <DialogTitle>
              {editing ? "SEO-Eintrag bearbeiten" : "Neuer SEO-Eintrag"}
            </DialogTitle>
          </DialogHeader>
          <div className="mt-4 grid gap-3">
            <label className="text-sm font-medium">
              Slug *
              <Input
                value={form.slug ?? ""}
                onChange={(e) =>
                  setForm((f) => ({ ...f, slug: e.target.value }))
                }
                placeholder="z.B. psilocybin"
                className="mt-1"
              />
            </label>
            <label className="text-sm font-medium">
              Entity-Typ *
              <NativeSelect
                value={form.entity_type ?? "article"}
                onValueChange={(v) =>
                  setForm((f) => ({ ...f, entity_type: v }))
                }
                className="mt-1"
              >
                {ENTITY_TYPES.filter(Boolean).map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </NativeSelect>
            </label>
            <label className="text-sm font-medium">
              Title (SEO)
              <Input
                value={form.title ?? ""}
                onChange={(e) =>
                  setForm((f) => ({ ...f, title: e.target.value }))
                }
                placeholder="Psilocybin – Synapedia"
                className="mt-1"
              />
            </label>
            <label className="text-sm font-medium">
              Meta Description
              <textarea
                value={form.description ?? ""}
                onChange={(e) =>
                  setForm((f) => ({ ...f, description: e.target.value }))
                }
                rows={3}
                placeholder="Evidenzbasierte Informationen zu…"
                className="mt-1 w-full rounded-md border border-neutral-300 bg-transparent px-3 py-2 text-sm dark:border-neutral-700"
              />
              <span className="text-xs text-neutral-400">
                {(form.description ?? "").length}/160 Zeichen
              </span>
            </label>
            <label className="text-sm font-medium">
              Canonical URL
              <Input
                value={form.canonical_url ?? ""}
                onChange={(e) =>
                  setForm((f) => ({ ...f, canonical_url: e.target.value }))
                }
                placeholder="https://synapedia.com/articles/psilocybin"
                className="mt-1"
              />
            </label>
            <label className="text-sm font-medium">
              OG Title
              <Input
                value={form.og_title ?? ""}
                onChange={(e) =>
                  setForm((f) => ({ ...f, og_title: e.target.value }))
                }
                className="mt-1"
              />
            </label>
            <label className="text-sm font-medium">
              OG Description
              <textarea
                value={form.og_description ?? ""}
                onChange={(e) =>
                  setForm((f) => ({ ...f, og_description: e.target.value }))
                }
                rows={2}
                className="mt-1 w-full rounded-md border border-neutral-300 bg-transparent px-3 py-2 text-sm dark:border-neutral-700"
              />
            </label>
            <label className="text-sm font-medium">
              OG Image URL
              <Input
                value={form.og_image_url ?? ""}
                onChange={(e) =>
                  setForm((f) => ({ ...f, og_image_url: e.target.value }))
                }
                className="mt-1"
              />
            </label>
            <label className="text-sm font-medium">
              Robots
              <NativeSelect
                value={form.robots ?? "index, follow"}
                onValueChange={(v) => setForm((f) => ({ ...f, robots: v }))}
                className="mt-1"
              >
                <option value="index, follow">index, follow</option>
                <option value="noindex, follow">noindex, follow</option>
                <option value="index, nofollow">index, nofollow</option>
                <option value="noindex, nofollow">noindex, nofollow</option>
              </NativeSelect>
            </label>
            <label className="text-sm font-medium">
              Keywords (kommagetrennt)
              <Input
                value={keywordsInput}
                onChange={(e) => setKeywordsInput(e.target.value)}
                placeholder="Psilocybin, Psychedelika, 5-HT2A"
                className="mt-1"
              />
            </label>
          </div>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Abbrechen
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Speichere…" : editing ? "Aktualisieren" : "Erstellen"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <DialogContent>
          <DialogClose onClose={() => setDeleteTarget(null)} />
          <DialogHeader>
            <DialogTitle>SEO-Eintrag löschen?</DialogTitle>
          </DialogHeader>
          <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
            Soll der SEO-Eintrag für &quot;{deleteTarget?.slug}&quot; (
            {deleteTarget?.entity_type}) wirklich gelöscht werden?
          </p>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Abbrechen
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Löschen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
