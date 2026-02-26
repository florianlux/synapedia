/**
 * Poly-Substance Risk Overlay computation engine.
 *
 * DISCLAIMER: This is educational only and does NOT constitute medical advice.
 * It does NOT suggest what to take, does NOT provide dosing instructions,
 * and does NOT recommend "best combos". It only visualizes risks based on
 * categories and timing with significant uncertainty.
 *
 * If you experience severe symptoms, call emergency services immediately.
 */

import { classifySubstance, type SubstanceCategory } from "./categories";
import type {
  RiskLogEntry,
  RiskOverlayResult,
  StackEntry,
  ReboundWindow,
  OverallRiskLevel,
} from "./models";

/** Hours between a given date and now */
function hoursAgo(takenAt: string, now: Date): number {
  return (now.getTime() - new Date(takenAt).getTime()) / (1000 * 60 * 60);
}

/** Check if route is vaporized/smoked */
function isVaporized(route?: string | null): boolean {
  if (!route) return false;
  const r = route.toLowerCase();
  return r === "vaporized" || r === "smoked" || r === "vaped" || r === "geraucht" || r === "verdampft";
}

interface CategorizedEntry {
  entry: RiskLogEntry;
  category: SubstanceCategory;
  hoursAgo: number;
}

/**
 * Compute a risk overlay from dosing log entries.
 *
 * @param logs - Array of log entries (substance, dose, route, timestamp)
 * @param now - Current time (defaults to new Date())
 * @returns Risk overlay result with stack counters, warnings, and rebound windows
 */
