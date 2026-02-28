/**
 * import-masterlist.ts
 *
 * Reads seeds/substances.masterlist.json and upserts safe MDX stubs into
 * Supabase public.articles. No dosing, no use instructions, no preparation,
 * no synthesis — only harm-reduction stub content.
 *
 * Usage:
 *   npx tsx scripts/import-masterlist.ts [--dry-run] [--limit N] [--only slug1,slug2] [--status "draft"] [--verbose]
 *
 * Environment:
 *   SUPABASE_URL               — Supabase project URL
 *   SUPABASE_SERVICE_ROLE_KEY  — Supabase service role key (server-side)
 */

import * as fs from "node:fs";
import * as path from "node:path";
import * as url from "node:url";
import { createClient } from "@supabase/supabase-js";

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
  aliases: string[];
  tags: string[];
  risk: string;
  evidence: string;
}

// ---------------------------------------------------------------------------
// MDX stub generator (safe, German, harm-reduction only)
// ---------------------------------------------------------------------------

function generateMdxStub(title: string): string {
  return `# ${title}

## Überblick

Automatisch generierter Entwurf. Dieser Artikel wird durch kuratierte Informationen ergänzt.

## Pharmakologie

## Wirkmechanismus

## Risiken

## Abhängigkeitspotenzial

## Rechtlicher Status

## Quellen
`;
}

// ---------------------------------------------------------------------------
// Risk / evidence mapping to DB-compatible values
// ---------------------------------------------------------------------------

/** Map issue-specified risk labels to DB CHECK constraint values */
function mapRiskLevel(risk: string): "low" | "moderate" | "high" | "unknown" {
  switch (risk.toLowerCase()) {
    case "low":
    case "niedrig":
      return "low";
    case "moderate":
    case "mittel":
      return "moderate";
    case "high":
    case "hoch":
      return "high";
    default:
      return "unknown";
  }
}

/** Map issue-specified evidence labels to DB CHECK constraint values */
function mapEvidenceStrength(evidence: string): "weak" | "moderate" | "strong" {
  switch (evidence.toLowerCase()) {
    case "strong":
    case "stark":
      return "strong";
    case "moderate":
    case "mittel":
      return "moderate";
    default:
      return "weak";
  }
}

// ---------------------------------------------------------------------------
// CLI argument parsing
// ---------------------------------------------------------------------------

interface CliOptions {
  dryRun: boolean;
  limit: number;
  only: string[];
  status: string;
  verbose: boolean;
}

function parseArgs(): CliOptions {
  const args = process.argv.slice(2);
  const opts: CliOptions = {
    dryRun: false,
    limit: Infinity,
    only: [],
    status: "draft",
    verbose: false,
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case "--dry-run":
        opts.dryRun = true;
        break;
      case "--limit":
        opts.limit = parseInt(args[++i], 10);
        break;
      case "--only":
        opts.only = args[++i].split(",").map((s) => s.trim()).filter(Boolean);
        break;
      case "--status":
        opts.status = args[++i];
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
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const opts = parseArgs();

  // Read masterlist
  if (!fs.existsSync(MASTERLIST_FILE)) {
    console.error(`[import-masterlist] File not found: ${MASTERLIST_FILE}`);
    console.error("[import-masterlist] Run 'npm run gen:masterlist' first.");
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
  if (opts.limit !== Infinity) {
    entries = entries.slice(0, opts.limit);
  }

  console.log(`[import-masterlist] ${entries.length} entries to process.`);
  if (opts.dryRun) console.log("[import-masterlist] DRY RUN — no database writes.");

  // Map status: the DB CHECK constraint expects 'draft', 'review', or 'published'
  const statusMap: Record<string, string> = {
    entwurf: "draft",
    draft: "draft",
    review: "review",
    published: "published",
  };
  const dbStatus = statusMap[opts.status.toLowerCase()] ?? "draft";

  // Initialize Supabase client (only if not dry-run)
  let supabase: ReturnType<typeof createClient> | null = null;
  if (!opts.dryRun) {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.error("[import-masterlist] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
      process.exit(1);
    }

    supabase = createClient(supabaseUrl, supabaseKey);
  }

  const errors: { slug: string; error: string }[] = [];
  let upserted = 0;

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    const idx = `[${i + 1}/${entries.length}]`;

    if (!entry.title || !entry.slug) {
      console.warn(`${idx} skipping entry with missing title/slug`);
      errors.push({ slug: entry.slug ?? "(unknown)", error: "missing title or slug" });
      continue;
    }

    const row = {
      slug: entry.slug,
      title: entry.title,
      subtitle: null,
      summary: `Automatisch generierter Stub-Artikel für ${entry.title}.`,
      content_mdx: generateMdxStub(entry.title),
      status: dbStatus,
      risk_level: mapRiskLevel(entry.risk),
      evidence_strength: mapEvidenceStrength(entry.evidence),
      tags: entry.tags.length > 0 ? entry.tags : [],
      updated_at: new Date().toISOString(),
    };

    if (opts.verbose) {
      console.log(`${idx} preparing ${entry.slug} (tags: ${entry.tags.join(", ") || "none"})`);
    }

    if (opts.dryRun) {
      console.log(`${idx} [dry-run] would upsert ${entry.slug}`);
      upserted++;
    } else {
      try {
        const { error } = await supabase!
          .from("articles")
          .upsert(row as Record<string, unknown>, { onConflict: "slug" });

        if (error) {
          console.error(`${idx} ERROR upserting ${entry.slug}: ${error.message}`);
          errors.push({ slug: entry.slug, error: error.message });
        } else {
          console.log(`${idx} upserted ${entry.slug}`);
          upserted++;
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`${idx} EXCEPTION upserting ${entry.slug}: ${msg}`);
        errors.push({ slug: entry.slug, error: msg });
      }
    }

    // Sequential delay (50–100ms)
    if (i < entries.length - 1) {
      await sleep(75);
    }
  }

  // Summary
  console.log("\n=== Import Summary ===");
  console.log(`Total processed: ${entries.length}`);
  console.log(`Upserted:        ${upserted}`);
  console.log(`Errors:          ${errors.length}`);

  if (errors.length > 0) {
    console.log("\nErrors:");
    for (const e of errors) {
      console.log(`  - ${e.slug}: ${e.error}`);
    }
  }

  if (errors.length > 0 && !opts.dryRun) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("[import-masterlist] Fatal error:", err);
  process.exit(1);
});
