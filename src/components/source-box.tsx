import type { Source } from "@/lib/types";
import { BookOpen } from "lucide-react";

export function SourceBox({ sources }: { sources: Source[] }) {
  if (sources.length === 0) return null;

  return (
    <section className="mt-12 rounded-lg border border-neutral-200 bg-neutral-50 p-6 dark:border-neutral-800 dark:bg-neutral-900">
      <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
        <BookOpen className="h-5 w-5" />
        Quellen
      </h2>
      <ol className="list-decimal space-y-3 pl-6 text-sm">
        {sources.map((source) => (
          <li key={source.id} className="leading-relaxed">
            <span className="font-medium">{source.title}</span>
            {source.authors && (
              <span className="text-neutral-600 dark:text-neutral-400">
                {" — "}
                {source.authors}
              </span>
            )}
            {source.journal && (
              <span className="italic text-neutral-600 dark:text-neutral-400">
                {" "}
                {source.journal}
              </span>
            )}
            {source.year && (
              <span className="text-neutral-600 dark:text-neutral-400">
                {" "}
                ({source.year})
              </span>
            )}
            {source.doi && (
              <>
                {" "}
                <a
                  href={`https://doi.org/${source.doi}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-cyan-600 underline hover:text-cyan-500 dark:text-cyan-400"
                >
                  DOI: {source.doi}
                </a>
              </>
            )}
          </li>
        ))}
      </ol>
    </section>
  );
}
