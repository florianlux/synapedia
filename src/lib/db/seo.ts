import { isSupabaseConfigured } from "@/lib/supabase/config";
import type { SeoDocument, SeoEntityType } from "@/lib/types";

/**
 * Fetch a single SEO document by slug and entity type.
 * Returns null if Supabase is not configured or row doesn't exist.
 */
export async function getSeoDocument(
  slug: string,
  entityType: SeoEntityType = "article"
): Promise<SeoDocument | null> {
  if (!isSupabaseConfigured()) return null;

  try {
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("seo_documents")
      .select("*")
      .eq("slug", slug)
      .eq("entity_type", entityType)
      .maybeSingle();

    if (error) {
      console.error("[getSeoDocument]", error.message);
      return null;
    }

    return data as SeoDocument | null;
  } catch {
    return null;
  }
}

/**
 * Fetch all SEO documents, optionally filtered by entity type.
 */
export async function getSeoDocuments(
  entityType?: SeoEntityType
): Promise<SeoDocument[]> {
  if (!isSupabaseConfigured()) return [];

  try {
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = await createClient();
    let query = supabase
      .from("seo_documents")
      .select("*")
      .order("updated_at", { ascending: false });

    if (entityType) {
      query = query.eq("entity_type", entityType);
    }

    const { data, error } = await query;

    if (error) {
      console.error("[getSeoDocuments]", error.message);
      return [];
    }

    return (data ?? []) as SeoDocument[];
  } catch {
    return [];
  }
}

/**
 * Upsert an SEO document (insert or update by slug + entity_type).
 * Admin-only — should only be called from API routes.
 */
export async function upsertSeoDocument(
  doc: Omit<SeoDocument, "id" | "created_at" | "updated_at">
): Promise<SeoDocument> {
  const { createAdminClient } = await import("@/lib/supabase/admin");
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("seo_documents")
    .upsert(doc, { onConflict: "slug,entity_type" })
    .select()
    .single();

  if (error) {
    console.error("[upsertSeoDocument]", error.message);
    throw new Error("SEO-Dokument konnte nicht gespeichert werden.");
  }

  return data as SeoDocument;
}

/**
 * Delete an SEO document by ID. Admin-only.
 */
export async function deleteSeoDocument(id: string): Promise<void> {
  const { createAdminClient } = await import("@/lib/supabase/admin");
  const supabase = createAdminClient();

  const { error } = await supabase
    .from("seo_documents")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("[deleteSeoDocument]", error.message);
    throw new Error("SEO-Dokument konnte nicht gelöscht werden.");
  }
}
