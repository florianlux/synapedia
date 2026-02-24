"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Boxes } from "lucide-react";
import Link from "next/link";
import type { Template } from "@/lib/types";

const demoTemplates: Template[] = [
  {
    id: "tpl-1",
    name: "Substanz-Standard",
    slug: "substanz-standard",
    schema_json: {
      sections: [
        { key: "kurzfazit", title: "Kurzfazit", required: true },
        { key: "was-ist", title: "Was ist …?", required: true },
        { key: "chemie", title: "Chemische Struktur / Klasse", required: true },
        { key: "wirkmechanismus", title: "Wirkmechanismus", required: true },
        { key: "rezeptorprofil", title: "Rezeptorprofil", required: true },
        { key: "wirkprofil", title: "Wirkprofil", required: true },
        { key: "risiken", title: "Risiken & Nebenwirkungen", required: true },
        { key: "interaktionen", title: "Interaktionen", required: true },
        { key: "kreuztoleranz", title: "Kreuztoleranz", required: false },
        { key: "rechtsstatus", title: "Rechtsstatus", required: true },
        { key: "quellenlage", title: "Quellenlage", required: true },
      ],
      links: [
        { from: "rezeptorprofil", to: "wirkmechanismus", relation: "explains" },
        { from: "interaktionen", to: "risiken", relation: "warns" },
      ],
    },
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
  },
];

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>(demoTemplates);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    import("@/lib/db/templates")
      .then(({ getTemplates }) => getTemplates())
      .then((data) => {
        if (data.length > 0) setTemplates(data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50">Templates</h1>
          <p className="mt-1 text-neutral-500 dark:text-neutral-400">
            Neural Blueprints – Artikelvorlagen definieren und verwalten.
          </p>
        </div>
        <Link href="/admin/templates/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Neues Template
          </Button>
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {loading && (
          <p className="col-span-full text-sm text-neutral-500">Laden…</p>
        )}
        {templates.map((tpl) => (
          <Link key={tpl.id} href={`/admin/templates/${tpl.slug}`}>
            <Card className="cursor-pointer transition-colors hover:border-cyan-500/40">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Boxes className="h-5 w-5 text-violet-500" />
                  {tpl.name}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="mb-3 text-sm text-neutral-500 dark:text-neutral-400">
                  {tpl.schema_json.sections?.length ?? 0} Sektionen
                </p>
                <div className="flex flex-wrap gap-1">
                  {tpl.schema_json.sections?.slice(0, 5).map((s) => (
                    <Badge key={s.key} variant={s.required ? "default" : "secondary"} className="text-xs">
                      {s.title}
                    </Badge>
                  ))}
                  {(tpl.schema_json.sections?.length ?? 0) > 5 && (
                    <Badge variant="outline" className="text-xs">
                      +{tpl.schema_json.sections!.length - 5}
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
