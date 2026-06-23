"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { applyQueuedActions } from "@/lib/parking/optimistic";
import {
  enqueueAction,
  readQueue,
  type PendingParkingAction,
  type ParkingActionType,
} from "@/lib/parking/queue";
import { saveSnapshot } from "@/lib/parking/snapshot";
import { flushParkingQueue } from "@/lib/parking/sync";
import type { Profile, SpotWithOccupancy } from "@/types/database";

const RETRY_MS = 15_000;

export function useParkingOffline({
  userId,
  profile,
  spots,
  mySpot,
}: {
  userId: string;
  profile: Profile;
  spots: SpotWithOccupancy[];
  mySpot: SpotWithOccupancy | null;
}) {
  const router = useRouter();
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== "undefined" ? navigator.onLine : true
  );
  const [queue, setQueue] = useState<PendingParkingAction[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  useEffect(() => {
    setQueue(readQueue(userId));
  }, [userId]);

  useEffect(() => {
    saveSnapshot(userId, { profile, spots, mySpot });
  }, [userId, profile, spots, mySpot]);

  useEffect(() => {
    function handleOnline() {
      setIsOnline(true);
    }
    function handleOffline() {
      setIsOnline(false);
    }

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const syncQueue = useCallback(async () => {
    if (!navigator.onLine || readQueue(userId).length === 0) {
      return { failure: null as Awaited<ReturnType<typeof flushParkingQueue>>["failure"] };
    }

    setIsSyncing(true);
    try {
      const supabase = createClient();
      const { queue: nextQueue, failure } = await flushParkingQueue(supabase, userId);
      setQueue(nextQueue);

      if (failure) {
        setSyncError(failure.message);
        if (failure.status === "conflict") {
          router.refresh();
        }
        return { failure };
      }

      setSyncError(null);
      if (nextQueue.length === 0) {
        router.refresh();
      }
      return { failure: null };
    } finally {
      setIsSyncing(false);
    }
  }, [router, userId]);

  useEffect(() => {
    if (!isOnline || queue.length === 0) return;
    void syncQueue();
  }, [isOnline, queue.length, syncQueue]);

  useEffect(() => {
    if (queue.length === 0) return;

    const id = window.setInterval(() => {
      if (navigator.onLine) void syncQueue();
    }, RETRY_MS);

    return () => window.clearInterval(id);
  }, [queue.length, syncQueue]);

  const { spots: displaySpots, mySpot: displayMySpot } = useMemo(
    () => applyQueuedActions(spots, mySpot, queue, userId, profile),
    [spots, mySpot, queue, userId, profile]
  );

  const queueAction = useCallback(
    async (type: ParkingActionType, spotId: string) => {
      setSyncError(null);
      const nextQueue = enqueueAction(userId, { type, spotId });
      setQueue(nextQueue);

      if (!navigator.onLine) {
        return { offline: true as const, failure: null };
      }

      const { failure } = await syncQueue();
      return { offline: false as const, failure };
    },
    [syncQueue, userId]
  );

  const hasPending = queue.length > 0;

  return {
    isOnline,
    isSyncing,
    hasPending,
    syncError,
    displaySpots,
    displayMySpot,
    queueAction,
    syncQueue,
  };
}
