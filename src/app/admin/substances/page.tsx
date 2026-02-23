"use client";

import { useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  demoSubstances,
  demoJobs,
  demoAllowlist,
} from "@/lib/demo-substances";
import type {
  Substance,
  SubstanceJob,
  DomainAllowlistEntry,
} from "@/lib/types";
import {
  FlaskConical,
  Play,
  RefreshCw,
  Plus,
  AlertTriangle,
  CheckCircle,
  Clock,
  XCircle,
  Loader2,
  Trash2,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Status / Risk badge helpers
// ---------------------------------------------------------------------------

function statusBadge(status: string) {
  const map: Record<string, "default" | "secondary" | "info" | "destructive"> =
    {
      draft: "secondary",
      review: "info",
      published: "default",
      archived: "destructive",
    };
  return <Badge variant={map[status] ?? "secondary"}>{status}</Badge>;
}

function riskBadge(risk: string) {
  const map: Record<string, "low" | "moderate" | "high" | "unknown"> = {
    low: "low",
    moderate: "moderate",
    high: "high",
    unknown: "unknown",
  };
  return <Badge variant={map[risk] ?? "unknown"}>{risk}</Badge>;
}

function jobStatusIcon(status: string) {
  switch (status) {
    case "succeeded":
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    case "failed":
      return <XCircle className="h-4 w-4 text-red-500" />;
    case "running":
      return <Loader2 className="h-4 w-4 animate-spin text-cyan-500" />;
    case "queued":
      return <Clock className="h-4 w-4 text-yellow-500" />;
    default:
      return <Clock className="h-4 w-4 text-neutral-400" />;
  }
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function AdminSubstances() {
  const [substances] = useState<Substance[]>(demoSubstances);
  const [jobs] = useState<SubstanceJob[]>(demoJobs);
  const [allowlist, setAllowlist] = useState<DomainAllowlistEntry[]>(demoAllowlist);
  const [newDomain, setNewDomain] = useState("");

  const isDemo = true; // In real mode would check env vars

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50">
            Substanz
          </h1>
          <p className="mt-1 text-neutral-500 dark:text-neutral-400">
            Substanzen verwalten, Artikel generieren, Jobs &amp; Allowlist.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <FlaskConical className="h-5 w-5 text-violet-500" />
        </div>
      </div>

      {isDemo && (
        <div className="flex items-center gap-2 rounded-lg border border-yellow-300 bg-yellow-50 p-3 text-sm text-yellow-800 dark:border-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300">
          <AlertTriangle className="h-4 w-4 flex-shrink-0" />
          Demo-Modus: Import/Jobs deaktiviert. Daten werden aus lokaler Demo
          geladen.
        </div>
      )}

      {/* Tabs */}
      <Tabs defaultValue="substances">
        <TabsList>
          <TabsTrigger value="substances">Substanzen</TabsTrigger>
          <TabsTrigger value="jobs">Jobs</TabsTrigger>
          <TabsTrigger value="allowlist">Allowlist</TabsTrigger>
        </TabsList>

        {/* ---- Tab: Substanzen ---- */}
        <TabsContent value="substances">
          <Card>
            <CardHeader>
              <CardTitle>Alle Substanzen ({substances.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-neutral-200 text-left dark:border-neutral-800">
                      <th className="pb-3 pr-4 font-medium text-neutral-500 dark:text-neutral-400">
                        Name
                      </th>
                      <th className="pb-3 pr-4 font-medium text-neutral-500 dark:text-neutral-400">
                        Klasse
                      </th>
                      <th className="pb-3 pr-4 font-medium text-neutral-500 dark:text-neutral-400">
                        Status
                      </th>
                      <th className="pb-3 pr-4 font-medium text-neutral-500 dark:text-neutral-400">
                        Risiko
                      </th>
                      <th className="pb-3 pr-4 font-medium text-neutral-500 dark:text-neutral-400">
                        Aktualisiert
                      </th>
                      <th className="pb-3 font-medium text-neutral-500 dark:text-neutral-400">
                        Aktionen
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {substances.map((sub) => (
                      <tr
                        key={sub.id}
                        className="border-b border-neutral-100 dark:border-neutral-800/50"
                      >
                        <td className="py-3 pr-4">
                          <Link
                            href={`/admin/substances/${sub.id}`}
                            className="font-medium text-neutral-900 hover:text-cyan-500 dark:text-neutral-50"
                          >
                            {sub.name}
                          </Link>
                          {sub.aliases.length > 0 && (
                            <p className="text-xs text-neutral-500 dark:text-neutral-400">
                              {sub.aliases.slice(0, 3).join(", ")}
                            </p>
                          )}
                        </td>
                        <td className="py-3 pr-4 text-neutral-600 dark:text-neutral-400">
                          {sub.class_primary ?? "–"}
                        </td>
                        <td className="py-3 pr-4">{statusBadge(sub.status)}</td>
                        <td className="py-3 pr-4">
                          {riskBadge(sub.risk_level)}
                        </td>
                        <td className="py-3 pr-4 text-neutral-600 dark:text-neutral-400">
                          {new Date(sub.updated_at).toLocaleDateString("de-DE")}
                        </td>
                        <td className="py-3">
                          <div className="flex items-center gap-1">
                            <Link href={`/admin/substances/${sub.id}`}>
                              <Button variant="ghost" size="sm">
                                Details
                              </Button>
                            </Link>
                            <Link href={`/articles/${sub.slug}`}>
                              <Button variant="ghost" size="sm">
                                Artikel
                              </Button>
                            </Link>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ---- Tab: Jobs ---- */}
        <TabsContent value="jobs">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Jobs &amp; Queue</CardTitle>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" disabled={isDemo}>
                  <RefreshCw className="mr-1 h-3 w-3" />
                  Aktualisieren
                </Button>
                <Button size="sm" disabled={isDemo}>
                  <Play className="mr-1 h-3 w-3" />
                  Worker starten
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-neutral-200 text-left dark:border-neutral-800">
                      <th className="pb-3 pr-4 font-medium text-neutral-500 dark:text-neutral-400">
                        Status
                      </th>
                      <th className="pb-3 pr-4 font-medium text-neutral-500 dark:text-neutral-400">
                        Typ
                      </th>
                      <th className="pb-3 pr-4 font-medium text-neutral-500 dark:text-neutral-400">
                        Versuche
                      </th>
                      <th className="pb-3 pr-4 font-medium text-neutral-500 dark:text-neutral-400">
                        Erstellt
                      </th>
                      <th className="pb-3 pr-4 font-medium text-neutral-500 dark:text-neutral-400">
                        Beendet
                      </th>
                      <th className="pb-3 font-medium text-neutral-500 dark:text-neutral-400">
                        Fehler
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {jobs.map((job) => (
                      <tr
                        key={job.id}
                        className="border-b border-neutral-100 dark:border-neutral-800/50"
                      >
                        <td className="py-3 pr-4">
                          <span className="flex items-center gap-1.5">
                            {jobStatusIcon(job.status)}
                            {job.status}
                          </span>
                        </td>
                        <td className="py-3 pr-4">
                          <Badge variant="outline">{job.type}</Badge>
                        </td>
                        <td className="py-3 pr-4 text-neutral-600 dark:text-neutral-400">
                          {job.attempts}/{job.max_attempts}
                        </td>
                        <td className="py-3 pr-4 text-neutral-600 dark:text-neutral-400">
                          {new Date(job.created_at).toLocaleString("de-DE")}
                        </td>
                        <td className="py-3 pr-4 text-neutral-600 dark:text-neutral-400">
                          {job.finished_at
                            ? new Date(job.finished_at).toLocaleString("de-DE")
                            : "–"}
                        </td>
                        <td className="py-3 text-red-600 dark:text-red-400">
                          {job.error ?? "–"}
                        </td>
                      </tr>
                    ))}
                    {jobs.length === 0 && (
                      <tr>
                        <td
                          colSpan={6}
                          className="py-8 text-center text-neutral-500"
                        >
                          Keine Jobs vorhanden.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ---- Tab: Allowlist ---- */}
        <TabsContent value="allowlist">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Domain Allowlist</CardTitle>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="domain.org"
                  value={newDomain}
                  onChange={(e) => setNewDomain(e.target.value)}
                  className="h-9 rounded-md border border-neutral-300 bg-transparent px-3 text-sm dark:border-neutral-700"
                />
                <Button
                  size="sm"
                  disabled={!newDomain.trim()}
                  onClick={() => {
                    if (!newDomain.trim()) return;
                    setAllowlist((prev) => [
                      ...prev,
                      {
                        id: `new-${Date.now()}`,
                        domain: newDomain.trim(),
                        enabled: true,
                        rate_limit_ms: 1500,
                        created_at: new Date().toISOString(),
                      },
                    ]);
                    setNewDomain("");
                  }}
                >
                  <Plus className="mr-1 h-3 w-3" />
                  Hinzufügen
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-neutral-200 text-left dark:border-neutral-800">
                      <th className="pb-3 pr-4 font-medium text-neutral-500 dark:text-neutral-400">
                        Domain
                      </th>
                      <th className="pb-3 pr-4 font-medium text-neutral-500 dark:text-neutral-400">
                        Aktiv
                      </th>
                      <th className="pb-3 pr-4 font-medium text-neutral-500 dark:text-neutral-400">
                        Rate Limit
                      </th>
                      <th className="pb-3 font-medium text-neutral-500 dark:text-neutral-400">
                        Aktionen
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {allowlist.map((entry) => (
                      <tr
                        key={entry.id}
                        className="border-b border-neutral-100 dark:border-neutral-800/50"
                      >
                        <td className="py-3 pr-4 font-medium text-neutral-900 dark:text-neutral-50">
                          {entry.domain}
                        </td>
                        <td className="py-3 pr-4">
                          <Badge
                            variant={entry.enabled ? "default" : "secondary"}
                          >
                            {entry.enabled ? "Aktiv" : "Deaktiviert"}
                          </Badge>
                        </td>
                        <td className="py-3 pr-4 text-neutral-600 dark:text-neutral-400">
                          {entry.rate_limit_ms}ms
                        </td>
                        <td className="py-3">
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setAllowlist((prev) =>
                                  prev.map((e) =>
                                    e.id === entry.id
                                      ? { ...e, enabled: !e.enabled }
                                      : e
                                  )
                                );
                              }}
                            >
                              {entry.enabled ? "Deaktivieren" : "Aktivieren"}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setAllowlist((prev) =>
                                  prev.filter((e) => e.id !== entry.id)
                                );
                              }}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
