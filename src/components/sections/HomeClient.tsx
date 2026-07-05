"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { GalleryHorizontalEnd, Hash, HeartHandshake, MapPin, MessageCircleHeart, Sparkles } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import type { Couple, Profile } from "@/types/domain";
import { GlassCard } from "@/components/ui/Card";
import { Cloud } from "@/components/ui/Shapes";
import { Counter } from "@/components/ui/Counter";
import { Button } from "@/components/ui/Button";
import { daysBetween } from "@/lib/utils";

type ReasonOption = { day: number; text: string };

const REASON_STORAGE_KEY = "our-cloud-home-reason";
const REASON_COOLDOWN_MS = 60 * 60 * 1000;

const cards = [
  { href: "/map", title: "Карта свиданий", text: "сердечки на карте города — там, где вы были", icon: MapPin },
  { href: "/story", title: "Наша история", text: "хронология вашего первого месяца", icon: Sparkles },
  { href: "/memories", title: "Комната воспоминаний", text: "даты, фото и маленькие истории", icon: Sparkles },
  { href: "/gallery", title: "Галерея", text: "ваша нежная лента моментов", icon: GalleryHorizontalEnd },
  { href: "/reasons", title: "365 причин", text: "каждый день еще один ответ на почему", icon: HeartHandshake },
  { href: "/counters", title: "Счётчики", text: "дни вместе, любовь и поцелуи", icon: Hash },
  { href: "/secret", title: "Тайная комната", text: "сообщения только для вас двоих", icon: MessageCircleHeart }
];

function normalizeProfileName(profile: Profile | { id: string; display_name: string }) {
  // Comes pre-lowered from the Supabase seed and the local profile factory,
  // so we just pass it through — no more hard-coded special IDs.
  return profile.display_name;
}

function formatRemaining(ms: number) {
  const minutes = Math.max(1, Math.ceil(ms / 60_000));
  if (minutes >= 60) return "примерно час";
  return `${minutes} мин.`;
}

