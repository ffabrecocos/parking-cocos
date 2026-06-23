import { redirect } from "next/navigation";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; code?: string }>;
}) {
  const params = await searchParams;

  if (params.code) {
    redirect(
      `/auth/callback?code=${encodeURIComponent(params.code)}&next=${encodeURIComponent("/")}`
    );
  }

  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      redirect("/");
    }
  }

  return (
    <div className="app app--login">
      <div className="login-page">
        <div className="login-page__hero">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/cocos-logo.png" alt="Cocos" />
          <h1>Cocos Parking</h1>
          <p>Reservá tu cochera al llegar a la oficina</p>
        </div>
        <div className="login-page__sheet">
          <h2>Ingresá con tu cuenta</h2>
          <p>Usá tu cuenta de Google para continuar.</p>
          {params.error && (
            <p style={{ color: "var(--danger)", fontSize: "0.875rem", marginBottom: 12 }}>
              No pudimos iniciar sesión. Intentá de nuevo.
            </p>
          )}
          <GoogleSignInButton />
        </div>
      </div>
    </div>
  );
}
