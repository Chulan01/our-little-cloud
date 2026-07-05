import { HomeClient } from "@/components/sections/HomeClient";
import { getSiteAccess } from "@/lib/auth/admin";
import { requireCouple } from "@/lib/auth/guard";
import { hasSupabaseEnv } from "@/lib/env";
import { getLocalCouple } from "@/lib/local-store";
import { getLocalProfiles, isLocalAuthEnabled } from "@/lib/local-auth";
import { getAllReasonTexts, getDailyReason } from "@/lib/reasons";
import { createClient } from "@/lib/supabase/server";
import type { Couple, Profile } from "@/types/domain";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const reasonPool = getAllReasonTexts().map((text, index) => ({ day: index + 1, text }));
  const access = await getSiteAccess();

  if (!hasSupabaseEnv()) {
    const profiles = isLocalAuthEnabled() ? (getLocalProfiles() as Profile[]) : [];
    return (
      <HomeClient
        couple={isLocalAuthEnabled() ? getLocalCouple() : null}
        profiles={profiles}
        dailyReason={getDailyReason()}
        reasonPool={reasonPool}
        canViewAll={access.canView}
      />
    );
  }

  const { coupleId } = await requireCouple();
  const supabase = createClient();
  const [{ data: couple }, { data: profiles }] = await Promise.all([
    supabase.from("couples").select("*").eq("id", coupleId).single(),
    supabase.from("profiles").select("*").eq("couple_id", coupleId).order("created_at")
  ]);

  return <HomeClient couple={(couple ?? null) as Couple | null} profiles={(profiles ?? []) as Profile[]} dailyReason={getDailyReason()} reasonPool={reasonPool} canViewAll={access.canView} />;
}
