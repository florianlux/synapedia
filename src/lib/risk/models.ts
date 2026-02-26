export type RiskLevel = "low" | "moderate" | "high" | "critical";

export interface StackEntry {
  type: string;
  level: RiskLevel;
  rationale: string;
}

export interface ReboundWindow {
  window_start: string; // ISO timestamp
  window_end: string;   // ISO timestamp
  risks: string[];
  rationale: string;
}

export interface RiskOverlayResult {
  overall_level: RiskLevel;
  warnings: string[];
  stacks: StackEntry[];
  rebound: ReboundWindow[];
  notes: string[];
}

export interface DosingLogEntry {
  id: string;
  substance: string;
  dose_mg: number | null;
  dose_g: number | null;
  route: string | null;
  notes: string | null;
  taken_at: string; // ISO timestamp
}
