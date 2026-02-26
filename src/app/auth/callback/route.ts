import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/account";

  if (code) {
    const response = NextResponse.redirect(`${origin}${next}`);

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              response.cookies.set(name, value, options);
            });
          },
        },
      }
    );

    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      return NextResponse.redirect(`${origin}/auth/login`);
    }

    // For OAuth users: check if profile has a username set.
    // The handle_new_user trigger creates the profile row automatically,
    // but OAuth users won't have a username in metadata.
    // Only redirect to onboarding if profile exists but username is null.
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase
        .from("user_profiles")
        .select("username")
        .eq("id", user.id)
        .maybeSingle();

      if (profile && !profile.username) {
        // Reuse the existing response so that auth cookies set by
        // exchangeCodeForSession are preserved during onboarding redirect.
        response.headers.set("Location", `${origin}/onboarding`);
        return response;
      }
    }

    return response;
  }

  return NextResponse.redirect(`${origin}/auth/login`);
}
