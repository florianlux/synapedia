import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Creates a Supabase client using the SERVICE_ROLE_KEY.
 * This bypasses RLS and should only be used in server-side API routes.
 *
 * Falls back to ANON_KEY if SERVICE_ROLE_KEY is not configured,
 * so the app still works in development/demo mode.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  const key = serviceRoleKey || anonKey;

  if (!url || !key) {
    throw new Error("Supabase URL and key must be configured.");
  }

  // Validate URL before passing to Supabase client to avoid
  // "The string did not match the expected pattern" runtime errors.
  try {
    new URL(url);
  } catch {
    throw new Error(
      `Ungültige NEXT_PUBLIC_SUPABASE_URL: "${url}" ist keine gültige URL.`,
    );
  }

  const PLACEHOLDER_PATTERNS = ["your-project", "your-supabase"];
  if (PLACEHOLDER_PATTERNS.some((p) => url.includes(p))) {
    throw new Error(
      `NEXT_PUBLIC_SUPABASE_URL enthält Platzhalter-Text ("${url}"). Bitte eine echte Supabase-URL setzen.`,
    );
  }

  if (!serviceRoleKey) {
    console.warn(
      "[createAdminClient] SUPABASE_SERVICE_ROLE_KEY not set — falling back to anon key. " +
      "RLS will NOT be bypassed. Set the key in production.",
    );
  }

  return createSupabaseClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
