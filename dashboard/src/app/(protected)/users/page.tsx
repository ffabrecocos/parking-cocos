import { createClient } from "@/lib/supabase/server";
import { AdminUsersClient } from "@/components/admin/AdminUsersClient";
import type { AdminUserRow } from "@/types/database";

async function loadUsers() {
  const supabase = await createClient();

  const { data: profiles } = await supabase
    .from("profiles")
    .select("*")
    .order("full_name");

  const { data: occupancies } = await supabase
    .from("occupancies")
    .select("user_id, spot:parking_spots(floor, spot_number)")
    .is("released_at", null);

  return (profiles ?? []).map((profile) => {
    const occ = occupancies?.find((o) => o.user_id === profile.id);
    const spot = occ?.spot as { floor: number; spot_number: number } | null;
    return {
      ...profile,
      email: profile.email ?? null,
      active_spot: spot ?? null,
    } satisfies AdminUserRow;
  });
}

export default async function UsersPage() {
  const users = await loadUsers();
  return <AdminUsersClient initialUsers={users} />;
}
