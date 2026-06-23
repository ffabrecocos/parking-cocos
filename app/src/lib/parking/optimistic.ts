import type { PendingParkingAction } from "@/lib/parking/queue";
import type { Profile, SpotWithOccupancy } from "@/types/database";

export function applyQueuedActions(
  spots: SpotWithOccupancy[],
  mySpot: SpotWithOccupancy | null,
  queue: PendingParkingAction[],
  userId: string,
  profile: Profile
): { spots: SpotWithOccupancy[]; mySpot: SpotWithOccupancy | null } {
  let nextSpots = spots;
  let nextMySpot = mySpot;

  for (const action of queue) {
    if (action.type === "claim") {
      const spot = nextSpots.find((s) => s.id === action.spotId);
      if (!spot) continue;

      if (nextMySpot) {
        nextSpots = nextSpots.map((s) =>
          s.id === nextMySpot!.id ? { ...s, active_occupancy: null } : s
        );
      }

      nextSpots = nextSpots.map((s) =>
        s.id === action.spotId
          ? {
              ...s,
              active_occupancy: {
                id: `pending-${action.id}`,
                spot_id: action.spotId,
                user_id: userId,
                occupied_at: action.createdAt,
                released_at: null,
                profile,
              },
            }
          : s
      );
      nextMySpot = nextSpots.find((s) => s.id === action.spotId) ?? null;
    }

    if (action.type === "release") {
      nextSpots = nextSpots.map((s) =>
        s.id === action.spotId ? { ...s, active_occupancy: null } : s
      );
      if (nextMySpot?.id === action.spotId) {
        nextMySpot = null;
      }
    }
  }

  return { spots: nextSpots, mySpot: nextMySpot };
}
