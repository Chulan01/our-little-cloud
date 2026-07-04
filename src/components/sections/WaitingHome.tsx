"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { MapPin } from "lucide-react";
import { motion } from "framer-motion";
import { Countdown } from "@/components/ui/Countdown";
import { GlassCard } from "@/components/ui/Card";
import { Cloud } from "@/components/ui/Shapes";
import type { Profile } from "@/types/domain";

/**
 * Pre-anniversary home: a tender waiting room. Big countdown to 8 July,
 * the two name-clouds, and a single door — the dating map. No hints about
 * what opens later; it is a surprise.
 */
export function WaitingHome({ profiles, unlockAt }: { profiles: Profile[]; unlockAt: number }) {
  const router = useRouter();

  return (
    <main className="mx-auto min-h-screen max-w-4xl px-5 pb-28 pt-16 md:pt-24">
      <section className="flex min-h-[80vh] flex-col items-center justify-center text-center">
        <motion.p
          className="font-script text-3xl text-petal"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          скоро здесь случится кое-что нежное
        </motion.p>
        <h1 className="mt-2 font-display text-6xl leading-tight text-ink sm:text-7xl">Наше Облачко</h1>

        <div className="relative my-10 flex w-full max-w-2xl items-center justify-center gap-6">
          {profiles.slice(0, 2).map((profile, index) => (
            <motion.div
              key={profile.id}
              className="relative"
              animate={{ y: [0, -8, 0], x: [0, index === 0 ? 6 : -6, 0] }}
              transition={{ duration: 5 + index, repeat: Infinity, ease: "easeInOut" }}
            >
              <Cloud className="home-cloud-shape h-24 w-40 text-white drop-shadow-xl sm:h-28 sm:w-44" />
              <span className="home-cloud-label absolute inset-0 flex items-center justify-center font-script text-3xl text-ink/70">
                {profile.display_name}
              </span>
            </motion.div>
          ))}
        </div>

        <p className="mb-5 max-w-md text-balance leading-7 text-ink/70">
          8 июля облачко раскроется до конца. А пока оно тихонько считает минуты до вашего первого месяца.
        </p>

        <Countdown target={unlockAt} onDone={() => router.refresh()} />

        <Link href="/map" className="mt-10 w-full max-w-md">
          <GlassCard className="flex items-center gap-4 px-6 py-5 text-left transition hover:-translate-y-1 hover:bg-white/65">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blush text-petal">
              <MapPin className="h-6 w-6" aria-hidden />
            </span>
            <span>
              <span className="block font-display text-2xl text-ink">Места наших свиданий</span>
              <span className="mt-1 block text-sm leading-6 text-ink/68">карта города с сердечками там, где вы были вместе</span>
            </span>
          </GlassCard>
        </Link>
      </section>
    </main>
  );
}
