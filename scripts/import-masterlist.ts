/**
 * Import masterlist stubs into Supabase public.articles.
 *
 * Reads seeds/substances.masterlist.json and upserts safe MDX stub articles
 * (German) into the articles table.
 *
 * Content policy: NO dosing, NO use instructions, NO synthesis, NO how-to.
 * Only neutral scientific stub sections.
 *
 * Usage:
 *   npx tsx scripts/import-masterlist.ts [flags]
 *
 * Flags:
 *   --dry-run         Print what would be upserted, don't touch DB
 *   --limit N         Process at most N entries
 *   --only slug1,...  Only process the listed slugs
 *   --status TEXT     Article status (default: "draft")
 *   --verbose         Extra logging
 *
 * Environment:
 *   SUPABASE_URL              or NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
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
// Types (matches gen-masterlist output)
// ---------------------------------------------------------------------------

interface MasterlistEntry {
  name: string;
  slug: string;
  aliases: string[];
  qid: string;
  pubchem_cid: number | null;
  tags: string[];
}

interface MasterlistFile {
  generated_at: string;
  count: number;
  entries: MasterlistEntry[];
}

// ---------------------------------------------------------------------------
// MDX stub generator
// ---------------------------------------------------------------------------

function generateMdxStub(entry: MasterlistEntry): string {
  const aliasLine =
    entry.aliases.length > 0
      ? `Auch bekannt als: ${entry.aliases.slice(0, 5).join(", ")}.`
      : "";

  // Neutral German MDX stub — informational only.
  // NO dosing, NO consumption instructions, NO synthesis.
  return `# ${entry.name}

## Überblick

${entry.name} ist eine psychoaktive Substanz, die in der wissenschaftlichen Literatur beschrieben wird.
${aliasLine}

> Dieser Artikel ist ein automatisch generierter Entwurf und muss redaktionell überprüft werden.

## Pharmakologie

Die pharmakologischen Eigenschaften von ${entry.name} werden in der Fachliteratur beschrieben.
Weitere Details werden nach redaktioneller Prüfung ergänzt.

## Wirkmechanismus

Der Wirkmechanismus von ${entry.name} ist Gegenstand wissenschaftlicher Forschung.
Dieser Abschnitt wird nach Sichtung der aktuellen Studienlage ergänzt.

## Risiken

Zu den Risiken von ${entry.name} liegen unterschiedliche wissenschaftliche Einschätzungen vor.
Eine differenzierte Darstellung folgt nach redaktioneller Prüfung.

## Abhängigkeitspotenzial

Informationen zum Abhängigkeitspotenzial von ${entry.name} werden nach Auswertung
der verfügbaren Evidenz ergänzt.

## Rechtlicher Status

Der rechtliche Status von ${entry.name} variiert je nach Jurisdiktion.
Dieser Abschnitt wird nach Recherche der aktuellen Rechtslage aktualisiert.

## Quellen

- Wikidata: [${entry.qid}](https://www.wikidata.org/wiki/${entry.qid})${entry.pubchem_cid ? `\n- PubChem: [CID ${entry.pubchem_cid}](https://pubchem.ncbi.nlm.nih.gov/compound/${entry.pubchem_cid})` : ""}
`.trimStart();
}

// ---------------------------------------------------------------------------
// CLI argument parsing
// ---------------------------------------------------------------------------

interface ImportOptions {
  dryRun: boolean;
  limit: number;
  only: string[];
  status: string;
  verbose: boolean;
}

function parseArgs(argv: string[]): ImportOptions {
  const opts: ImportOptions = {
    dryRun: false,
    limit: Infinity,
    only: [],
    status: "Entwurf",
    verbose: false,
  };

  for (let i = 0; i < argv.length; i++) {
    switch (argv[i]) {
      case "--dry-run":
        opts.dryRun = true;
        break;
      case "--limit": {
        const parsed = parseInt(argv[i + 1], 10);
        if (isNaN(parsed) || parsed < 1) {
          console.warn(`[import-masterlist] Invalid --limit value "${argv[i + 1]}", using no limit.`);
        } else {
          opts.limit = parsed;
        }
        i++;
        break;
      }
      case "--only":
        opts.only = (argv[i + 1] ?? "").split(",").map((s) => s.trim()).filter(Boolean);
        i++;
        break;
      case "--status":
        opts.status = argv[i + 1] ?? "draft";
        i++;
        break;
      case "--verbose":
        opts.verbose = true;
        break;
    }
  }

  return opts;
}

// ---------------------------------------------------------------------------
// Supabase client (service role)
// ---------------------------------------------------------------------------

function createSupabaseAdmin(): SupabaseClient {
  const supabaseUrl =
    process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error(
      "[import-masterlist] Missing environment variables.\n" +
        "  Required: SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY"
    );
    process.exit(1);
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

// ---------------------------------------------------------------------------
// Sleep helper
// ---------------------------------------------------------------------------

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

// ---------------------------------------------------------------------------
// Sanity check — verify required columns exist in public.articles
// ---------------------------------------------------------------------------

const REQUIRED_COLUMNS = ["slug", "title", "mdx", "risk", "evidence", "aliases", "tags", "status"];

async function verifySchemaSanity(supabase: SupabaseClient): Promise<boolean> {
  try {
    const { error } = await supabase
      .from("articles")
      .select("slug, title, mdx, risk, evidence, aliases, tags, status")
      .limit(0);

    if (error) {
      const msg = error.message ?? "";
      // Detect "column does not exist" errors
      if (msg.includes("column") && msg.includes("does not exist")) {
        console.error(
          `[import-masterlist] ❌ Schema mismatch — one or more required columns missing in public.articles.\n` +
          `  Expected columns: ${REQUIRED_COLUMNS.join(", ")}\n` +
          `  Supabase error: ${msg}\n` +
          `  Please verify the DB schema matches the expected layout.`
        );
        return false;
      }
      console.warn(`[import-masterlist] ⚠ Schema check returned an error: ${msg} (proceeding anyway)`);
    }
    return true;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`[import-masterlist] ⚠ Schema check failed: ${msg} (proceeding anyway)`);
    return true;
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

export async function importMasterlist(opts: ImportOptions): Promise<void> {
  // 1. Read masterlist
  if (!fs.existsSync(MASTERLIST_FILE)) {
    console.error(`[import-masterlist] Masterlist not found: ${MASTERLIST_FILE}`);
    console.error("  Run gen-masterlist.ts first: npx tsx scripts/gen-masterlist.ts");
    process.exit(1);
  }

  const raw = fs.readFileSync(MASTERLIST_FILE, "utf-8");
  const masterlist: MasterlistFile = JSON.parse(raw);
  let entries = masterlist.entries;

  console.log(`[import-masterlist] Loaded ${entries.length} entries from masterlist (generated ${masterlist.generated_at})`);

  // 2. Filter by --only
  if (opts.only.length > 0) {
    const onlySet = new Set(opts.only);
    entries = entries.filter((e) => onlySet.has(e.slug));
    console.log(`[import-masterlist] Filtered to ${entries.length} entries via --only`);
  }

  // 3. Apply --limit
  if (opts.limit < entries.length) {
    entries = entries.slice(0, opts.limit);
    console.log(`[import-masterlist] Limited to ${entries.length} entries via --limit`);
  }

  if (entries.length === 0) {
    console.log("[import-masterlist] Nothing to import.");
    return;
  }

  // 4. Dry-run or live
  const now = new Date().toISOString();
  let upserted = 0;
  let errors = 0;

  if (opts.dryRun) {
    console.log("[import-masterlist] DRY RUN — no database writes.");
    for (const entry of entries) {
      const mdx = generateMdxStub(entry);
      if (opts.verbose) {
        console.log(`  [dry] ${entry.slug} — ${mdx.length} chars MDX, tags=[${entry.tags.join(",")}]`);
      }
      upserted++;
    }
  } else {
    const supabase = createSupabaseAdmin();

    // Sanity check: verify DB schema has expected columns
    const schemaOk = await verifySchemaSanity(supabase);
    if (!schemaOk) {
      console.error("[import-masterlist] Aborting due to schema mismatch.");
      process.exit(1);
    }

    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];
      const mdx = generateMdxStub(entry);

      const row = {
        slug: entry.slug,
        title: entry.name,
        subtitle: entry.aliases.length > 0 ? entry.aliases.slice(0, 3).join(", ") : null,
        summary: `Wissenschaftlicher Entwurf zu ${entry.name}.`,
        mdx,
        status: opts.status,
        risk: "Unbekannt",
        evidence: "Unbekannt",
        aliases: entry.aliases ?? [],
        tags: entry.tags.length > 0 ? entry.tags : [],
        updated_at: now,
      };

      const { error } = await supabase
        .from("articles")
        .upsert(row, { onConflict: "slug" });

      if (error) {
        errors++;
        const msg = error.message ?? "";
        console.error(`  [error] ${entry.slug}: ${msg}`);
        // Abort early on schema-level errors (missing column = all future rows will fail too)
        if (msg.includes("column") && msg.includes("does not exist")) {
          console.error("[import-masterlist] ❌ Detected missing column — aborting to avoid repeated failures.");
          break;
        }
      } else {
        upserted++;
        if (opts.verbose) {
          console.log(`  [ok] ${entry.slug}`);
        }
      }

      // Progress log every 50 entries
      if ((i + 1) % 50 === 0) {
        console.log(`[import-masterlist]   progress: ${i + 1}/${entries.length} (ok=${upserted}, err=${errors})`);
      }

      // Polite delay between upserts to stay well within Supabase rate limits
      // (Supabase free tier allows ~100 req/sec; 75ms ≈ 13 req/sec is very conservative)
      if (i < entries.length - 1) {
        await sleep(75);
      }
    }
  }

  // Summary
  console.log("\n[import-masterlist] === Summary ===");
  console.log(`  Total processed : ${entries.length}`);
  console.log(`  Upserted        : ${upserted}`);
  console.log(`  Errors          : ${errors}`);
  console.log(`  Status          : ${opts.status}`);
  console.log(`  Dry run         : ${opts.dryRun}`);
}

// CLI entry point
const isDirectRun =
  typeof require !== "undefined"
    ? require.main === module
    : process.argv[1] && import.meta.url === url.pathToFileURL(process.argv[1]).href;

if (isDirectRun) {
  const opts = parseArgs(process.argv.slice(2));
  importMasterlist(opts).catch((err) => {
    console.error("[import-masterlist] Fatal error:", err);
    process.exit(1);
  });
}
