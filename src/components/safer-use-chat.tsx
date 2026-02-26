"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Loader2,
  Phone,
  Plus,
  Send,
  Shield,
  Trash2,
} from "lucide-react";
import type {
  SaferUseChatRequest,
  SaferUseChatResponse,
  SaferUseIntakeEntry,
  SaferUseRiskLevel,
  SaferUseUserProfile,
} from "@/lib/types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const RISK_COLORS: Record<SaferUseRiskLevel, string> = {
  GRÜN: "bg-green-600",
  GELB: "bg-yellow-500 text-neutral-900",
  ORANGE: "bg-orange-500",
  ROT: "bg-red-600",
};

const RISK_BORDER: Record<SaferUseRiskLevel, string> = {
  GRÜN: "border-green-600",
  GELB: "border-yellow-500",
  ORANGE: "border-orange-500",
  ROT: "border-red-600",
};

const emptyEntry: SaferUseIntakeEntry = {
  substance: "",
  dose_mg: null,
  route: "oral",
  time_taken: "",
  notes: "",
};

const defaultProfile: SaferUseUserProfile = {
  age_range: "unknown",
  weight_kg: null,
  tolerance: "unknown",
  conditions: [],
  regular_meds: [],
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function SaferUseChat() {
  const [profile, setProfile] = useState<SaferUseUserProfile>(defaultProfile);
  const [intakeLog, setIntakeLog] = useState<SaferUseIntakeEntry[]>([
    { ...emptyEntry },
  ]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<SaferUseChatResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [profileOpen, setProfileOpen] = useState(true);
  const [medsInput, setMedsInput] = useState("");
  const [conditionsInput, setConditionsInput] = useState("");
  const [consentGiven, setConsentGiven] = useState(false);
  const responseRef = useRef<HTMLDivElement>(null);

  // Scroll to response when it appears
  useEffect(() => {
    if (response && responseRef.current) {
      responseRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [response]);

  // --- Intake log helpers ---
  const updateEntry = useCallback(
    (idx: number, patch: Partial<SaferUseIntakeEntry>) => {
      setIntakeLog((prev) => prev.map((e, i) => (i === idx ? { ...e, ...patch } : e)));
    },
    []
  );

  const removeEntry = useCallback((idx: number) => {
    setIntakeLog((prev) => (prev.length === 1 ? [{ ...emptyEntry }] : prev.filter((_, i) => i !== idx)));
  }, []);

  const addEntry = useCallback(() => {
    setIntakeLog((prev) => [...prev, { ...emptyEntry }]);
  }, []);

  // --- Submit ---
  const handleSubmit = async () => {
    if (!message.trim()) return;
    setLoading(true);
    setError(null);
    setResponse(null);

    // Parse comma-separated meds/conditions into arrays
    const meds = medsInput
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const conds = conditionsInput
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    const req: SaferUseChatRequest = {
      user_profile: { ...profile, regular_meds: meds, conditions: conds },
      intake_log: intakeLog.filter((e) => e.substance.trim() !== ""),
      user_message: message,
      locale: "de-DE",
    };

    try {
      const res = await fetch("/api/safer-use", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...req,
          consent_at: consentGiven ? new Date().toISOString() : null,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? `HTTP ${res.status}`);
      }
      const data: SaferUseChatResponse = await res.json();
      setResponse(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unbekannter Fehler");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* ───── Disclaimer banner ───── */}
      <div className="flex items-start gap-3 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-700 dark:bg-amber-950/30 dark:text-amber-300">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
        <p>
          <strong>Wichtig:</strong> Der Safer-Use Companion gibt <strong>keine</strong>{" "}
          medizinischen Diagnosen, Dosierungsfreigaben oder Konsumanleitungen.
          Er hilft bei Risikoeinschätzung und Schadensminimierung. Bei akuter
          Gefahr bitte sofort{" "}
          <a href="tel:112" className="font-semibold underline">
            112
          </a>{" "}
          anrufen.
        </p>
      </div>

      {/* ───── Chat logging consent (non-blocking) ───── */}
      {!consentGiven && (
        <div className="flex items-start gap-3 rounded-lg border border-neutral-200 bg-neutral-50 p-4 text-sm text-neutral-600 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-400">
          <Shield className="mt-0.5 h-5 w-5 shrink-0 text-cyan-500" />
          <div className="flex-1">
            <p>
              <strong>Chat-Protokollierung:</strong> Zur Qualitätssicherung können Chat-Verläufe
              pseudonymisiert gespeichert werden. IP-Adressen werden nur gehasht (nicht im Klartext)
              gespeichert. Daten werden nach 90 Tagen automatisch gelöscht.
            </p>
            <button
              type="button"
              onClick={() => setConsentGiven(true)}
              className="mt-2 inline-flex items-center gap-1.5 rounded-md bg-cyan-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-cyan-700"
            >
              Einverstanden
            </button>
          </div>
        </div>
      )}

      {/* ───── User profile (collapsible) ───── */}
      <section className="rounded-xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
        <button
          type="button"
          onClick={() => setProfileOpen((p) => !p)}
          className="flex w-full items-center justify-between px-5 py-4 text-left"
        >
          <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-50">
            Dein Profil <span className="text-sm font-normal text-neutral-500">(optional)</span>
          </h2>
          {profileOpen ? (
            <ChevronUp className="h-5 w-5 text-neutral-400" />
          ) : (
            <ChevronDown className="h-5 w-5 text-neutral-400" />
          )}
        </button>

        {profileOpen && (
          <div className="grid gap-4 border-t border-neutral-200 px-5 py-4 sm:grid-cols-2 dark:border-neutral-800">
            {/* Age range */}
            <div>
              <label className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                Altersgruppe
              </label>
              <select
                value={profile.age_range}
                onChange={(e) =>
                  setProfile((p) => ({
                    ...p,
                    age_range: e.target.value as SaferUseUserProfile["age_range"],
                  }))
                }
                className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
              >
                <option value="unknown">Nicht angeben</option>
                <option value="18-24">18–24</option>
                <option value="25-34">25–34</option>
                <option value="35-44">35–44</option>
                <option value="45+">45+</option>
              </select>
            </div>

            {/* Weight */}
            <div>
              <label className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                Gewicht (kg)
              </label>
              <input
                type="number"
                min={30}
                max={300}
                placeholder="z.B. 70"
                value={profile.weight_kg ?? ""}
                onChange={(e) =>
                  setProfile((p) => ({
                    ...p,
                    weight_kg: e.target.value ? Number(e.target.value) : null,
                  }))
                }
                className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
              />
            </div>

            {/* Tolerance */}
            <div>
              <label className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                Toleranz
              </label>
              <select
                value={profile.tolerance}
                onChange={(e) =>
                  setProfile((p) => ({
                    ...p,
                    tolerance: e.target.value as SaferUseUserProfile["tolerance"],
                  }))
                }
                className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
              >
                <option value="unknown">Nicht angeben</option>
                <option value="low">Niedrig</option>
                <option value="medium">Mittel</option>
                <option value="high">Hoch</option>
              </select>
            </div>

            {/* Conditions */}
            <div>
              <label className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                Vorerkrankungen{" "}
                <span className="text-xs text-neutral-500">(kommagetrennt)</span>
              </label>
              <input
                type="text"
                placeholder="z.B. heart_disease, epilepsy"
                value={conditionsInput}
                onChange={(e) => setConditionsInput(e.target.value)}
                className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
              />
            </div>

            {/* Regular meds */}
            <div className="sm:col-span-2">
              <label className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                Regelmäßige Medikamente{" "}
                <span className="text-xs text-neutral-500">(kommagetrennt)</span>
              </label>
              <input
                type="text"
                placeholder="z.B. ssri, diazepam, methadon"
                value={medsInput}
                onChange={(e) => setMedsInput(e.target.value)}
                className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
              />
            </div>
          </div>
        )}
      </section>

      {/* ───── Intake log ───── */}
      <section className="rounded-xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
        <div className="px-5 py-4">
          <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-50">
            Einnahme-Log
          </h2>
          <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
            Trage ein, was du eingenommen hast.
          </p>
        </div>

        <div className="space-y-4 border-t border-neutral-200 px-5 py-4 dark:border-neutral-800">
          {intakeLog.map((entry, idx) => (
            <div
              key={idx}
              className="grid gap-3 rounded-lg border border-neutral-200 bg-neutral-50 p-4 sm:grid-cols-5 dark:border-neutral-700 dark:bg-neutral-800"
            >
              {/* Substance */}
              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs font-medium text-neutral-600 dark:text-neutral-400">
                  Substanz
                </label>
                <input
                  type="text"
                  placeholder="z.B. MDMA, Alkohol"
                  value={entry.substance}
                  onChange={(e) => updateEntry(idx, { substance: e.target.value })}
                  className="w-full rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-sm dark:border-neutral-600 dark:bg-neutral-700 dark:text-neutral-100"
                />
              </div>

              {/* Dose */}
              <div>
                <label className="mb-1 block text-xs font-medium text-neutral-600 dark:text-neutral-400">
                  Dosis (mg)
                </label>
                <input
                  type="number"
                  min={0}
                  placeholder="mg"
                  value={entry.dose_mg ?? ""}
                  onChange={(e) =>
                    updateEntry(idx, {
                      dose_mg: e.target.value ? Number(e.target.value) : null,
                    })
                  }
                  className="w-full rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-sm dark:border-neutral-600 dark:bg-neutral-700 dark:text-neutral-100"
                />
              </div>

              {/* Route */}
              <div>
                <label className="mb-1 block text-xs font-medium text-neutral-600 dark:text-neutral-400">
                  Einnahme
                </label>
                <select
                  value={entry.route}
                  onChange={(e) =>
                    updateEntry(idx, {
                      route: e.target.value as SaferUseIntakeEntry["route"],
                    })
                  }
                  className="w-full rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-sm dark:border-neutral-600 dark:bg-neutral-700 dark:text-neutral-100"
                >
                  <option value="oral">Oral</option>
                  <option value="nasal">Nasal</option>
                  <option value="smoked">Geraucht</option>
                  <option value="vaped">Verdampft</option>
                  <option value="iv">Intravenös</option>
                  <option value="other">Andere</option>
                  <option value="unknown">Unbekannt</option>
                </select>
              </div>

              {/* Time + delete */}
              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <label className="mb-1 block text-xs font-medium text-neutral-600 dark:text-neutral-400">
                    Zeitpunkt
                  </label>
                  <input
                    type="text"
                    placeholder="z.B. vor 2h"
                    value={entry.time_taken}
                    onChange={(e) =>
                      updateEntry(idx, { time_taken: e.target.value })
                    }
                    className="w-full rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-sm dark:border-neutral-600 dark:bg-neutral-700 dark:text-neutral-100"
                  />
                </div>
                <button
                  type="button"
                  aria-label="Eintrag entfernen"
                  onClick={() => removeEntry(idx)}
                  className="rounded-md p-1.5 text-neutral-400 transition-colors hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-950/30"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}

          <button
            type="button"
            onClick={addEntry}
            className="inline-flex items-center gap-1.5 rounded-md border border-dashed border-neutral-300 px-3 py-2 text-sm text-neutral-600 transition-colors hover:border-cyan-500 hover:text-cyan-600 dark:border-neutral-600 dark:text-neutral-400 dark:hover:border-cyan-500 dark:hover:text-cyan-400"
          >
            <Plus className="h-4 w-4" />
            Substanz hinzufügen
          </button>
        </div>
      </section>

      {/* ───── Message input ───── */}
      <section className="rounded-xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
        <div className="px-5 py-4">
          <label className="mb-2 block text-lg font-semibold text-neutral-900 dark:text-neutral-50">
            Deine Frage
          </label>
          <textarea
            rows={3}
            placeholder="z.B. Welche Risiken hat meine aktuelle Kombination? Worauf sollte ich achten?"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
          />
          <div className="mt-3 flex justify-end">
            <button
              type="button"
              disabled={loading || !message.trim()}
              onClick={handleSubmit}
              className="inline-flex items-center gap-2 rounded-lg bg-cyan-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              Einschätzung anfordern
            </button>
          </div>
        </div>
      </section>

      {/* ───── Error ───── */}
      {error && (
        <div className="rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-700 dark:border-red-700 dark:bg-red-950/30 dark:text-red-300">
          <strong>Fehler:</strong> {error}
        </div>
      )}

      {/* ───── Response ───── */}
      {response && (
        <div
          ref={responseRef}
          className={`space-y-5 rounded-xl border-2 p-6 ${RISK_BORDER[response.risk_level]} bg-white dark:bg-neutral-900`}
        >
          {/* Risk badge */}
          <div className="flex items-center gap-3">
            <Shield className="h-6 w-6 text-neutral-500 dark:text-neutral-400" />
            <span
              className={`inline-block rounded-full px-4 py-1 text-sm font-bold text-white ${RISK_COLORS[response.risk_level]}`}
            >
              Risikostufe: {response.risk_level}
            </span>
          </div>

          {/* Assessment */}
          <div>
            <h3 className="mb-1 font-semibold text-neutral-900 dark:text-neutral-50">
              Einordnung
            </h3>
            <p className="text-sm leading-relaxed text-neutral-700 dark:text-neutral-300">
              {response.assessment}
            </p>
          </div>

          {/* Interactions */}
          {response.interactions.length > 0 && (
            <div>
              <h3 className="mb-2 font-semibold text-neutral-900 dark:text-neutral-50">
                ⚠️ Interaktionen
              </h3>
              <ul className="space-y-1.5">
                {response.interactions.map((item, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-2 text-sm text-neutral-700 dark:text-neutral-300"
                  >
                    <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-amber-500" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Harm reduction */}
          {response.harm_reduction.length > 0 && (
            <div>
              <h3 className="mb-2 font-semibold text-neutral-900 dark:text-neutral-50">
                🛡️ Harm-Reduction-Tipps
              </h3>
              <ul className="space-y-1.5">
                {response.harm_reduction.map((item, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-2 text-sm text-neutral-700 dark:text-neutral-300"
                  >
                    <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-cyan-500" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Emergency */}
          {response.emergency && (
            <div className="rounded-lg border-2 border-red-500 bg-red-50 p-4 dark:bg-red-950/20">
              <div className="flex items-center gap-2 font-semibold text-red-700 dark:text-red-400">
                <Phone className="h-5 w-5" />
                Notfall
              </div>
              <p className="mt-2 text-sm text-red-700 dark:text-red-300">
                {response.emergency}
              </p>
              <a
                href="tel:112"
                className="mt-3 inline-flex items-center gap-2 rounded-md bg-red-600 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-red-700"
              >
                <Phone className="h-4 w-4" />
                112 anrufen
              </a>
            </div>
          )}

          {/* Disclaimer */}
          <p className="text-xs text-neutral-500 dark:text-neutral-500">
            {response.disclaimer}
          </p>
        </div>
      )}
    </div>
  );
}
