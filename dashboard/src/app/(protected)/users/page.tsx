import { createClient } from "@/lib/supabase/server";
import { AdminUsersClient } from "@/components/admin/AdminUsersClient";
import type { AdminUserRow } from "@/types/database";

type SpotSummary = { floor: number; spot_number: number };

function parseSpotRelation(spot: unknown): SpotSummary | null {
  if (!spot || typeof spot !== "object") return null;
  if (Array.isArray(spot)) {
    const first = spot[0];
    if (!first || typeof first !== "object") return null;
    return first as SpotSummary;
  }
  return spot as SpotSummary;
}

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
    return {
      ...profile,
      email: profile.email ?? null,
      active_spot: parseSpotRelation(occ?.spot),
    } satisfies AdminUserRow;
  });
}

export default async function UsersPage() {
  const users = await loadUsers();
  return <AdminUsersClient initialUsers={users} />;
}
