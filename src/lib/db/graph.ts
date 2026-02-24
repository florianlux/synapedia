import { createClient } from "@/lib/supabase/client";
import type { GraphEdge } from "@/lib/types";

type GraphEdgeInsert = {
  article_id: string;
  from_type: string;
  from_key: string;
  to_type: string;
  to_key: string;
  relation: string;
  confidence?: number;
  origin?: string;
};

type GraphEdgeUpdate = Partial<Omit<GraphEdgeInsert, "article_id">>;

export async function getEdgesByArticle(articleId: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .schema("synapedia")
    .from("graph_edges")
    .select("*")
    .eq("article_id", articleId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[getEdgesByArticle]", error.message);
    throw new Error("Graph-Kanten konnten nicht geladen werden.");
  }

  return data as GraphEdge[];
}

export async function getAllEdges() {
  const supabase = createClient();
  const { data, error } = await supabase
    .schema("synapedia")
    .from("graph_edges")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[getAllEdges]", error.message);
    throw new Error("Graph-Kanten konnten nicht geladen werden.");
  }

  return data as GraphEdge[];
}

export async function createEdge(edge: GraphEdgeInsert) {
  const supabase = createClient();
  const { data, error } = await supabase
    .schema("synapedia")
    .from("graph_edges")
    .insert(edge)
    .select()
    .single();

  if (error) {
    console.error("[createEdge]", error.message);
    throw new Error("Graph-Kante konnte nicht erstellt werden.");
  }

  return data as GraphEdge;
}

export async function updateEdge(id: string, updates: GraphEdgeUpdate) {
  const supabase = createClient();
  const { data, error } = await supabase
    .schema("synapedia")
    .from("graph_edges")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("[updateEdge]", error.message);
    throw new Error("Graph-Kante konnte nicht aktualisiert werden.");
  }

  return data as GraphEdge;
}

export async function deleteEdge(id: string) {
  const supabase = createClient();
  const { error } = await supabase
    .schema("synapedia")
    .from("graph_edges")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("[deleteEdge]", error.message);
    throw new Error("Graph-Kante konnte nicht gelöscht werden.");
  }
}

export async function createEdgesBatch(edges: GraphEdgeInsert[]) {
  const supabase = createClient();
  const { data, error } = await supabase
    .schema("synapedia")
    .from("graph_edges")
    .insert(edges)
    .select();

  if (error) {
    console.error("[createEdgesBatch]", error.message);
    throw new Error("Graph-Kanten konnten nicht erstellt werden.");
  }

  return data as GraphEdge[];
}
