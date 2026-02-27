/**
 * Neurocodex – Database helpers
 *
 * CRUD operations for the Neurocodex user layer, analytics, and sync tables.
 * All functions follow the existing pattern from src/lib/db/*.ts.
 */

import { createClient } from "@/lib/supabase/client";
import type {
  NcUserPreferences,
  NcRiskSnapshot,
  NcBehaviorEvent,
  BehaviorEventType,
  NcSyncConsumer,
  NcSyncEvent,
  NcSyncError,
} from "@/lib/types";

/* ------------------------------------------------------------------ */
/*  User Preferences                                                  */
/* ------------------------------------------------------------------ */

export async function getUserPreferences(
  userId: string,
): Promise<NcUserPreferences | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("nc_user_preferences")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.error("[getUserPreferences]", error.message);
    throw new Error("Benutzereinstellungen konnten nicht geladen werden.");
  }

  return data as NcUserPreferences | null;
}

export async function upsertUserPreferences(
  userId: string,
  prefs: Partial<
    Pick<
      NcUserPreferences,
      "sensitivity_flags" | "display_settings" | "harm_reduction_alerts"
    >
  >,
): Promise<NcUserPreferences> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("nc_user_preferences")
    .upsert({ user_id: userId, ...prefs }, { onConflict: "user_id" })
    .select()
    .single();

  if (error) {
    console.error("[upsertUserPreferences]", error.message);
    throw new Error("Benutzereinstellungen konnten nicht gespeichert werden.");
  }

  return data as NcUserPreferences;
}

/* ------------------------------------------------------------------ */
/*  Risk Snapshots                                                    */
/* ------------------------------------------------------------------ */

export async function createRiskSnapshot(
  snapshot: Pick<NcRiskSnapshot, "user_id" | "risk_score" | "factors" | "notes">,
): Promise<NcRiskSnapshot> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("nc_risk_snapshots")
    .insert(snapshot)
    .select()
    .single();

  if (error) {
    console.error("[createRiskSnapshot]", error.message);
    throw new Error("Risiko-Snapshot konnte nicht erstellt werden.");
  }

  return data as NcRiskSnapshot;
}

export async function getRiskSnapshots(
  userId: string,
  limit = 30,
): Promise<NcRiskSnapshot[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("nc_risk_snapshots")
    .select("*")
    .eq("user_id", userId)
    .order("snapshot_date", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("[getRiskSnapshots]", error.message);
    throw new Error("Risiko-Snapshots konnten nicht geladen werden.");
  }

  return data as NcRiskSnapshot[];
}

/* ------------------------------------------------------------------ */
/*  Behavior Events (Analytics)                                       */
/* ------------------------------------------------------------------ */

export async function trackBehaviorEvent(
  event: Pick<
    NcBehaviorEvent,
    "session_id" | "user_id" | "event_type" | "event_data" | "page_url"
  >,
): Promise<NcBehaviorEvent> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("nc_behavior_events")
    .insert(event)
    .select()
    .single();

  if (error) {
    console.error("[trackBehaviorEvent]", error.message);
    throw new Error("Ereignis konnte nicht gespeichert werden.");
  }

  return data as NcBehaviorEvent;
}

export async function getEventsByType(
  eventType: BehaviorEventType,
  limit = 100,
): Promise<NcBehaviorEvent[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("nc_behavior_events")
    .select("*")
    .eq("event_type", eventType)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("[getEventsByType]", error.message);
    throw new Error("Ereignisse konnten nicht geladen werden.");
  }

  return data as NcBehaviorEvent[];
}

export async function getEventCountsByType(): Promise<
  Record<BehaviorEventType, number>
> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("nc_behavior_events")
    .select("event_type");

  if (error) {
    console.error("[getEventCountsByType]", error.message);
    throw new Error("Ereigniszählung fehlgeschlagen.");
  }

  const counts: Record<string, number> = {};
  for (const row of data ?? []) {
    const t = row.event_type as string;
    counts[t] = (counts[t] ?? 0) + 1;
  }

  return counts as Record<BehaviorEventType, number>;
}

/* ------------------------------------------------------------------ */
/*  Sync Consumers                                                    */
/* ------------------------------------------------------------------ */

export async function getSyncConsumer(
  consumerName: string,
): Promise<NcSyncConsumer | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("nc_sync_consumers")
    .select("*")
    .eq("consumer_name", consumerName)
    .maybeSingle();

  if (error) {
    console.error("[getSyncConsumer]", error.message);
    throw new Error("Sync-Consumer konnte nicht geladen werden.");
  }

  return data as NcSyncConsumer | null;
}

export async function upsertSyncConsumer(
  consumer: Pick<NcSyncConsumer, "consumer_name" | "entity_type"> &
    Partial<Pick<NcSyncConsumer, "last_cursor" | "last_sync_at" | "config">>,
): Promise<NcSyncConsumer> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("nc_sync_consumers")
    .upsert(consumer, { onConflict: "consumer_name" })
    .select()
    .single();

  if (error) {
    console.error("[upsertSyncConsumer]", error.message);
    throw new Error("Sync-Consumer konnte nicht gespeichert werden.");
  }

  return data as NcSyncConsumer;
}

/* ------------------------------------------------------------------ */
/*  Sync Events                                                       */
/* ------------------------------------------------------------------ */

export async function createSyncEvent(
  event: Pick<NcSyncEvent, "consumer_id" | "cursor_before">,
): Promise<NcSyncEvent> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("nc_sync_events")
    .insert({ ...event, status: "running" })
    .select()
    .single();

  if (error) {
    console.error("[createSyncEvent]", error.message);
    throw new Error("Sync-Event konnte nicht erstellt werden.");
  }

  return data as NcSyncEvent;
}

export async function completeSyncEvent(
  id: string,
  result: {
    status: "success" | "failed";
    records_processed: number;
    cursor_after: string | null;
    details?: Record<string, unknown>;
  },
): Promise<NcSyncEvent> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("nc_sync_events")
    .update({
      status: result.status,
      records_processed: result.records_processed,
      cursor_after: result.cursor_after,
      finished_at: new Date().toISOString(),
      details: result.details ?? {},
    })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("[completeSyncEvent]", error.message);
    throw new Error("Sync-Event konnte nicht abgeschlossen werden.");
  }

  return data as NcSyncEvent;
}

/* ------------------------------------------------------------------ */
/*  Sync Errors                                                       */
/* ------------------------------------------------------------------ */

export async function logSyncError(
  syncError: Pick<
    NcSyncError,
    "sync_event_id" | "entity_id" | "error_message" | "error_context"
  >,
): Promise<NcSyncError> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("nc_sync_errors")
    .insert(syncError)
    .select()
    .single();

  if (error) {
    console.error("[logSyncError]", error.message);
    throw new Error("Sync-Fehler konnte nicht protokolliert werden.");
  }

  return data as NcSyncError;
}

export async function getSyncErrors(
  syncEventId: string,
): Promise<NcSyncError[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("nc_sync_errors")
    .select("*")
    .eq("sync_event_id", syncEventId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("[getSyncErrors]", error.message);
    throw new Error("Sync-Fehler konnten nicht geladen werden.");
  }

  return data as NcSyncError[];
}
