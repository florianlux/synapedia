import { getChatSession } from "@/lib/chat/persistence";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, MessageSquare, User, Globe, Clock, Shield } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

const RISK_BADGE_COLORS: Record<string, string> = {
  GRÜN: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  GELB: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  ORANGE: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
  ROT: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
};

export default async function AdminChatSessionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { session, messages } = await getChatSession(id);

  if (!session) {
    notFound();
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <Link
            href="/admin/chat-sessions"
            className="mb-2 inline-flex items-center gap-1 text-sm text-neutral-500 transition-colors hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-50"
          >
            <ArrowLeft className="h-4 w-4" />
            Alle Sitzungen
          </Link>
          <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50">
            {session.title ?? "Chat-Sitzung"}
          </h1>
        </div>
        {session.risk_level && (
          <span
            className={`inline-block rounded-full px-3 py-1 text-sm font-bold ${
              RISK_BADGE_COLORS[session.risk_level] ?? ""
            }`}
          >
            {session.risk_level}
          </span>
        )}
      </div>

      {/* Metadata */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Sitzungs-Details</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <dt className="text-neutral-500 dark:text-neutral-400">ID</dt>
              <dd className="font-mono text-xs text-neutral-700 dark:text-neutral-300 truncate">
                {session.id}
              </dd>
            </div>
            <div>
              <dt className="text-neutral-500 dark:text-neutral-400">Erstellt</dt>
              <dd className="flex items-center gap-1 text-neutral-700 dark:text-neutral-300">
                <Clock className="h-3 w-3" />
                {new Date(session.created_at).toLocaleString("de-DE")}
              </dd>
            </div>
            <div>
              <dt className="text-neutral-500 dark:text-neutral-400">Identität</dt>
              <dd className="flex items-center gap-1 text-neutral-700 dark:text-neutral-300">
                {session.user_id ? (
                  <>
                    <User className="h-3 w-3" />
                    <span className="font-mono text-xs truncate">{session.user_id}</span>
                  </>
                ) : (
                  <>
                    <Globe className="h-3 w-3" />
                    <span className="font-mono text-xs truncate">
                      Anonym{session.visitor_id ? ` (${session.visitor_id.slice(0, 8)}…)` : ""}
                    </span>
                  </>
                )}
              </dd>
            </div>
            <div>
              <dt className="text-neutral-500 dark:text-neutral-400">Nachrichten</dt>
              <dd className="flex items-center gap-1 text-neutral-700 dark:text-neutral-300">
                <MessageSquare className="h-3 w-3" />
                {session.message_count}
              </dd>
            </div>
            <div>
              <dt className="text-neutral-500 dark:text-neutral-400">Einwilligung</dt>
              <dd className="text-neutral-700 dark:text-neutral-300">
                {session.consent_at ? (
                  <Badge variant="default" className="text-xs">
                    <Shield className="mr-1 h-3 w-3" />
                    {new Date(session.consent_at).toLocaleString("de-DE")}
                  </Badge>
                ) : (
                  <span className="text-neutral-400">Nicht erteilt</span>
                )}
              </dd>
            </div>
            <div>
              <dt className="text-neutral-500 dark:text-neutral-400">Aufbewahrung bis</dt>
              <dd className="text-neutral-700 dark:text-neutral-300">
                {new Date(session.retain_until).toLocaleDateString("de-DE")}
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      {/* Messages */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-cyan-500" />
            Nachrichtenverlauf
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`rounded-lg border p-4 ${
                  msg.role === "user"
                    ? "border-neutral-200 bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800"
                    : "border-cyan-200 bg-cyan-50 dark:border-cyan-800 dark:bg-cyan-950/20"
                }`}
              >
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase text-neutral-500 dark:text-neutral-400">
                    {msg.role === "user" ? "Nutzer:in" : "Companion"}
                  </span>
                  <div className="flex items-center gap-2">
                    {msg.risk_level && (
                      <span
                        className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          RISK_BADGE_COLORS[msg.risk_level] ?? ""
                        }`}
                      >
                        {msg.risk_level}
                      </span>
                    )}
                    <span className="text-[10px] text-neutral-400">
                      {new Date(msg.created_at).toLocaleTimeString("de-DE")}
                    </span>
                  </div>
                </div>
                <pre className="whitespace-pre-wrap text-sm text-neutral-700 dark:text-neutral-300 overflow-x-auto">
                  {JSON.stringify(msg.content, null, 2)}
                </pre>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
