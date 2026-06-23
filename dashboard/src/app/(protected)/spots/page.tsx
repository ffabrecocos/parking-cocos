import { createClient } from "@/lib/supabase/server";
import { AdminSpotsClient } from "@/components/admin/AdminSpotsClient";
import type { AdminSpotRow, Profile } from "@/types/database";

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
            profile: (occ.profile as Profile | null) ?? null,
          }
        : null,
    } satisfies AdminSpotRow;
  });
}

export default async function SpotsPage() {
  const spots = await loadSpots();
  return <AdminSpotsClient initialSpots={spots} />;
}
