import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

interface TableCheck {
  table: string;
  exists: boolean;
  columns: string[];
  missing_columns: string[];
}

const EXPECTED_TABLES: Record<string, string[]> = {
  substances: [
    "id", "name", "slug", "categories", "summary", "mechanism",
    "effects", "risks", "interactions", "dependence", "legality",
    "citations", "confidence", "status", "created_at",
    "external_ids", "canonical_name", "tags", "related_slugs", "enrichment",
  ],
  articles: [
    "id", "slug", "title", "summary", "content_mdx", "status",
    "risk_level", "evidence_strength", "category", "created_at", "updated_at",
  ],
  media: [
    "id", "bucket", "path", "url", "width", "height", "alt", "tags", "created_at",
  ],
  article_media: [
    "article_id", "media_id", "role", "section_key", "sort",
  ],
};

export async function GET(request: NextRequest) {
  const authenticated = await isAdminAuthenticated(request);
  if (!authenticated) {
    return NextResponse.json({ error: "Nicht autorisiert." }, { status: 401 });
  }

  try {
    const supabase = await createClient();
    const results: TableCheck[] = [];

    for (const [table, expectedCols] of Object.entries(EXPECTED_TABLES)) {
      // Try selecting from the table to check existence and discover columns
      const { data, error } = await supabase
        .from(table)
        .select("*")
        .limit(0);

      if (error) {
        results.push({
          table,
          exists: false,
          columns: [],
          missing_columns: expectedCols,
        });
        continue;
      }

      // Supabase returns empty array for limit(0), but the query succeeding means the table exists.
      // Try selecting expected columns explicitly to verify they exist.
      const colCheckQuery = expectedCols.join(",");
      const { error: colError } = await supabase
        .from(table)
        .select(colCheckQuery)
        .limit(0);

      // If the column check query fails, find which columns are missing
      const missing: string[] = [];
      if (colError) {
        for (const col of expectedCols) {
          const { error: singleColErr } = await supabase
            .from(table)
            .select(col)
            .limit(0);
          if (singleColErr) {
            missing.push(col);
          }
        }
      }

      const actualCols = expectedCols.filter((col) => !missing.includes(col));

      results.push({
        table,
        exists: !error && data !== null,
        columns: actualCols,
        missing_columns: missing,
      });
    }

    return NextResponse.json({
      ok: results.every((r) => r.exists),
      checked_at: new Date().toISOString(),
      tables: results,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unbekannter Fehler.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
