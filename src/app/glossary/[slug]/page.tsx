import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import glossaryData from "@/../data/glossary.json";

export default async function GlossaryTermPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const entry = glossaryData.find((e) => e.slug === slug);
  if (!entry) notFound();

  const seeAlsoEntries = entry.see_also
    .map((s) => glossaryData.find((e) => e.slug === s))
    .filter(Boolean);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      {/* Back link */}
      <Link
        href="/glossary"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-neutral-500 transition-colors hover:text-neutral-900 dark:hover:text-neutral-200"
      >
        <ArrowLeft className="h-4 w-4" />
        Zurück zum Glossar
      </Link>

      {/* Term heading */}
      <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
        {entry.term}
      </h1>

      {/* Definition */}
      <section className="mt-8">
        <h2 className="mb-2 text-xl font-semibold text-cyan-500">
          Definition
        </h2>
        <p className="text-neutral-300">{entry.definition}</p>
      </section>

      {/* Detail */}
      <section className="mt-8">
        <h2 className="mb-2 text-xl font-semibold text-cyan-500">
          Detaillierte Erklärung
        </h2>
        <p className="leading-relaxed text-neutral-300">{entry.detail}</p>
      </section>

      {/* See also */}
      {seeAlsoEntries.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-2 text-xl font-semibold text-cyan-500">
            Siehe auch
          </h2>
          <ul className="flex flex-wrap gap-2">
            {seeAlsoEntries.map((related) => (
              <li key={related!.slug}>
                <Link
                  href={`/glossary/${related!.slug}`}
                  className="inline-block rounded-md border border-neutral-800 px-3 py-1.5 text-sm text-neutral-300 transition-colors hover:border-cyan-500 hover:text-cyan-400"
                >
                  {related!.term}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Sources */}
      {entry.sources.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-2 text-xl font-semibold text-cyan-500">
            Quellen
          </h2>
          <ul className="list-inside list-disc space-y-1 text-sm text-neutral-400">
            {entry.sources.map((source, i) => (
              <li key={i}>
                <a
                  href={source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline transition-colors hover:text-cyan-400"
                >
                  {source.label}
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
