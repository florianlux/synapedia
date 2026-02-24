"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Upload, ImageIcon, Tag } from "lucide-react";
import type { Media } from "@/lib/types";

export default function AdminMedia() {
  const [mediaList, setMediaList] = useState<Media[]>([]);
  const [loading, setLoading] = useState(true);
  const [altText, setAltText] = useState("");
  const [tags, setTags] = useState("");

  useEffect(() => {
    import("@/lib/db/media")
      .then(({ getMediaList }) => getMediaList())
      .then(setMediaList)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50">Medien</h1>
        <p className="mt-1 text-neutral-500 dark:text-neutral-400">
          Visual Cortex – Bilder und Dateien für Artikel verwalten.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Datei hochladen</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-neutral-300 p-12 text-center dark:border-neutral-700">
            <Upload className="mb-4 h-10 w-10 text-neutral-400" />
            <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
              Dateien hierher ziehen oder klicken zum Auswählen
            </p>
            <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
              PNG, JPG, SVG oder WebP (max. 5 MB)
            </p>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">Alt-Text</label>
              <Input
                value={altText}
                onChange={(e) => setAltText(e.target.value)}
                placeholder="Bildbeschreibung"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">Tags</label>
              <Input
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="hero, struktur, rezeptor (kommagetrennt)"
              />
            </div>
          </div>
          <p className="mt-4 text-xs text-neutral-400 dark:text-neutral-500">
            Upload benötigt konfiguriertes Supabase Storage. In der Demo-Version ist der Upload deaktiviert.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Medienbibliothek {!loading && `(${mediaList.length})`}</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-neutral-500">Laden…</p>
          ) : mediaList.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {mediaList.map((m) => (
                <div
                  key={m.id}
                  className="rounded-lg border border-neutral-200 p-3 dark:border-neutral-800"
                >
                  {m.url ? (
                    <Image src={m.url} alt={m.alt ?? "Media"} width={m.width ?? 300} height={m.height ?? 200} className="mb-2 h-32 w-full rounded object-cover" />
                  ) : (
                    <div className="mb-2 flex h-32 items-center justify-center rounded bg-neutral-100 dark:bg-neutral-800">
                      <ImageIcon className="h-8 w-8 text-neutral-400" />
                    </div>
                  )}
                  <p className="truncate text-sm font-medium text-neutral-900 dark:text-neutral-50">
                    {m.path}
                  </p>
                  {m.alt && <p className="text-xs text-neutral-500">{m.alt}</p>}
                  {m.tags && m.tags.length > 0 && (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {m.tags.map((tag) => (
                        <Badge key={tag} variant="secondary" className="text-[10px]">
                          <Tag className="mr-0.5 h-2.5 w-2.5" />
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <ImageIcon className="mb-4 h-10 w-10 text-neutral-300 dark:text-neutral-600" />
              <p className="text-sm text-neutral-500 dark:text-neutral-400">
                Noch keine Medien vorhanden.
              </p>
              <p className="mt-1 text-xs text-neutral-400 dark:text-neutral-500">
                Hochgeladene Dateien werden hier angezeigt.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
