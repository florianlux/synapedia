/**
 * Chat session persistence helpers for Safer-Use Companion.
 *
 * Privacy-first design:
 * - No raw IP addresses stored — only HMAC-SHA256 hash
 * - visitor_id (anonymous UUID) or user_id (Supabase Auth) for identity
 * - 90-day default retention with explicit retain_until
 */

import { createHmac, randomUUID } from "crypto";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import type {
  ChatSession,
  ChatMessage,
  SaferUseChatRequest,
  SaferUseChatResponse,
} from "@/lib/types";

// ---------------------------------------------------------------------------
// IP hashing — never store raw IPs
// ---------------------------------------------------------------------------

export function hashIp(rawIp: string): string {
  const secret = process.env.CHAT_IP_HASH_SECRET;
  if (!secret) return ""; // No secret configured — skip hashing
  return createHmac("sha256", secret).update(rawIp).digest("hex");
}

/**
 * Extract the client IP from request headers (x-forwarded-for, cf-connecting-ip)
 * and return its HMAC hash. Returns null if no IP header found.
 */
export function getIpHash(headers: Headers): string | null {
  if (!process.env.CHAT_IP_HASH_SECRET) return null;
  const raw =
    headers.get("cf-connecting-ip") ??
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    null;
  if (!raw) return null;
  return hashIp(raw);
}

// ---------------------------------------------------------------------------
// Visitor ID — pseudonymous UUID cookie
// ---------------------------------------------------------------------------

export function getOrCreateVisitorId(
  cookieValue: string | undefined
): { visitorId: string; isNew: boolean } {
  if (cookieValue && cookieValue.length >= 32) {
    return { visitorId: cookieValue, isNew: false };
  }
  return { visitorId: randomUUID(), isNew: true };
}

// ---------------------------------------------------------------------------
// Supabase service client (bypasses RLS)
// ---------------------------------------------------------------------------

async function getServiceClient() {
  if (!isSupabaseConfigured()) return null;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey || serviceKey === "your-service-role-key") return null;

  const { createClient } = await import("@supabase/supabase-js");
  return createClient(url, serviceKey);
}

// ---------------------------------------------------------------------------
// Persist a full chat exchange (session + user message + assistant response)
// ---------------------------------------------------------------------------

export async function persistChatExchange(opts: {
  userId: string | null;
  visitorId: string | null;
  ipHash: string | null;
  userAgent: string | null;
  consentAt: string | null;
  request: SaferUseChatRequest;
  response: SaferUseChatResponse;
}): Promise<string | null> {
  const supabase = await getServiceClient();
  if (!supabase) return null;

  try {
    // Build title from first substance
    const firstSubstance =
      opts.request.intake_log[0]?.substance || "Allgemein";
    const title = `Safer-Use Chat – ${firstSubstance}`;

    // Create session
    const { data: session, error: sessionErr } = await supabase
      .from("chat_sessions")
      .insert({
        user_id: opts.userId,
        visitor_id: opts.visitorId,
        ip_hash: opts.ipHash,
        user_agent: opts.userAgent,
        title,
        risk_level: opts.response.risk_level,
        message_count: 2,
        consent_at: opts.consentAt,
      })
      .select("id")
      .single();

    if (sessionErr || !session) return null;

    // Insert user message
    const { error: userMsgErr } = await supabase.from("chat_messages").insert({
      session_id: session.id,
      role: "user",
      content: {
        user_message: opts.request.user_message,
        user_profile: opts.request.user_profile,
        intake_log: opts.request.intake_log,
      },
    });

    if (userMsgErr) return session.id;

    // Insert assistant response
    await supabase.from("chat_messages").insert({
      session_id: session.id,
      role: "assistant",
      content: opts.response,
      risk_level: opts.response.risk_level,
    });

    return session.id;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Admin queries
// ---------------------------------------------------------------------------

export async function listChatSessions(opts?: {
  limit?: number;
  offset?: number;
}): Promise<{ sessions: ChatSession[]; total: number }> {
  const supabase = await getServiceClient();
  if (!supabase) return { sessions: [], total: 0 };

  const limit = opts?.limit ?? 50;
  const offset = opts?.offset ?? 0;

  const { count } = await supabase
    .from("chat_sessions")
    .select("id", { count: "exact", head: true });

  const { data, error } = await supabase
    .from("chat_sessions")
    .select("*")
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error || !data) return { sessions: [], total: 0 };

  return { sessions: data as ChatSession[], total: count ?? 0 };
}

export async function getChatSession(
  id: string
): Promise<{ session: ChatSession | null; messages: ChatMessage[] }> {
  const supabase = await getServiceClient();
  if (!supabase) return { session: null, messages: [] };

  const { data: session } = await supabase
    .from("chat_sessions")
    .select("*")
    .eq("id", id)
    .single();

  const { data: messages } = await supabase
    .from("chat_messages")
    .select("*")
    .eq("session_id", id)
    .order("created_at", { ascending: true });

  return {
    session: (session as ChatSession) ?? null,
    messages: (messages as ChatMessage[]) ?? [],
  };
}

export async function deleteChatSession(id: string): Promise<boolean> {
  const supabase = await getServiceClient();
  if (!supabase) return false;

  const { error } = await supabase
    .from("chat_sessions")
    .delete()
    .eq("id", id);

  return !error;
}
