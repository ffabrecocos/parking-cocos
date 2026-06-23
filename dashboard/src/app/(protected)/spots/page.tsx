import { createClient } from "@/lib/supabase/server";
import { AdminSpotsClient } from "@/components/admin/AdminSpotsClient";
import type { AdminSpotRow, AdminSpotUserOption, Profile } from "@/types/database";

async function loadSpots() {
  const supabase = await createClient();

  const { data: spots } = await supabase
    .from("parking_spots")
    .select("*")
    .order("floor")
    .order("spot_number");

  const { data: occupancies } = await supabase
    .from("occupancies")
    .select("*, profile:profiles(*)")
    .is("released_at", null);

  return (spots ?? []).map((spot) => {
    const occ = occupancies?.find((o) => o.spot_id === spot.id);
    return {
      ...spot,
      active_occupancy: occ
        ? {
            id: occ.id,
            spot_id: occ.spot_id,
            user_id: occ.user_id,
            occupied_at: occ.occupied_at,
            released_at: occ.released_at,
            marked_by_admin: occ.marked_by_admin ?? false,
            display_name: occ.display_name,
            display_plate: occ.display_plate,
            profile: (occ.profile as Profile | null) ?? null,
          }
        : null,
    } satisfies AdminSpotRow;
  });
}

async function loadUsers(): Promise<AdminSpotUserOption[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("id, full_name, email, license_plates")
    .order("full_name");

  return (data ?? []).map((u) => ({
    id: u.id,
    full_name: u.full_name,
    email: u.email,
    license_plates: u.license_plates ?? [],
  }));
}

export default async function SpotsPage() {
  const [spots, users] = await Promise.all([loadSpots(), loadUsers()]);
  return <AdminSpotsClient initialSpots={spots} users={users} />;
}
