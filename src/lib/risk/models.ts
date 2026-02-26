/**
 * Type definitions for the Poly-Substance Risk Overlay.
 *
 * DISCLAIMER: Educational only. NOT medical advice.
 */

export type OverallRiskLevel = "low" | "moderate" | "high" | "critical";

export interface StackEntry {
  type: string;
  level: OverallRiskLevel;
  count: number;
  rationale: string;
}

export interface ReboundWindow {
  window_start: string; // relative description, e.g. "+2h"
  window_end: string;   // e.g. "+10h"
  risks: string[];
  rationale: string;
}

export interface RiskOverlayResult {
  overall_level: OverallRiskLevel;
  warnings: string[];
  stacks: StackEntry[];
  rebound: ReboundWindow[];
  notes: string[];
}

/** Input log entry for risk computation (compatible with user_logs or dosing_logs) */
export interface RiskLogEntry {
  substance: string;
  dose_value?: number | null;
  dose_unit?: string | null;
  route?: string | null;
  taken_at: string; // ISO datetime
}
