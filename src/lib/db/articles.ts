import { createClient } from "@/lib/supabase/client";
import type { Article } from "@/lib/types";

type ArticleInsert = Omit<Article, "id" | "created_at" | "updated_at" | "published_at">;
type ArticleUpdate = Partial<ArticleInsert>;

export async function getArticles() {
  const supabase = createClient();
  const { data, error } = await supabase
    .schema("synapedia")
    .from("articles")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[getArticles]", error.message);
    throw new Error("Artikel konnten nicht geladen werden.");
  }

  return data as Article[];
}

export async function getArticleBySlug(slug: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .schema("synapedia")
    .from("articles")
    .select("*")
    .eq("slug", slug)
    .single();

  if (error) {
    console.error("[getArticleBySlug]", error.message);
    throw new Error("Artikel nicht gefunden.");
  }

  return data as Article;
}

export async function createArticle(article: ArticleInsert) {
  const supabase = createClient();

  // Check slug uniqueness
  const { data: existing } = await supabase
    .schema("synapedia")
    .from("articles")
    .select("id")
    .eq("slug", article.slug)
    .maybeSingle();

  if (existing) {
    throw new Error("Ein Artikel mit diesem Slug existiert bereits.");
  }

  const { data, error } = await supabase
    .schema("synapedia")
    .from("articles")
    .insert(article)
    .select()
    .single();

  if (error) {
    console.error("[createArticle]", error.message);
    throw new Error("Artikel konnte nicht erstellt werden.");
  }

  return data as Article;
}

export async function updateArticle(id: string, updates: ArticleUpdate) {
  const supabase = createClient();

  // If slug is being changed, check uniqueness
  if (updates.slug) {
    const { data: existing } = await supabase
      .schema("synapedia")
      .from("articles")
      .select("id")
      .eq("slug", updates.slug)
      .neq("id", id)
      .maybeSingle();

    if (existing) {
      throw new Error("Ein Artikel mit diesem Slug existiert bereits.");
    }
  }

  const { data, error } = await supabase
    .schema("synapedia")
    .from("articles")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("[updateArticle]", error.message);
    throw new Error("Artikel konnte nicht aktualisiert werden.");
  }

  return data as Article;
}

export async function deleteArticle(id: string) {
  const supabase = createClient();
  const { error } = await supabase
    .schema("synapedia")
    .from("articles")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("[deleteArticle]", error.message);
    throw new Error("Artikel konnte nicht gelöscht werden.");
  }
}
