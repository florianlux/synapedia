import { AlertTriangle } from "lucide-react";
import { ArticleBrowser } from "@/components/article-browser";
import { demoArticles, demoTags, demoArticleTags } from "@/lib/demo-data";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Artikel – Synapedia",
  description:
    "Durchsuche die wissenschaftliche Substanzdatenbank. Filtere nach Substanzklasse, Rezeptor-Typ und Legalstatus.",
};

export default function ArticlesPage() {
  const articles = demoArticles.filter((a) => a.status === "published");

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      {/* Header */}
      <section className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Artikel
        </h1>
        <p className="mt-2 text-neutral-600 dark:text-neutral-400">
          Wissenschaftliche Substanzdatenbank – filtere nach Klasse, Rezeptor
          oder Legalstatus.
        </p>
      </section>

      {/* Disclaimer */}
      <div
        className="mb-8 flex items-start gap-3 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-700 dark:bg-amber-950/30 dark:text-amber-300"
        role="alert"
      >
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
        <p>
          <strong>Hinweis:</strong> Diese Plattform dient ausschließlich der
          wissenschaftlichen Aufklärung. Kein Konsumratgeber. Nur sachliche,
          wissenschaftliche Information mit Harm-Reduction-Orientierung.
        </p>
      </div>

      {/* Article Browser */}
      <ArticleBrowser
        articles={articles}
        tags={demoTags}
        articleTags={demoArticleTags}
      />
    </div>
  );
}
