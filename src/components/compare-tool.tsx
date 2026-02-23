"use client";

import { useState } from "react";
import { ExternalLink, Link2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SubstanceSearch } from "@/components/substance-search";

interface Source {
  label: string;
  url: string;
}

interface Substance {
  id: string;
  slug: string;
  title: string;
  class_primary: string;
  class_secondary?: string[];
  mechanisms?: string[];
  receptors?: string[];
  tags?: string[];
  risk_level?: string;
  summary?: string;
  sources?: Source[];
}

const riskVariant: Record<string, "high" | "moderate" | "low" | "unknown"> = {
  high: "high",
  moderate: "moderate",
  low: "low",
  unknown: "unknown",
};

const riskLabels: Record<string, string> = {
  high: "Hoch",
  moderate: "Moderat",
  low: "Niedrig",
  unknown: "Unbekannt",
};

const EMPTY_LABEL = "Datenlage unklar / nicht gepflegt";

interface CompareToolProps {
  substances: Substance[];
  initialA?: string;
  initialB?: string;
}

function SubstanceCard({ substance }: { substance: Substance }) {
  const classes = [
    substance.class_primary,
    ...(substance.class_secondary ?? []),
  ].filter(Boolean);

  const risk = substance.risk_level ?? "unknown";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">{substance.title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Klasse */}
        <section>
          <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-neutral-500">
            Klasse
          </h3>
          {classes.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {classes.map((c) => (
                <Badge key={c} variant="secondary">
                  {c}
                </Badge>
              ))}
            </div>
          ) : (
            <p className="text-sm text-neutral-500">{EMPTY_LABEL}</p>
          )}
        </section>

        {/* Mechanismen */}
        <section>
          <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-neutral-500">
            Mechanismen
          </h3>
          {substance.mechanisms && substance.mechanisms.length > 0 ? (
            <ul className="list-inside list-disc space-y-1 text-sm text-neutral-300">
              {substance.mechanisms.map((m) => (
                <li key={m}>{m}</li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-neutral-500">{EMPTY_LABEL}</p>
          )}
        </section>

        {/* Rezeptoren */}
        <section>
          <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-neutral-500">
            Rezeptoren
          </h3>
          {substance.receptors && substance.receptors.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {substance.receptors.map((r) => (
                <Badge key={r} variant="outline">
                  {r}
                </Badge>
              ))}
            </div>
          ) : (
            <p className="text-sm text-neutral-500">{EMPTY_LABEL}</p>
          )}
        </section>

        {/* Risikolevel */}
        <section>
          <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-neutral-500">
            Risikolevel
          </h3>
          <Badge variant={riskVariant[risk] ?? "unknown"}>
            {riskLabels[risk] ?? risk}
          </Badge>
        </section>

        {/* Tags */}
        <section>
          <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-neutral-500">
            Tags
          </h3>
          {substance.tags && substance.tags.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {substance.tags.map((t) => (
                <Badge key={t} variant="info">
                  {t}
                </Badge>
              ))}
            </div>
          ) : (
            <p className="text-sm text-neutral-500">{EMPTY_LABEL}</p>
          )}
        </section>

        {/* Zusammenfassung */}
        <section>
          <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-neutral-500">
            Zusammenfassung
          </h3>
          {substance.summary ? (
            <p className="text-sm leading-relaxed text-neutral-300">
              {substance.summary}
            </p>
          ) : (
            <p className="text-sm text-neutral-500">{EMPTY_LABEL}</p>
          )}
        </section>

        {/* Quellen */}
        <section>
          <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-neutral-500">
            Quellen
          </h3>
          {substance.sources && substance.sources.length > 0 ? (
            <ul className="space-y-1">
              {substance.sources.map((src) => (
                <li key={src.url}>
                  <a
                    href={src.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-sm text-cyan-400 hover:underline"
                  >
                    {src.label}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-neutral-500">{EMPTY_LABEL}</p>
          )}
        </section>
      </CardContent>
    </Card>
  );
}

export function CompareTool({
  substances,
  initialA,
  initialB,
}: CompareToolProps) {
  const [subA, setSubA] = useState<Substance | null>(() =>
    initialA ? substances.find((s) => s.slug === initialA) ?? null : null
  );
  const [subB, setSubB] = useState<Substance | null>(() =>
    initialB ? substances.find((s) => s.slug === initialB) ?? null : null
  );
  const [copied, setCopied] = useState(false);

  function handleShare() {
    if (!subA || !subB) return;
    const url = `${window.location.origin}/compare?a=${encodeURIComponent(subA.slug)}&b=${encodeURIComponent(subB.slug)}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      <h1 className="mb-6 text-4xl font-bold tracking-tight">
        Substanz-Vergleich
      </h1>

      {/* Search Fields */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row">
        <SubstanceSearch
          label="Substanz A"
          substances={substances}
          selected={subA}
          onSelect={setSubA}
        />
        <SubstanceSearch
          label="Substanz B"
          substances={substances}
          selected={subB}
          onSelect={setSubB}
        />
      </div>

      {/* Comparison */}
      {subA && subB ? (
        <>
          <div className="mb-6 flex justify-end">
            <Button variant="outline" size="sm" onClick={handleShare}>
              <Link2 className="mr-1.5 h-4 w-4" />
              {copied ? "Link kopiert!" : "Als Link teilen"}
            </Button>
          </div>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <SubstanceCard substance={subA} />
            <SubstanceCard substance={subB} />
          </div>
        </>
      ) : (
        <p className="text-center text-neutral-500">
          Wähle zwei Substanzen zum Vergleichen.
        </p>
      )}
    </div>
  );
}
