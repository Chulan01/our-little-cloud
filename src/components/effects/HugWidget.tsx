"use client";

import { useEffect, useState, useTransition } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Heart, HeartHandshake, X } from "lucide-react";
import { dismissHugSignal, getHugState, sendHugBack, sendMissSignal } from "@/lib/actions/hugs";
import type { LocalHugState } from "@/lib/local-store";
import { Button } from "@/components/ui/Button";

function hugVerb(name: string) {
  return name.toLowerCase().includes("вика") ? "обняла" : "обнял";
}

export function HugWidget() {
  const [state, setState] = useState<LocalHugState | null>(null);
  const [notice, setNotice] = useState("");
  const [hugBurst, setHugBurst] = useState(0);
  const [hidden, setHidden] = useState(false);
  const [isPending, startTransition] = useTransition();

  const refresh = () => {
    getHugState().then((result) => {
      if (result.ok) setState(result.data);
    });
  };

  useEffect(() => {
    refresh();
    const timer = window.setInterval(refresh, 8000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (state?.outgoing?.status === "hugged" && !state.outgoing.sender_seen_at) {
      setHugBurst((value) => value + 1);
      setHidden(false);
    }
  }, [state?.outgoing?.id, state?.outgoing?.status, state?.outgoing?.sender_seen_at]);

  const sendMiss = () => {
    setHidden(false);
    startTransition(async () => {
      const result = await sendMissSignal();
      if (result.ok) {
        setState(result.data);
        setNotice("Сигнал отправлен. Теперь он точно знает, что ты скучаешь.");
      } else {
        setNotice(result.error.message);
      }
    });
  };

  const hugBack = (id: string) => {
    startTransition(async () => {
      const result = await sendHugBack({ id });
      setHugBurst((value) => value + 1);
      if (result.ok) {
        setState(result.data);
        setNotice("Объятие отправлено. Пусть ему станет теплее.");
      } else {
        setNotice(result.error.message);
      }
    });
  };

  const dismiss = (id: string) => {
    startTransition(async () => {
      const result = await dismissHugSignal({ id });
      if (result.ok) {
        setState(result.data);
        setHidden(true);
        setNotice("");
      } else {
        setNotice(result.error.message);
      }
    });
  };

  const incoming = state?.incoming ?? null;
  const outgoing = state?.outgoing ?? null;
  const showPanel = !hidden || incoming || outgoing;

  // Hide the entire hug widget until both halves of the couple exist.
  // Without a partner, "Сигнал летит" / "Я скучаю" / incoming panel are
  // suppressed — they only reappear once a paired profile is signed in.
  if (!state?.currentUserId || !state?.partnerName) return null;

  return (
    <>
      <AnimatePresence>
        {hugBurst > 0 ? (
          <motion.div
            key={hugBurst}
            className="pointer-events-none fixed inset-0 z-[70] flex items-center justify-center overflow-hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35 }}
          >
            <motion.div
              className="absolute inset-0 bg-petal/20"
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 0.35, 0] }}
              transition={{ duration: 1.4, ease: "easeOut" }}
            />
            <motion.div
              className="rounded-full bg-white/65 px-8 py-5 text-center font-script text-4xl text-ink shadow-glow backdrop-blur"
              initial={{ scale: 0.72, opacity: 0 }}
              animate={{ scale: [0.72, 1.06, 1], opacity: [0, 1, 0] }}
              transition={{ duration: 1.7, ease: "easeOut" }}
            >
              обнимаю крепко
            </motion.div>
            {Array.from({ length: 22 }).map((_, index) => (
              <motion.span
                key={index}
                className="absolute left-1/2 top-1/2 text-2xl text-petal"
                initial={{ x: 0, y: 0, opacity: 0, scale: 0.3 }}
                animate={{
                  x: Math.cos(index * 0.9) * (90 + index * 8),
                  y: Math.sin(index * 1.4) * (70 + index * 5),
                  opacity: [0, 1, 0],
                  scale: [0.3, 1.2, 0.8],
                  rotate: index * 24
                }}
                transition={{ duration: 1.5, ease: "easeOut" }}
              >
                ♡
              </motion.span>
            ))}
          </motion.div>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {showPanel ? (
          <motion.div
            className="fixed bottom-24 left-3 z-50 w-[min(350px,calc(100vw-1.5rem))] rounded-3xl bg-white/76 p-4 text-ink shadow-glow ring-1 ring-white/70 backdrop-blur-xl md:bottom-6 md:left-6"
            initial={{ opacity: 0, y: 18, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 18, scale: 0.98 }}
          >
            <button className="absolute right-3 top-3 rounded-full p-1 text-ink/45 transition hover:bg-white/60 hover:text-ink" type="button" aria-label="Скрыть" onClick={() => setHidden(true)}>
              <X className="h-4 w-4" aria-hidden />
            </button>

            {incoming ? (
              <div className="pr-6">
                <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-petal">
                  <Heart className="h-4 w-4 fill-current" aria-hidden />
                  {incoming.senderName} скучает по тебе
                </div>
                <p className="text-sm leading-6 text-ink/70">Можно ответить одним теплым объятием. Оно появится у него на экране.</p>
                <Button className="mt-4 w-full" disabled={isPending} icon={<HeartHandshake className="h-4 w-4" aria-hidden />} onClick={() => hugBack(incoming.id)}>
                  Обнять
                </Button>
              </div>
            ) : outgoing?.status === "hugged" ? (
              <div className="pr-6">
                <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-petal">
                  <HeartHandshake className="h-4 w-4" aria-hidden />
                  {outgoing.recipientName} {hugVerb(outgoing.recipientName)} тебя
                </div>
                <p className="text-sm leading-6 text-ink/70">Это объятие уже долетело. Можно чуть-чуть задержаться в нем.</p>
                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  <Button variant="soft" disabled={isPending} onClick={() => setHugBurst((value) => value + 1)}>
                    Обнять экран
                  </Button>
                  <Button variant="ghost" disabled={isPending} onClick={() => dismiss(outgoing.id)}>
                    Прижать к сердцу
                  </Button>
                </div>
              </div>
            ) : outgoing?.status === "missing" ? (
              <div className="pr-6">
                <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-petal">
                  <Heart className="h-4 w-4 fill-current" aria-hidden />
                  Сигнал уже летит
                </div>
                <p className="text-sm leading-6 text-ink/70">{outgoing.recipientName} увидит, что ты скучаешь, и сможет обнять тебя в ответ.</p>
              </div>
            ) : (
              <div className="pr-6">
                <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-petal">
                  <Heart className="h-4 w-4 fill-current" aria-hidden />
                  Быстрый сигнал
                </div>
                <p className="text-sm leading-6 text-ink/70">Если стало тихо внутри, можно просто сказать: “я скучаю”.</p>
                <Button className="mt-4 w-full" disabled={isPending} onClick={sendMiss}>
                  Я скучаю
                </Button>
              </div>
            )}

            {notice ? <p className="mt-3 text-xs leading-5 text-ink/55">{notice}</p> : null}
          </motion.div>
        ) : (
          <motion.button
            className="fixed bottom-24 left-3 z-50 flex h-12 items-center gap-2 rounded-full bg-white/76 px-4 text-sm font-semibold text-ink shadow-glow ring-1 ring-white/70 backdrop-blur-xl md:bottom-6 md:left-6"
            type="button"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            whileTap={{ scale: 0.96 }}
            onClick={() => setHidden(false)}
          >
            <Heart className="h-4 w-4 text-petal fill-current" aria-hidden />
            Я скучаю
          </motion.button>
        )}
      </AnimatePresence>
    </>
  );
}
