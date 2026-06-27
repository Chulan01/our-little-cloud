import { ReasonsClient } from "@/components/sections/ReasonsClient";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { listReasons } from "@/lib/actions/reasons";
import { hasSupabaseEnv } from "@/lib/env";
import { isLocalAuthEnabled } from "@/lib/local-auth";

export const dynamic = "force-dynamic";

export default async function ReasonsPage() {
  const supabaseReady = hasSupabaseEnv();
  const actionsReady = supabaseReady || isLocalAuthEnabled();
  const reasons = actionsReady ? await listReasons() : { ok: true as const, data: [] };
  return (
    <main className="mx-auto max-w-4xl px-5 pb-28 pt-14 md:pt-20">
      <SectionHeading kicker="по одной нежности за раз" title="365 причин, почему я тебя люблю" />
      <ReasonsClient initialReasons={reasons.ok ? reasons.data : []} supabaseReady={actionsReady} />
    </main>
  );
}
