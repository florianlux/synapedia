import { DosingLogEntry, RiskLevel, RiskOverlayResult, StackEntry, ReboundWindow } from "./models";
import { classifySubstance, SubstanceCategory } from "./categories";

/** Hours since a given timestamp relative to `now`. */
function hoursSince(takenAt: string, now: Date): number {
  return (now.getTime() - new Date(takenAt).getTime()) / (1000 * 60 * 60);
}

/** Shift a date by hours (positive = future). */
function addHours(date: Date, hours: number): string {
  return new Date(date.getTime() + hours * 3600_000).toISOString();
}

function bucketByCategory(logs: DosingLogEntry[]): Map<SubstanceCategory, DosingLogEntry[]> {
  const map = new Map<SubstanceCategory, DosingLogEntry[]>();
  for (const log of logs) {
    const cat = classifySubstance(log.substance);
    const arr = map.get(cat) ?? [];
    arr.push(log);
    map.set(cat, arr);
  }
  return map;
}

function computeStackLevel(count: number, hasVaporized: boolean): RiskLevel {
  const effective = count + (hasVaporized ? 1 : 0);
  if (effective <= 1) return "low";
  if (effective <= 2) return "moderate";
  if (effective <= 4) return "high";
  return "critical";
}

/**
 * Compute a harm-reduction risk overlay from dosing logs.
 *
 * DISCLAIMER: This is educational only and NOT medical advice.
 * The output is intentionally conservative and cannot replace
 * professional medical assessment.
 */
