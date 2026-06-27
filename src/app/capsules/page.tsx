import { CapsulesClient } from "@/components/sections/CapsulesClient";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { listCapsules } from "@/lib/actions/capsules";
import { hasSupabaseEnv } from "@/lib/env";
import { isLocalAuthEnabled } from "@/lib/local-auth";

export const dynamic = "force-dynamic";

export default async function CapsulesPage() {
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
