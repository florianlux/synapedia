/**
 * import-substances-masterlist.ts
 *
 * Reads seeds/substances.masterlist.json and upserts into
 * Supabase public.substances. Does NOT overwrite description,
 * summary_md, mechanism, or effects fields if they already have content.
 *
 * Usage:
 *   npx tsx scripts/import-substances-masterlist.ts [--dry-run] [--limit N] [--only slug1,slug2] [--status "Entwurf"] [--verbose]
 *
 * Environment:
 *   SUPABASE_URL               — Supabase project URL
 *   SUPABASE_SERVICE_ROLE_KEY  — Supabase service role key (server-side)
 */

import * as fs from "node:fs";
import * as path from "node:path";
import * as url from "node:url";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// ---------------------------------------------------------------------------
// Path setup
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
// CLI argument parsing
// ---------------------------------------------------------------------------

interface CliOptions {
  dryRun: boolean;
  limit: number;
  only: string[];
  status: string; // user-facing: Entwurf / draft / review / published
  verbose: boolean;
}

function parseArgs(): CliOptions {
  const args = process.argv.slice(2);
  const opts: CliOptions = {
    dryRun: false,
    limit: Infinity,
    only: [],
    status: "Entwurf",
    verbose: false,
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case "--dry-run":
        opts.dryRun = true;
        break;
      case "--limit":
        if (i + 1 < args.length) opts.limit = parseInt(args[++i], 10);
        break;
      case "--only":
        if (i + 1 < args.length) {
          opts.only = args[++i]
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean);
        }
        break;
      case "--status":
        if (i + 1 < args.length) opts.status = args[++i];
        break;
      case "--verbose":
        opts.verbose = true;
        break;
    }
  }

  return opts;
}

// ---------------------------------------------------------------------------
// Sleep helper
// ---------------------------------------------------------------------------

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

// ---------------------------------------------------------------------------
// Sanity check — verify required columns exist in public.substances
// ---------------------------------------------------------------------------

const REQUIRED_COLUMNS = [
  "slug",
  "name",
  "canonical_name",
  "tags",
  "aliases",
  "risk_level",
  "evidence_level",
  "status",
] as const;

async function verifySchemaSanity(supabase: SupabaseClient): Promise<boolean> {
  const { error } = await supabase
    .from("substances")
    .select(REQUIRED_COLUMNS.join(","))
    .limit(0);

  if (!error) return true;

  const msg = error.message ?? "";
  if (msg.includes("column") && msg.includes("does not exist")) {
    console.error(
      `[import-substances] ❌ Schema mismatch — one or more required columns missing in public.substances.\n` +
        `  Expected columns: ${REQUIRED_COLUMNS.join(", ")}\n` +
        `  Supabase error: ${msg}\n`
    );
    return false;
  }

  // Non-schema errors shouldn't block imports (RLS etc.)
  console.warn(`[import-substances] ⚠ Schema check error (proceeding): ${msg}`);
  return true;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const opts = parseArgs();

  // Read masterlist
  if (!fs.existsSync(MASTERLIST_FILE)) {
    console.error(`[import-substances] File not found: ${MASTERLIST_FILE}`);
    console.error("[import-substances] Run 'npm run gen:masterlist' first.");
    process.exit(1);
  }

  const raw = fs.readFileSync(MASTERLIST_FILE, "utf-8");
  let entries: MasterlistEntry[] = JSON.parse(raw);

  // Filter by --only
  if (opts.only.length > 0) {
    const allowed = new Set(opts.only);
    entries = entries.filter((e) => allowed.has(e.slug));
  }

  // Apply --limit
  if (Number.isFinite(opts.limit)) {
    entries = entries.slice(0, opts.limit);
  }

  console.log(`[import-substances] ${entries.length} entries to process.`);
  if (opts.dryRun) console.log("[import-substances] DRY RUN — no database writes.");

  // Normalize status to DB-friendly values
  const statusMap: Record<string, "draft" | "review" | "published"> = {
    entwurf: "draft",
    draft: "draft",
    review: "review",
    published: "published",
  };
  const dbStatus = statusMap[opts.status.toLowerCase()] ?? "draft";

  // In dry-run we do not need a DB connection
  let supabase: SupabaseClient | null = null;

  if (!opts.dryRun) {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.error("[import-substances] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
      process.exit(1);
    }

    supabase = createClient(supabaseUrl, supabaseKey);

    // Sanity check: verify DB schema has expected columns
    const schemaOk = await verifySchemaSanity(supabase);
    if (!schemaOk) {
      console.error("[import-substances] Aborting due to schema mismatch.");
      process.exit(1);
    }
  }

  // Pre-fetch existing canonical names to avoid N+1 queries
  const existingNames = new Map<string, string>();
  if (!opts.dryRun) {
    const slugs = entries.filter((e) => e.title && e.slug).map((e) => e.slug);
    const { data } = await supabase!
      .from("substances")
      .select("slug,canonical_name")
      .in("slug", slugs);
    if (data) {
      for (const row of data) {
        if (row.canonical_name) existingNames.set(row.slug, row.canonical_name);
      }
    }
  }

  const errors: { slug: string; error: string }[] = [];
  let upserted = 0;

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    const idx = `[${i + 1}/${entries.length}]`;

    if (!entry.title || !entry.slug) {
      const slug = entry.slug ?? "(unknown)";
      console.warn(`${idx} skipping entry with missing title/slug (${slug})`);
      errors.push({ slug, error: "missing title or slug" });
      continue;
    }

    const name = entry.title.trim();

    const row: Record<string, unknown> = {
      slug: entry.slug,
      name,
      canonical_name: existingNames.get(entry.slug) || name,
      aliases: entry.aliases ?? [],
      tags: entry.tags ?? [],
      risk_level: entry.risk ?? "Unbekannt",
      evidence_level: entry.evidence ?? "Unbekannt",
      status: dbStatus,
      updated_at: new Date().toISOString(),
    };

    if (opts.verbose) {
      console.log(`${idx} preparing ${entry.slug} (tags: ${(entry.tags ?? []).join(", ") || "none"})`);
    }

    if (opts.dryRun) {
      console.log(`${idx} [dry-run] would upsert ${entry.slug}`);
      upserted++;
    } else {
      const { error } = await supabase!
        .from("substances")
        .upsert(row, { onConflict: "slug" });

      if (error) {
        console.error(`${idx} ERROR upserting ${entry.slug}: ${error.message}`);
        errors.push({ slug: entry.slug, error: error.message });

        // Abort early on schema-level errors
        if (error.message.includes("column") && error.message.includes("does not exist")) {
          console.error("[import-substances] ❌ Missing column detected — aborting.");
          break;
        }
      } else {
        console.log(`${idx} upserted ${entry.slug}`);
        upserted++;
      }
    }

    // Sequential delay (avoid rate limits)
    if (i < entries.length - 1) await sleep(75);
  }

  // Summary
  console.log("\n=== Import Summary ===");
  console.log(`Total processed: ${entries.length}`);
  console.log(`Upserted:        ${upserted}`);
  console.log(`Errors:          ${errors.length}`);

  if (errors.length > 0) {
    console.log("\nErrors:");
    for (const e of errors) console.log(`  - ${e.slug}: ${e.error}`);
  }

  if (errors.length > 0 && !opts.dryRun) process.exit(1);
}

main().catch((err) => {
  console.error("[import-substances] Fatal error:", err);
  process.exit(1);
});
