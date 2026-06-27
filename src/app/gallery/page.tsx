import { GalleryClient } from "@/components/sections/GalleryClient";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { listMemories } from "@/lib/actions/memories";
import { hasSupabaseEnv } from "@/lib/env";
import { isLocalAuthEnabled } from "@/lib/local-auth";

export const dynamic = "force-dynamic";

export default async function GalleryPage() {
  const actionsReady = hasSupabaseEnv() || isLocalAuthEnabled();
  const memories = actionsReady ? await listMemories() : { ok: true as const, data: [] };

  return (
    <main className="mx-auto max-w-6xl px-5 pb-28 pt-14 md:pt-20">
      <SectionHeading
        kicker="моменты, которые хочется держать ближе"
        title="Галерея"
        description="Здесь будут жить ваши фотографии, маленькие кадры и тихие доказательства того, что все это настоящее."
      />
      <GalleryClient memories={memories.ok ? memories.data : []} />
    </main>
  );
}
