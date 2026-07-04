import { MemoriesClient } from "@/components/sections/MemoriesClient";
import { LockedSurprise } from "@/components/sections/LockedSurprise";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { listMemories } from "@/lib/actions/memories";
import { getSiteAccess } from "@/lib/auth/admin";
import { hasSupabaseEnv } from "@/lib/env";
import { isLocalAuthEnabled } from "@/lib/local-auth";
import { unlockAtMs } from "@/lib/unlock";

export const dynamic = "force-dynamic";

export default async function MemoriesPage() {
  const access = await getSiteAccess();
  if (!access.canView) return <LockedSurprise unlockAt={unlockAtMs()} />;

  const supabaseReady = hasSupabaseEnv();
  const actionsReady = supabaseReady || isLocalAuthEnabled();
  const memories = actionsReady ? await listMemories() : { ok: true as const, data: [] };

  return (
    <main className="mx-auto max-w-5xl px-5 pb-28 pt-14 md:pt-20">
      <SectionHeading
        kicker="бережно сохранено"
        title="Комната воспоминаний"
        description="Истории, к которым можно возвращаться в дни, когда хочется снова почувствовать тот самый момент."
      />
      <MemoriesClient initialMemories={memories.ok ? memories.data : []} supabaseReady={actionsReady} photoUploadReady={supabaseReady} />
    </main>
  );
}
