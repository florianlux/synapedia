"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus, ClipboardList, Shield } from "lucide-react";
import { createClientSafe } from "@/lib/supabase/client";
import type { UserLog, LogEntryType } from "@/lib/types";

export default function LogsPage() {
  const router = useRouter();
  const supabase = createClientSafe();
  const [logs, setLogs] = useState<UserLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  // Form state
  const [entryType, setEntryType] = useState<LogEntryType>("medication");
  const [occurredAt, setOccurredAt] = useState(
    new Date().toISOString().slice(0, 16)
  );
  const [substanceName, setSubstanceName] = useState("");
  const [doseValue, setDoseValue] = useState("");
  const [doseUnit, setDoseUnit] = useState("mg");
  const [route, setRoute] = useState("");
  const [notes, setNotes] = useState("");
  const [saferUseNotes, setSaferUseNotes] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function load() {
      if (!supabase) { router.push("/auth/login"); return; }
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/auth/login");
        return;
      }

      const { data } = await supabase
        .from("user_logs")
        .select("*")
        .eq("user_id", user.id)
        .order("occurred_at", { ascending: false })
        .limit(50);

      if (data) setLogs(data as UserLog[]);
      setLoading(false);
    }
    load();
  }, [supabase, router]);

  async function handleAddLog(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase) return;
    setSaving(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("user_logs")
      .insert({
        user_id: user.id,
        entry_type: entryType,
        occurred_at: new Date(occurredAt).toISOString(),
        substance_name: substanceName || null,
        dose_value: doseValue ? parseFloat(doseValue) : null,
        dose_unit: doseUnit || null,
        route: route || null,
        notes: notes || null,
        safer_use_notes: saferUseNotes || null,
      })
      .select()
      .single();

    if (!error && data) {
      setLogs((prev) => [data as UserLog, ...prev]);
      setShowForm(false);
      // Reset form
      setSubstanceName("");
      setDoseValue("");
      setNotes("");
      setSaferUseNotes("");
    }
    setSaving(false);
  }

  // Group logs by date
  const grouped = logs.reduce<Record<string, UserLog[]>>((acc, log) => {
    const date = new Date(log.occurred_at).toLocaleDateString("de-DE", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    if (!acc[date]) acc[date] = [];
    acc[date].push(log);
    return acc;
  }, {});

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="mb-8 text-2xl font-bold text-neutral-900 dark:text-neutral-50">
        Mein Konto
      </h1>

      <nav className="mb-8 flex gap-4 border-b border-neutral-200 pb-3 dark:border-neutral-800">
        <Link
          href="/account"
          className="pb-3 text-sm text-neutral-500 transition-colors hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200"
        >
          Profil
        </Link>
        <Link
          href="/account/favorites"
          className="pb-3 text-sm text-neutral-500 transition-colors hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200"
        >
          Favoriten
        </Link>
        <span className="border-b-2 border-cyan-500 pb-3 text-sm font-medium text-cyan-600 dark:text-cyan-400">
          Protokoll
        </span>
        <Link
          href="/account/risk"
          className="pb-3 text-sm text-neutral-500 transition-colors hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200"
        >
          Risiko-Overlay
        </Link>
      </nav>

      <div className="mb-6 flex items-center justify-between">
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          Privates Einnahmeprotokoll – nur für dich sichtbar.
        </p>
        <div className="flex items-center gap-2">
          <Link
            href="/account/risk"
            className="flex items-center gap-1.5 rounded-md border border-cyan-600 px-3 py-1.5 text-sm font-medium text-cyan-600 transition-colors hover:bg-cyan-50 dark:border-cyan-400 dark:text-cyan-400 dark:hover:bg-cyan-950"
          >
            <Shield className="h-4 w-4" />
            Risiko-Overlay
          </Link>
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-1.5 rounded-md bg-cyan-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-cyan-700"
          >
            <Plus className="h-4 w-4" />
            Eintrag
          </button>
        </div>
      </div>

      {showForm && (
        <form
          onSubmit={handleAddLog}
          className="mb-8 space-y-4 rounded-lg border border-neutral-200 p-4 dark:border-neutral-800"
        >
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                Typ
              </label>
              <select
                value={entryType}
                onChange={(e) => setEntryType(e.target.value as LogEntryType)}
                className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-50"
              >
                <option value="medication">Medikament</option>
                <option value="use">Konsum</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                Datum/Uhrzeit
              </label>
              <input
                type="datetime-local"
                value={occurredAt}
                onChange={(e) => setOccurredAt(e.target.value)}
                required
                className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-50"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
              Substanz / Medikament
            </label>
            <input
              type="text"
              value={substanceName}
              onChange={(e) => setSubstanceName(e.target.value)}
              className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-50"
              placeholder="z.B. Ibuprofen, Psilocybin"
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                Dosis
              </label>
              <input
                type="number"
                step="any"
                value={doseValue}
                onChange={(e) => setDoseValue(e.target.value)}
                className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-50"
                placeholder="100"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                Einheit
              </label>
              <input
                type="text"
                value={doseUnit}
                onChange={(e) => setDoseUnit(e.target.value)}
                className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-50"
                placeholder="mg"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                Route
              </label>
              <input
                type="text"
                value={route}
                onChange={(e) => setRoute(e.target.value)}
                className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-50"
                placeholder="oral, nasal, …"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
              Notizen <span className="text-neutral-400">(optional)</span>
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-50"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
              Safer-Use Hinweise <span className="text-neutral-400">(optional)</span>
            </label>
            <textarea
              rows={2}
              value={saferUseNotes}
              onChange={(e) => setSaferUseNotes(e.target.value)}
              className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-50"
              placeholder="z.B. Hydration, Abstände"
            />
          </div>

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={saving}
              className="rounded-md bg-cyan-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-cyan-700 disabled:opacity-50"
            >
              {saving ? "Speichern…" : "Eintrag speichern"}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="rounded-md border border-neutral-300 px-4 py-2 text-sm text-neutral-600 dark:border-neutral-700 dark:text-neutral-400"
            >
              Abbrechen
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <p className="text-neutral-500">Laden…</p>
      ) : logs.length === 0 ? (
        <div className="rounded-lg border border-dashed border-neutral-300 p-8 text-center dark:border-neutral-700">
          <ClipboardList className="mx-auto mb-3 h-8 w-8 text-neutral-400" />
          <p className="text-neutral-500 dark:text-neutral-400">
            Noch keine Einträge. Erstelle deinen ersten Eintrag.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([date, dayLogs]) => (
            <div key={date}>
              <h3 className="mb-3 text-sm font-semibold text-neutral-500 dark:text-neutral-400">
                {date}
              </h3>
              <ul className="space-y-2">
                {dayLogs.map((log) => (
                  <li
                    key={log.id}
                    className="rounded-lg border border-neutral-200 p-3 dark:border-neutral-800"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${log.entry_type === "medication" ? "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300" : "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300"}`}>
                          {log.entry_type === "medication" ? "Medikament" : "Konsum"}
                        </span>
                        {log.substance_name && (
                          <span className="ml-2 font-medium text-neutral-900 dark:text-neutral-50">
                            {log.substance_name}
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-neutral-500">
                        {new Date(log.occurred_at).toLocaleTimeString("de-DE", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                    {(log.dose_value || log.route) && (
                      <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
                        {log.dose_value && `${log.dose_value} ${log.dose_unit || ""}`}
                        {log.dose_value && log.route && " · "}
                        {log.route}
                      </p>
                    )}
                    {log.notes && (
                      <p className="mt-1 text-sm text-neutral-500">{log.notes}</p>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
