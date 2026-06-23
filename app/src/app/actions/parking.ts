"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { friendlyError } from "@/lib/errors";

export async function claimSpot(spotId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "No autenticado" };
  }

  const { error } = await supabase.from("occupancies").insert({
    spot_id: spotId,
    user_id: user.id,
  });

  if (error) {
    return { error: friendlyError("No pudimos reservar la cochera. Intentá de nuevo.", error) };
  }

  revalidatePath("/");
  return { success: true };
}

export async function releaseSpot(spotId?: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "No autenticado" };
  }

  let query = supabase
    .from("occupancies")
    .update({ released_at: new Date().toISOString() })
    .eq("user_id", user.id)
    .is("released_at", null);

  if (spotId) {
    query = query.eq("spot_id", spotId);
  }

  const { data, error } = await query.select("id");

  if (error) {
    return { error: friendlyError("No pudimos liberar la cochera. Intentá de nuevo.", error) };
  }

  if (!data?.length) {
    return { error: "No tenés una cochera activa para liberar." };
  }

  revalidatePath("/");
  return { success: true };
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
}
