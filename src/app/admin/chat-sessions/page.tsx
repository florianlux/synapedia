import { listChatSessions } from "@/lib/chat/persistence";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, User, Globe } from "lucide-react";
import Link from "next/link";

const RISK_BADGE_COLORS: Record<string, string> = {
  GRÜN: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  GELB: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  ORANGE: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
  ROT: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
};

export default async function AdminChatSessionsPage() {
  const { sessions, total } = await listChatSessions({ limit: 50 });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50">
          Chat Sessions
        </h1>
        <p className="mt-1 text-neutral-500 dark:text-neutral-400">
          {total} Safer-Use Companion Sitzungen gespeichert.
        </p>
      </div>

      {sessions.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <MessageSquare className="mx-auto h-12 w-12 text-neutral-300 dark:text-neutral-600" />
            <p className="mt-4 text-neutral-500 dark:text-neutral-400">
              Noch keine Chat-Sitzungen vorhanden. Sitzungen werden automatisch
              beim Nutzen des Safer-Use Companions erstellt (Supabase erforderlich).
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-cyan-500" />
              Letzte Sitzungen
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {sessions.map((session) => (
                <Link
                  key={session.id}
                  href={`/admin/chat-sessions/${session.id}`}
                  className="flex items-center justify-between rounded-lg border border-neutral-200 p-4 transition-colors hover:bg-neutral-50 dark:border-neutral-800 dark:hover:bg-neutral-800/50"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-neutral-900 dark:text-neutral-50 truncate">
                        {session.title ?? "Unbenannte Sitzung"}
                      </span>
                      {session.risk_level && (
                        <span
                          className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${
                            RISK_BADGE_COLORS[session.risk_level] ?? ""
                          }`}
                        >
                          {session.risk_level}
                        </span>
                      )}
                    </div>
                    <div className="mt-1 flex items-center gap-3 text-xs text-neutral-500 dark:text-neutral-400">
                      <span>
                        {new Date(session.created_at).toLocaleString("de-DE", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                      </span>
                      <span className="flex items-center gap-1">
                        <MessageSquare className="h-3 w-3" />
                        {session.message_count}
                      </span>
                      {session.user_id ? (
                        <span className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          Angemeldet
                        </span>
                      ) : (
                        <span className="flex items-center gap-1">
                          <Globe className="h-3 w-3" />
                          Anonym
                        </span>
                      )}
                      {session.consent_at && (
                        <Badge variant="secondary" className="text-[10px]">
                          Einwilligung
                        </Badge>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