export function HomeClient({
  couple,
  profiles,
  dailyReason,
  reasonPool,
  canViewAll = false
}: {
  couple: Couple | null;
  profiles: Profile[];
  dailyReason: ReasonOption | null;
  reasonPool: ReasonOption[];
  canViewAll?: boolean;
}) {
  // Hide the "Наша история" shortcut until the 8 July reveal so the home
  // grid never spoils the surprise. The admin always sees it.
  const visibleCards = canViewAll ? cards : cards.filter((card) => card.href !== "/story");
  const title = couple?.name ?? "Наше Облачко";
  const days = couple?.anniversary_date ? daysBetween(couple.anniversary_date) : 0;
  const visibleProfiles = profiles.map((profile) => ({ ...profile, display_name: normalizeProfileName(profile) }));

  const fallbackReason = dailyReason ?? reasonPool[0] ?? { day: 1, text: "За то, что ты есть." };
  const [currentReason, setCurrentReason] = useState<ReasonOption | null>(null);
  const [openedAt, setOpenedAt] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const [burst, setBurst] = useState(0);
  const [cloudClicks, setCloudClicks] = useState(0);
  const [titleClicks, setTitleClicks] = useState(0);

  useEffect(() => {
    const saved = window.localStorage.getItem(REASON_STORAGE_KEY);
    if (!saved) return;
    try {
      const parsed = JSON.parse(saved) as { openedAt: number; reason: ReasonOption };
      if (parsed.reason?.text && Number.isFinite(parsed.openedAt)) {
        setCurrentReason(parsed.reason);
        setOpenedAt(parsed.openedAt);
      }
    } catch {
      window.localStorage.removeItem(REASON_STORAGE_KEY);
    }
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  const remainingMs = currentReason ? Math.max(0, openedAt + REASON_COOLDOWN_MS - now) : 0;
  const canOpenReason = !currentReason || remainingMs <= 0;
  const secretCloudOpen = cloudClicks >= 5;
  const secretTitleOpen = titleClicks >= 3;

  const nextReason = useMemo(() => {
    if (!reasonPool.length) return fallbackReason;
    return reasonPool[Math.floor(Math.random() * reasonPool.length)] ?? fallbackReason;
  }, [fallbackReason, reasonPool, burst]);

  const openReason = () => {
    if (!canOpenReason) return;
    const reason = nextReason;
    const timestamp = Date.now();
    setCurrentReason(reason);
    setOpenedAt(timestamp);
    setNow(timestamp);
    setBurst((value) => value + 1);
    window.localStorage.setItem(REASON_STORAGE_KEY, JSON.stringify({ openedAt: timestamp, reason }));
  };

  return (
    <main className="mx-auto min-h-screen max-w-6xl px-5 pb-28 pt-16 md:pt-24 space-y-12">
      <section className="flex min-h-[70vh] flex-col items-center justify-center text-center">
        <motion.p className="font-script text-3xl text-petal" animate={secretTitleOpen ? { scale: [1, 1.08, 1] } : {}} transition={{ duration: 1.2, repeat: secretTitleOpen ? Infinity : 0 }}>
          там, где каждый день бережно хранит вас
        </motion.p>
        <button type="button" className="romantic-glow mt-2 cursor-pointer font-display text-6xl leading-tight text-ink sm:text-7xl" onClick={() => setTitleClicks((value) => value + 1)}>
          {title}
        </button>

        <AnimatePresence>
          {secretTitleOpen ? (
            <motion.div
              className="mt-4 rounded-full bg-white/60 px-5 py-2 text-sm font-semibold text-ink/70 shadow-cloud"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
            >
              секрет: это облачко светится сильнее, когда вы рядом
            </motion.div>
          ) : null}
        </AnimatePresence>

        <div className="relative my-10 grid w-full max-w-3xl items-center gap-4 sm:grid-cols-[1fr_auto_1fr]">
          {/* Thread joining the two names, passing softly behind the days card. */}
          <div className="pointer-events-none absolute inset-x-6 top-1/2 z-0 hidden -translate-y-1/2 sm:block" aria-hidden>
            <div className="love-thread h-px w-full bg-gradient-to-r from-transparent via-petal to-transparent" />
          </div>

          {visibleProfiles.slice(0, 1).map((profile, index) => (
            <motion.button
              type="button"
              key={profile.id}
              className="relative z-10 mx-auto"
              animate={{ y: [0, -8, 0], x: [0, 6, 0] }}
              transition={{ duration: 5 + index, repeat: Infinity, ease: "easeInOut" }}
              onClick={() => setCloudClicks((value) => value + 1)}
            >
              <Cloud className="home-cloud-shape h-28 w-44 text-white drop-shadow-xl" />
              <span className="home-cloud-label absolute inset-0 flex items-center justify-center font-script text-3xl text-ink/70">{profile.display_name}</span>
            </motion.button>
          ))}

          <div className="home-days-card relative z-10 mx-auto rounded-3xl bg-white/75 px-6 py-4 text-sm font-semibold text-ink shadow-cloud ring-1 ring-white/70 backdrop-blur">
            <span className="home-days-label">вы вместе</span>
            <div className="home-days-number font-display text-5xl leading-none text-petal">
              <Counter value={days} />
            </div>
            <span className="home-days-label">дней</span>
          </div>

          {visibleProfiles.slice(1, 2).map((profile, index) => (
            <motion.button
              type="button"
              key={profile.id}
              className="relative z-10 mx-auto"
              animate={{ y: [0, -8, 0], x: [0, -6, 0] }}
              transition={{ duration: 5.5 + index, repeat: Infinity, ease: "easeInOut" }}
              onClick={() => setCloudClicks((value) => value + 1)}
            >
              <Cloud className="home-cloud-shape h-28 w-44 text-white drop-shadow-xl" />
              <span className="home-cloud-label absolute inset-0 flex items-center justify-center font-script text-3xl text-ink/70">{profile.display_name}</span>
            </motion.button>
          ))}
        </div>

        <AnimatePresence>
          {secretCloudOpen ? (
            <motion.div
              className="mb-5 max-w-xl rounded-3xl bg-white/55 px-5 py-3 text-sm leading-6 text-ink/70 shadow-cloud"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
            >
              пасхалка найдена: если два облачка встретились, значит день уже стал мягче
            </motion.div>
          ) : null}
        </AnimatePresence>

        <GlassCard className="relative max-w-2xl overflow-hidden px-7 py-6">
          <AnimatePresence>
            {burst > 0 ? (
              <motion.div className="pointer-events-none absolute inset-0" initial={{ opacity: 1 }} animate={{ opacity: 0 }} exit={{ opacity: 0 }} transition={{ duration: 1.1 }}>
                {Array.from({ length: 14 }).map((_, index) => (
                  <motion.span
                    key={`${burst}-${index}`}
                    className="absolute left-1/2 top-1/2 text-2xl text-petal"
                    initial={{ x: 0, y: 0, scale: 0.4, opacity: 0 }}
                    animate={{
                      x: Math.cos(index) * (70 + index * 7),
                      y: Math.sin(index * 1.7) * (45 + index * 5),
                      scale: [0.4, 1.15, 0.7],
                      opacity: [0, 0.95, 0]
                    }}
                    transition={{ duration: 1.2, ease: "easeOut" }}
                  >
                    ♡
                  </motion.span>
                ))}
              </motion.div>
            ) : null}
          </AnimatePresence>

          <div className="mb-3 flex flex-col items-center justify-center gap-2 sm:flex-row">
            <p className="font-script text-3xl text-petal">причина, почему я люблю тебя</p>
            <span className="rounded-full bg-blush/80 px-4 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-ink/60">
              {currentReason ? `причина ${currentReason.day}/365` : "закрыто"}
            </span>
          </div>

          <AnimatePresence mode="wait">
            {currentReason ? (
              <motion.p
                key={`${currentReason.day}-${openedAt}`}
                className="text-lg leading-8 text-ink"
                initial={{ opacity: 0, y: 12, filter: "blur(6px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.45 }}
              >
                {currentReason.text}
              </motion.p>
            ) : (
              <motion.p
                key="closed"
                className="text-lg leading-8 text-ink/70"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                Нажми кнопку, и облачко откроет одну нежность. Следующую можно будет открыть только через час.
              </motion.p>
            )}
          </AnimatePresence>

          <div className="mt-5 flex flex-col items-center gap-2">
            <Button onClick={openReason} disabled={!canOpenReason}>
              {canOpenReason ? "Открыть причину" : "Следующая через " + formatRemaining(remainingMs)}
            </Button>
            {!canOpenReason ? <p className="text-xs text-ink/50">пусть эта причина чуть-чуть побудет с вами</p> : null}
          </div>
        </GlassCard>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
        {visibleCards.map((card) => {
          const Icon = card.icon;
          return (
            <Link key={card.href} href={card.href} prefetch className="group">
              <GlassCard className="romantic-card min-h-48 hover:bg-white/65">
                <Icon className="mb-5 h-8 w-8 text-petal transition-transform duration-300 group-hover:-rotate-6 group-hover:scale-110" aria-hidden />
                <h2 className="font-display text-2xl text-ink">{card.title}</h2>
                <p className="mt-3 text-sm leading-6 text-ink/68">{card.text}</p>
              </GlassCard>
            </Link>
          );
        })}
      </section>
    </main>
  );
}
