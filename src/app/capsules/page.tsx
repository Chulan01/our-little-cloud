import { CapsulesClient } from "@/components/sections/CapsulesClient";
import { LockedSurprise } from "@/components/sections/LockedSurprise";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { listCapsules } from "@/lib/actions/capsules";
import { getSiteAccess } from "@/lib/auth/admin";
import { hasSupabaseEnv } from "@/lib/env";
import { isLocalAuthEnabled } from "@/lib/local-auth";
import { unlockAtMs } from "@/lib/unlock";

export const dynamic = "force-dynamic";

export default async function CapsulesPage() {
  const access = await getSiteAccess();
  if (!access.canView) return <LockedSurprise unlockAt={unlockAtMs()} />;

  const supabaseReady = hasSupabaseEnv();
  const actionsReady = supabaseReady || isLocalAuthEnabled();
  const capsules = actionsReady ? await listCapsules() : { ok: true as const, data: [] };
  return (
    <main className="mx-auto max-w-5xl px-5 pb-28 pt-14 md:pt-20">
      <SectionHeading kicker="прочитать, когда придет время" title="Капсулы времени" description="Здесь письма умеют ждать. До выбранной даты текст никуда не уйдет и откроется только в свой день." />
      <CapsulesClient initialCapsules={capsules.ok ? capsules.data : []} supabaseReady={actionsReady} />
    </main>
  );
}
