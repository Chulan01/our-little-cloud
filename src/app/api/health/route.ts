import { NextResponse } from "next/server";
import { hasSupabaseEnv, isLocalStoreDisabled } from "@/lib/env";

export const dynamic = "force-dynamic";

/**
 * Lightweight health endpoint — used by uptime checks / load balancers.
 * Returns 200 with current mode so the operator can confirm env wiring.
 */
export async function GET() {
  return NextResponse.json(
    {
      status: "ok",
      timestamp: new Date().toISOString(),
      supabase: hasSupabaseEnv(),
      localStoreDisabled: isLocalStoreDisabled()
    },
    {
      headers: {
        "Cache-Control": "no-store"
      }
    }
  );
}
