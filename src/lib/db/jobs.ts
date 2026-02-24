import { createClient } from "@/lib/supabase/client";
import type { AiJob, AiJobStatus } from "@/lib/types";

type JobInsert = {
  type: string;
  input_json: Record<string, unknown>;
};

export async function createJob(job: JobInsert) {
  const supabase = createClient();
  const { data, error } = await supabase
    .schema("synapedia")
    .from("ai_jobs")
    .insert({ ...job, status: "queued" as AiJobStatus })
    .select()
    .single();

  if (error) {
    console.error("[createJob]", error.message);
    throw new Error("AI-Job konnte nicht erstellt werden.");
  }

  return data as AiJob;
}

export async function getJob(id: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .schema("synapedia")
    .from("ai_jobs")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    console.error("[getJob]", error.message);
    throw new Error("AI-Job nicht gefunden.");
  }

  return data as AiJob;
}

export async function updateJob(
  id: string,
  updates: Partial<Pick<AiJob, "status" | "output_json" | "error">>
) {
  const supabase = createClient();
  const { data, error } = await supabase
    .schema("synapedia")
    .from("ai_jobs")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("[updateJob]", error.message);
    throw new Error("AI-Job konnte nicht aktualisiert werden.");
  }

  return data as AiJob;
}

export async function listJobs(status?: AiJobStatus) {
  const supabase = createClient();
  let query = supabase
    .schema("synapedia")
    .from("ai_jobs")
    .select("*")
    .order("created_at", { ascending: false });

  if (status) {
    query = query.eq("status", status);
  }

  const { data, error } = await query;

  if (error) {
    console.error("[listJobs]", error.message);
    throw new Error("AI-Jobs konnten nicht geladen werden.");
  }

  return data as AiJob[];
}
