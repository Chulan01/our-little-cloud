import { HomeClient } from "@/components/sections/HomeClient";
import { WaitingHome } from "@/components/sections/WaitingHome";
import { getSiteAccess } from "@/lib/auth/admin";
import { requireCouple } from "@/lib/auth/guard";
import { hasSupabaseEnv } from "@/lib/env";
import { getLocalCouple } from "@/lib/local-store";
import { getLocalProfiles, isLocalAuthEnabled } from "@/lib/local-auth";
import { getAllReasonTexts, getDailyReason } from "@/lib/reasons";
import { createClient } from "@/lib/supabase/server";
import { unlockAtMs } from "@/lib/unlock";
import type { Couple, Profile } from "@/types/domain";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const reasonPool = getAllReasonTexts().map((text, index) => ({ day: index + 1, text }));
  const access = await getSiteAccess();

  if (!hasSupabaseEnv()) {
    const profiles = isLocalAuthEnabled() ? (getLocalProfiles() as Profile[]) : [];
    if (!access.canView) {
      return <WaitingHome profiles={profiles} unlockAt={unlockAtMs()} />;
    }
    return (
      <HomeClient
        couple={isLocalAuthEnabled() ? getLocalCouple() : null}
        profiles={profiles}
        dailyReason={getDailyReason()}
        reasonPool={reasonPool}
      />
    );
  }

  const { coupleId } = await requireCouple();
  const supabase = createClient();
  const [{ data: couple }, { data: profiles }] = await Promise.all([
    supabase.from("couples").select("*").eq("id", coupleId).single(),
    supabase.from("profiles").select("*").eq("couple_id", coupleId).order("created_at")
  ]);

  if (!access.canView) {
    return <WaitingHome profiles={(profiles ?? []) as Profile[]} unlockAt={unlockAtMs()} />;
  }

  return <HomeClient couple={(couple ?? null) as Couple | null} profiles={(profiles ?? []) as Profile[]} dailyReason={getDailyReason()} reasonPool={reasonPool} />;
}
