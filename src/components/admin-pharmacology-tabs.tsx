"use client";

import { useState, useEffect, useCallback } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Plus, Trash2, Save, AlertTriangle } from "lucide-react";
import {
  upsertTargetAffinity,
  deleteTargetAffinity,
  upsertPKRoute,
  deletePKRoute,
  upsertPD,
  deletePD,
  listTargets,
  getSubstancePharmacology,
} from "@/lib/db/pharmacology";
import type {
  Target,
  SubstanceTargetAffinity,
  AffinityWithTarget,
  PharmacokineticRoute,
  Pharmacodynamics,
  MeasureType,
  EffectType,
  ConfidenceLevel,
  PKRoute,
} from "@/lib/types";

interface AdminPharmacologyTabsProps {
  substanceId: string;
}

const MEASURE_TYPES: MeasureType[] = ["Ki", "IC50", "EC50", "qualitative"];
const EFFECT_TYPES: EffectType[] = [
  "agonist", "antagonist", "partial_agonist", "inhibitor", "releaser", "modulator", "unknown",
];
const CONFIDENCE_LEVELS: ConfidenceLevel[] = ["literature", "clinical", "estimate", "low"];
const PK_ROUTES: PKRoute[] = ["oral", "nasal", "iv", "smoked", "sublingual"];

const EFFECT_LABELS: Record<string, string> = {
  agonist: "Agonist",
  antagonist: "Antagonist",
  partial_agonist: "Partialagonist",
  inhibitor: "Inhibitor",
  releaser: "Releaser",
  modulator: "Modulator",
  unknown: "Unbekannt",
};

const ROUTE_LABELS: Record<string, string> = {
  oral: "Oral",
  nasal: "Nasal",
  iv: "Intravenös",
  smoked: "Geraucht",
  sublingual: "Sublingual",
};

const CONFIDENCE_LABELS: Record<string, string> = {
  literature: "Literatur",
  clinical: "Klinisch",
  estimate: "Schätzung",
  low: "Gering",
};

function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 p-3 dark:border-red-800 dark:bg-red-900/20">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-600 dark:text-red-400" />
      <p className="text-xs text-red-700 dark:text-red-300">{message}</p>
    </div>
  );
}

// ─── Receptor Affinities Tab ─────────────────────────────────────────────────

