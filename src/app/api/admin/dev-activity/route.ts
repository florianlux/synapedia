import { NextRequest, NextResponse } from "next/server";
import { assertAdmin } from "@/lib/admin/require-admin";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface DevEvent {
  id: string;
  type: "pr" | "commit" | "workflow";
  title: string;
  url: string;
  author: string;
  date: string; // ISO-8601
}

// ---------------------------------------------------------------------------
// GitHub helpers
// ---------------------------------------------------------------------------

const GITHUB_API = "https://api.github.com";

async function ghFetch(path: string, token: string) {
  const res = await fetch(`${GITHUB_API}${path}`, {
    headers: {
      Authorization: `token ${token}`,
      Accept: "application/vnd.github+json",
    },
    next: { revalidate: 120 }, // cache for 2 min
  });
  if (!res.ok) throw new Error(`GitHub API ${res.status}: ${path}`);
  return res.json();
}

function repoSlug(): string {
  return process.env.GITHUB_REPO ?? "florianlux/synapedia";
}

async function fetchMergedPRs(token: string): Promise<DevEvent[]> {
  const slug = repoSlug();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data: any[] = await ghFetch(
    `/repos/${slug}/pulls?state=closed&sort=updated&direction=desc&per_page=10`,
    token,
  );
  return data
    .filter((pr) => pr.merged_at)
    .map((pr) => ({
      id: `pr-${pr.number}`,
      type: "pr" as const,
      title: pr.title,
      url: pr.html_url,
      author: pr.user?.login ?? "unknown",
      date: pr.merged_at,
    }));
}

async function fetchCommits(token: string): Promise<DevEvent[]> {
  const slug = repoSlug();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data: any[] = await ghFetch(
    `/repos/${slug}/commits?per_page=10`,
    token,
  );
  return data.map((c) => ({
    id: `commit-${c.sha.slice(0, 7)}`,
    type: "commit" as const,
    title: c.commit.message.split("\n")[0],
    url: c.html_url,
    author: c.author?.login ?? c.commit.author?.name ?? "unknown",
    date: c.commit.author?.date ?? "",
  }));
}

async function fetchWorkflowRuns(token: string): Promise<DevEvent[]> {
  const slug = repoSlug();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data: any = await ghFetch(
    `/repos/${slug}/actions/runs?status=success&per_page=10`,
    token,
  );
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data.workflow_runs ?? []).map((r: any) => ({
    id: `wf-${r.id}`,
    type: "workflow" as const,
    title: `${r.name} #${r.run_number}`,
    url: r.html_url,
    author: r.actor?.login ?? "ci",
    date: r.updated_at,
  }));
}

// ---------------------------------------------------------------------------
// Demo fallback
// ---------------------------------------------------------------------------

function demoEvents(): DevEvent[] {
  const now = new Date();
  return [
    { id: "pr-42", type: "pr", title: "feat: add interaction checker", url: "#", author: "demo-user", date: new Date(now.getTime() - 3600_000).toISOString() },
    { id: "commit-abc1234", type: "commit", title: "fix: correct receptor binding data", url: "#", author: "demo-user", date: new Date(now.getTime() - 7200_000).toISOString() },
    { id: "wf-100", type: "workflow", title: "CI #100", url: "#", author: "github-actions", date: new Date(now.getTime() - 10800_000).toISOString() },
  ];
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

export async function GET(req: NextRequest) {
  try {
    await assertAdmin(req);
  } catch (res) {
    return res as NextResponse;
  }

  const token = process.env.GITHUB_TOKEN;

  if (!token) {
    return NextResponse.json({ events: demoEvents(), demo: true });
  }

  try {
    const [prs, commits, runs] = await Promise.all([
      fetchMergedPRs(token),
      fetchCommits(token),
      fetchWorkflowRuns(token),
    ]);

    const events = [...prs, ...commits, ...runs].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );

    return NextResponse.json({ events, demo: false });
  } catch (err) {
    const message = err instanceof Error ? err.message : "GitHub API error";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
