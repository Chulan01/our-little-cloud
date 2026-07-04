"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Lock } from "lucide-react";
import { motion } from "framer-motion";
import { Countdown } from "@/components/ui/Countdown";
import { GlassCard } from "@/components/ui/Card";

/**
 * A tender "closed door" shown instead of any section that only opens on
 * 8 July. Deliberately vague — no hints at what is inside, just a promise.
 */
export function LockedSurprise({ unlockAt }: { unlockAt: number }) {
  const router = useRouter();

  return (
    <main className="mx-auto flex min-h-[85vh] max-w-2xl flex-col items-center justify-center px-5 pb-28 pt-14 text-center">
      <GlassCard className="w-full px-7 py-10 sm:px-10">
        <motion.span
          className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-blush text-petal shadow-cloud"
          animate={{ y: [0, -6, 0] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        >
          <Lock className="h-9 w-9" aria-hidden />
        </motion.span>

        <p className="font-script text-3xl text-petal">тс-с-с... это сюрприз</p>
        <h1 className="mt-2 text-balance font-display text-4xl leading-tight text-ink sm:text-5xl">
          Эта дверца откроется 8 июля
        </h1>
        <p className="mx-auto mt-4 max-w-md text-balance leading-7 text-ink/70">
          Облачко бережно хранит то, что за ней. Осталось совсем немного — загляни сюда, когда часики дойдут до нуля.
        </p>

        <div className="mt-8">
          <Countdown target={unlockAt} onDone={() => router.refresh()} />
        </div>

        <Link
          href="/map"
          className="mt-8 inline-flex min-h-11 items-center justify-center rounded-full bg-white/70 px-6 py-2.5 text-sm font-semibold text-ink shadow-cloud transition hover:bg-white"
        >
          а пока — к карте ваших мест
        </Link>
      </GlassCard>
    </main>
  );
}
