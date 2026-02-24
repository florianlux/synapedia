import { createClient } from "@/lib/supabase/client";
import type { Category } from "@/lib/types";

type CategoryInsert = Omit<Category, "id" | "created_at">;

export async function getCategories() {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .order("name", { ascending: true });

  if (error) {
    console.error("[getCategories]", error.message);
    throw new Error("Kategorien konnten nicht geladen werden.");
  }

  return data as Category[];
}

export async function createCategory(category: CategoryInsert) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("categories")
    .insert(category)
    .select()
    .single();

  if (error) {
    console.error("[createCategory]", error.message);
    throw new Error("Kategorie konnte nicht erstellt werden.");
  }

  return data as Category;
}
