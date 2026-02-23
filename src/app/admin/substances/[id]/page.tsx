"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { demoSubstances } from "@/lib/demo-substances";
import { generateArticleMdx } from "@/lib/article-generator";
import { checkContent } from "@/lib/content-filter";
import {
  ArrowLeft,
  FileText,
  Play,
  AlertTriangle,
  CheckCircle,
  Eye,
} from "lucide-react";

export default function SubstanceDetailPage() {
  const params = useParams();
  const id = params.id as string;

  // Demo mode: find substance by id
  const substance = demoSubstances.find((s) => s.id === id);

  const [draftMdx, setDraftMdx] = useState<string | null>(null);
  const [filterResult, setFilterResult] = useState<{
    passed: boolean;
    violations: string[];
  } | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  if (!substance) {
    return (
      <div className="space-y-4">
        <Link
          href="/admin/substances"
          className="inline-flex items-center gap-1 text-sm text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-50"
        >
          <ArrowLeft className="h-4 w-4" />
          Zurück
        </Link>
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-neutral-500">
              Substanz nicht gefunden (ID: {id}).
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  function handleGenerateDraft() {
    if (!substance) return;
    const mdx = generateArticleMdx(substance, null);
    const result = checkContent(mdx);
    setDraftMdx(mdx);
    setFilterResult(result);
  }

  return (
    <div className="space-y-6">
      {/* Back link */}
      <Link
        href="/admin/substances"
        className="inline-flex items-center gap-1 text-sm text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-50"
      >
        <ArrowLeft className="h-4 w-4" />
        Zurück zu Substanzen
      </Link>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50">
            {substance.name}
          </h1>
          <p className="mt-1 text-neutral-500 dark:text-neutral-400">
            {substance.class_primary ?? "Nicht klassifiziert"} ·{" "}
            {substance.class_secondary ?? "–"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge
            variant={
              substance.status === "published"
                ? "default"
                : substance.status === "review"
                  ? "info"
                  : "secondary"
            }
          >
            {substance.status}
          </Badge>
          <Badge
            variant={
              (substance.risk_level as "low" | "moderate" | "high" | "unknown") ??
              "unknown"
            }
          >
            {substance.risk_level}
          </Badge>
        </div>
      </div>

      {/* Info Card */}
      <Card>
        <CardHeader>
          <CardTitle>Details</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-sm font-medium text-neutral-500 dark:text-neutral-400">
                Slug
              </dt>
              <dd className="text-neutral-900 dark:text-neutral-50">
                {substance.slug}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-neutral-500 dark:text-neutral-400">
                Aliase
              </dt>
              <dd className="text-neutral-900 dark:text-neutral-50">
                {substance.aliases.length > 0
                  ? substance.aliases.join(", ")
                  : "–"}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-neutral-500 dark:text-neutral-400">
                Lizenz
              </dt>
              <dd className="text-neutral-900 dark:text-neutral-50">
                {substance.source_license ?? "–"}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-neutral-500 dark:text-neutral-400">
                Importiert am
              </dt>
              <dd className="text-neutral-900 dark:text-neutral-50">
                {substance.imported_at
                  ? new Date(substance.imported_at).toLocaleDateString("de-DE")
                  : "–"}
              </dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-sm font-medium text-neutral-500 dark:text-neutral-400">
                Zusammenfassung
              </dt>
              <dd className="text-neutral-900 dark:text-neutral-50">
                {substance.summary ?? "Keine Zusammenfassung vorhanden."}
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      {/* Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Aktionen</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-3">
            <Button onClick={handleGenerateDraft}>
              <Play className="mr-2 h-4 w-4" />
              Draft generieren
            </Button>
            <Link href={`/articles/${substance.slug}`}>
              <Button variant="outline">
                <FileText className="mr-2 h-4 w-4" />
                Artikel öffnen
              </Button>
            </Link>
            <Button variant="secondary" disabled>
              Status → Review
            </Button>
            <Button variant="secondary" disabled>
              Publish
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Generated Draft */}
      {draftMdx && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Generierter Draft</CardTitle>
            <div className="flex items-center gap-2">
              {filterResult && (
                <>
                  {filterResult.passed ? (
                    <span className="flex items-center gap-1 text-sm text-green-600 dark:text-green-400">
                      <CheckCircle className="h-4 w-4" />
                      Content-Filter bestanden
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-sm text-red-600 dark:text-red-400">
                      <AlertTriangle className="h-4 w-4" />
                      Filter-Verletzungen: {filterResult.violations.length}
                    </span>
                  )}
                </>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowPreview(!showPreview)}
              >
                <Eye className="mr-1 h-3 w-3" />
                {showPreview ? "Editor" : "Vorschau"}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {filterResult && !filterResult.passed && (
              <div className="mb-4 rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-800 dark:border-red-700 dark:bg-red-900/30 dark:text-red-300">
                <p className="font-medium">
                  ⚠️ Content-Filter hat Verstöße gefunden:
                </p>
                <ul className="mt-1 list-inside list-disc">
                  {filterResult.violations.map((v, i) => (
                    <li key={i}>{v}</li>
                  ))}
                </ul>
                <p className="mt-2">
                  Publish ist blockiert. Bitte den Inhalt manuell überprüfen.
                </p>
              </div>
            )}

            {showPreview ? (
              <div className="prose prose-neutral max-w-none dark:prose-invert">
                <pre className="whitespace-pre-wrap rounded-lg bg-neutral-50 p-4 text-sm dark:bg-neutral-900">
                  {draftMdx}
                </pre>
              </div>
            ) : (
              <textarea
                value={draftMdx}
                onChange={(e) => {
                  setDraftMdx(e.target.value);
                  setFilterResult(checkContent(e.target.value));
                }}
                className="h-96 w-full rounded-lg border border-neutral-300 bg-transparent p-4 font-mono text-sm dark:border-neutral-700"
                spellCheck={false}
              />
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
