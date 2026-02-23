import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { AuditLog } from "@/lib/types";

const mockAuditLogs: AuditLog[] = [
  {
    id: "a1",
    user_id: null,
    action: "article.created",
    entity_type: "article",
    entity_id: "1",
    details: { title: "Psilocybin" },
    created_at: "2024-01-15T10:00:00Z",
  },
  {
    id: "a2",
    user_id: null,
    action: "article.published",
    entity_type: "article",
    entity_id: "1",
    details: { title: "Psilocybin" },
    created_at: "2024-01-20T14:30:00Z",
  },
  {
    id: "a3",
    user_id: null,
    action: "article.created",
    entity_type: "article",
    entity_id: "2",
    details: { title: "MDMA" },
    created_at: "2024-02-01T09:00:00Z",
  },
  {
    id: "a4",
    user_id: null,
    action: "article.published",
    entity_type: "article",
    entity_id: "2",
    details: { title: "MDMA" },
    created_at: "2024-02-10T11:00:00Z",
  },
  {
    id: "a5",
    user_id: null,
    action: "article.created",
    entity_type: "article",
    entity_id: "3",
    details: { title: "Ketamin" },
    created_at: "2024-03-01T08:00:00Z",
  },
  {
    id: "a6",
    user_id: null,
    action: "article.published",
    entity_type: "article",
    entity_id: "3",
    details: { title: "Ketamin" },
    created_at: "2024-03-15T16:00:00Z",
  },
  {
    id: "a7",
    user_id: null,
    action: "article.updated",
    entity_type: "article",
    entity_id: "1",
    details: { title: "Psilocybin", field: "content_mdx" },
    created_at: "2024-06-01T12:00:00Z",
  },
];

const actionLabels: Record<string, string> = {
  "article.created": "Artikel erstellt",
  "article.published": "Artikel veröffentlicht",
  "article.updated": "Artikel aktualisiert",
  "article.deleted": "Artikel gelöscht",
};

const actionVariants: Record<string, "default" | "secondary" | "info" | "destructive"> = {
  "article.created": "info",
  "article.published": "default",
  "article.updated": "secondary",
  "article.deleted": "destructive",
};

export default function AdminAudit() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50">Audit-Log</h1>
        <p className="mt-1 text-neutral-500 dark:text-neutral-400">
          Protokoll aller Änderungen und Aktionen.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Letzte Aktivitäten</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-200 text-left dark:border-neutral-800">
                  <th className="pb-3 pr-4 font-medium text-neutral-500 dark:text-neutral-400">Zeitpunkt</th>
                  <th className="pb-3 pr-4 font-medium text-neutral-500 dark:text-neutral-400">Aktion</th>
                  <th className="pb-3 pr-4 font-medium text-neutral-500 dark:text-neutral-400">Entität</th>
                  <th className="pb-3 font-medium text-neutral-500 dark:text-neutral-400">Details</th>
                </tr>
              </thead>
              <tbody>
                {mockAuditLogs.map((log) => (
                  <tr
                    key={log.id}
                    className="border-b border-neutral-100 dark:border-neutral-800/50"
                  >
                    <td className="py-3 pr-4 text-neutral-600 dark:text-neutral-400">
                      {new Date(log.created_at).toLocaleString("de-DE", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="py-3 pr-4">
                      <Badge variant={actionVariants[log.action] ?? "secondary"}>
                        {actionLabels[log.action] ?? log.action}
                      </Badge>
                    </td>
                    <td className="py-3 pr-4 text-neutral-600 dark:text-neutral-400">
                      {log.entity_type} #{log.entity_id}
                    </td>
                    <td className="py-3 text-neutral-600 dark:text-neutral-400">
                      {log.details && typeof log.details === "object" && "title" in log.details
                        ? String(log.details.title)
                        : "–"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
