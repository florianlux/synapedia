"use server";

import type {
  Target,
  SubstanceTargetAffinity,
  AffinityWithTarget,
  PharmacokineticRoute,
  Pharmacodynamics,
  SubstancePharmacology,
} from "@/lib/types";

// Normalize affinity_nm to 0..1 strength using log scale
// Smaller Ki/IC50 = stronger binding = higher strength
export function normalizeAffinity(
  affinityNm: number | null,
  minNm = 0.01,
  maxNm = 100000
): number {
  if (affinityNm === null || affinityNm <= 0) return 0.3; // conservative for qualitative
  const logMin = Math.log10(minNm);
  const logMax = Math.log10(maxNm);
  const logVal = Math.log10(affinityNm);
  const strength = (logMax - logVal) / (logMax - logMin);
  return Math.max(0, Math.min(1, strength));
}

export async function getSubstancePharmacology(
  substanceId: string
): Promise<SubstancePharmacology> {
  try {
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = await createClient();

    const [affinityRes, pkRes, pdRes] = await Promise.all([
      supabase
        .from("substance_target_affinity")
        .select("*, target:targets(*)")
        .eq("substance_id", substanceId)
        .order("created_at"),
      supabase
        .from("pharmacokinetics_routes")
        .select("*")
        .eq("substance_id", substanceId)
        .order("route"),
      supabase
        .from("pharmacodynamics")
        .select("*")
        .eq("substance_id", substanceId),
    ]);

    const rawAffinities = (affinityRes.data ?? []) as (SubstanceTargetAffinity & {
      target: Target;
    })[];
    const targets: AffinityWithTarget[] = rawAffinities.map((a) => ({
      ...a,
      strength: normalizeAffinity(a.affinity_nm),
    }));

    return {
      targets,
      pkRoutes: (pkRes.data ?? []) as PharmacokineticRoute[],
      pdParams: (pdRes.data ?? []) as Pharmacodynamics[],
    };
  } catch {
    return { targets: [], pkRoutes: [], pdParams: [] };
  }
}

export async function upsertTargetAffinity(
  data: Omit<SubstanceTargetAffinity, "id" | "created_at" | "updated_at" | "target">
): Promise<{ error?: string }> {
  try {
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = await createClient();
    const { error } = await supabase
      .from("substance_target_affinity")
      .upsert({ ...data, updated_at: new Date().toISOString() });
    if (error) return { error: error.message };
    return {};
  } catch (e) {
    return { error: String(e) };
  }
}

export async function deleteTargetAffinity(id: string): Promise<{ error?: string }> {
  try {
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = await createClient();
    const { error } = await supabase
      .from("substance_target_affinity")
      .delete()
      .eq("id", id);
    if (error) return { error: error.message };
    return {};
  } catch (e) {
    return { error: String(e) };
  }
}

export async function upsertPKRoute(
  data: Omit<PharmacokineticRoute, "id" | "created_at" | "updated_at">
): Promise<{ error?: string }> {
  try {
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = await createClient();
    const { error } = await supabase
      .from("pharmacokinetics_routes")
      .upsert({ ...data, updated_at: new Date().toISOString() }, { onConflict: "substance_id,route" });
    if (error) return { error: error.message };
    return {};
  } catch (e) {
    return { error: String(e) };
  }
}

export async function deletePKRoute(id: string): Promise<{ error?: string }> {
  try {
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = await createClient();
    const { error } = await supabase
      .from("pharmacokinetics_routes")
      .delete()
      .eq("id", id);
    if (error) return { error: error.message };
    return {};
  } catch (e) {
    return { error: String(e) };
  }
}

export async function upsertPD(
  data: Omit<Pharmacodynamics, "id" | "created_at" | "updated_at">
): Promise<{ error?: string }> {
  try {
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = await createClient();
    const { error } = await supabase
      .from("pharmacodynamics")
      .upsert({ ...data, updated_at: new Date().toISOString() });
    if (error) return { error: error.message };
    return {};
  } catch (e) {
    return { error: String(e) };
  }
}

export async function deletePD(id: string): Promise<{ error?: string }> {
  try {
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = await createClient();
    const { error } = await supabase.from("pharmacodynamics").delete().eq("id", id);
    if (error) return { error: error.message };
    return {};
  } catch (e) {
    return { error: String(e) };
  }
}

export async function listTargets(): Promise<Target[]> {
  try {
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = await createClient();
    const { data } = await supabase.from("targets").select("*").order("family").order("name");
    return (data ?? []) as Target[];
  } catch {
    return [];
  }
}