export function computeRiskOverlay(
  logs: RiskLogEntry[],
  now: Date = new Date()
): RiskOverlayResult {
  const warnings: string[] = [];
  const stacks: StackEntry[] = [];
  const rebound: ReboundWindow[] = [];
  const notes: string[] = [
    "⚠️ Diese Analyse ist rein heuristisch und ersetzt keine medizinische Beurteilung.",
    "Individuelle Faktoren (Toleranz, Gewicht, Gesundheitszustand, Genetik) beeinflussen Risiken erheblich.",
    "Angaben zu Zeitfenstern sind grobe Schätzungen mit hoher Unsicherheit.",
  ];

  // Categorize all entries
  const categorized: CategorizedEntry[] = logs.map((entry) => ({
    entry,
    category: classifySubstance(entry.substance),
    hoursAgo: hoursAgo(entry.taken_at, now),
  }));

  // ── Stack Counters ──────────────────────────────────────

  // Stimulant stack: last 12h
  const stimEntries = categorized.filter(
    (e) => e.category === "stimulant" && e.hoursAgo >= 0 && e.hoursAgo <= 12
  );
  const stimVaporized = stimEntries.filter((e) => isVaporized(e.entry.route));
  // Vaporized entries count 1.5x for acute spike assessment
  const stimScore = stimEntries.length + stimVaporized.length * 0.5;
  const stimLevel = stackLevel(stimScore, 1, 2, 4);
  stacks.push({
    type: "Stimulanzien",
    level: stimLevel,
    count: stimEntries.length,
    rationale: stimEntries.length === 0
      ? "Keine Stimulanzien in den letzten 12 Stunden."
      : `${stimEntries.length} Stimulanzien-Einnahme(n) in 12h.${stimVaporized.length > 0 ? ` Davon ${stimVaporized.length}× verdampft/geraucht (schnellerer Anflutung).` : ""}`,
  });

  // Opioid stack: last 12h
  const opioidEntries = categorized.filter(
    (e) => e.category === "opioid" && e.hoursAgo >= 0 && e.hoursAgo <= 12
  );
  const opioidLevel = stackLevel(opioidEntries.length, 1, 2, 3);
  stacks.push({
    type: "Opioide",
    level: opioidLevel,
    count: opioidEntries.length,
    rationale: opioidEntries.length === 0
      ? "Keine Opioide in den letzten 12 Stunden."
      : `${opioidEntries.length} Opioid-Einnahme(n) in 12h.`,
  });

  // GABAergic stack: last 24h (phenibut has a long tail)
  const gabaEntries = categorized.filter(
    (e) => e.category === "gabaergic" && e.hoursAgo >= 0 && e.hoursAgo <= 24
  );
  const gabaLevel = stackLevel(gabaEntries.length, 1, 2, 3);
  stacks.push({
    type: "GABAerg",
    level: gabaLevel,
    count: gabaEntries.length,
    rationale: gabaEntries.length === 0
      ? "Keine GABAergen Substanzen in den letzten 24 Stunden."
      : `${gabaEntries.length} GABAerge Einnahme(n) in 24h. Phenibut und GHB haben lange Wirkdauern.`,
  });

  // Cannabis stack: last 12h
  const cannabisEntries = categorized.filter(
    (e) => e.category === "cannabis" && e.hoursAgo >= 0 && e.hoursAgo <= 12
  );
  stacks.push({
    type: "Cannabis",
    level: stackLevel(cannabisEntries.length, 1, 3, 5),
    count: cannabisEntries.length,
    rationale: cannabisEntries.length === 0
      ? "Kein Cannabis in den letzten 12 Stunden."
      : `${cannabisEntries.length} Cannabis-Einnahme(n) in 12h.`,
  });

  // Nicotine stack: last 6h
  const nicotineEntries = categorized.filter(
    (e) => e.category === "nicotine" && e.hoursAgo >= 0 && e.hoursAgo <= 6
  );
  stacks.push({
    type: "Nikotin",
    level: stackLevel(nicotineEntries.length, 3, 8, 15),
    count: nicotineEntries.length,
    rationale: nicotineEntries.length === 0
      ? "Kein Nikotin in den letzten 6 Stunden."
      : `${nicotineEntries.length} Nikotin-Einnahme(n) in 6h.`,
  });

  // ── Cross-Category Warnings ─────────────────────────────

  // Opioid + GABAergic overlap → respiratory depression
  if (opioidEntries.length > 0 && gabaEntries.length > 0) {
    warnings.push(
      "🔴 ATEMDEPRESSION: Opioide und GABAerge Substanzen zusammen erhöhen das Risiko einer Atemdepression erheblich. Dies ist eine der häufigsten Todesursachen bei Mischkonsum."
    );
  }

  // Stimulant + Opioid overlap → masking
  if (stimEntries.length > 0 && opioidEntries.length > 0) {
    warnings.push(
      "🟠 MASKIERUNG: Stimulanzien können die sedierende Wirkung von Opioiden überdecken. Wenn das Stimulans nachlässt, kann die volle Opioid-Wirkung durchschlagen – Überdosis-Risiko."
    );
  }

  // Stimulant + Cannabis → anxiety
  if (stimEntries.length > 0 && cannabisEntries.length > 0) {
    warnings.push(
      "🟡 ANGST/PARANOIA: Die Kombination von Stimulanzien und Cannabis kann Angst, Paranoia und Herzrasen verstärken."
    );
  }

  // Multiple opioids
  if (opioidEntries.length >= 2) {
    const substances = [...new Set(opioidEntries.map((e) => e.entry.substance))];
    if (substances.length >= 2) {
      warnings.push(
        "🔴 MEHRERE OPIOIDE: Verschiedene Opioide gleichzeitig potenzieren sich gegenseitig. Extremes Überdosis-Risiko."
      );
    }
  }

  // Multiple GABAergics
  if (gabaEntries.length >= 2) {
    const substances = [...new Set(gabaEntries.map((e) => e.entry.substance))];
    if (substances.length >= 2) {
      warnings.push(
        "🔴 MEHRERE GABAerge SUBSTANZEN: Die Kombination mehrerer zentraldämpfender Substanzen ist besonders gefährlich (z.B. Benzos + Alkohol, Phenibut + GHB)."
      );
    }
  }

  // General hydration warning for stimulants
  if (stimEntries.length > 0) {
    warnings.push(
      "💧 HYDRATION: Achte bei Stimulanzien auf ausreichende Flüssigkeitszufuhr und regelmäßige Pausen."
    );
  }

  // ── Rebound Predictor ───────────────────────────────────

  // Stimulant rebound
  if (stimEntries.length > 0) {
    const lastStim = stimEntries.reduce((a, b) =>
      new Date(a.entry.taken_at) > new Date(b.entry.taken_at) ? a : b
    );
    const isVap = isVaporized(lastStim.entry.route);
    // Vaporized: shorter action = earlier rebound (1-4h), oral: 2-10h
    const startH = isVap ? 1 : 2;
    const endH = isVap ? 4 : 10;

    rebound.push({
      window_start: `+${startH}h nach letzter Stimulans-Einnahme`,
      window_end: `+${endH}h nach letzter Stimulans-Einnahme`,
      risks: [
        "Rebound-Angst und Unruhe",
        "Schlafstörungen / Insomnie",
        "Stimmungstief (Crash)",
        "Craving (Nachlegebedürfnis)",
      ],
      rationale: `Stimulanzien-Rebound typischerweise ${startH}–${endH}h nach Einnahme${isVap ? " (kürzer bei inhalativer Aufnahme)" : ""}. Breites Unsicherheitsfenster.`,
    });
  }

  // Opioid withdrawal — only generic warning, no exact timing
  if (opioidEntries.length > 0) {
    rebound.push({
      window_start: "Variabel (Stunden bis Tage)",
      window_end: "Abhängig von Substanz und Nutzungsmuster",
      risks: [
        "Entzugssymptome bei regelmäßiger Nutzung",
        "Unruhe, Schwitzen, Muskelschmerzen",
        "Gastrointestinale Beschwerden",
      ],
      rationale:
        "Opioid-Entzug hängt stark von der Substanz, Dosis und Nutzungsdauer ab. Exaktes Timing kann NICHT zuverlässig geschätzt werden. Bei regelmäßiger Nutzung: ärztliche Begleitung empfohlen.",
    });
  }

  // GABAergic rebound
  if (gabaEntries.length > 0) {
    rebound.push({
      window_start: "Variabel (6–72h)",
      window_end: "Abhängig von Substanz und Halbwertszeit",
      risks: [
        "Rebound-Angst",
        "Schlafstörungen",
        "Bei längerer Nutzung: Krampfanfall-Risiko (medizinischer Notfall)",
      ],
      rationale:
        "GABAerger Rebound variiert stark. Phenibut hat eine HWZ von ~5h, Benzos variieren von 2–100h+. Abruptes Absetzen nach regelmäßiger Nutzung kann lebensgefährlich sein – ärztliche Begleitung empfohlen.",
    });
  }

  // Sleep opportunity (neutral, not advice)
  if (stimEntries.length > 0) {
    const lastStim = stimEntries.reduce((a, b) =>
      new Date(a.entry.taken_at) > new Date(b.entry.taken_at) ? a : b
    );
    const isVap = isVaporized(lastStim.entry.route);
    const sleepH = isVap ? 3 : 6;

    rebound.push({
      window_start: `+${sleepH}h nach letzter Stimulans-Einnahme`,
      window_end: `+${sleepH + 6}h`,
      risks: [],
      rationale: `Du könntest frühestens ab ~${sleepH}h nach der letzten Stimulans-Einnahme müde werden. Dies ist eine grobe Schätzung – keine Einschlafgarantie.`,
    });
  }

  // ── Overall Level ──────────────────────────────────────

  let overall_level: OverallRiskLevel = "low";

  // Critical if opioid + GABA overlap or multiple opioids with 2+ substances
  if (opioidEntries.length > 0 && gabaEntries.length > 0) {
    overall_level = "critical";
  } else if (
    opioidEntries.length >= 2 &&
    [...new Set(opioidEntries.map((e) => e.entry.substance))].length >= 2
  ) {
    overall_level = "critical";
  } else if (
    gabaEntries.length >= 2 &&
    [...new Set(gabaEntries.map((e) => e.entry.substance))].length >= 2
  ) {
    overall_level = "critical";
  }

  // High if stimulant + opioid masking or high stack scores
  if (overall_level !== "critical") {
    if (stimEntries.length > 0 && opioidEntries.length > 0) {
      overall_level = "high";
    } else if (stimLevel === "high" || opioidLevel === "high" || gabaLevel === "high") {
      overall_level = "high";
    } else if (stimLevel === "critical" || opioidLevel === "critical" || gabaLevel === "critical") {
      overall_level = "critical";
    }
  }

  // Moderate if any significant stacking
  if (overall_level === "low") {
    const activeCategories = categorized.filter(
      (e) => e.hoursAgo >= 0 && e.hoursAgo <= 24 && e.category !== "nicotine"
    );
    const uniqueCategories = new Set(activeCategories.map((e) => e.category));
    if (uniqueCategories.size >= 2 || activeCategories.length >= 3) {
      overall_level = "moderate";
    } else if (activeCategories.length >= 1) {
      overall_level = "moderate";
    }
  }

  // Conservative additional warnings
  if (overall_level === "high" || overall_level === "critical") {
    warnings.push(
      "🚫 NICHT nachlegen – Redosing erhöht das Risiko überproportional."
    );
    warnings.push(
      "📞 Bei schweren Symptomen (Atemnot, Brustschmerzen, Bewusstlosigkeit, blaue Lippen): Sofort Notruf 112."
    );
  }

  return {
    overall_level,
    warnings,
    stacks,
    rebound,
    notes,
  };
}

/** Map a count to a risk level */
function stackLevel(
  score: number,
  moderateThreshold: number,
  highThreshold: number,
  criticalThreshold: number
): OverallRiskLevel {
  if (score >= criticalThreshold) return "critical";
  if (score >= highThreshold) return "high";
  if (score >= moderateThreshold) return "moderate";
  return "low";
}
