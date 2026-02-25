import { NextRequest, NextResponse } from "next/server";
import { assertAdmin } from "@/lib/admin/require-admin";

/** Metadata about an environment variable — never includes the actual value. */
interface SecretMeta {
  name: string;
  category: string;
  configured: boolean;
  hint: string;
}

/** Known environment variables the platform cares about. */
const SECRET_DEFS: { name: string; category: string; hint: string }[] = [
  { name: "NEXT_PUBLIC_SUPABASE_URL", category: "Supabase", hint: "Supabase project URL" },
  { name: "NEXT_PUBLIC_SUPABASE_ANON_KEY", category: "Supabase", hint: "Supabase anonymous key" },
  { name: "SUPABASE_SERVICE_ROLE_KEY", category: "Supabase", hint: "Server-side service-role key (bypasses RLS)" },
  { name: "ADMIN_TOKEN", category: "Auth", hint: "Shared admin authentication token" },
  { name: "OPENAI_API_KEY", category: "AI", hint: "OpenAI API key for AI features" },
  { name: "ANTHROPIC_API_KEY", category: "AI", hint: "Anthropic API key for AI features" },
  { name: "GITHUB_TOKEN", category: "GitHub", hint: "GitHub PAT for Dev-Activity feed" },
];

function isConfigured(name: string): boolean {
  const val = process.env[name];
  if (!val) return false;
  // Treat placeholder values from .env.example as not configured
  const placeholders = [
    "your-project",
    "your-anon-key",
    "your-service-role-key",
    "your-secret-admin-token",
    "sk-your-openai-key",
    "sk-ant-your-anthropic-key",
  ];
  return !placeholders.some((p) => val.includes(p));
}

export async function GET(req: NextRequest) {
  try {
    await assertAdmin(req);
  } catch (res) {
    return res as NextResponse;
  }

  const secrets: SecretMeta[] = SECRET_DEFS.map((d) => ({
    name: d.name,
    category: d.category,
    configured: isConfigured(d.name),
    hint: d.hint,
  }));

  return NextResponse.json({ secrets, checked_at: new Date().toISOString() });
}
