"use client";

import { useEffect, useState } from "react";
import { GitPullRequest, GitCommit, Play, AlertCircle } from "lucide-react";

interface DevEvent {
  id: string;
  type: "pr" | "commit" | "workflow";
  title: string;
  url: string;
  author: string;
  date: string;
}

const typeConfig = {
  pr: { icon: GitPullRequest, label: "Merged PR", color: "text-violet-600 dark:text-violet-400" },
  commit: { icon: GitCommit, label: "Commit", color: "text-sky-600 dark:text-sky-400" },
  workflow: { icon: Play, label: "Workflow", color: "text-emerald-600 dark:text-emerald-400" },
};

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "gerade eben";
  if (mins < 60) return `vor ${mins} Min.`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `vor ${hours} Std.`;
  const days = Math.floor(hours / 24);
  return `vor ${days} Tag${days > 1 ? "en" : ""}`;
}

export default function DevActivityPage() {
  const [events, setEvents] = useState<DevEvent[]>([]);
  const [demo, setDemo] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/dev-activity")
      .then(async (res) => {
        if (!res.ok) throw new Error((await res.json()).error ?? res.statusText);
        return res.json();
      })
      .then((data) => {
        setEvents(data.events ?? []);
        setDemo(data.demo ?? false);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-50">
          Dev Activity
        </h1>
        <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
          Letzte GitHub-Aktivität: Merged PRs, Commits &amp; erfolgreiche Workflows.
        </p>
      </div>

      {demo && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-300">
          <AlertCircle className="mb-0.5 inline h-3 w-3" /> Demo-Modus – setze{" "}
          <code className="font-mono">GITHUB_TOKEN</code> für Live-Daten.
        </div>
      )}

      {loading && (
        <p className="text-sm text-neutral-500 dark:text-neutral-400">Lade Aktivität…</p>
      )}

      {error && (
        <div className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
          {error}
        </div>
      )}

      {!loading && !error && events.length === 0 && (
        <p className="text-sm text-neutral-500">Keine Aktivitäten gefunden.</p>
      )}

      {events.length > 0 && (
        <div className="divide-y divide-neutral-200 rounded-lg border border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800">
          {events.map((ev) => {
            const cfg = typeConfig[ev.type];
            const Icon = cfg.icon;
            return (
              <div key={ev.id} className="flex items-start gap-3 px-4 py-3">
                <Icon className={`mt-0.5 h-4 w-4 flex-shrink-0 ${cfg.color}`} />
                <div className="min-w-0 flex-1">
                  <a
                    href={ev.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-medium text-neutral-900 hover:underline dark:text-neutral-100"
                  >
                    {ev.title}
                  </a>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">
                    {cfg.label} · {ev.author} · {relativeTime(ev.date)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
