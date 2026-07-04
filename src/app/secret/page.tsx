import { SecretClient } from "@/components/sections/SecretClient";
import { LockedSurprise } from "@/components/sections/LockedSurprise";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { listMessages } from "@/lib/actions/messages";
import { getSiteAccess } from "@/lib/auth/admin";
import { requireCouple } from "@/lib/auth/guard";
import { unlockAtMs } from "@/lib/unlock";
import { hasSupabaseEnv } from "@/lib/env";
import { getLocalCurrentUser, getLocalPartner } from "@/lib/local-store";
import { isLocalAuthEnabled } from "@/lib/local-auth";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/types/domain";

export const dynamic = "force-dynamic";

export default async function SecretPage() {
  const access = await getSiteAccess();
  if (!access.canView) return <LockedSurprise unlockAt={unlockAtMs()} />;

  const supabaseReady = hasSupabaseEnv();
  const actionsReady = supabaseReady || isLocalAuthEnabled();
  let currentUserId: string | null = null;
  let partner: Profile | null = null;
  const messages = actionsReady ? await listMessages() : { ok: true as const, data: [] };

  if (supabaseReady) {
    const { user, coupleId } = await requireCouple();
    currentUserId = user.id;
    const supabase = createClient();
    const { data: profiles } = await supabase.from("profiles").select("*").eq("couple_id", coupleId);
    partner = ((profiles ?? []) as Profile[]).find((profile) => profile.id !== user.id) ?? null;
  } else if (isLocalAuthEnabled()) {
    currentUserId = getLocalCurrentUser()?.id ?? null;
    partner = getLocalPartner() as Profile | null;
  }

  return (
    <main className="mx-auto max-w-3xl px-5 pb-32 pt-14 md:pt-20">
      <SectionHeading kicker="между нами" title="Тайная комната" description="Сообщения и отложенные письма, которые открываются только в свой момент." />
      <SecretClient messages={messages.ok ? messages.data : []} currentUserId={currentUserId} partner={partner} supabaseReady={actionsReady} />
    </main>
  );
}
