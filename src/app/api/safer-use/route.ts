import { NextRequest, NextResponse } from "next/server";
import { runSaferUseChat } from "@/lib/ai/safer-use";
import type { SaferUseChatRequest } from "@/lib/types";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as SaferUseChatRequest;

    // Basic validation
    if (!body.user_profile || !body.intake_log || !body.user_message) {
      return NextResponse.json(
        { error: "Unvollständige Anfrage. user_profile, intake_log und user_message sind erforderlich." },
        { status: 400 }
      );
    }

    const response = await runSaferUseChat(body);
    return NextResponse.json(response);
  } catch {
    return NextResponse.json(
      { error: "Interner Serverfehler. Bitte versuche es später erneut." },
      { status: 500 }
    );
  }
}
