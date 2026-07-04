import { MapClient } from "@/components/sections/MapClient";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { listSpots } from "@/lib/actions/spots";
import { isAdmin } from "@/lib/auth/admin";
import { hasSupabaseEnv } from "@/lib/env";
import { isLocalAuthEnabled } from "@/lib/local-auth";

export const dynamic = "force-dynamic";

export default async function MapPage() {
  const actionsReady = hasSupabaseEnv() || isLocalAuthEnabled();
  const [spots, admin] = await Promise.all([
    actionsReady ? listSpots() : Promise.resolve({ ok: true as const, data: [] }),
    isAdmin()
  ]);

  return (
    <main className="mx-auto max-w-6xl px-5 pb-28 pt-14 md:pt-20">
      <SectionHeading
        kicker="города помнят вас двоих"
        title="Места наших свиданий"
        description="Каждое сердечко на карте — место, где вы были вместе. Нажми на любое, чтобы увидеть фото и вспомнить, как это было."
      />
      <MapClient spots={spots.ok ? spots.data : []} isAdmin={admin} />
    </main>
  );
}
