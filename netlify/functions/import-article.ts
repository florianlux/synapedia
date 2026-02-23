import { createClient } from "@supabase/supabase-js";

interface ImportArticleBody {
  title: string;
  slug: string;
  subtitle?: string;
  summary: string;
  content_mdx: string;
  status?: string;
  risk_level?: string;
  evidence_strength?: string;
  category?: string;
  sources?: {
    title: string;
    authors?: string;
    journal?: string;
    year?: number;
    doi?: string;
    url?: string;
    source_type?: string;
  }[];
}

export default async function handler(req: Request) {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return new Response(
      JSON.stringify({ error: "Missing server configuration" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    db: { schema: "synapedia" },
  });

  try {
    const body = (await req.json()) as ImportArticleBody;

    if (!body.title || !body.slug || !body.summary) {
      return new Response(
        JSON.stringify({ error: "title, slug, and summary are required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Insert article
    const { data: article, error: articleError } = await supabase
      .schema("synapedia")
      .from("articles")
      .insert({
        title: body.title,
        slug: body.slug,
        subtitle: body.subtitle ?? null,
        summary: body.summary,
        content_mdx: body.content_mdx ?? "",
        status: body.status ?? "draft",
        risk_level: body.risk_level ?? "moderate",
        evidence_strength: body.evidence_strength ?? "moderate",
        category: body.category ?? null,
      })
      .select()
      .single();

    if (articleError) {
      return new Response(
        JSON.stringify({ error: articleError.message }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Insert sources and link to article
    if (body.sources && body.sources.length > 0) {
      for (let i = 0; i < body.sources.length; i++) {
        const src = body.sources[i];
        const { data: source, error: sourceError } = await supabase
          .schema("synapedia")
          .from("sources")
          .insert({
            title: src.title,
            authors: src.authors ?? null,
            journal: src.journal ?? null,
            year: src.year ?? null,
            doi: src.doi ?? null,
            url: src.url ?? null,
            source_type: src.source_type ?? "journal",
          })
          .select()
          .single();

        if (sourceError) {
          console.error("[import-article] source insert error:", sourceError.message);
          continue;
        }

        await supabase
          .schema("synapedia")
          .from("article_sources")
          .insert({
            article_id: article.id,
            source_id: source.id,
            citation_order: i + 1,
          });
      }
    }

    // Audit log entry
    await supabase
      .schema("synapedia")
      .from("audit_log")
      .insert({
        action: "import",
        entity_type: "article",
        entity_id: article.id,
        details: { source: "netlify-function", title: body.title },
      });

    return new Response(
      JSON.stringify({ success: true, article }),
      { status: 201, headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[import-article]", message);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
