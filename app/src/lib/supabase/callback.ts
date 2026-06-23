import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function handleAuthCallback(request: NextRequest, defaultNext: string) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  let next = searchParams.get("next") ?? defaultNext;

  if (!next.startsWith("/")) {
    next = defaultNext;
  }

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=auth`);
  }

  const redirectTo = `${origin}${next}`;
  const response = NextResponse.redirect(redirectTo);

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(`${origin}/login?error=auth`);
  }

  return response;
}
