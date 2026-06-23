import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

function redirectOAuthCode(request: NextRequest, defaultNext = "/spots") {
  const code = request.nextUrl.searchParams.get("code");
  if (!code || request.nextUrl.pathname === "/auth/callback") {
    return null;
  }

  const callback = request.nextUrl.clone();
  callback.pathname = "/auth/callback";
  if (!callback.searchParams.has("next")) {
    const path = request.nextUrl.pathname;
    callback.searchParams.set("next", path === "/" ? defaultNext : path);
  }
  return NextResponse.redirect(callback);
}

export async function proxy(request: NextRequest) {
  const oauthRedirect = redirectOAuthCode(request, "/spots");
  if (oauthRedirect) {
    return oauthRedirect;
  }

  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  ) {
    return NextResponse.next({ request });
  }

  return updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
