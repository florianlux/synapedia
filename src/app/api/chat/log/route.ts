import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * POST /api/chat/log
 *
 * Persists a chat thread (session) and its messages to Postgres.
 * Uses the Supabase service role key server-side only — never exposed to clients.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const { thread, messages } = body as {
      thread?: {
        visitor_id?: string | null;
        user_id?: string | null;
        title?: string | null;
        risk_level?: string | null;
        consent_at?: string | null;
        ip_hash?: string | null;
        user_agent?: string | null;
      };
      messages?: Array<{
        role: "user" | "assistant";
        content: Record<string, unknown>;
        risk_level?: string | null;
      }>;
    };

    // --- Validation ---
    if (!thread || !messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: "thread und messages (nicht-leeres Array) sind erforderlich." },
        { status: 400 },
      );
    }

    for (const msg of messages) {
      if (!msg.role || !["user", "assistant"].includes(msg.role)) {
        return NextResponse.json(
          { error: "Jede Nachricht muss eine gültige role ('user' | 'assistant') haben." },
          { status: 400 },
        );
      }
      if (msg.content === undefined || msg.content === null) {
        return NextResponse.json(
          { error: "Jede Nachricht muss ein content-Feld enthalten." },
          { status: 400 },
        );
      }
    }

    // --- Insert chat session (thread) ---
    const supabase = createAdminClient();

    const { data: session, error: sessionError } = await supabase
      .from("chat_sessions")
      .insert({
        user_id: thread.user_id ?? null,
        visitor_id: thread.visitor_id ?? null,
        ip_hash: thread.ip_hash ?? null,
        user_agent: thread.user_agent ?? null,
        title: thread.title ?? null,
        risk_level: thread.risk_level ?? null,
        message_count: messages.length,
        consent_at: thread.consent_at ?? null,
      })
      .select("id")
      .single();

    if (sessionError || !session) {
      console.error("[chat/log] session insert error:", sessionError);
      return NextResponse.json(
        { error: "Chat-Session konnte nicht erstellt werden." },
        { status: 500 },
      );
    }

    // --- Insert chat messages ---
    const messageRows = messages.map((msg) => ({
      session_id: session.id,
      role: msg.role,
      content: msg.content,
      risk_level: msg.risk_level ?? null,
    }));

    const { data: insertedMessages, error: messagesError } = await supabase
      .from("chat_messages")
      .insert(messageRows)
      .select("id");

    if (messagesError) {
      console.error("[chat/log] messages insert error:", messagesError);
      // Clean up the orphaned session
      await supabase.from("chat_sessions").delete().eq("id", session.id);
      return NextResponse.json(
        { error: "Nachrichten konnten nicht gespeichert werden." },
        { status: 500 },
      );
    }

    return NextResponse.json(
      {
        session_id: session.id,
        message_ids: insertedMessages?.map((m) => m.id) ?? [],
      },
      { status: 201 },
    );
  } catch (err) {
    console.error("[chat/log] unexpected error:", err);
    return NextResponse.json(
      { error: "Interner Serverfehler." },
      { status: 500 },
    );
  }
}
