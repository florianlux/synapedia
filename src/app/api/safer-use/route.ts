import { NextRequest, NextResponse } from "next/server";
import { runSaferUseChat } from "@/lib/ai/safer-use";
import {
  getIpHash,
  getOrCreateVisitorId,
  persistChatExchange,
} from "@/lib/chat/persistence";
import type { SaferUseChatRequest } from "@/lib/types";

const VISITOR_COOKIE = "sp_visitor_id";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as SaferUseChatRequest & {
      consent_at?: string | null;
    };

    // Basic validation
    if (!body.user_profile || !body.intake_log || !body.user_message) {
      return NextResponse.json(
        { error: "Unvollständige Anfrage. user_profile, intake_log und user_message sind erforderlich." },
        { status: 400 }
      );
    }

    const chatResponse = await runSaferUseChat(body);

    // --- Persistence (best-effort, never blocks the response) ---
    let userId: string | null = null;
    let visitorId: string | null = null;
    let isNewVisitor = false;

    // Try to get authenticated user from Supabase session cookie
    try {
      const { createClient } = await import("@/lib/supabase/server");
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) userId = user.id;
    } catch {
      // No auth available — use visitor_id
    }

    if (!userId) {
      const cookieVal = request.cookies.get(VISITOR_COOKIE)?.value;
      const result = getOrCreateVisitorId(cookieVal);
      visitorId = result.visitorId;
      isNewVisitor = result.isNew;
    }

    const ipHash = getIpHash(request.headers);
    const userAgent = request.headers.get("user-agent");

    // Fire-and-forget persistence — do not await in critical path
    persistChatExchange({
      userId,
      visitorId,
      ipHash,
      userAgent,
      consentAt: body.consent_at ?? null,
      request: body,
      response: chatResponse,
    }).catch((err) => {
      console.error("[safer-use] persistence error:", err);
    });

    // Build response with optional visitor_id cookie
    const res = NextResponse.json(chatResponse);

    if (isNewVisitor && visitorId) {
      res.cookies.set(VISITOR_COOKIE, visitorId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 90, // 90 days
      });
    }

    return res;
  } catch {
    return NextResponse.json(
      { error: "Interner Serverfehler. Bitte versuche es später erneut." },
      { status: 500 }
    );
  }
}
