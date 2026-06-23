import type { Profile, SpotWithOccupancy } from "@/types/database";

export type ParkingSnapshot = {
  profile: Profile;
  spots: SpotWithOccupancy[];
  mySpot: SpotWithOccupancy | null;
  savedAt: string;
};

const snapshotKey = (userId: string) => `cocos-parking-snapshot:${userId}`;

export function saveSnapshot(userId: string, snapshot: Omit<ParkingSnapshot, "savedAt">) {
  const data: ParkingSnapshot = { ...snapshot, savedAt: new Date().toISOString() };
  localStorage.setItem(snapshotKey(userId), JSON.stringify(data));
}

export function readSnapshot(userId: string): ParkingSnapshot | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(snapshotKey(userId));
    if (!raw) return null;
    return JSON.parse(raw) as ParkingSnapshot;
  } catch {
    return null;
  }
}
