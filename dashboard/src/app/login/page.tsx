import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";
import { SignOutButton } from "@/components/auth/SignOutButton";

const employeeAppUrl =
  process.env.NEXT_PUBLIC_EMPLOYEE_APP_URL ?? "http://localhost:3000";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  let user = null;
  let isAdmin = false;

  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();

    user = authUser;

    if (authUser) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("is_admin")
        .eq("id", authUser.id)
        .single();

      isAdmin = profile?.is_admin ?? false;

      if (isAdmin) {
        redirect("/spots");
      }
    }
  }

  const showAdminError = params.error === "admin" || (user && !isAdmin);

  return (
    <div className="app app--login">
      <div className="login-page">
        <div className="login-page__hero">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/cocos-logo.png" alt="Cocos" />
          <h1>Admin Parking</h1>
          <p>Gestión de cocheras y usuarios</p>
        </div>
        <div className="login-page__sheet">
          <h2>Ingresá con tu cuenta</h2>
          <p>Solo usuarios con permisos de admin.</p>
          {showAdminError && (
            <>
              <p style={{ color: "var(--danger)", fontSize: "0.875rem", marginBottom: 12 }}>
                Tu cuenta no tiene permisos de administrador.
              </p>
              {user && <SignOutButton />}
            </>
          )}
          {params.error && params.error !== "admin" && (
            <p style={{ color: "var(--danger)", fontSize: "0.875rem", marginBottom: 12 }}>
              No pudimos iniciar sesión. Intentá de nuevo.
            </p>
          )}
          {!user && <GoogleSignInButton />}
          <p className="hint-text" style={{ marginTop: 16 }}>
            ¿Sos empleado?{" "}
            <Link href={employeeAppUrl} style={{ color: "var(--cocos-navy)", fontWeight: 700 }}>
              Ir a la app
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
