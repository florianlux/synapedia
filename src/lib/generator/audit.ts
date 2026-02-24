/**
 * Audit logger for Content Creator actions.
 * Logs to the existing audit_log table.
 */

import { createAdminClient } from "@/lib/supabase/admin";

export type AuditAction =
  | "data_pull_started"
  | "data_pull_finished"
  | "autofill_applied"
  | "draft_generated"
  | "media_added"
  | "mapped_to_article"
  | "publish_attempted"
  | "published"
  | "blocked"
  | "batch_started"
  | "batch_finished";

export async function logAudit(
  action: AuditAction,
  entityType: string,
  entityId: string,
  details: Record<string, unknown> = {},
): Promise<void> {
  try {
    const supabase = createAdminClient();
    await supabase.from("audit_log").insert({
      action,
      entity_type: entityType,
      entity_id: entityId,
      details,
    });
  } catch (err) {
    // Non-critical: log but don't throw
    console.error("[audit]", err instanceof Error ? err.message : err);
  }
}
