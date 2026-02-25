"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  GitMerge,
  GitCommit,
  CheckCircle,
  ExternalLink,
  RefreshCw,
  AlertTriangle,
} from "lucide-react";

interface MergedPR {
  number: number;
  title: string;
  merged_at: string;
  user: string;
  url: string;
  base: string;
}

interface RecentCommit {
  sha7: string;
  messageFirstLine: string;
  author: string;
  date: string;
  url: string;
}

interface SuccessfulRun {
  name: string;
  event: string;
  branch: string;
  updated_at: string;
  url: string;
}

interface DevActivityData {
  repo: string;
  mergedPRs: MergedPR[];
  recentCommits: RecentCommit[];
  successfulRuns: SuccessfulRun[];
  warning?: string;
}

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `vor ${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `vor ${hours}h`;
  const days = Math.floor(hours / 24);
  return `vor ${days}d`;
}

export default function DevActivityPage() {
  const [data, setData] = useState<DevActivityData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);

  async function fetchData() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/dev-activity");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Fehler beim Laden.");
      setData(json);
      setLastRefreshed(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unbekannter Fehler.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50">
            Dev Activity
          </h1>
          <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
            Aktuelle GitHub-Aktivität für{" "}
            {data?.repo ?? "florianlux/synapedia"}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {lastRefreshed && (
            <span className="text-xs text-neutral-400">
              Aktualisiert: {lastRefreshed.toLocaleTimeString("de-DE")}
            </span>
          )}
          <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Aktualisieren
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-800 dark:border-red-700 dark:bg-red-950 dark:text-red-300">
          {error}
        </div>
      )}

      {data?.warning && (
        <div className="flex items-center gap-2 rounded-lg border border-yellow-300 bg-yellow-50 p-3 text-sm text-yellow-800 dark:border-yellow-700 dark:bg-yellow-950 dark:text-yellow-300">
          <AlertTriangle className="h-4 w-4" />
          {data.warning}
        </div>
      )}

      {loading && !data ? (
        <p className="text-sm text-neutral-500">Lade Aktivität…</p>
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Successful Workflow Runs */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <CheckCircle className="h-4 w-4 text-green-500" />
                Erfolgreiche Workflows
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {data?.successfulRuns.length === 0 && (
                <p className="text-sm text-neutral-400">Keine Daten</p>
              )}
              {data?.successfulRuns.map((run, i) => (
                <a
                  key={i}
                  href={run.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block rounded-lg border border-neutral-200 p-3 transition-colors hover:bg-neutral-50 dark:border-neutral-800 dark:hover:bg-neutral-900"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium text-neutral-900 dark:text-neutral-50">
                      {run.name}
                    </p>
                    <ExternalLink className="h-3 w-3 shrink-0 text-neutral-400" />
                  </div>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    <Badge variant="secondary">{run.branch}</Badge>
                    <Badge variant="outline">{run.event}</Badge>
                    <span className="text-xs text-neutral-400">
                      {relativeTime(run.updated_at)}
                    </span>
                  </div>
                </a>
              ))}
            </CardContent>
          </Card>

          {/* Merged PRs */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <GitMerge className="h-4 w-4 text-violet-500" />
                Gemergte PRs
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {data?.mergedPRs.length === 0 && (
                <p className="text-sm text-neutral-400">Keine Daten</p>
              )}
              {data?.mergedPRs.map((pr) => (
                <a
                  key={pr.number}
                  href={pr.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block rounded-lg border border-neutral-200 p-3 transition-colors hover:bg-neutral-50 dark:border-neutral-800 dark:hover:bg-neutral-900"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium text-neutral-900 dark:text-neutral-50">
                      #{pr.number} {pr.title}
                    </p>
                    <ExternalLink className="h-3 w-3 shrink-0 text-neutral-400" />
                  </div>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    <Badge variant="secondary">{pr.base}</Badge>
                    <span className="text-xs text-neutral-400">
                      {pr.user} · {relativeTime(pr.merged_at)}
                    </span>
                  </div>
                </a>
              ))}
            </CardContent>
          </Card>

          {/* Recent Commits */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <GitCommit className="h-4 w-4 text-cyan-500" />
                Letzte Commits
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {data?.recentCommits.length === 0 && (
                <p className="text-sm text-neutral-400">Keine Daten</p>
              )}
              {data?.recentCommits.map((c) => (
                <a
                  key={c.sha7}
                  href={c.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block rounded-lg border border-neutral-200 p-3 transition-colors hover:bg-neutral-50 dark:border-neutral-800 dark:hover:bg-neutral-900"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium text-neutral-900 dark:text-neutral-50 line-clamp-2">
                      {c.messageFirstLine}
                    </p>
                    <ExternalLink className="h-3 w-3 shrink-0 text-neutral-400" />
                  </div>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    <code className="rounded bg-neutral-100 px-1.5 py-0.5 text-xs text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400">
                      {c.sha7}
                    </code>
                    <span className="text-xs text-neutral-400">
                      {c.author} · {relativeTime(c.date)}
                    </span>
                  </div>
                </a>
              ))}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
