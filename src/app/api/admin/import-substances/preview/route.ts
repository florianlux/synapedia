import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/auth";
import { wikidataAdapter } from "@/lib/substances/adapters/wikidata-adapter";
import { mergeRawSources } from "@/lib/substances/adapters/normalize";
import { MAX_IMPORT_BATCH_SIZE } from "@/lib/config";

interface PreviewRequestItem {
  name: string;
  wikidataQid?: string;
  tags?: string[];
  category?: string;
}

export async function POST(request: NextRequest) {
  if (!(await isAdminAuthenticated(request))) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  let body: { items: PreviewRequestItem[]; sources?: string[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const { items } = body;
  if (!Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ ok: false, error: "No items" }, { status: 400 });
  }

  // Limit to MAX_IMPORT_BATCH_SIZE items per preview request
  const limited = items.slice(0, MAX_IMPORT_BATCH_SIZE);

  const previews = await Promise.allSettled(
    limited.map(async (item) => {
      const rawResult = await (item.wikidataQid
        ? wikidataAdapter.fetchById(item.wikidataQid)
        : wikidataAdapter.search(item.name).then((results) => results[0] ?? null));

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
      return { ...normalized, seedCategory: item.category, seedTags: item.tags };
    }),
  );

  const results = previews.map((r, i) => {
    if (r.status === "fulfilled") return { ok: true, item: r.value };
    return { ok: false, name: limited[i].name, error: String(r.reason) };
  });

  return NextResponse.json({ ok: true, results, count: results.length });
}
