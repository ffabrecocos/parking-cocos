import { type NextRequest } from "next/server";
import { handleAuthCallback } from "@/lib/supabase/callback";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  return handleAuthCallback(request, "/spots");
}
