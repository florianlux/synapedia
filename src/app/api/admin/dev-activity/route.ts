import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/auth";

const OWNER = "florianlux";
const REPO = "synapedia";

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

async function ghFetch(path: string, token: string) {
  const res = await fetch(`https://api.github.com${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
    },
    next: { revalidate: 60 },
  });
  return res;
}

export async function GET(request: NextRequest) {
  const authenticated = await isAdminAuthenticated(request);
  if (!authenticated) {
    return NextResponse.json({ error: "Nicht autorisiert." }, { status: 401 });
  }

  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    return NextResponse.json(
      { error: "GITHUB_TOKEN ist nicht konfiguriert." },
      { status: 500 }
    );
  }

  let warning: string | undefined;

  // A) Merged PRs
  let mergedPRs: MergedPR[] = [];
  try {
    const res = await ghFetch(
      `/repos/${OWNER}/${REPO}/pulls?state=closed&per_page=10&sort=updated&direction=desc`,
      token
    );
    if (res.ok) {
      const data = await res.json();
      mergedPRs = data
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .filter((pr: any) => pr.merged_at)
        .slice(0, 6)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .map((pr: any) => ({
          number: pr.number,
          title: pr.title,
          merged_at: pr.merged_at,
          user: pr.user?.login ?? "unknown",
          url: pr.html_url,
          base: pr.base?.ref ?? "",
        }));
    }
  } catch {
    // swallow – return empty
  }

  // B) Recent commits
  let recentCommits: RecentCommit[] = [];
  try {
    const res = await ghFetch(
      `/repos/${OWNER}/${REPO}/commits?per_page=8`,
      token
    );
    if (res.ok) {
      const data = await res.json();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      recentCommits = data.map((c: any) => ({
        sha7: c.sha.substring(0, 7),
        messageFirstLine: (c.commit?.message ?? "").split("\n")[0],
        author: c.commit?.author?.name ?? c.author?.login ?? "unknown",
        date: c.commit?.author?.date ?? "",
        url: c.html_url,
      }));
    }
  } catch {
    // swallow
  }

  // C) Successful workflow runs (optional)
  let successfulRuns: SuccessfulRun[] = [];
  try {
    const res = await ghFetch(
      `/repos/${OWNER}/${REPO}/actions/runs?per_page=10`,
      token
    );
    if (res.ok) {
      const data = await res.json();
      successfulRuns = (data.workflow_runs ?? [])
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .filter((r: any) => r.conclusion === "success")
        .slice(0, 5)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .map((r: any) => ({
          name: r.name,
          event: r.event,
          branch: r.head_branch ?? "",
          updated_at: r.updated_at,
          url: r.html_url,
        }));
    } else {
      warning = "Actions scope missing";
    }
  } catch {
    warning = "Actions scope missing";
    successfulRuns = [];
  }

  return NextResponse.json({
    repo: `${OWNER}/${REPO}`,
    mergedPRs,
    recentCommits,
    successfulRuns,
    ...(warning ? { warning } : {}),
  });
}
