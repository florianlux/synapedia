/**
 * Neurocodex – Synapedia Sync Consumer
 *
 * Pull-based sync layer that consumes public Synapedia entities
 * (substances, articles, references) into Neurocodex.
 *
 * Design:
 * - Maintains cursor state via nc_sync_consumers
 * - Idempotent upserts with version checks
 * - Structured logging for every sync run
 * - Error isolation: one failed entity doesn't abort the batch
 */

import {
  getSyncConsumer,
  upsertSyncConsumer,
  createSyncEvent,
  completeSyncEvent,
  logSyncError,
} from "@/lib/db/neurocodex";
import { createClient } from "@/lib/supabase/client";

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

export interface SyncResult {
  status: "success" | "failed";
  records_processed: number;
  errors: number;
  cursor_after: string | null;
  duration_ms: number;
}

interface SynapediaEntity {
  id: string;
  slug: string;
  updated_at: string;
  [key: string]: unknown;
}

/* ------------------------------------------------------------------ */
/*  Main sync runner                                                  */
/* ------------------------------------------------------------------ */

/**
 * Run a sync cycle for a given entity type.
 *
 * @param entityType - Synapedia table to sync from (e.g. "articles", "substances")
 * @param consumerName - Unique name for this consumer (for cursor tracking)
 * @param batchSize - Max records per sync run
 */
export async function runSync(
  entityType: string,
  consumerName: string,
  batchSize = 50,
): Promise<SyncResult> {
  const startTime = Date.now();

  console.log(
    `[Sync] Starting sync: consumer=${consumerName}, entity=${entityType}`,
  );

  // 1. Get or create consumer
  let consumer = await getSyncConsumer(consumerName);
  if (!consumer) {
    consumer = await upsertSyncConsumer({
      consumer_name: consumerName,
      entity_type: entityType,
    });
    console.log(`[Sync] Created new consumer: ${consumerName}`);
  }

  // 2. Create sync event
  const syncEvent = await createSyncEvent({
    consumer_id: consumer.id,
    cursor_before: consumer.last_cursor,
  });

  let recordsProcessed = 0;
  let errorCount = 0;
  let newCursor: string | null = consumer.last_cursor;

  try {
    // 3. Fetch records from Synapedia source table
    const supabase = createClient();
    let query = supabase
      .from(entityType)
      .select("*")
      .order("updated_at", { ascending: true })
      .limit(batchSize);

    // Apply cursor (fetch records updated after last sync)
    if (consumer.last_cursor) {
      query = query.gt("updated_at", consumer.last_cursor);
    }

    const { data: records, error: fetchError } = await query;

    if (fetchError) {
      throw new Error(`Fetch failed: ${fetchError.message}`);
    }

    const entities = (records ?? []) as SynapediaEntity[];
    console.log(
      `[Sync] Fetched ${entities.length} records for ${entityType}`,
    );

    // 4. Process each entity (idempotent upsert)
    for (const entity of entities) {
      try {
        await upsertSyncedEntity(entityType, entity);
        recordsProcessed++;
        // Track cursor: use the latest updated_at
        if (entity.updated_at) {
          newCursor = entity.updated_at;
        }
      } catch (err) {
        errorCount++;
        const message =
          err instanceof Error ? err.message : String(err);
        console.error(
          `[Sync] Error processing ${entityType}/${entity.id}: ${message}`,
        );
        await logSyncError({
          sync_event_id: syncEvent.id,
          entity_id: entity.id,
          error_message: message,
          error_context: { slug: entity.slug },
        });
      }
    }

    // 5. Update consumer cursor
    await upsertSyncConsumer({
      consumer_name: consumerName,
      entity_type: entityType,
      last_cursor: newCursor,
      last_sync_at: new Date().toISOString(),
    });

    // 6. Complete sync event
    const status = errorCount === 0 ? "success" : (errorCount < recordsProcessed ? "success" : "failed");
    await completeSyncEvent(syncEvent.id, {
      status,
      records_processed: recordsProcessed,
      cursor_after: newCursor,
      details: { errors: errorCount, batch_size: batchSize },
    });

    const durationMs = Date.now() - startTime;
    console.log(
      `[Sync] Completed: ${recordsProcessed} processed, ${errorCount} errors, ${durationMs}ms`,
    );

    return {
      status,
      records_processed: recordsProcessed,
      errors: errorCount,
      cursor_after: newCursor,
      duration_ms: durationMs,
    };
  } catch (err) {
    // Fatal error – mark sync as failed
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[Sync] Fatal error: ${message}`);

    await completeSyncEvent(syncEvent.id, {
      status: "failed",
      records_processed: recordsProcessed,
      cursor_after: consumer.last_cursor,
      details: { fatal_error: message },
    });

    return {
      status: "failed",
      records_processed: recordsProcessed,
      errors: errorCount + 1,
      cursor_after: consumer.last_cursor,
      duration_ms: Date.now() - startTime,
    };
  }
}

/* ------------------------------------------------------------------ */
/*  Idempotent upsert                                                 */
/* ------------------------------------------------------------------ */

/**
 * Upsert a synced entity into the local table.
 * Uses slug as natural key for idempotency + updated_at for version checks.
 */
async function upsertSyncedEntity(
  entityType: string,
  entity: SynapediaEntity,
): Promise<void> {
  const supabase = createClient();

  // Version check: skip if local version is newer
  const { data: existing } = await supabase
    .from(entityType)
    .select("updated_at")
    .eq("slug", entity.slug)
    .maybeSingle();

  if (existing && existing.updated_at >= entity.updated_at) {
    console.log(
      `[Sync] Skipping ${entity.slug}: local version is up-to-date`,
    );
    return;
  }

  const { error } = await supabase
    .from(entityType)
    .upsert(entity, { onConflict: "slug" });

  if (error) {
    throw new Error(`Upsert failed for ${entity.slug}: ${error.message}`);
  }

  console.log(`[Sync] Upserted ${entityType}/${entity.slug}`);
}
