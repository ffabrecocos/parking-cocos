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

export async function adminMarkSpot(input: {
  spotId: string;
  userId?: string | null;
  displayName?: string;
  displayPlate?: string;
}) {
  try {
    const supabase = await requireAdmin();

    const { data: active } = await supabase
      .from("occupancies")
      .select("id")
      .eq("spot_id", input.spotId)
      .is("released_at", null)
      .maybeSingle();

    if (active) return { error: "La cochera ya está ocupada" };

    const userId = input.userId || null;
    const displayName = input.displayName?.trim() || null;
    const displayPlate = input.displayPlate?.trim().toUpperCase() || null;

    if (userId) {
      const { data: userOcc } = await supabase
        .from("occupancies")
        .select("id")
        .eq("user_id", userId)
        .is("released_at", null)
        .maybeSingle();

      if (userOcc) {
        return { error: "Ese usuario ya tiene una cochera activa" };
      }
    }

    const { error } = await supabase.from("occupancies").insert({
      spot_id: input.spotId,
      user_id: userId,
      marked_by_admin: true,
      display_name: displayName,
      display_plate: displayPlate,
    });

    if (error) return { error: friendlyError("No pudimos marcar la cochera.", error) };
    revalidatePath("/spots");
    return { success: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : friendlyError() };
  }
}

export async function adminUpdateOccupancy(input: {
  spotId: string;
  userId?: string | null;
  displayName?: string;
  displayPlate?: string;
}) {
  try {
    const supabase = await requireAdmin();

    const { data: occ } = await supabase
      .from("occupancies")
      .select("id, user_id, marked_by_admin")
      .eq("spot_id", input.spotId)
      .is("released_at", null)
      .maybeSingle();

    if (!occ) return { error: "La cochera no está ocupada" };
    if (!occ.marked_by_admin) {
      return { error: "Solo podés editar ocupaciones marcadas por admin" };
    }

    const userId = input.userId || null;
    const displayName = input.displayName?.trim() || null;
    const displayPlate = input.displayPlate?.trim().toUpperCase() || null;

    if (userId && userId !== occ.user_id) {
      const { data: userOcc } = await supabase
        .from("occupancies")
        .select("id")
        .eq("user_id", userId)
        .is("released_at", null)
        .maybeSingle();

      if (userOcc) {
        return { error: "Ese usuario ya tiene una cochera activa" };
      }
    }

    const { error } = await supabase
      .from("occupancies")
      .update({
        user_id: userId,
        display_name: displayName,
        display_plate: displayPlate,
      })
      .eq("id", occ.id);

    if (error) return { error: friendlyError("No pudimos actualizar la ocupación.", error) };
    revalidatePath("/spots");
    return { success: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : friendlyError() };
  }
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
