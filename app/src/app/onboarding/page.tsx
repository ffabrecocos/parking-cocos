import { redirect } from "next/navigation";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { OnboardingForm } from "@/components/onboarding/OnboardingForm";

export default async function OnboardingPage() {
  if (!isSupabaseConfigured()) {
    redirect("/login");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, license_plates")
    .eq("id", user.id)
    .single();

  if (profile?.full_name?.trim()) {
    redirect("/");
  }

  return (
    <div className="app">
      <header className="parking-header">
        <div className="parking-header__bar parking-header__bar--center-logo">
          <div className="parking-header__slot" />
          <div className="parking-header__logo-wrap">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/cocos-logo.png" alt="Cocos" className="parking-header__logo" />
          </div>
          <div className="parking-header__slot" />
        </div>
        <h1 className="parking-header__heading">Tu perfil</h1>
        <p className="parking-header__sub">Completá tus datos para usar las cocheras</p>
      </header>

      <main className="parking-body">
        <div className="info-card">
          <div className="info-card__icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 16v-4M12 8h.01" />
            </svg>
          </div>
          <p>
            Tu nombre y patentes se muestran cuando ocupás una cochera. Podés agregar
            más de una patente.
          </p>
        </div>
        <OnboardingForm
          initialName={profile?.full_name ?? ""}
          initialPlates={profile?.license_plates ?? []}
        />
      </main>
    </div>
  );
}
