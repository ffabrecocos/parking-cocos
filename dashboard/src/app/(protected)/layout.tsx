import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { AdminNav } from "@/components/admin/AdminNav";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
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
    .select("is_admin, full_name")
    .eq("id", user.id)
    .single();

  if (!profile?.is_admin) {
    redirect("/login?error=admin");
  }

  return (
    <div className="app app--admin">
      <header className="parking-header">
        <div className="parking-header__bar parking-header__bar--center-logo">
          <div className="parking-header__slot" />
          <div className="parking-header__logo-wrap">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/cocos-logo.png" alt="Cocos" className="parking-header__logo" />
          </div>
          <div className="parking-header__slot" />
        </div>
        <h1 className="parking-header__heading">Admin</h1>
        <p className="parking-header__sub">{profile.full_name ?? user.email}</p>
      </header>
      <main className="parking-body parking-body--admin">
        <AdminNav />
        {children}
      </main>
    </div>
  );
}
