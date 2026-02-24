/**
 * Check if Supabase is configured (env vars are set and not placeholder values).
 */
export function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return !!(
    url &&
    key &&
    !url.includes("your-project") &&
    key !== "your-anon-key"
  );
}
