import { NextRequest, NextResponse } from "next/server";
import { demoArticles } from "@/lib/demo-data";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get("q")?.toLowerCase() ?? "";

  if (!query || query.length < 2) {
    return NextResponse.json([]);
  }

  const results = demoArticles
    .filter(
      (a) =>
        a.status === "published" &&
        (a.title.toLowerCase().includes(query) ||
          (a.subtitle?.toLowerCase().includes(query) ?? false) ||
          a.summary.toLowerCase().includes(query) ||
          a.content_mdx.toLowerCase().includes(query))
    )
    .map(({ content_mdx, ...rest }) => rest);

  return NextResponse.json(results);
}
