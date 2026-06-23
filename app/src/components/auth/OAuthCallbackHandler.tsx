"use client";

import { Suspense, useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

function OAuthCallbackHandlerInner() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    const code = searchParams.get("code");
    if (!code || pathname === "/auth/callback") {
      return;
    }

    const next = searchParams.get("next") ?? "/";
    const supabase = createClient();

    supabase.auth.exchangeCodeForSession(code).then(({ error }) => {
      if (error) {
        const params = new URLSearchParams({ code, next });
        window.location.replace(`/auth/callback?${params.toString()}`);
        return;
      }

      router.replace(next);
    });
  }, [pathname, searchParams, router]);

  return null;
}

export function OAuthCallbackHandler() {
  return (
    <Suspense fallback={null}>
      <OAuthCallbackHandlerInner />
    </Suspense>
  );
}
