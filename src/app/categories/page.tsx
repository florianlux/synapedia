import Link from "next/link";
import { Layers } from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import { getAllArticlesAsync } from "@/lib/articles";

export const revalidate = 60;

export default async function CategoriesPage() {
  const allArticles = await getAllArticlesAsync();
  const published = allArticles.filter((a) => a.status === "published");

  const categoryMap = new Map<string, number>();
  for (const article of published) {
    const cat = article.category ?? "Sonstige";
    categoryMap.set(cat, (categoryMap.get(cat) ?? 0) + 1);
  }

  const categories = Array.from(categoryMap.entries()).sort((a, b) =>
    a[0].localeCompare(b[0], "de")
  );

  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <div className="mb-8 flex items-center gap-3">
        <Layers className="h-7 w-7" />
        <h1 className="text-3xl font-bold tracking-tight">Kategorien</h1>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {categories.map(([category, count]) => {
          const categoryArticles = published.filter(
            (a) => (a.category ?? "Sonstige") === category
          );

          return (
            <Card key={category} className="transition-shadow hover:shadow-md">
              <CardHeader>
                <CardTitle className="text-lg">{category}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="mb-4 text-sm text-neutral-500 dark:text-neutral-400">
                  {count} Artikel
                </p>
                <div className="space-y-2">
                  {categoryArticles.map((article) => (
                    <Link
                      key={article.id}
                      href={`/articles/${article.slug}`}
                      className="block text-sm text-cyan-600 hover:underline dark:text-cyan-400"
                    >
                      {article.title}
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