export function computeRiskOverlay(
  logs: DosingLogEntry[],
  now: Date = new Date()
): RiskOverlayResult {
  const warnings: string[] = [];
  const stacks: StackEntry[] = [];
  const rebound: ReboundWindow[] = [];
  const notes: string[] = [
    "Diese Analyse ist rein edukativ und stellt KEINE medizinische Beratung dar.",
    "Individuelle Toleranz, Gesundheitszustand und Wechselwirkungen können die Risiken erheblich verändern.",
    "Im Zweifelsfall oder bei schweren Symptomen: Notruf 112.",
  ];

  // Filter logs by recency
  const last12h = logs.filter((l) => hoursSince(l.taken_at, now) <= 12);
  const last24h = logs.filter((l) => hoursSince(l.taken_at, now) <= 24);

  const buckets12 = bucketByCategory(last12h);
  const buckets24 = bucketByCategory(last24h);

  // --- Stack Counter ---

  // Stimulant stack (12h window)
  const stimEntries = buckets12.get("stimulant") ?? [];
  if (stimEntries.length > 0) {
    const hasVaporized = stimEntries.some((e) => {
      const route = e.route?.toLowerCase();
      return route === "vaporized" || route === "geraucht";
    });
    const level = computeStackLevel(stimEntries.length, hasVaporized);
    stacks.push({
      type: "Stimulanzien",
      level,
      rationale: `${stimEntries.length} Einnahme(n) in den letzten 12 h${hasVaporized ? " (inkl. vaporisiert – schnellerer Wirkeintritt)" : ""}.`,
    });
    if (level === "high" || level === "critical") {
      warnings.push("Hohes Stimulanzien-Stacking: erhöhtes Risiko für Herzrasen, Bluthochdruck und Krampfanfälle.");
    }
  }

  // Opioid stack (12h window)
  const opioidEntries = buckets12.get("opioid") ?? [];
  if (opioidEntries.length > 0) {
    const level = computeStackLevel(opioidEntries.length, false);
    stacks.push({
      type: "Opioide",
      level,
      rationale: `${opioidEntries.length} Einnahme(n) in den letzten 12 h.`,
    });
    if (level === "high" || level === "critical") {
      warnings.push("Hohes Opioid-Stacking: Atemdepression möglich. Bei Atemnot sofort Notruf wählen.");
    }
  }

  // GABAergic stack (24h window – phenibut has long tail)
  const gabaEntries = buckets24.get("gabaergic") ?? [];
  if (gabaEntries.length > 0) {
    const level = computeStackLevel(gabaEntries.length, false);
    stacks.push({
      type: "GABAerg",
      level,
      rationale: `${gabaEntries.length} Einnahme(n) in den letzten 24 h (GABAerge Substanzen wie Phenibut wirken lang).`,
    });
    if (level === "high" || level === "critical") {
      warnings.push("Hohes GABAerges Stacking: Verstärkte Sedierung und Atemdepression möglich.");
    }
  }

  // Cannabis (24h)
  const cannabisEntries = buckets24.get("cannabis") ?? [];
  if (cannabisEntries.length > 0) {
    stacks.push({
      type: "Cannabis",
      level: cannabisEntries.length >= 3 ? "moderate" : "low",
      rationale: `${cannabisEntries.length} Einnahme(n) in den letzten 24 h.`,
    });
  }

  // Nicotine (24h)
  const nicotineEntries = buckets24.get("nicotine") ?? [];
  if (nicotineEntries.length > 0) {
    stacks.push({
      type: "Nikotin",
      level: "low",
      rationale: `${nicotineEntries.length} Einnahme(n) in den letzten 24 h.`,
    });
  }

  // --- Cross-category interactions ---

  // Opioid + GABAergic overlap → respiratory depression
  if (opioidEntries.length > 0 && gabaEntries.length > 0) {
    warnings.push(
      "⚠️ Opioide + GABAerge Substanzen gleichzeitig: HOHES Risiko für Atemdepression. " +
      "Keine weiteren Depressiva einnehmen. Im Notfall: 112."
    );
  }

  // Stimulant + Opioid overlap → masking
  if (stimEntries.length > 0 && opioidEntries.length > 0) {
    warnings.push(
      "⚠️ Stimulanzien + Opioide: Stimulanzien können die Sedierung maskieren – " +
      "das Risiko einer Opioid-Überdosis bleibt bestehen oder steigt, wenn das Stimulans nachlässt."
    );
  }

  // Stimulant + Cannabis → anxiety/paranoia
  if (stimEntries.length > 0 && cannabisEntries.length > 0) {
    warnings.push(
      "Stimulanzien + Cannabis: Erhöhtes Risiko für Angst, Paranoia und Herzrasen."
    );
  }

  // --- Rebound Predictor ---

  // Stimulant rebound
  if (stimEntries.length > 0) {
    const lastStim = stimEntries.reduce((a, b) =>
      new Date(a.taken_at) > new Date(b.taken_at) ? a : b
    );
    const lastTime = new Date(lastStim.taken_at);
    const lastRoute = lastStim.route?.toLowerCase();
    const isVaporized = lastRoute === "vaporized" || lastRoute === "geraucht";
    const startH = isVaporized ? 1 : 2;
    const endH = isVaporized ? 6 : 10;

    rebound.push({
      window_start: addHours(lastTime, startH),
      window_end: addHours(lastTime, endH),
      risks: ["Rebound-Angst", "Schlaflosigkeit", "Stimmungstief", "Erschöpfung"],
      rationale: `Stimulanzien-Rebound ca. ${startH}–${endH} h nach letzter Einnahme${isVaporized ? " (vaporisiert: kürzeres Fenster)" : ""}.`,
    });
  }

  // Opioid discontinuation warning (broad range, no exact timing)
  if (opioidEntries.length > 0) {
    const lastOpioid = opioidEntries.reduce((a, b) =>
      new Date(a.taken_at) > new Date(b.taken_at) ? a : b
    );
    const lastTime = new Date(lastOpioid.taken_at);
    rebound.push({
      window_start: addHours(lastTime, 4),
      window_end: addHours(lastTime, 48),
      risks: ["Entzugssymptome möglich", "Unruhe", "Muskelschmerzen", "Schlafstörungen"],
      rationale:
        "Opioid-Entzugsfenster ist sehr individuell (4–48 h+). " +
        "Keine genaue Vorhersage möglich – hängt von Substanz, Dauer des Gebrauchs und Toleranz ab.",
    });
  }

  // GABAergic rebound (longer window)
  if (gabaEntries.length > 0) {
    const lastGaba = gabaEntries.reduce((a, b) =>
      new Date(a.taken_at) > new Date(b.taken_at) ? a : b
    );
    const lastTime = new Date(lastGaba.taken_at);
    rebound.push({
      window_start: addHours(lastTime, 6),
      window_end: addHours(lastTime, 72),
      risks: ["Rebound-Angst", "Schlafstörungen", "Krampfanfälle (bei abruptem Absetzen)"],
      rationale:
        "GABAerge Substanzen können Rebound-Effekte über Tage zeigen. " +
        "Abruptes Absetzen kann gefährlich sein – ärztliche Begleitung empfohlen.",
    });
  }

  // --- Determine overall level ---
  let overall_level: RiskLevel = "low";

  // Check cross-category danger combos first
  if (opioidEntries.length > 0 && gabaEntries.length > 0) {
    overall_level = "critical";
  } else {
    const stackLevels = stacks.map((s) => s.level);
    if (stackLevels.includes("critical")) overall_level = "critical";
    else if (stackLevels.includes("high")) overall_level = "high";
    else if (stackLevels.includes("moderate")) overall_level = "moderate";
  }

  // Always add conservative safety warnings
  if (overall_level === "high" || overall_level === "critical") {
    warnings.push("Keine weiteren Substanzen einnehmen. Ausreichend Wasser trinken. Nicht alleine sein.");
    warnings.push(
      "🚨 Red Flags: Brustschmerzen, schwere Atemnot, Verwirrtheit, blaue Lippen, Bewusstlosigkeit → Sofort 112 rufen!"
    );
  }

  // Deduplicate warnings
  const uniqueWarnings = Array.from(new Set(warnings));

  return {
    overall_level,
    warnings: uniqueWarnings,
    stacks,
    rebound,
    notes,
  };
}
