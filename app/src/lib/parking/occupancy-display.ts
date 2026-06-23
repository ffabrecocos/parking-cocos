import type { Profile } from "@/types/database";

export const ADMIN_OCCUPANCY_LABEL = "Marcada por admin";

export type OccupancyDisplayFields = {
  marked_by_admin: boolean;
  display_name: string | null;
  display_plate: string | null;
  profile?: Profile | null;
};

export function occupancyDisplayName(occ: OccupancyDisplayFields): string {
  const custom = occ.display_name?.trim();
  if (custom) return custom;
  const profileName = occ.profile?.full_name?.trim();
  if (profileName) return profileName;
  if (occ.marked_by_admin) return ADMIN_OCCUPANCY_LABEL;
  return "Ocupada";
}

export function occupancyDisplayPlate(occ: OccupancyDisplayFields): string {
  const custom = occ.display_plate?.trim();
  if (custom) return custom.toUpperCase();
  return occ.profile?.license_plates?.[0] ?? "—";
}
