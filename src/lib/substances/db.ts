/**
 * Database functions for substances, sources, and reddit reports.
 * Follows the same pattern as src/lib/db/articles.ts
 */

import { createClient } from "@/lib/supabase/client";
import type { SubstanceRow } from "./schema";
import { sanitizeSubstancePayload } from "./sanitize";

/* ---------- Substances ---------- */

export async function getSubstances(): Promise<SubstanceRow[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("substances")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[getSubstances]", error.message);
    throw new Error("Substanzen konnten nicht geladen werden.");
  }

  return data as SubstanceRow[];
}

export async function getSubstanceBySlug(slug: string): Promise<SubstanceRow | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("substances")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();

  if (error) {
    console.error("[getSubstanceBySlug]", error.message);
    return null;
  }

  return data as SubstanceRow | null;
}

export async function getSubstanceById(id: string): Promise<SubstanceRow | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("substances")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error("[getSubstanceById]", error.message);
    return null;
  }

  return data as SubstanceRow | null;
}

export async function createSubstance(substance: Omit<SubstanceRow, "id" | "created_at">): Promise<SubstanceRow> {
  const supabase = createClient();

  const { data: existing } = await supabase
    .from("substances")
    .select("id")
    .eq("slug", substance.slug)
    .maybeSingle();

  if (existing) {
    throw new Error(`Substanz mit Slug "${substance.slug}" existiert bereits.`);
  }

  const { data, error } = await supabase
    .from("substances")
    .insert(sanitizeSubstancePayload(substance as unknown as Record<string, unknown>))
    .select()
    .single();

  if (error) {
    console.error("[createSubstance]", error.message);
    throw new Error("Substanz konnte nicht erstellt werden.");
  }

  return data as SubstanceRow;
}

export async function updateSubstanceStatus(id: string, status: "draft" | "review" | "published"): Promise<SubstanceRow> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("substances")
    .update({ status })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("[updateSubstanceStatus]", error.message);
    throw new Error("Status konnte nicht aktualisiert werden.");
  }

  return data as SubstanceRow;
}

export async function deleteSubstance(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("substances")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("[deleteSubstance]", error.message);
    throw new Error("Substanz konnte nicht gelöscht werden.");
  }
}

/* ---------- Sources ---------- */

export async function createSubstanceSources(sources: Array<{
  substance_id: string;
  source_name: string;
  source_url: string;
  source_type: string;
  snippet: string;
  snippet_hash: string;
  license_note: string;
  confidence: number;
}>): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("substance_sources")
    .insert(sources);

  if (error) {
    console.error("[createSubstanceSources]", error.message);
    throw new Error("Quellen konnten nicht erstellt werden.");
  }
}

export async function getSubstanceSources(substanceId: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("substance_sources")
    .select("*")
    .eq("substance_id", substanceId)
    .order("confidence", { ascending: false });

  if (error) {
    console.error("[getSubstanceSources]", error.message);
    return [];
  }

  return data;
}

/* ---------- Reddit Reports ---------- */

export async function getRedditReports(substanceId: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("reddit_reports")
    .select("*")
    .eq("substance_id", substanceId)
    .order("upvotes", { ascending: false });

  if (error) {
    console.error("[getRedditReports]", error.message);
    return [];
  }

  return data;
}
