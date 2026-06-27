import { CountersClient } from "@/components/sections/CountersClient";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { listCounters } from "@/lib/actions/counters";
import { hasSupabaseEnv } from "@/lib/env";
import { isLocalAuthEnabled } from "@/lib/local-auth";

export const dynamic = "force-dynamic";

export default async function CountersPage() {
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
