/**
 * Masterlist → public.articles Importer
 *
 * Reads seeds/substances.masterlist.json and upserts each entry into
 * public.articles (onConflict: slug) using the Supabase Service Role Key.
 *
 * No consumption guides, dosage tables, or procurement hints are generated.
 * Each article receives a neutral MDX stub in German.
 *
 * Usage:
 *   npx tsx scripts/import-masterlist.ts [options]
 *
 * Options:
 *   --dry-run          Preview without writing to the database
 *   --limit <n>        Import only the first n entries
 *   --only <a,b,c>     Import only entries whose slug matches a, b, or c
 *   --status <status>  Override article status (default: "draft")
 *   --verbose          Print detailed per-record information
 */

import * as fs from "node:fs";
import * as path from "node:path";
import * as url from "node:url";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { slugify } from "../src/lib/substances/slugify";

// ---------------------------------------------------------------------------
// Paths
// ---------------------------------------------------------------------------

const SCRIPT_DIR =
  typeof __dirname !== "undefined"
    ? __dirname
    : path.dirname(url.fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(SCRIPT_DIR, "..");
const MASTERLIST_PATH = path.join(ROOT_DIR, "seeds", "substances.masterlist.json");

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Shape of a single entry in substances.masterlist.json */
interface MasterlistEntry {
  title?: string;
  slug?: string;
  summary?: string;
  subtitle?: string;
  aliases?: string[];
  tags?: string[];
  risk?: string;
  evidence?: string;
  category?: string;
}

/** Row we upsert into public.articles */
interface ArticleRow {
  slug: string;
  title: string;
  subtitle: string;
  summary: string;
  content_mdx: string;
  status: string;
  risk_level: string;
  evidence_strength: string;
  tags: string[];
  updated_at: string;
}

interface ImportStats {
  inserted: number;
  updated: number;
  skipped: number;
  errors: number;
}

interface ImportError {
  slug: string;
  message: string;
}

// ---------------------------------------------------------------------------
// CLI argument parsing
// ---------------------------------------------------------------------------

interface CliFlags {
  dryRun: boolean;
  limit: number | null;
  only: string[] | null;
  status: string;
  verbose: boolean;
}

function parseArgs(argv: string[]): CliFlags {
  const flags: CliFlags = {
    dryRun: false,
    limit: null,
    only: null,
    status: "draft",
    verbose: false,
  };

  for (let i = 0; i < argv.length; i++) {
    switch (argv[i]) {
      case "--dry-run":
        flags.dryRun = true;
        break;
      case "--limit": {
        const next = argv[++i];
        if (!next || isNaN(Number(next))) {
          console.error("ERROR: --limit requires a numeric argument");
          process.exit(1);
        }
        flags.limit = Number(next);
        break;
      }
      case "--only": {
        const next = argv[++i];
        if (!next) {
          console.error("ERROR: --only requires a comma-separated list of slugs");
          process.exit(1);
        }
        flags.only = next.split(",").map((s) => s.trim().toLowerCase());
        break;
      }
      case "--status": {
        const next = argv[++i];
        if (!next) {
          console.error("ERROR: --status requires a value");
          process.exit(1);
        }
        flags.status = next;
        break;
      }
      case "--verbose":
        flags.verbose = true;
        break;
      default:
        console.warn(`WARN: Unknown flag "${argv[i]}" — ignoring.`);
    }
  }

  return flags;
}

// ---------------------------------------------------------------------------
// Slug normalisation (extends existing slugify with Greek letter support)
// ---------------------------------------------------------------------------

function normalizeSlug(name: string): string {
  // Pre-process Greek letters before handing off to slugify
  const preProcessed = name.replace(/α/g, "alpha");
  return slugify(preProcessed);
}

// ---------------------------------------------------------------------------
// MDX stub template
// ---------------------------------------------------------------------------

function generateMdxStub(title: string): string {
  return `# ${title}

## Überblick
Automatisch generierter Entwurf. Dieser Artikel wird noch durch kuratiertes Fachwissen ergänzt.

## Pharmakologie

## Wirkmechanismus

## Risiken

## Abhängigkeitspotenzial

## Rechtlicher Status

## Quellen
`;
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

const VALID_RISK_LEVELS = new Set(["low", "moderate", "high"]);
const VALID_EVIDENCE = new Set(["weak", "moderate", "strong"]);

function validateEntry(
  entry: MasterlistEntry,
  index: number,
  verbose: boolean,
): { valid: boolean; warnings: string[] } {
  const warnings: string[] = [];

  if (!entry.title || typeof entry.title !== "string" || entry.title.trim() === "") {
    return { valid: false, warnings: [`Entry ${index}: missing required field "title"`] };
  }

  if (entry.risk && !VALID_RISK_LEVELS.has(entry.risk)) {
    warnings.push(`risk "${entry.risk}" is not a valid risk_level — using "moderate"`);
  }

  if (entry.evidence && !VALID_EVIDENCE.has(entry.evidence)) {
    warnings.push(`evidence "${entry.evidence}" is not a valid evidence_strength — using "moderate"`);
  }

  if (verbose) {
    if (!entry.summary) warnings.push("missing optional field: summary");
    if (!entry.tags || entry.tags.length === 0) warnings.push("missing optional field: tags");
  }

  return { valid: true, warnings };
}

// ---------------------------------------------------------------------------
// Build article row
// ---------------------------------------------------------------------------

function buildArticleRow(entry: MasterlistEntry, status: string): ArticleRow {
  const title = entry.title!.trim();
  const slug = entry.slug ? normalizeSlug(entry.slug) : normalizeSlug(title);

  return {
    slug,
    title,
    subtitle: entry.subtitle ?? "",
    summary: entry.summary ?? `Wissenschaftlicher Überblick zu ${title}.`,
    content_mdx: generateMdxStub(title),
    status,
    risk_level: entry.risk && VALID_RISK_LEVELS.has(entry.risk) ? entry.risk : "moderate",
    evidence_strength:
      entry.evidence && VALID_EVIDENCE.has(entry.evidence) ? entry.evidence : "moderate",
    tags: entry.tags ?? [],
    updated_at: new Date().toISOString(),
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ---------------------------------------------------------------------------
// Main import function
// ---------------------------------------------------------------------------

export async function importMasterlist(
  supabase: SupabaseClient,
  flags: CliFlags,
): Promise<{ stats: ImportStats; errors: ImportError[] }> {
  // 1. Read masterlist
  if (!fs.existsSync(MASTERLIST_PATH)) {
    console.error(`ERROR: Masterlist not found at ${MASTERLIST_PATH}`);
    process.exit(1);
  }

  const raw = fs.readFileSync(MASTERLIST_PATH, "utf-8");
  let entries: MasterlistEntry[];
  try {
    entries = JSON.parse(raw) as MasterlistEntry[];
  } catch {
    console.error("ERROR: Failed to parse masterlist JSON");
    process.exit(1);
  }

  if (!Array.isArray(entries)) {
    console.error("ERROR: Masterlist must be a JSON array");
    process.exit(1);
  }

  console.log(`Loaded ${entries.length} entries from masterlist.`);

  // 2. Apply --only filter
  if (flags.only) {
    entries = entries.filter((e) => {
      const s = e.slug ? normalizeSlug(e.slug) : e.title ? normalizeSlug(e.title) : "";
      return flags.only!.includes(s);
    });
    console.log(`Filtered to ${entries.length} entries (--only).`);
  }

  // 3. Apply --limit
  if (flags.limit !== null && flags.limit < entries.length) {
    entries = entries.slice(0, flags.limit);
    console.log(`Limited to ${entries.length} entries (--limit).`);
  }

  if (flags.dryRun) {
    console.log("\n🔍 DRY RUN — no database writes will be performed.\n");
  }

  // 4. Slug collision check
  const slugSet = new Set<string>();
  for (const entry of entries) {
    if (!entry.title) continue;
    const slug = entry.slug ? normalizeSlug(entry.slug) : normalizeSlug(entry.title);
    if (slugSet.has(slug)) {
      console.warn(`WARN: Duplicate slug "${slug}" detected in masterlist — later entry wins.`);
    }
    slugSet.add(slug);
  }

  // 5. Sequential upsert
  const stats: ImportStats = { inserted: 0, updated: 0, skipped: 0, errors: 0 };
  const errors: ImportError[] = [];
  const total = entries.length;

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    const idx = `[${i + 1}/${total}]`;

    // Validate
    const { valid, warnings } = validateEntry(entry, i, flags.verbose);
    if (!valid) {
      console.error(`${idx} SKIP: ${warnings.join("; ")}`);
      stats.skipped++;
      continue;
    }

    for (const w of warnings) {
      console.warn(`${idx} WARN: ${w}`);
    }

    const row = buildArticleRow(entry, flags.status);

    if (flags.verbose) {
      console.log(`${idx} Preparing: ${row.slug} (${row.title})`);
    }

    if (flags.dryRun) {
      console.log(`${idx} Would upsert: ${row.slug}`);
      stats.inserted++;
      continue;
    }

    // Check if article already exists
    const { data: existing } = await supabase
      .from("articles")
      .select("slug")
      .eq("slug", row.slug)
      .maybeSingle();

    try {
      const { error } = await supabase
        .from("articles")
        .upsert(row, { onConflict: "slug" });

      if (error) {
        throw new Error(error.message);
      }

      if (existing) {
        console.log(`${idx} Updated ${row.slug}`);
        stats.updated++;
      } else {
        console.log(`${idx} Upserted ${row.slug}`);
        stats.inserted++;
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`${idx} ERROR ${row.slug}: ${message}`);
      errors.push({ slug: row.slug, message });
      stats.errors++;
    }

    // Rate limiting: 50ms pause between requests
    if (i < entries.length - 1) {
      await sleep(50);
    }
  }

  return { stats, errors };
}

// ---------------------------------------------------------------------------
// Print summary
// ---------------------------------------------------------------------------

function printSummary(stats: ImportStats, errors: ImportError[]): void {
  console.log("\n--------------------------------");
  console.log("Import finished");
  console.log(`Inserted: ${stats.inserted}`);
  console.log(`Updated:  ${stats.updated}`);
  console.log(`Skipped:  ${stats.skipped}`);
  console.log(`Errors:   ${stats.errors}`);
  console.log("--------------------------------");

  if (errors.length > 0) {
    console.log("\nError details:");
    for (const e of errors) {
      console.error(`  - ${e.slug}: ${e.message}`);
    }
  }
}

// ---------------------------------------------------------------------------
// CLI entry point
// ---------------------------------------------------------------------------

const isDirectRun =
  typeof require !== "undefined"
    ? require.main === module
    : process.argv[1] && import.meta.url === url.pathToFileURL(process.argv[1]).href;

if (isDirectRun) {
  const flags = parseArgs(process.argv.slice(2));

  // Resolve environment variables
  const supabaseUrl =
    process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  function run(): Promise<void> {
    if (flags.dryRun) {
      // Dry run does not need Supabase credentials
      if (!supabaseUrl || !supabaseKey) {
        console.log("WARN: Supabase credentials not set — dry-run mode only.\n");
      }

      return importMasterlist(
        createClient(supabaseUrl ?? "http://localhost:54321", supabaseKey ?? "placeholder"),
        flags,
      ).then(({ stats, errors }) => {
        printSummary(stats, errors);
      });
    }

    if (!supabaseUrl) {
      console.error("ERROR: SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL must be set.");
      process.exit(1);
    }
    if (!supabaseKey) {
      console.error("ERROR: SUPABASE_SERVICE_ROLE_KEY must be set.");
      process.exit(1);
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    return importMasterlist(supabase, flags).then(({ stats, errors }) => {
      printSummary(stats, errors);
      if (stats.errors > 0) {
        process.exit(1);
      }
    });
  }

  run().catch((err: unknown) => {
    console.error("Import failed:", err);
    process.exit(1);
  });
}
