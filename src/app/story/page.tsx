import { LockedSurprise } from "@/components/sections/LockedSurprise";
import { StoryClient } from "@/components/sections/StoryClient";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { listStoryEvents } from "@/lib/actions/story";
import { getSiteAccess } from "@/lib/auth/admin";
import { hasSupabaseEnv } from "@/lib/env";
import { isLocalAuthEnabled } from "@/lib/local-auth";
import { unlockAtMs } from "@/lib/unlock";

export const dynamic = "force-dynamic";

export default async function StoryPage() {
  const access = await getSiteAccess();
  if (!access.canView) {
    return <LockedSurprise unlockAt={unlockAtMs()} />;
  }

  const actionsReady = hasSupabaseEnv() || isLocalAuthEnabled();
  const events = actionsReady ? await listStoryEvents() : { ok: true as const, data: [] };

  return (
    <main className="mx-auto max-w-4xl px-5 pb-28 pt-14 md:pt-20">
      <SectionHeading
        kicker="месяц, который всё изменил"
        title="Наша история"
        description="Хронология вашего первого месяца — от первого сообщения до этого самого дня."
      />
      <StoryClient events={events.ok ? events.data : []} />
    </main>
  );
}
