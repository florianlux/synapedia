import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { wikidataAdapter } from "@/lib/substances/adapters/wikidata-adapter";
import { mergeRawSources } from "@/lib/substances/adapters/normalize";
import { slugify } from "@/lib/substances/slugify";
import { MAX_IMPORT_BATCH_SIZE } from "@/lib/config";

interface DryRunItem {
  name: string;
  wikidataQid?: string;
  tags?: string[];
  category?: string;
}

export async function POST(request: NextRequest) {
  if (!(await isAdminAuthenticated(request))) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  let body: { items: DryRunItem[]; overwrite?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const { items, overwrite = false } = body;
  if (!Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ ok: false, error: "No items" }, { status: 400 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const hasSupabase = Boolean(supabaseUrl && supabaseKey);

  const limited = items.slice(0, MAX_IMPORT_BATCH_SIZE);

  // Fetch existing slugs from DB (if available)
  let existingSlugs = new Set<string>();
  if (hasSupabase) {
    try {
      const supabase = createAdminClient();
      const { data } = await supabase.from("substances").select("slug").limit(5000);
      existingSlugs = new Set((data ?? []).map((r: { slug: string }) => r.slug));
    } catch {
      // non-blocking
    }
  }

  const operations = await Promise.allSettled(
    limited.map(async (item) => {
      const slug = slugify(item.name);
      const rawResult = await (item.wikidataQid
        ? wikidataAdapter.fetchById(item.wikidataQid)
        : wikidataAdapter.search(item.name).then((r) => r[0] ?? null));

      const rawList = rawResult
        ? [
            {
              ...rawResult,
              category: item.category,
              tags: [...(rawResult.tags ?? []), ...(item.tags ?? [])],
            },
          ]
        : [];
      const normalized = mergeRawSources(item.name, rawList);

      const exists = existingSlugs.has(slug);
      let action: "insert" | "update" | "skip";
      if (!exists) action = "insert";
      else if (overwrite) action = "update";
      else action = "skip";

      return { slug, name: item.name, normalized, action, exists };
    }),
  );

  const results = operations.map((r, i) => {
    if (r.status === "fulfilled") return { ok: true, ...r.value };
    return { ok: false, name: limited[i].name, error: String(r.reason) };
  });

  const summary = {
    total: results.length,
    willInsert: results.filter((r) => r.ok && (r as { action?: string }).action === "insert")
      .length,
    willUpdate: results.filter((r) => r.ok && (r as { action?: string }).action === "update")
      .length,
    willSkip: results.filter((r) => r.ok && (r as { action?: string }).action === "skip").length,
    errors: results.filter((r) => !r.ok).length,
  };

  return NextResponse.json({ ok: true, results, summary, dryRun: true });
}
