import Link from "next/link";
import { MapPin, ImageIcon, MessageCircleHeart, Hash, HeartHandshake, Clock } from "lucide-react";
import { StoryAdminClient } from "@/components/sections/StoryAdminClient";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { GlassCard } from "@/components/ui/Card";
import { listStoryEvents } from "@/lib/actions/story";
import { isAdmin } from "@/lib/auth/admin";
import { hasSupabaseEnv } from "@/lib/env";
import { isLocalAuthEnabled } from "@/lib/local-auth";
import { AdminLocked } from "@/components/sections/AdminLocked";

export const dynamic = "force-dynamic";

const shortcuts = [
  { href: "/map", title: "Карта свиданий", text: "добавляй и редактируй места прямо на карте", icon: MapPin },
  { href: "/gallery", title: "Галерея", text: "загрузка фотографий", icon: ImageIcon },
  { href: "/memories", title: "Воспоминания", text: "истории и даты", icon: MessageCircleHeart },
  { href: "/counters", title: "Счётчики", text: "маленькая математика любви", icon: Hash },
  { href: "/reasons", title: "365 причин", text: "список причин", icon: HeartHandshake },
  { href: "/capsules", title: "Капсулы времени", text: "отложенные письма", icon: Clock }
];

export default async function AdminPage() {
  if (!(await isAdmin())) {
    return <AdminLocked />;
  }

  const actionsReady = hasSupabaseEnv() || isLocalAuthEnabled();
  const events = actionsReady ? await listStoryEvents() : { ok: true as const, data: [] };

  return (
    <main className="mx-auto max-w-4xl px-5 pb-28 pt-14 md:pt-20">
      <SectionHeading
        kicker="только для тебя"
        title="Админ-панель"
        description="Отсюда ты управляешь всем содержимым облачка. Гости этой страницы не видят."
      />

      <section className="mb-10">
        <h2 className="mb-3 font-display text-2xl text-ink">Разделы</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {shortcuts.map((item) => (
            <Link key={item.href} href={item.href} className="group">
              <GlassCard className="flex h-full items-start gap-3 px-4 py-4 transition group-hover:shadow-glow">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blush text-petal">
                  <item.icon className="h-5 w-5" aria-hidden />
                </span>
                <span>
                  <span className="block font-display text-lg text-ink">{item.title}</span>
                  <span className="block text-sm text-ink/65">{item.text}</span>
                </span>
              </GlassCard>
            </Link>
          ))}
        </div>
      </section>

      <StoryAdminClient events={events.ok ? events.data : []} />
    </main>
  );
}
