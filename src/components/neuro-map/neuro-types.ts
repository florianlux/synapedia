/* ------------------------------------------------------------------ */
/*  NeuroMap – type definitions                                       */
/* ------------------------------------------------------------------ */

/** Raw substance record coming from data/substances.json */
export interface SubstanceRaw {
  id: string;
  slug: string;
  title: string;
  class_primary: string;
  class_secondary: string[];
  mechanisms: string[];
  receptors: string[];
  tags: string[];
  risk_level: string;
  summary: string;
  sources: { label: string; url: string }[];
}

/** Raw interaction record from data/interactions.json */
export interface InteractionRaw {
  a: string;
  b: string;
  risk: string;
  headline: string;
  mechanism_conflict: string[];
  explanation: string;
  harm_reduction: string[];
  sources: { label: string; url: string }[];
  last_reviewed: string;
}

/** Raw receptor record from data/receptors.json */
export interface ReceptorRaw {
  id: string;
  label: string;
  type: string;
  system: string;
  description: string;
  risk_notes: string;
  related_substances: string[];
}

/* ---- graph primitives ---- */

export interface NeuroNode {
  id: string;
  slug: string;
  label: string;
  classPrimary: string;
  receptors: string[];
  mechanisms: string[];
  riskLevel: string;
  summary: string;
  sources: { label: string; url: string }[];
  /** computed size (radius) based on receptor count */
  radius: number;
  /** position */
  x: number;
  y: number;
  /** velocity for force-directed simulation */
  vx: number;
  vy: number;
}

export type LinkType = "class" | "receptor" | "interaction" | "structure";

export interface NeuroLink {
  source: string;
  target: string;
  type: LinkType;
  /** optional risk level for interaction links */
  risk?: string;
}

/** Substance class → color mapping */
export const CLASS_COLORS: Record<string, string> = {
  Dissoziativa: "#06b6d4",   // cyan
  Psychedelika: "#a855f7",   // purple
  Empathogene: "#ec4899",    // pink
  Cannabinoide: "#22c55e",   // green
  Stimulanzien: "#f59e0b",   // amber
  Depressiva: "#3b82f6",     // blue
  Opioide: "#ef4444",        // red
  Antidepressiva: "#64748b", // slate
};

export const DEFAULT_NODE_COLOR = "#71717a"; // zinc-500

/** Receptor overlay color mapping (neon style) */
export const RECEPTOR_COLORS: Record<string, string> = {
  "μ-Opioid": "#ef4444",
  "NMDA": "#06b6d4",
  "5-HT2A": "#a855f7",
  "DAT": "#f59e0b",
  "GABA-A": "#3b82f6",
  "5-HT1A": "#c084fc",
  "SERT": "#ec4899",
  "NET": "#fb923c",
  "CB1": "#22c55e",
  "CB2": "#4ade80",
  "D2": "#facc15",
  "κ-Opioid": "#f87171",
  "Sigma-1": "#818cf8",
  "nACh": "#2dd4bf",
  "A1": "#fbbf24",
  "A2A": "#f59e0b",
  "TAAR1": "#fb923c",
  "GABA-B": "#60a5fa",
  "5-HT2C": "#d946ef",
};

/** Layer filter names = the substance classes we allow toggling */
export const LAYER_FILTERS = [
  "Opioide",
  "Stimulanzien",
  "Depressiva",
  "Psychedelika",
  "Dissoziativa",
  "Empathogene",
  "Cannabinoide",
  "Antidepressiva",
] as const;

export type LayerFilter = (typeof LAYER_FILTERS)[number];

/** Receptor overlay toggles */
export const RECEPTOR_OVERLAYS = [
  "μ-Opioid",
  "NMDA",
  "5-HT2A",
  "DAT",
  "GABA-A",
] as const;

export type ReceptorOverlay = (typeof RECEPTOR_OVERLAYS)[number];
