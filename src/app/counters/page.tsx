import { CountersClient } from "@/components/sections/CountersClient";
import { LockedSurprise } from "@/components/sections/LockedSurprise";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { listCounters } from "@/lib/actions/counters";
import { getSiteAccess } from "@/lib/auth/admin";
import { hasSupabaseEnv } from "@/lib/env";
import { isLocalAuthEnabled } from "@/lib/local-auth";
import { unlockAtMs } from "@/lib/unlock";

export const dynamic = "force-dynamic";

export default async function CountersPage() {
  const access = await getSiteAccess();
  if (!access.canView) return <LockedSurprise unlockAt={unlockAtMs()} />;

  const supabaseReady = hasSupabaseEnv();
  const actionsReady = supabaseReady || isLocalAuthEnabled();
  const counters = actionsReady ? await listCounters() : { ok: true as const, data: [] };

  return (
    <main className="mx-auto max-w-5xl px-5 pb-28 pt-14 md:pt-20">
      <SectionHeading kicker="маленькая математика любви" title="Счетчик нашей любви" />
      <CountersClient initialCounters={counters.ok ? counters.data : []} supabaseReady={actionsReady} />
    </main>
  );
}
