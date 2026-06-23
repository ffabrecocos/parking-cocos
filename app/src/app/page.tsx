import { redirect } from "next/navigation";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { ParkingView } from "@/components/parking/ParkingView";
import type { Profile, SpotWithOccupancy } from "@/types/database";

async function loadParkingData(userId: string) {
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();

  if (!profile?.full_name?.trim()) {
    return { redirect: "/onboarding" as const };
  }

  const { data: spots } = await supabase
    .from("parking_spots")
    .select("*")
    .order("floor")
    .order("spot_number");

  const { data: occupancies } = await supabase
    .from("occupancies")
    .select("*, profile:profiles(*)")
    .is("released_at", null);

  const spotsWithOcc: SpotWithOccupancy[] = (spots ?? []).map((spot) => {
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
    };
  });

  const mySpot =
    spotsWithOcc.find((s) => s.active_occupancy?.user_id === userId) ?? null;

  return {
    profile: profile as Profile,
    spots: spotsWithOcc,
    mySpot,
  };
}

export default async function HomePage() {
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

  const data = await loadParkingData(user.id);

  if ("redirect" in data) {
    redirect("/onboarding");
  }

  return (
    <div className="app">
      <ParkingView
        userId={user.id}
        profile={data.profile}
        spots={data.spots}
        mySpot={data.mySpot}
      />
    </div>
  );
}
