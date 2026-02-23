import { demoArticles } from "@/lib/demo-data";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, Eye, PenLine, Clock } from "lucide-react";
import Link from "next/link";

export default function AdminDashboard() {
  const total = demoArticles.length;
  const published = demoArticles.filter((a) => a.status === "published").length;
  const drafts = demoArticles.filter((a) => a.status === "draft").length;
  const review = demoArticles.filter((a) => a.status === "review").length;

  const stats = [
    { label: "Artikel gesamt", value: total, icon: FileText, color: "text-cyan-500" },
    { label: "Veröffentlicht", value: published, icon: Eye, color: "text-green-500" },
    { label: "Entwürfe", value: drafts, icon: PenLine, color: "text-yellow-500" },
    { label: "In Review", value: review, icon: Clock, color: "text-violet-500" },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50">Dashboard</h1>
        <p className="mt-1 text-neutral-500 dark:text-neutral-400">Übersicht aller Inhalte und Aktivitäten.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-neutral-500 dark:text-neutral-400">
                {stat.label}
              </CardTitle>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-neutral-900 dark:text-neutral-50">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Letzte Artikel</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {demoArticles.map((article) => (
              <div
                key={article.id}
                className="flex items-center justify-between rounded-lg border border-neutral-200 p-4 dark:border-neutral-800"
              >
                <div>
                  <Link
                    href={`/articles/${article.slug}`}
                    className="font-medium text-neutral-900 hover:text-cyan-500 dark:text-neutral-50"
                  >
                    {article.title}
                  </Link>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">{article.subtitle}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={article.risk_level}>{article.risk_level}</Badge>
                  <Badge variant="secondary">{article.status}</Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
