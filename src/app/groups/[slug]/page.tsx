import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft } from "lucide-react";
import { riskLabels, type RiskLevel } from "@/lib/types";
import {
  fetchGroupBySlug,
  fetchSubstancesByGroup,
} from "@/lib/db/groups";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const group = await fetchGroupBySlug(slug);

  if (!group) {
    return { title: "Nicht gefunden | Synapedia" };
  }

  return {
    title: `${group.name} – Substanzgruppe | Synapedia`,
    description:
      group.description ??
      `Übersicht der Substanzen in der Gruppe ${group.name}.`,
  };
}

export default async function GroupDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const group = await fetchGroupBySlug(slug);

  if (!group) {
    notFound();
  }

  const substances = await fetchSubstancesByGroup(slug);

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      {/* Back link */}
      <Link
        href="/groups"
        className="mb-6 inline-flex items-center gap-1 text-sm text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200"
      >
        <ArrowLeft className="h-4 w-4" />
        Alle Substanzgruppen
      </Link>

      {/* Header */}
      <header className="mb-8">
        <div className="flex items-center gap-3">
          {group.icon && (
            <span className="text-3xl" aria-hidden="true">
              {group.icon}
            </span>
          )}
          <h1 className="text-3xl font-bold tracking-tight">{group.name}</h1>
        </div>
        {group.description && (
          <p className="mt-3 max-w-2xl text-neutral-600 dark:text-neutral-400">
            {group.description}
          </p>
        )}
      </header>

      {/* Substance list */}
      {substances.length === 0 ? (
        <div className="rounded-lg border border-neutral-200 p-8 text-center dark:border-neutral-800">
          <p className="text-neutral-500 dark:text-neutral-400">
            Derzeit sind keine Substanzen in dieser Gruppe verzeichnet.
          </p>
          <Link
            href="/articles"
            className="mt-3 inline-block text-sm text-cyan-600 hover:underline dark:text-cyan-400"
          >
            Alle Artikel ansehen →
          </Link>
        </div>
      ) : (
        <section>
          <h2 className="mb-4 text-xl font-semibold">
            Substanzen ({substances.length})
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {substances.map((s) => (
              <Link key={s.id} href={`/articles/${s.slug}`}>
                <Card className="h-full transition-shadow hover:shadow-md">
                  <CardHeader>
                    <CardTitle className="text-lg">{s.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="mb-3 line-clamp-3 text-sm text-neutral-600 dark:text-neutral-400">
                      {s.summary}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant={s.risk_level as RiskLevel}>
                        {riskLabels[s.risk_level as RiskLevel] ?? s.risk_level}
                      </Badge>
                      {s.tags.slice(0, 3).map((tag) => (
                        <Badge key={tag} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
