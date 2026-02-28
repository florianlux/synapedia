import { NextRequest, NextResponse } from "next/server";
import { getAllArticlesAsync } from "@/lib/articles";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get("q")?.toLowerCase() ?? "";

  if (!query || query.length < 2) {
    return NextResponse.json([]);
  }

  const allArticles = await getAllArticlesAsync();
  const results = allArticles
    .filter(
      (a) =>
        a.status === "published" &&
        (a.title.toLowerCase().includes(query) ||
          (a.subtitle?.toLowerCase().includes(query) ?? false) ||
          a.summary.toLowerCase().includes(query) ||
          a.content_mdx.toLowerCase().includes(query))
    )
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    .map(({ content_mdx: _, ...rest }) => rest);

  return NextResponse.json(results);
}
