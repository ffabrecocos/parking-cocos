export type ParkingActionType = "claim" | "release";

export type PendingParkingAction = {
  id: string;
  type: ParkingActionType;
  spotId: string;
  createdAt: string;
};

const queueKey = (userId: string) => `cocos-parking-queue:${userId}`;

export function readQueue(userId: string): PendingParkingAction[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(queueKey(userId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as PendingParkingAction[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function writeQueue(userId: string, queue: PendingParkingAction[]) {
  localStorage.setItem(queueKey(userId), JSON.stringify(queue));
}

export function enqueueAction(
  userId: string,
  action: Omit<PendingParkingAction, "id" | "createdAt">
): PendingParkingAction[] {
  const entry: PendingParkingAction = {
    ...action,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  };
  const next = [...readQueue(userId), entry];
  writeQueue(userId, next);
  return next;
}

export function clearQueue(userId: string) {
  localStorage.removeItem(queueKey(userId));
}
