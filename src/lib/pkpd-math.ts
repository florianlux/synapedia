import type { PharmacokineticRoute, Pharmacodynamics, PKCurvePoint } from "@/lib/types";

// Solve for ka given ke and tmax using binary search
// tmax = ln(ka/ke)/(ka-ke) for one-compartment first-order absorption
export function solveKa(ke: number, tmax_h: number): number {
  if (tmax_h <= 0 || ke <= 0) return ke * 5; // fallback
  let a = ke * 1.05;
  let b = ke * 200;
  for (let i = 0; i < 200; i++) {
    const m = (a + b) / 2;
    const pred = Math.log(m / ke) / (m - ke);
    if (pred > tmax_h) {
      a = m;
    } else {
      b = m;
    }
    if (Math.abs(b - a) < 1e-8) break;
  }
  return (a + b) / 2;
}

// One-compartment concentration model
// Returns relative concentration (not absolute)
export function concentration(t_h: number, ka: number, ke: number): number {
  if (Math.abs(ka - ke) < 1e-9) {
    return t_h * Math.exp(-ke * t_h);
  }
  const c = (ka / (ka - ke)) * (Math.exp(-ke * t_h) - Math.exp(-ka * t_h));
  return Math.max(0, c);
}

// IV bolus: simple mono-exponential
export function concentrationIV(t_h: number, ke: number): number {
  return Math.exp(-ke * t_h);
}

// Emax/Hill model: Effect = E0 + (Emax * C^h) / (EC50^h + C^h)
export function emaxEffect(
  c: number,
  emax: number,
  ec50: number,
  hill: number,
  e0 = 0
): number {
  if (c <= 0) return e0;
  const ch = Math.pow(c, hill);
  const ec50h = Math.pow(ec50, hill);
  return e0 + (emax * ch) / (ec50h + ch);
}

interface CurveParams {
  ke: number;
  ka: number;
  isIV: boolean;
}

function deriveCurveParams(
  pk: PharmacokineticRoute,
  useLow: boolean
): CurveParams {
  const halfLife = pk.half_life_h ?? 4;
  const ke = Math.log(2) / halfLife;

  if (pk.route === "iv") {
    return { ke, ka: ke * 100, isIV: true };
  }

  if (pk.ka_h && pk.ka_h > ke) {
    return { ke, ka: pk.ka_h, isIV: false };
  }

  const tmaxMin = useLow
    ? (pk.tmax_min ?? 60)
    : (pk.tmax_max ?? pk.tmax_min ?? 90);
  const tmax_h = tmaxMin / 60;
  const ka = solveKa(ke, tmax_h);
  return { ke, ka, isIV: false };
}

export function computePKCurve(
  pk: PharmacokineticRoute,
  pd: Pharmacodynamics | null,
  doseScale = 1
): PKCurvePoint[] {
  const durationMax = (pk.duration_max ?? pk.duration_min ?? 360) +
    (pk.after_effects_max ?? 0);
  const totalMinutes = Math.max(durationMax + 60, 120);
  const steps = 120;
  const dt = totalMinutes / steps;

  const meanParams = deriveCurveParams(pk, false);
  const lowParams = deriveCurveParams(pk, true);
  const highParams: CurveParams = {
    ke: Math.log(2) / (pk.half_life_h ? pk.half_life_h * 1.3 : 5.2),
    ka: lowParams.ka * 0.7,
    isIV: pk.route === "iv",
  };

  let peakMean = 0;
  let peakLow = 0;
  let peakHigh = 0;
  for (let i = 0; i <= steps; i++) {
    const t_h = (i * dt) / 60;
    const cm = meanParams.isIV
      ? concentrationIV(t_h, meanParams.ke)
      : concentration(t_h, meanParams.ka, meanParams.ke);
    const cl = lowParams.isIV
      ? concentrationIV(t_h, lowParams.ke)
      : concentration(t_h, lowParams.ka, lowParams.ke);
    const ch = highParams.isIV
      ? concentrationIV(t_h, highParams.ke)
      : concentration(t_h, highParams.ka, highParams.ke);
    if (cm > peakMean) peakMean = cm;
    if (cl > peakLow) peakLow = cl;
    if (ch > peakHigh) peakHigh = ch;
  }

  const normalize = (c: number, peak: number) =>
    peak > 0 ? (c / peak) * doseScale : 0;

  const toEffect = (relC: number): number => {
    if (!pd || !pd.ec50_rel_concentration) {
      return relC * 100;
    }
    return emaxEffect(
      relC,
      pd.emax,
      pd.ec50_rel_concentration,
      pd.hill_h,
      pd.baseline_e0
    );
  };

  const points: PKCurvePoint[] = [];
  for (let i = 0; i <= steps; i++) {
    const t_min = i * dt;
    const t_h = t_min / 60;
    const cm = normalize(
      meanParams.isIV
        ? concentrationIV(t_h, meanParams.ke)
        : concentration(t_h, meanParams.ka, meanParams.ke),
      peakMean
    );
    const cl = normalize(
      lowParams.isIV
        ? concentrationIV(t_h, lowParams.ke)
        : concentration(t_h, lowParams.ka, lowParams.ke),
      peakLow
    );
    const ch = normalize(
      highParams.isIV
        ? concentrationIV(t_h, highParams.ke)
        : concentration(t_h, highParams.ka, highParams.ke),
      peakHigh
    );
    points.push({
      t: Math.round(t_min),
      mean: Math.round(toEffect(cm) * 10) / 10,
      low: Math.round(toEffect(Math.min(cl, ch)) * 10) / 10,
      high: Math.round(toEffect(Math.max(cl, ch)) * 10) / 10,
    });
  }
  return points;
}

export function computeDoseResponseCurve(
  pd: Pharmacodynamics,
  doseRange: [number, number],
  steps = 100
): { dose: number; effect: number }[] {
  const [minDose, maxDose] = doseRange;
  if (!pd.ec50_mg || minDose >= maxDose) return [];
  const points = [];
  for (let i = 0; i <= steps; i++) {
    const dose = minDose + (i / steps) * (maxDose - minDose);
    const effect = emaxEffect(dose, pd.emax, pd.ec50_mg, pd.hill_h, pd.baseline_e0);
    points.push({ dose: Math.round(dose * 10) / 10, effect: Math.round(effect * 10) / 10 });
  }
  return points;
}
