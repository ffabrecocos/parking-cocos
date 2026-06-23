"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function claimSpot(spotId: string) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("claim_spot", { p_spot_id: spotId });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/");
  return { success: true };
}

export async function releaseSpot(spotId?: string) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("release_spot", {
    p_spot_id: spotId ?? null,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/");
  return { success: true };
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
}