function AffinityForm({
  substanceId,
  targets,
  existing,
  onSaved,
  onCancel,
}: {
  substanceId: string;
  targets: Target[];
  existing?: AffinityWithTarget;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [targetId, setTargetId] = useState(existing?.target_id ?? "");
  const [measureType, setMeasureType] = useState<MeasureType>(existing?.measure_type ?? "Ki");
  const [affinityNm, setAffinityNm] = useState(existing?.affinity_nm?.toString() ?? "");
  const [effectType, setEffectType] = useState<EffectType | "">(existing?.effect_type ?? "");
  const [efficacy, setEfficacy] = useState(existing?.efficacy?.toString() ?? "");
  const [confidence, setConfidence] = useState<ConfidenceLevel>(existing?.confidence_level ?? "estimate");
  const [notes, setNotes] = useState(existing?.notes ?? "");

  const handleSave = async () => {
    if (!targetId) { setError("Bitte einen Rezeptor/Transporter auswählen."); return; }
    setSaving(true);
    setError(null);
    const data: Omit<SubstanceTargetAffinity, "id" | "created_at" | "updated_at" | "target"> = {
      substance_id: substanceId,
      target_id: targetId,
      measure_type: measureType,
      affinity_nm: affinityNm ? parseFloat(affinityNm) : null,
      effect_type: effectType || null,
      efficacy: efficacy ? parseFloat(efficacy) : null,
      confidence_level: confidence,
      sources: existing?.sources ?? [],
      notes,
    };
    const result = await upsertTargetAffinity(data);
    setSaving(false);
    if (result.error) { setError(result.error); return; }
    onSaved();
  };

  return (
    <div className="space-y-3 rounded-lg border border-neutral-200 p-4 dark:border-neutral-700">
      <h5 className="text-sm font-semibold">{existing ? "Eintrag bearbeiten" : "Neuer Eintrag"}</h5>
      {error && <ErrorBanner message={error} />}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs text-neutral-500">Rezeptor/Transporter *</label>
          <select
            value={targetId}
            onChange={(e) => setTargetId(e.target.value)}
            className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm dark:border-neutral-600 dark:bg-neutral-800"
          >
            <option value="">– Auswählen –</option>
            {targets.map((t) => (
              <option key={t.id} value={t.id}>{t.name} ({t.family})</option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-xs text-neutral-500">Messtyp</label>
          <select
            value={measureType}
            onChange={(e) => setMeasureType(e.target.value as MeasureType)}
            className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm dark:border-neutral-600 dark:bg-neutral-800"
          >
            {MEASURE_TYPES.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-xs text-neutral-500">Affinität (nM)</label>
          <Input
            type="number"
            placeholder="z.B. 107"
            value={affinityNm}
            onChange={(e) => setAffinityNm(e.target.value)}
          />
        </div>

        <div>
          <label className="mb-1 block text-xs text-neutral-500">Wirktyp</label>
          <select
            value={effectType}
            onChange={(e) => setEffectType(e.target.value as EffectType | "")}
            className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm dark:border-neutral-600 dark:bg-neutral-800"
          >
            <option value="">– Optional –</option>
            {EFFECT_TYPES.map((e) => <option key={e} value={e}>{EFFECT_LABELS[e]}</option>)}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-xs text-neutral-500">Efficacy (%)</label>
          <Input
            type="number"
            min="0"
            max="100"
            placeholder="z.B. 80"
            value={efficacy}
            onChange={(e) => setEfficacy(e.target.value)}
          />
        </div>

        <div>
          <label className="mb-1 block text-xs text-neutral-500">Konfidenz</label>
          <select
            value={confidence}
            onChange={(e) => setConfidence(e.target.value as ConfidenceLevel)}
            className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm dark:border-neutral-600 dark:bg-neutral-800"
          >
            {CONFIDENCE_LEVELS.map((c) => <option key={c} value={c}>{CONFIDENCE_LABELS[c]}</option>)}
          </select>
        </div>
      </div>

      <div>
        <label className="mb-1 block text-xs text-neutral-500">Hinweise</label>
        <Textarea
          placeholder="Optionale Anmerkungen..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
        />
      </div>

      <div className="flex gap-2">
        <Button size="sm" onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Save className="mr-1 h-3 w-3" />}
          Speichern
        </Button>
        <Button size="sm" variant="ghost" onClick={onCancel}>Abbrechen</Button>
      </div>
    </div>
  );
}

function ReceptorAffinitiesTab({ substanceId }: { substanceId: string }) {
  const [affinities, setAffinities] = useState<AffinityWithTarget[]>([]);
  const [targets, setTargets] = useState<Target[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [pharm, tgts] = await Promise.all([
        getSubstancePharmacology(substanceId),
        listTargets(),
      ]);
      setAffinities(pharm.targets);
      setTargets(tgts);
    } finally {
      setLoading(false);
    }
  }, [substanceId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleDelete = async (id: string) => {
    if (!confirm("Eintrag wirklich löschen?")) return;
    setDeleting(id);
    setError(null);
    const result = await deleteTargetAffinity(id);
    setDeleting(null);
    if (result.error) { setError(result.error); return; }
    await load();
  };

  if (loading) {
    return <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-neutral-400" /></div>;
  }

  return (
    <div className="space-y-4">
      {error && <ErrorBanner message={error} />}

      <div className="flex items-center justify-between">
        <p className="text-sm text-neutral-500">{affinities.length} Einträge</p>
        <Button size="sm" onClick={() => setShowForm(true)}>
          <Plus className="mr-1 h-3 w-3" /> Hinzufügen
        </Button>
      </div>

      {showForm && (
        <AffinityForm
          substanceId={substanceId}
          targets={targets}
          onSaved={() => { setShowForm(false); load(); }}
          onCancel={() => setShowForm(false)}
        />
      )}

      {affinities.length === 0 && !showForm && (
        <p className="text-sm text-neutral-500">Keine Bindungsaffinitätsdaten vorhanden.</p>
      )}

      {affinities.map((a) => (
        <div key={a.id} className="flex items-start justify-between rounded-lg border border-neutral-200 p-3 dark:border-neutral-700">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">{a.target?.name}</span>
              <Badge variant="outline" className="text-xs">{a.measure_type}</Badge>
              {a.effect_type && (
                <Badge variant="outline" className="text-xs">{EFFECT_LABELS[a.effect_type] ?? a.effect_type}</Badge>
              )}
            </div>
            <p className="text-xs text-neutral-500">
              {a.affinity_nm !== null ? `${a.affinity_nm} nM` : "Qualitativ"}
              {" · "}
              {CONFIDENCE_LABELS[a.confidence_level] ?? a.confidence_level}
              {a.notes && ` · ${a.notes}`}
            </p>
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => handleDelete(a.id)}
            disabled={deleting === a.id}
          >
            {deleting === a.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3 text-red-500" />}
          </Button>
        </div>
      ))}
    </div>
  );
}

// ─── PK Routes Tab ────────────────────────────────────────────────────────────

function PKRouteForm({
  substanceId,
  existing,
  onSaved,
  onCancel,
}: {
  substanceId: string;
  existing?: PharmacokineticRoute;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [route, setRoute] = useState<PKRoute>(existing?.route ?? "oral");
  const [onsetMin, setOnsetMin] = useState(existing?.onset_min?.toString() ?? "");
  const [onsetMax, setOnsetMax] = useState(existing?.onset_max?.toString() ?? "");
  const [tmaxMin, setTmaxMin] = useState(existing?.tmax_min?.toString() ?? "");
  const [tmaxMax, setTmaxMax] = useState(existing?.tmax_max?.toString() ?? "");
  const [durationMin, setDurationMin] = useState(existing?.duration_min?.toString() ?? "");
  const [durationMax, setDurationMax] = useState(existing?.duration_max?.toString() ?? "");
  const [halfLife, setHalfLife] = useState(existing?.half_life_h?.toString() ?? "");
  const [bioF, setBioF] = useState(existing?.bioavailability_f?.toString() ?? "");
  const [afterMin, setAfterMin] = useState(existing?.after_effects_min?.toString() ?? "");
  const [afterMax, setAfterMax] = useState(existing?.after_effects_max?.toString() ?? "");
  const [confidence, setConfidence] = useState<ConfidenceLevel>(existing?.confidence_level ?? "estimate");
  const [notes, setNotes] = useState(existing?.notes ?? "");

  const n = (v: string) => v ? parseFloat(v) : null;
  const ni = (v: string) => v ? parseInt(v, 10) : null;

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    const data: Omit<PharmacokineticRoute, "id" | "created_at" | "updated_at"> = {
      substance_id: substanceId,
      route,
      onset_min: ni(onsetMin),
      onset_max: ni(onsetMax),
      tmax_min: ni(tmaxMin),
      tmax_max: ni(tmaxMax),
      duration_min: ni(durationMin),
      duration_max: ni(durationMax),
      half_life_h: n(halfLife),
      bioavailability_f: n(bioF),
      ka_h: existing?.ka_h ?? null,
      ke_h: existing?.ke_h ?? null,
      cmax_rel: existing?.cmax_rel ?? null,
      after_effects_min: ni(afterMin),
      after_effects_max: ni(afterMax),
      confidence_level: confidence,
      sources: existing?.sources ?? [],
      notes,
    };
    const result = await upsertPKRoute(data);
    setSaving(false);
    if (result.error) { setError(result.error); return; }
    onSaved();
  };

  return (
    <div className="space-y-3 rounded-lg border border-neutral-200 p-4 dark:border-neutral-700">
      <h5 className="text-sm font-semibold">{existing ? "Route bearbeiten" : "Neue Route"}</h5>
      {error && <ErrorBanner message={error} />}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs text-neutral-500">Applikationsweg *</label>
          <select
            value={route}
            onChange={(e) => setRoute(e.target.value as PKRoute)}
            className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm dark:border-neutral-600 dark:bg-neutral-800"
          >
            {PK_ROUTES.map((r) => <option key={r} value={r}>{ROUTE_LABELS[r]}</option>)}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-xs text-neutral-500">Halbwertszeit (h)</label>
          <Input type="number" placeholder="z.B. 2.5" value={halfLife} onChange={(e) => setHalfLife(e.target.value)} />
        </div>

        <div>
          <label className="mb-1 block text-xs text-neutral-500">Onset min (min)</label>
          <Input type="number" placeholder="z.B. 20" value={onsetMin} onChange={(e) => setOnsetMin(e.target.value)} />
        </div>
        <div>
          <label className="mb-1 block text-xs text-neutral-500">Onset max (min)</label>
          <Input type="number" placeholder="z.B. 60" value={onsetMax} onChange={(e) => setOnsetMax(e.target.value)} />
        </div>

        <div>
          <label className="mb-1 block text-xs text-neutral-500">t_max min (min)</label>
          <Input type="number" placeholder="z.B. 90" value={tmaxMin} onChange={(e) => setTmaxMin(e.target.value)} />
        </div>
        <div>
          <label className="mb-1 block text-xs text-neutral-500">t_max max (min)</label>
          <Input type="number" placeholder="z.B. 120" value={tmaxMax} onChange={(e) => setTmaxMax(e.target.value)} />
        </div>

        <div>
          <label className="mb-1 block text-xs text-neutral-500">Dauer min (min)</label>
          <Input type="number" placeholder="z.B. 180" value={durationMin} onChange={(e) => setDurationMin(e.target.value)} />
        </div>
        <div>
          <label className="mb-1 block text-xs text-neutral-500">Dauer max (min)</label>
          <Input type="number" placeholder="z.B. 360" value={durationMax} onChange={(e) => setDurationMax(e.target.value)} />
        </div>

        <div>
          <label className="mb-1 block text-xs text-neutral-500">Nacheffekte min (min)</label>
          <Input type="number" placeholder="z.B. 60" value={afterMin} onChange={(e) => setAfterMin(e.target.value)} />
        </div>
        <div>
          <label className="mb-1 block text-xs text-neutral-500">Nacheffekte max (min)</label>
          <Input type="number" placeholder="z.B. 120" value={afterMax} onChange={(e) => setAfterMax(e.target.value)} />
        </div>

        <div>
          <label className="mb-1 block text-xs text-neutral-500">Bioverfügbarkeit (0–1)</label>
          <Input type="number" min="0" max="1" step="0.01" placeholder="z.B. 0.50" value={bioF} onChange={(e) => setBioF(e.target.value)} />
        </div>

        <div>
          <label className="mb-1 block text-xs text-neutral-500">Konfidenz</label>
          <select
            value={confidence}
            onChange={(e) => setConfidence(e.target.value as ConfidenceLevel)}
            className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm dark:border-neutral-600 dark:bg-neutral-800"
          >
            {CONFIDENCE_LEVELS.map((c) => <option key={c} value={c}>{CONFIDENCE_LABELS[c]}</option>)}
          </select>
        </div>
      </div>

      <div>
        <label className="mb-1 block text-xs text-neutral-500">Hinweise</label>
        <Textarea placeholder="Optionale Anmerkungen..." value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
      </div>

      <div className="flex gap-2">
        <Button size="sm" onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Save className="mr-1 h-3 w-3" />}
          Speichern
        </Button>
        <Button size="sm" variant="ghost" onClick={onCancel}>Abbrechen</Button>
      </div>
    </div>
  );
}

function PKRoutesTab({ substanceId }: { substanceId: string }) {
  const [pkRoutes, setPKRoutes] = useState<PharmacokineticRoute[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const pharm = await getSubstancePharmacology(substanceId);
      setPKRoutes(pharm.pkRoutes);
    } finally {
      setLoading(false);
    }
  }, [substanceId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleDelete = async (id: string) => {
    if (!confirm("Route wirklich löschen?")) return;
    setDeleting(id);
    setError(null);
    const result = await deletePKRoute(id);
    setDeleting(null);
    if (result.error) { setError(result.error); return; }
    await load();
  };

  if (loading) {
    return <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-neutral-400" /></div>;
  }

  return (
    <div className="space-y-4">
      {error && <ErrorBanner message={error} />}

      <div className="flex items-center justify-between">
        <p className="text-sm text-neutral-500">{pkRoutes.length} Routen</p>
        <Button size="sm" onClick={() => setShowForm(true)}>
          <Plus className="mr-1 h-3 w-3" /> Hinzufügen
        </Button>
      </div>

      {showForm && (
        <PKRouteForm
          substanceId={substanceId}
          onSaved={() => { setShowForm(false); load(); }}
          onCancel={() => setShowForm(false)}
        />
      )}

      {pkRoutes.length === 0 && !showForm && (
        <p className="text-sm text-neutral-500">Keine PK-Daten vorhanden.</p>
      )}

      {pkRoutes.map((pk) => (
        <div key={pk.id} className="flex items-start justify-between rounded-lg border border-neutral-200 p-3 dark:border-neutral-700">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">{ROUTE_LABELS[pk.route] ?? pk.route}</span>
              <Badge variant="outline" className="text-xs">{CONFIDENCE_LABELS[pk.confidence_level]}</Badge>
            </div>
            <p className="text-xs text-neutral-500">
              {pk.half_life_h !== null && `t½ = ${pk.half_life_h}h`}
              {pk.tmax_min !== null && ` · t_max ${pk.tmax_min}–${pk.tmax_max ?? pk.tmax_min} min`}
              {pk.duration_min !== null && ` · Dauer ${pk.duration_min}–${pk.duration_max ?? pk.duration_min} min`}
              {pk.bioavailability_f !== null && ` · F=${(pk.bioavailability_f * 100).toFixed(0)}%`}
            </p>
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => handleDelete(pk.id)}
            disabled={deleting === pk.id}
          >
            {deleting === pk.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3 text-red-500" />}
          </Button>
        </div>
      ))}
    </div>
  );
}

// ─── Pharmacodynamics Tab ─────────────────────────────────────────────────────

function PDForm({
  substanceId,
  existing,
  onSaved,
  onCancel,
}: {
  substanceId: string;
  existing?: Pharmacodynamics;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [route, setRoute] = useState(existing?.route ?? "");
  const [emax, setEmax] = useState(existing?.emax.toString() ?? "100");
  const [ec50mg, setEc50mg] = useState(existing?.ec50_mg?.toString() ?? "");
  const [ec50rel, setEc50rel] = useState(existing?.ec50_rel_concentration?.toString() ?? "");
  const [hillH, setHillH] = useState(existing?.hill_h.toString() ?? "1");
  const [baselineE0, setBaselineE0] = useState(existing?.baseline_e0.toString() ?? "0");
  const [ti, setTi] = useState(existing?.therapeutic_index?.toString() ?? "");
  const [tolerance, setTolerance] = useState(existing?.tolerance_shift_per_day?.toString() ?? "");
  const [confidence, setConfidence] = useState<ConfidenceLevel>(existing?.confidence_level ?? "estimate");
  const [notes, setNotes] = useState(existing?.notes ?? "");

  const n = (v: string) => v ? parseFloat(v) : null;

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    const data: Omit<Pharmacodynamics, "id" | "created_at" | "updated_at"> = {
      substance_id: substanceId,
      route: route || null,
      emax: parseFloat(emax) || 100,
      ec50_mg: n(ec50mg),
      ec50_rel_concentration: n(ec50rel),
      hill_h: parseFloat(hillH) || 1,
      baseline_e0: parseFloat(baselineE0) || 0,
      therapeutic_index: n(ti),
      tolerance_shift_per_day: n(tolerance),
      confidence_level: confidence,
      sources: existing?.sources ?? [],
      notes,
    };
    const result = await upsertPD(data);
    setSaving(false);
    if (result.error) { setError(result.error); return; }
    onSaved();
  };

  return (
    <div className="space-y-3 rounded-lg border border-neutral-200 p-4 dark:border-neutral-700">
      <h5 className="text-sm font-semibold">{existing ? "PD bearbeiten" : "Neues PD-Modell"}</h5>
      {error && <ErrorBanner message={error} />}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs text-neutral-500">Route (optional)</label>
          <Input placeholder="z.B. oral" value={route} onChange={(e) => setRoute(e.target.value)} />
        </div>

        <div>
          <label className="mb-1 block text-xs text-neutral-500">Emax (%)</label>
          <Input type="number" placeholder="100" value={emax} onChange={(e) => setEmax(e.target.value)} />
        </div>

        <div>
          <label className="mb-1 block text-xs text-neutral-500">EC50 / ED50 (mg)</label>
          <Input type="number" placeholder="z.B. 25" value={ec50mg} onChange={(e) => setEc50mg(e.target.value)} />
        </div>

        <div>
          <label className="mb-1 block text-xs text-neutral-500">EC50 rel. (Konzentration 0–1)</label>
          <Input type="number" step="0.01" placeholder="z.B. 0.5" value={ec50rel} onChange={(e) => setEc50rel(e.target.value)} />
        </div>

        <div>
          <label className="mb-1 block text-xs text-neutral-500">Hill-Koeffizient (h)</label>
          <Input type="number" step="0.1" placeholder="1" value={hillH} onChange={(e) => setHillH(e.target.value)} />
        </div>

        <div>
          <label className="mb-1 block text-xs text-neutral-500">Baseline E₀ (%)</label>
          <Input type="number" placeholder="0" value={baselineE0} onChange={(e) => setBaselineE0(e.target.value)} />
        </div>

        <div>
          <label className="mb-1 block text-xs text-neutral-500">Therapeutischer Index</label>
          <Input type="number" placeholder="Optional" value={ti} onChange={(e) => setTi(e.target.value)} />
        </div>

        <div>
          <label className="mb-1 block text-xs text-neutral-500">Toleranzshift / Tag</label>
          <Input type="number" placeholder="Optional" value={tolerance} onChange={(e) => setTolerance(e.target.value)} />
        </div>

        <div>
          <label className="mb-1 block text-xs text-neutral-500">Konfidenz</label>
          <select
            value={confidence}
            onChange={(e) => setConfidence(e.target.value as ConfidenceLevel)}
            className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm dark:border-neutral-600 dark:bg-neutral-800"
          >
            {CONFIDENCE_LEVELS.map((c) => <option key={c} value={c}>{CONFIDENCE_LABELS[c]}</option>)}
          </select>
        </div>
      </div>

      <div>
        <label className="mb-1 block text-xs text-neutral-500">Hinweise</label>
        <Textarea placeholder="Optionale Anmerkungen..." value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
      </div>

      <div className="flex gap-2">
        <Button size="sm" onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Save className="mr-1 h-3 w-3" />}
          Speichern
        </Button>
        <Button size="sm" variant="ghost" onClick={onCancel}>Abbrechen</Button>
      </div>
    </div>
  );
}

function PharmacodynamicsTab({ substanceId }: { substanceId: string }) {
  const [pdParams, setPDParams] = useState<Pharmacodynamics[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const pharm = await getSubstancePharmacology(substanceId);
      setPDParams(pharm.pdParams);
    } finally {
      setLoading(false);
    }
  }, [substanceId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleDelete = async (id: string) => {
    if (!confirm("PD-Modell wirklich löschen?")) return;
    setDeleting(id);
    setError(null);
    const result = await deletePD(id);
    setDeleting(null);
    if (result.error) { setError(result.error); return; }
    await load();
  };

  if (loading) {
    return <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-neutral-400" /></div>;
  }

  return (
    <div className="space-y-4">
      {error && <ErrorBanner message={error} />}

      <div className="flex items-center justify-between">
        <p className="text-sm text-neutral-500">{pdParams.length} Einträge</p>
        <Button size="sm" onClick={() => setShowForm(true)}>
          <Plus className="mr-1 h-3 w-3" /> Hinzufügen
        </Button>
      </div>

      {showForm && (
        <PDForm
          substanceId={substanceId}
          onSaved={() => { setShowForm(false); load(); }}
          onCancel={() => setShowForm(false)}
        />
      )}

      {pdParams.length === 0 && !showForm && (
        <p className="text-sm text-neutral-500">Keine pharmakodynamischen Daten vorhanden.</p>
      )}

      {pdParams.map((pd) => (
        <div key={pd.id} className="flex items-start justify-between rounded-lg border border-neutral-200 p-3 dark:border-neutral-700">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">{pd.route ?? "Allgemein"}</span>
              <Badge variant="outline" className="text-xs">{CONFIDENCE_LABELS[pd.confidence_level]}</Badge>
            </div>
            <p className="text-xs text-neutral-500">
              Emax={pd.emax}%
              {pd.ec50_mg !== null && ` · ED₅₀=${pd.ec50_mg}mg`}
              {` · h=${pd.hill_h}`}
              {pd.therapeutic_index !== null && ` · TI=${pd.therapeutic_index}`}
            </p>
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => handleDelete(pd.id)}
            disabled={deleting === pd.id}
          >
            {deleting === pd.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3 text-red-500" />}
          </Button>
        </div>
      ))}
    </div>
  );
}

// ─── Main Export ──────────────────────────────────────────────────────────────

export function AdminPharmacologyTabs({ substanceId }: AdminPharmacologyTabsProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Pharmakologie-Daten</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="receptors">
          <TabsList className="mb-4">
            <TabsTrigger value="receptors">Rezeptoren</TabsTrigger>
            <TabsTrigger value="pkroutes">PK-Routen</TabsTrigger>
            <TabsTrigger value="pd">Pharmakodynamik</TabsTrigger>
          </TabsList>

          <TabsContent value="receptors">
            <ReceptorAffinitiesTab substanceId={substanceId} />
          </TabsContent>

          <TabsContent value="pkroutes">
            <PKRoutesTab substanceId={substanceId} />
          </TabsContent>

          <TabsContent value="pd">
            <PharmacodynamicsTab substanceId={substanceId} />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
