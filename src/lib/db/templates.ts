import { createClient } from "@/lib/supabase/client";
import type { Template, TemplateSchema } from "@/lib/types";

type TemplateInsert = {
  name: string;
  slug: string;
  schema_json: TemplateSchema;
};

type TemplateUpdate = Partial<TemplateInsert>;

export async function getTemplates() {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("templates")
    .select("*")
    .order("name", { ascending: true });

  if (error) {
    console.error("[getTemplates]", error.message);
    throw new Error("Templates konnten nicht geladen werden.");
  }

  return data as Template[];
}

export async function getTemplateBySlug(slug: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("templates")
    .select("*")
    .eq("slug", slug)
    .single();

  if (error) {
    console.error("[getTemplateBySlug]", error.message);
    throw new Error("Template nicht gefunden.");
  }

  return data as Template;
}

export async function getTemplateById(id: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("templates")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    console.error("[getTemplateById]", error.message);
    throw new Error("Template nicht gefunden.");
  }

  return data as Template;
}

export async function createTemplate(template: TemplateInsert) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("templates")
    .insert(template)
    .select()
    .single();

  if (error) {
    console.error("[createTemplate]", error.message);
    throw new Error("Template konnte nicht erstellt werden.");
  }

  return data as Template;
}

export async function updateTemplate(id: string, updates: TemplateUpdate) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("templates")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("[updateTemplate]", error.message);
    throw new Error("Template konnte nicht aktualisiert werden.");
  }

  return data as Template;
}

export async function deleteTemplate(id: string) {
  const supabase = createClient();
  const { error } = await supabase
    .from("templates")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("[deleteTemplate]", error.message);
    throw new Error("Template konnte nicht gelöscht werden.");
  }
}
