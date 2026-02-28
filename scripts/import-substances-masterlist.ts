/**
 * import-substances-masterlist.ts
 *
 * Reads seeds/substances.masterlist.json and upserts into
 * Supabase public.substances.
 *
 * Now with:
 *  - import_source
 *  - import_batch_id
 *
 * Usage:
 *   npx tsx scripts/import-substances-masterlist.ts
 */

import * as fs from "node:fs";
import * as path from "node:path";
import * as url from "node:url";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// ---------------------------------------------------------------------------
// Paths
// ---------------------------------------------------------------------------

const SCRIPT_DIR =
  typeof __dirname !== "undefined"
    ? __dirname
    : path.dirname(url.fileURLToPath(import.meta.url));

const ROOT_DIR = path.resolve(SCRIPT_DIR, "..");
const MASTERLIST_FILE = path.join(ROOT_DIR, "seeds", "substances.masterlist.json");

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface MasterlistEntry {
  title: string;
  slug: string;
  aliases?: string[];
  tags?: string[];
  risk?: string;
  evidence?: string;
}

// ---------------------------------------------------------------------------
// Controlled vocabulary mapping
// ---------------------------------------------------------------------------

function mapEvidenceLevel(
  input?: string
): "strong" | "moderate" | "limited" | "preclinical" | "unknown" {
  const v = (input ?? "").trim().toLowerCase();

  if (["strong", "stark", "hoch"].includes(v)) return "strong";
  if (["moderate", "mittel"].includes(v)) return "moderate";
  if (["limited", "schwach", "gering"].includes(v)) return "limited";
  if (["preclinical", "präklinisch"].includes(v)) return "preclinical";

  return "unknown";
}

function mapRiskLevel(
  input?: string
): "strong" | "moderate" | "limited" | "preclinical" | "unknown" {
  const v = (input ?? "").trim().toLowerCase();

  if (["hoch", "high"].includes(v)) return "strong";
  if (["mittel", "moderate"].includes(v)) return "moderate";
  if (["niedrig", "low"].includes(v)) return "limited";

  return "unknown";
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  // 🔥 Batch ID erzeugen
  const batchId = `wikidata_${new Date().toISOString()}`;

  if (!fs.existsSync(MASTERLIST_FILE)) {
    console.error("Masterlist file not found.");
    process.exit(1);
  }

  const raw = fs.readFileSync(MASTERLIST_FILE, "utf-8");
  const entries: MasterlistEntry[] = JSON.parse(raw);

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
  }

  const supabase: SupabaseClient = createClient(supabaseUrl, supabaseKey);

  console.log(`[import-substances] Processing ${entries.length} entries`);
  console.log(`[import-substances] Batch ID: ${batchId}`);

  let upserted = 0;
  const errors: string[] = [];

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    const idx = `[${i + 1}/${entries.length}]`;

    if (!entry.title || !entry.slug) {
      console.warn(`${idx} skipping invalid entry`);
      continue;
    }

    const name = entry.title.trim();

    const row = {
      slug: entry.slug,
      name,
      canonical_name: name,
      aliases: entry.aliases ?? [],
      tags: entry.tags ?? [],
      risk_level: mapRiskLevel(entry.risk),
      evidence_level: mapEvidenceLevel(entry.evidence),
      status: "draft",

      // 🔥 NEW FIELDS
      import_source: "wikidata_masterlist",
      import_batch_id: batchId,

      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from("substances")
      .upsert(row, { onConflict: "slug" });

    if (error) {
      console.error(`${idx} ERROR: ${error.message}`);
      errors.push(error.message);
    } else {
      console.log(`${idx} upserted ${entry.slug}`);
      upserted++;
    }
  }

  console.log("\n=== Import Summary ===");
  console.log(`Upserted: ${upserted}`);
  console.log(`Errors:   ${errors.length}`);

  if (errors.length > 0) process.exit(1);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
