export type Profile = {
  id: string;
  email: string | null;
  full_name: string | null;
  license_plates: string[];
  is_admin: boolean;
  created_at: string;
  updated_at: string;
};

export type ParkingSpot = {
  id: string;
  floor: number;
  spot_number: number;
  created_at: string;
};

export type Occupancy = {
  id: string;
  spot_id: string;
  user_id: string | null;
  occupied_at: string;
  released_at: string | null;
  marked_by_admin: boolean;
  display_name: string | null;
  display_plate: string | null;
};

export type AdminSpotRow = ParkingSpot & {
  active_occupancy: (Occupancy & { profile: Profile | null }) | null;
};

export type AdminUserRow = Profile & {
  email: string | null;
  active_spot: { floor: number; spot_number: number } | null;
};

export type AdminSpotUserOption = {
  id: string;
  full_name: string | null;
  email: string | null;
  license_plates: string[];
};
