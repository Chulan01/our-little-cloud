import { ReasonsClient } from "@/components/sections/ReasonsClient";
import { LockedSurprise } from "@/components/sections/LockedSurprise";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { listReasons } from "@/lib/actions/reasons";
import { getSiteAccess } from "@/lib/auth/admin";
import { requireCouple } from "@/lib/auth/guard";
import { unlockAtMs } from "@/lib/unlock";
import { hasSupabaseEnv } from "@/lib/env";
import { isLocalAuthEnabled } from "@/lib/local-auth";
import { getLocalCouple } from "@/lib/local-store";
import { getAllReasonTexts } from "@/lib/reasons";
import { createClient } from "@/lib/supabase/server";
import { daysBetween } from "@/lib/utils";
import type { Couple } from "@/types/domain";

export const dynamic = "force-dynamic";

const CASCADE_CHUNK_SIZE = 30;
const MAX_CASCADE_DAYS = 365;

/**
 * For an N×30-day milestone (day 30, 60, 90, …, 360) surface the next 30
 * reasons from the canonical 365. Day 30 → #1–30, day 60 → #31–60, …
 * Reads come straight from `reasons.txt` so we always have a full chunk
 * even if the couple has deleted some in their couple-local list.
 */
function buildMilestoneChunk(daysTogether: number, allTexts: string[]): { number: number; text: string }[] {
  const end = Math.min(daysTogether, allTexts.length);
  const start = Math.max(0, end - CASCADE_CHUNK_SIZE);
  return allTexts.slice(start, end).map((text, offset) => ({ number: start + offset + 1, text }));
}

export default async function ReasonsPage() {
  const access = await getSiteAccess();
  if (!access.canView) return <LockedSurprise unlockAt={unlockAtMs()} />;

  const supabaseReady = hasSupabaseEnv();
  const actionsReady = supabaseReady || isLocalAuthEnabled();
  const reasons = actionsReady ? await listReasons() : { ok: true as const, data: [] };

  let couple: Couple | null = null;
  if (supabaseReady) {
    const { coupleId } = await requireCouple();
    const supabase = createClient();
    const { data: coupleRow } = await supabase.from("couples").select("*").eq("id", coupleId).single();
    couple = (coupleRow ?? null) as Couple | null;
  } else if (isLocalAuthEnabled()) {
    couple = getLocalCouple();
  }

  // Milestone rule: every N×30 days, where N ∈ [1..12]. A 1-day bump on the
  // home counter from 29 → 30 is the trigger. Reads from `couple.anniversary_date`
  // (Supabase or local-mode couple).
  const days = couple?.anniversary_date ? daysBetween(couple.anniversary_date) : 0;
  const isMilestone = days > 0 && days % 30 === 0 && days <= MAX_CASCADE_DAYS;
  const milestoneMonths = isMilestone ? Math.min(12, Math.floor(days / 30)) : 0;
  const milestoneItems = isMilestone ? buildMilestoneChunk(days, getAllReasonTexts()) : [];

  return (
    <main className="mx-auto max-w-4xl px-5 pb-28 pt-14 md:pt-20">
      <SectionHeading kicker="по одной нежности за раз" title="365 причин, почему я тебя люблю" />
      <ReasonsClient
        initialReasons={reasons.ok ? reasons.data : []}
        supabaseReady={actionsReady}
        days={days}
        isMilestone={isMilestone}
        milestoneItems={milestoneItems}
        milestoneMonths={milestoneMonths}
      />
    </main>
  );
}
