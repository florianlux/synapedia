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
import { KeyRound, Plus, Pencil, Trash2, Search, AlertTriangle } from "lucide-react";

interface SecretEntry {
  id: string;
  env: string;
  project: string;
  name: string;
  kind: string;
  used_by: string | null;
  storage_location: string;
  source_label: string | null;
  source_url: string | null;
  owner: string | null;
  notes: string | null;
  last_rotated_at: string | null;
  rotate_every_days: number | null;
  created_at: string;
  updated_at: string;
}

const ENVS = ["", "local", "staging", "production"];
const KINDS = ["", "token", "password", "email", "apikey", "oauth", "other"];

const emptyForm: Partial<SecretEntry> = {
  env: "production",
  project: "",
  name: "",
  kind: "token",
  used_by: "",
  storage_location: "",
  source_label: "",
  source_url: "",
  owner: "",
  notes: "",
  last_rotated_at: "",
  rotate_every_days: undefined,
};

function needsRotation(entry: SecretEntry): boolean {
  if (!entry.rotate_every_days || !entry.last_rotated_at) return false;
  const last = new Date(entry.last_rotated_at).getTime();
  const limit = entry.rotate_every_days * 24 * 60 * 60 * 1000;
  return Date.now() - last > limit;
}

export default function SecretsPage() {
  const [entries, setEntries] = useState<SecretEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [envFilter, setEnvFilter] = useState("");
  const [kindFilter, setKindFilter] = useState("");
  const [search, setSearch] = useState("");

  // Dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<SecretEntry | null>(null);
  const [form, setForm] = useState<Partial<SecretEntry>>({ ...emptyForm });
  const [saving, setSaving] = useState(false);

  // Delete confirm
  const [deleteTarget, setDeleteTarget] = useState<SecretEntry | null>(null);

  const fetchEntries = useCallback(async () => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams();
    if (envFilter) params.set("env", envFilter);
    if (kindFilter) params.set("kind", kindFilter);
    if (search) params.set("q", search);

    try {
      const res = await fetch(`/api/admin/secrets?${params.toString()}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Fehler beim Laden.");
      setEntries(json.data);
      setTotal(json.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unbekannter Fehler.");
    } finally {
      setLoading(false);
    }
  }, [envFilter, kindFilter, search]);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  function openCreate() {
    setEditing(null);
    setForm({ ...emptyForm });
    setDialogOpen(true);
  }

  function openEdit(entry: SecretEntry) {
    setEditing(entry);
    setForm({ ...entry });
    setDialogOpen(true);
  }

  async function handleSave() {
    setSaving(true);
    try {
      const url = editing
        ? `/api/admin/secrets/${editing.id}`
        : "/api/admin/secrets";
      const method = editing ? "PATCH" : "POST";
      const payload = { ...form };
      // Clean empty optional strings
      if (!payload.last_rotated_at) delete payload.last_rotated_at;
      if (!payload.rotate_every_days) delete payload.rotate_every_days;
      delete payload.id;
      delete payload.created_at;
      delete payload.updated_at;

      const res = await fetch(url, {
        method,
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
      const res = await fetch(`/api/admin/secrets/${deleteTarget.id}`, {
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

  const rotationCount = entries.filter(needsRotation).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-3xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50">
          <KeyRound className="h-7 w-7 text-cyan-500" />
          Secrets Register
        </h1>
        <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
          Nur Metadaten — keine geheimen Werte werden gespeichert.
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <NativeSelect
          value={envFilter}
          onValueChange={setEnvFilter}
          className="w-36"
        >
          <option value="">Alle Umgebungen</option>
          {ENVS.filter(Boolean).map((e) => (
            <option key={e} value={e}>
              {e}
            </option>
          ))}
        </NativeSelect>
        <NativeSelect
          value={kindFilter}
          onValueChange={setKindFilter}
          className="w-36"
        >
          <option value="">Alle Typen</option>
          {KINDS.filter(Boolean).map((k) => (
            <option key={k} value={k}>
              {k}
            </option>
          ))}
        </NativeSelect>
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
          <Input
            placeholder="Name oder Projekt suchen…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" />
          Eintrag hinzufügen
        </Button>
      </div>

      {rotationCount > 0 && (
        <div className="flex items-center gap-2 rounded-lg border border-yellow-300 bg-yellow-50 p-3 text-sm text-yellow-800 dark:border-yellow-700 dark:bg-yellow-950 dark:text-yellow-300">
          <AlertTriangle className="h-4 w-4" />
          {rotationCount} Secret(s) benötigen Rotation.
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-800 dark:border-red-700 dark:bg-red-950 dark:text-red-300">
          {error}
        </div>
      )}

      {loading ? (
        <p className="text-sm text-neutral-500">Lade Einträge…</p>
      ) : entries.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-neutral-500">
            Keine Einträge gefunden.
          </CardContent>
        </Card>
      ) : (
        <>
          <p className="text-sm text-neutral-500">{total} Einträge</p>

          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-200 text-left text-xs font-medium uppercase tracking-wider text-neutral-500 dark:border-neutral-800 dark:text-neutral-400">
                  <th className="px-3 py-2">Env</th>
                  <th className="px-3 py-2">Projekt</th>
                  <th className="px-3 py-2">Name</th>
                  <th className="px-3 py-2">Typ</th>
                  <th className="px-3 py-2">Benutzt von</th>
                  <th className="px-3 py-2">Speicherort</th>
                  <th className="px-3 py-2">Owner</th>
                  <th className="px-3 py-2">Rotation</th>
                  <th className="px-3 py-2">Aktionen</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((e) => (
                  <tr
                    key={e.id}
                    className="border-b border-neutral-100 dark:border-neutral-800"
                  >
                    <td className="px-3 py-2">
                      <Badge variant="secondary">{e.env}</Badge>
                    </td>
                    <td className="px-3 py-2">{e.project}</td>
                    <td className="px-3 py-2 font-medium">{e.name}</td>
                    <td className="px-3 py-2">
                      <Badge variant="outline">{e.kind}</Badge>
                    </td>
                    <td className="px-3 py-2 text-neutral-500">
                      {e.used_by || "–"}
                    </td>
                    <td className="px-3 py-2 text-neutral-500">
                      {e.storage_location}
                    </td>
                    <td className="px-3 py-2 text-neutral-500">
                      {e.owner || "–"}
                    </td>
                    <td className="px-3 py-2">
                      {needsRotation(e) ? (
                        <Badge variant="destructive">Rotation nötig</Badge>
                      ) : e.rotate_every_days ? (
                        <Badge variant="info">OK</Badge>
                      ) : (
                        <span className="text-neutral-400">–</span>
                      )}
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
            {entries.map((e) => (
              <Card key={e.id}>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center justify-between text-base">
                    <span>{e.name}</span>
                    <div className="flex gap-1">
                      <Badge variant="secondary">{e.env}</Badge>
                      <Badge variant="outline">{e.kind}</Badge>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-1 text-sm">
                  <p>
                    <span className="text-neutral-500">Projekt:</span>{" "}
                    {e.project}
                  </p>
                  <p>
                    <span className="text-neutral-500">Speicherort:</span>{" "}
                    {e.storage_location}
                  </p>
                  {e.owner && (
                    <p>
                      <span className="text-neutral-500">Owner:</span>{" "}
                      {e.owner}
                    </p>
                  )}
                  {needsRotation(e) && (
                    <Badge variant="destructive">Rotation nötig</Badge>
                  )}
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
              {editing ? "Eintrag bearbeiten" : "Neuer Eintrag"}
            </DialogTitle>
          </DialogHeader>
          <div className="mt-4 grid gap-3">
            <label className="text-sm font-medium">
              Umgebung *
              <NativeSelect
                value={form.env ?? ""}
                onValueChange={(v) => setForm((f) => ({ ...f, env: v }))}
                className="mt-1"
              >
                {ENVS.filter(Boolean).map((e) => (
                  <option key={e} value={e}>
                    {e}
                  </option>
                ))}
              </NativeSelect>
            </label>
            <label className="text-sm font-medium">
              Projekt *
              <Input
                value={form.project ?? ""}
                onChange={(e) =>
                  setForm((f) => ({ ...f, project: e.target.value }))
                }
                className="mt-1"
              />
            </label>
            <label className="text-sm font-medium">
              Name *
              <Input
                value={form.name ?? ""}
                onChange={(e) =>
                  setForm((f) => ({ ...f, name: e.target.value }))
                }
                className="mt-1"
              />
            </label>
            <label className="text-sm font-medium">
              Typ *
              <NativeSelect
                value={form.kind ?? ""}
                onValueChange={(v) => setForm((f) => ({ ...f, kind: v }))}
                className="mt-1"
              >
                {KINDS.filter(Boolean).map((k) => (
                  <option key={k} value={k}>
                    {k}
                  </option>
                ))}
              </NativeSelect>
            </label>
            <label className="text-sm font-medium">
              Speicherort *
              <Input
                value={form.storage_location ?? ""}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    storage_location: e.target.value,
                  }))
                }
                className="mt-1"
              />
            </label>
            <label className="text-sm font-medium">
              Benutzt von
              <Input
                value={form.used_by ?? ""}
                onChange={(e) =>
                  setForm((f) => ({ ...f, used_by: e.target.value }))
                }
                className="mt-1"
              />
            </label>
            <label className="text-sm font-medium">
              Owner
              <Input
                value={form.owner ?? ""}
                onChange={(e) =>
                  setForm((f) => ({ ...f, owner: e.target.value }))
                }
                className="mt-1"
              />
            </label>
            <label className="text-sm font-medium">
              Source Label
              <Input
                value={form.source_label ?? ""}
                onChange={(e) =>
                  setForm((f) => ({ ...f, source_label: e.target.value }))
                }
                className="mt-1"
              />
            </label>
            <label className="text-sm font-medium">
              Source URL
              <Input
                value={form.source_url ?? ""}
                onChange={(e) =>
                  setForm((f) => ({ ...f, source_url: e.target.value }))
                }
                className="mt-1"
              />
            </label>
            <label className="text-sm font-medium">
              Notizen
              <Input
                value={form.notes ?? ""}
                onChange={(e) =>
                  setForm((f) => ({ ...f, notes: e.target.value }))
                }
                className="mt-1"
              />
            </label>
            <label className="text-sm font-medium">
              Letzte Rotation (Datum)
              <Input
                type="date"
                value={
                  form.last_rotated_at
                    ? new Date(form.last_rotated_at)
                        .toISOString()
                        .split("T")[0]
                    : ""
                }
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    last_rotated_at: e.target.value
                      ? new Date(e.target.value).toISOString()
                      : "",
                  }))
                }
                className="mt-1"
              />
            </label>
            <label className="text-sm font-medium">
              Rotation alle X Tage
              <Input
                type="number"
                value={form.rotate_every_days ?? ""}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    rotate_every_days: e.target.value
                      ? parseInt(e.target.value, 10)
                      : undefined,
                  }))
                }
                className="mt-1"
              />
            </label>
          </div>
          <DialogFooter className="mt-4">
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
            >
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
            <DialogTitle>Eintrag löschen?</DialogTitle>
          </DialogHeader>
          <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
            Soll &quot;{deleteTarget?.name}&quot; ({deleteTarget?.env}/
            {deleteTarget?.project}) wirklich gelöscht werden?
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
