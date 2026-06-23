"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { friendlyError } from "@/lib/errors";

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  if (!profile?.is_admin) throw new Error("Sin permisos de admin");
  return supabase;
}

export async function adminReleaseSpot(spotId: string) {
  try {
    const supabase = await requireAdmin();
    const { data, error } = await supabase
      .from("occupancies")
      .update({ released_at: new Date().toISOString() })
      .eq("spot_id", spotId)
      .is("released_at", null)
      .select("id");

    if (error) return { error: friendlyError("No pudimos liberar la cochera.", error) };
    if (!data?.length) return { error: "La cochera no está ocupada" };
    revalidatePath("/spots");
    return { success: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : friendlyError() };
  }
}

export async function resetDay() {
  try {
    const supabase = await requireAdmin();
    const { data, error } = await supabase
      .from("occupancies")
      .update({ released_at: new Date().toISOString() })
      .is("released_at", null)
      .select("id");

    if (error) return { error: friendlyError("No pudimos reiniciar el día.", error) };
    revalidatePath("/spots");
    return { success: true, released: data?.length ?? 0 };
  } catch (e) {
    return { error: e instanceof Error ? e.message : friendlyError() };
  }
}

export async function upsertSpot(input: {
  id?: string;
  floor: number;
  spot_number: number;
}) {
  try {
    const supabase = await requireAdmin();
    const payload = { floor: input.floor, spot_number: input.spot_number };

    if (input.id) {
      const { error } = await supabase.from("parking_spots").update(payload).eq("id", input.id);
      if (error) return { error: friendlyError("No pudimos guardar la cochera.", error) };
    } else {
      const { error } = await supabase.from("parking_spots").insert(payload);
      if (error) return { error: friendlyError("No pudimos crear la cochera.", error) };
    }

    revalidatePath("/spots");
    return { success: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : friendlyError() };
  }
}

export async function deleteSpot(spotId: string) {
  try {
    const supabase = await requireAdmin();

    const { data: active } = await supabase
      .from("occupancies")
      .select("id")
      .eq("spot_id", spotId)
      .is("released_at", null)
      .maybeSingle();

    if (active) {
      return { error: "La cochera está ocupada" };
    }

    const { error } = await supabase.from("parking_spots").delete().eq("id", spotId);
    if (error) return { error: friendlyError("No pudimos eliminar la cochera.", error) };
    revalidatePath("/spots");
    return { success: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : friendlyError() };
  }
}

export async function updateUserProfile(
  userId: string,
  fullName: string,
  licensePlates: string[]
) {
  try {
    const supabase = await requireAdmin();
    const trimmedName = fullName.trim();
    if (!trimmedName) return { error: "Nombre requerido" };

    const plates = licensePlates.map((p) => p.trim().toUpperCase()).filter(Boolean);
    if (plates.length === 0) return { error: "Al menos una patente" };

    const { error } = await supabase
      .from("profiles")
      .update({ full_name: trimmedName, license_plates: plates })
      .eq("id", userId);

    if (error) return { error: friendlyError("No pudimos actualizar el usuario.", error) };
    revalidatePath("/users");
    revalidatePath("/spots");
    return { success: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : friendlyError() };
  }
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
}
