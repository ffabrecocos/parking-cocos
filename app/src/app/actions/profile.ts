"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function updateProfile(fullName: string, licensePlates: string[]) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "No autenticado" };
  }

  const trimmedName = fullName.trim();
  if (!trimmedName) {
    return { error: "Ingresá tu nombre" };
  }

  const plates = licensePlates
    .map((p) => p.trim().toUpperCase())
    .filter(Boolean);

  if (plates.length === 0) {
    return { error: "Agregá al menos una patente" };
  }

  const { error } = await supabase
    .from("profiles")
    .update({ full_name: trimmedName, license_plates: plates })
    .eq("id", user.id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/");
  revalidatePath("/onboarding");
  return { success: true };
}
