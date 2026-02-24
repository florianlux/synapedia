import { createClient } from "@/lib/supabase/client";
import type { Media, ArticleMedia } from "@/lib/types";

type MediaInsert = {
  bucket?: string;
  path: string;
  url?: string | null;
  width?: number | null;
  height?: number | null;
  alt?: string | null;
  tags?: string[];
};

type MediaUpdate = Partial<MediaInsert>;

export async function getMediaList() {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("media")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[getMediaList]", error.message);
    throw new Error("Medien konnten nicht geladen werden.");
  }

  return data as Media[];
}

export async function getMediaById(id: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("media")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    console.error("[getMediaById]", error.message);
    throw new Error("Medium nicht gefunden.");
  }

  return data as Media;
}

export async function createMedia(media: MediaInsert) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("media")
    .insert(media)
    .select()
    .single();

  if (error) {
    console.error("[createMedia]", error.message);
    throw new Error("Medium konnte nicht erstellt werden.");
  }

  return data as Media;
}

export async function updateMedia(id: string, updates: MediaUpdate) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("media")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("[updateMedia]", error.message);
    throw new Error("Medium konnte nicht aktualisiert werden.");
  }

  return data as Media;
}

export async function deleteMedia(id: string) {
  const supabase = createClient();
  const { error } = await supabase
    .from("media")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("[deleteMedia]", error.message);
    throw new Error("Medium konnte nicht gelöscht werden.");
  }
}

export async function getArticleMedia(articleId: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("article_media")
    .select("*, media(*)")
    .eq("article_id", articleId)
    .order("sort", { ascending: true });

  if (error) {
    console.error("[getArticleMedia]", error.message);
    throw new Error("Artikel-Medien konnten nicht geladen werden.");
  }

  return data as (ArticleMedia & { media: Media })[];
}

export async function assignMedia(
  articleId: string,
  mediaId: string,
  role: string = "gallery",
  sectionKey: string | null = null,
  sort: number = 0
) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("article_media")
    .upsert(
      { article_id: articleId, media_id: mediaId, role, section_key: sectionKey, sort },
      { onConflict: "article_id,media_id" }
    )
    .select()
    .single();

  if (error) {
    console.error("[assignMedia]", error.message);
    throw new Error("Medium konnte nicht zugeordnet werden.");
  }

  return data as ArticleMedia;
}

export async function unassignMedia(articleId: string, mediaId: string) {
  const supabase = createClient();
  const { error } = await supabase
    .from("article_media")
    .delete()
    .eq("article_id", articleId)
    .eq("media_id", mediaId);

  if (error) {
    console.error("[unassignMedia]", error.message);
    throw new Error("Medienzuordnung konnte nicht entfernt werden.");
  }
}
