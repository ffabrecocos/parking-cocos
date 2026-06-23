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
  user_id: string;
  occupied_at: string;
  released_at: string | null;
};

export type SpotWithOccupancy = ParkingSpot & {
  active_occupancy: (Occupancy & { profile: Profile | null }) | null;
};
