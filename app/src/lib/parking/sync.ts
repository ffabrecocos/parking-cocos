import type { SupabaseClient } from "@supabase/supabase-js";
import type { PendingParkingAction } from "@/lib/parking/queue";
import { readQueue, writeQueue } from "@/lib/parking/queue";

export type SyncResult =
  | { status: "ok" }
  | { status: "conflict"; message: string }
  | { status: "error"; message: string };

async function executeClaim(
  supabase: SupabaseClient,
  spotId: string,
  userId: string
): Promise<SyncResult> {
  const { error } = await supabase.from("occupancies").insert({
    spot_id: spotId,
    user_id: userId,
  });

  if (!error) return { status: "ok" };
  if (error.code === "23505") {
    return {
      status: "conflict",
      message: "Alguien ocupó esa cochera antes. Elegí otra.",
    };
  }
  return { status: "error", message: "No pudimos reservar la cochera. Intentá de nuevo." };
}

async function executeRelease(
  supabase: SupabaseClient,
  spotId: string,
  userId: string
): Promise<SyncResult> {
  const { data, error } = await supabase
    .from("occupancies")
    .update({ released_at: new Date().toISOString() })
    .eq("user_id", userId)
    .eq("spot_id", spotId)
    .is("released_at", null)
    .select("id");

  if (error) {
    return { status: "error", message: "No pudimos liberar la cochera. Intentá de nuevo." };
  }
  if (!data?.length) {
    return { status: "ok" };
  }
  return { status: "ok" };
}

export async function flushParkingQueue(
  supabase: SupabaseClient,
  userId: string
): Promise<{ queue: PendingParkingAction[]; failure: SyncResult | null }> {
  const queue = readQueue(userId);
  if (queue.length === 0) {
    return { queue, failure: null };
  }

  const remaining: PendingParkingAction[] = [];

  for (const action of queue) {
    const result =
      action.type === "claim"
        ? await executeClaim(supabase, action.spotId, userId)
        : await executeRelease(supabase, action.spotId, userId);

    if (result.status === "ok") continue;

    if (result.status === "conflict") {
      writeQueue(userId, []);
      return { queue: [], failure: result };
    }

    const rest = queue.slice(queue.indexOf(action) + 1);
    remaining.push(action, ...rest);
    writeQueue(userId, remaining);
    return { queue: remaining, failure: result };
  }

  writeQueue(userId, []);
  return { queue: [], failure: null };
}
