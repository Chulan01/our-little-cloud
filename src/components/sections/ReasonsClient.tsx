"use client";

import { useEffect, useState, useTransition } from "react";
import { Heart, Trash2 } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { addReason, deleteReason } from "@/lib/actions/reasons";
import type { LoveReason } from "@/types/domain";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { EmptyState } from "@/components/ui/EmptyState";
import { CelebrationBurst } from "@/components/effects/CelebrationBurst";
import { cn } from "@/lib/utils";

const MILESTONE_STORAGE_PREFIX = "our-cloud-reasons-milestone-seen:";

function milestoneStorageKey(days: number): string {
  return `${MILESTONE_STORAGE_PREFIX}${days}`;
}

function pluralMonths(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return "месяц";
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return "месяца";
  return "месяцев";
}

export function ReasonsClient({
  initialReasons,
  supabaseReady,
  days,
  isMilestone,
  milestoneItems,
  milestoneMonths
}: {
  initialReasons: LoveReason[];
  supabaseReady: boolean;
  days: number;
  isMilestone: boolean;
  milestoneItems: { number: number; text: string }[];
  milestoneMonths: number;
}) {
  const [message, setMessage] = useState("");
  const [burst, setBurst] = useState(0);
  const [isPending, startTransition] = useTransition();
  const [showMilestone, setShowMilestone] = useState(false);

  // Auto-show the cascade exactly once on the milestone day. Subsequent
  // reloads that day skip the auto-show but the user can still replay via
  // the celebratory banner above the list.
  useEffect(() => {
    if (!isMilestone) return;
    const key = milestoneStorageKey(days);
    let previouslySeen = false;
    try {
      previouslySeen = window.sessionStorage.getItem(key) === "1";
    } catch {
      // sessionStorage may be unavailable (private mode, etc.) — fall back to
      // re-showing the cascade, which is harmless.
    }
    if (!previouslySeen) setShowMilestone(true);
  }, [isMilestone, days]);

  const dismissMilestone = () => {
    if (typeof window !== "undefined" && isMilestone) {
      try {
        window.sessionStorage.setItem(milestoneStorageKey(days), "1");
      } catch {
        // Ignore sessionStorage failures — UI still returns to list view.
      }
    }
    setShowMilestone(false);
  };

  const openMilestone = () => setShowMilestone(true);

  const progress = Math.round((initialReasons.length / 365) * 100);

  return (
    <div className="relative">
      <CelebrationBurst trigger={burst} />
      <AnimatePresence mode="wait" initial={false}>
        {showMilestone && isMilestone ? (
          <MilestoneCascade
            key="cascade"
            items={milestoneItems}
            months={milestoneMonths}
            onBurst={() => setBurst((v) => v + 1)}
            onClose={dismissMilestone}
          />
        ) : (
          <motion.div
            key="list"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
          >
            {isMilestone ? <MilestoneReplayBanner months={milestoneMonths} onOpen={openMilestone} /> : null}

            <Card className="mb-6">
              <div className="flex items-center justify-between text-sm font-semibold text-ink">
                <span>{initialReasons.length} из 365</span>
                <span>{progress}%</span>
              </div>
              <div className="mt-3 h-3 rounded-full bg-white">
                <div className="h-full rounded-full bg-petal transition-all" style={{ width: `${progress}%` }} />
              </div>
            </Card>

            {initialReasons.length < 365 ? (
              <form
                className="mb-6 flex flex-col gap-3 sm:flex-row"
                onSubmit={(event) => {
                  event.preventDefault();
                  if (!supabaseReady) {
                    setMessage("Supabase пока не подключен. Добавь .env.local и перезапусти dev-сервер.");
                    return;
                  }
                  const form = event.currentTarget;
                  const formData = new FormData(form);
                  startTransition(async () => {
                    const result = await addReason({ text: String(formData.get("text") ?? "") });
                    if (result.ok) {
                      form.reset();
                      setMessage("Причина добавлена.");
                      setBurst((value) => value + 1);
                    } else {
                      setMessage(result.error.message);
                    }
                  });
                }}
              >
                <Input name="text" placeholder="Еще одна причина..." maxLength={280} required />
                <Button disabled={isPending || !supabaseReady} icon={<Heart className="h-4 w-4" aria-hidden />}>{isPending ? "..." : "Добавить"}</Button>
              </form>
            ) : null}

            {initialReasons.length === 0 ? (
              <EmptyState title="Список ждет первую причину" description="Добавь первую настоящую причину, и она появится здесь под номером 1." />
            ) : (
              <div className="grid gap-4">
                {initialReasons.map((reason) => (
                  <Card key={reason.id} className="flex items-start gap-3 sm:gap-5">
                    <div className="shrink-0 font-display text-3xl text-petal sm:text-4xl">{reason.number}</div>
                    <p className="min-w-0 flex-1 pt-1 leading-7 text-ink/75 sm:pt-2">{reason.text}</p>
                    <Button
                      variant="ghost"
                      className="shrink-0 px-3 sm:px-5"
                      aria-label="Удалить причину"
                      disabled={isPending}
                      icon={<Trash2 className="h-4 w-4" aria-hidden />}
                      onClick={() => {
                        startTransition(async () => {
                          const result = await deleteReason({ id: reason.id });
                          setMessage(result.ok ? "Удалено." : result.error.message);
                        });
                      }}
                    />
                  </Card>
                ))}
              </div>
            )}
            {message ? <p className="mt-4 text-center text-sm text-ink/65">{message}</p> : null}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function MilestoneReplayBanner({ months, onOpen }: { months: number; onOpen: () => void }) {
  return (
    <motion.button
      type="button"
      onClick={onOpen}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="mb-6 flex w-full items-center justify-between gap-4 rounded-3xl bg-petal/10 px-5 py-4 text-left shadow-cloud ring-1 ring-petal/30 backdrop-blur transition hover:bg-petal/15"
    >
      <span className="flex items-center gap-4">
        <span className="text-3xl" aria-hidden>🎉</span>
        <span className="min-w-0">
          <span className="block font-display text-xl text-petal">
            {months} {pluralMonths(months)} вместе
          </span>
          <span className="block text-sm text-ink/65">Хочешь заново открыть россыпь из 30 причин?</span>
        </span>
      </span>
      <span className="shrink-0 rounded-full bg-petal px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-white">открыть</span>
    </motion.button>
  );
}

// Three playful cloud silhouettes + matching pastel gradient surfaces +
// matching numbered badges + resting rotation, cycled by index so 30 cards
// feel like a hand-cut paper collage rather than a uniform grid.
// Deterministic — no Math.random — because framer-motion re-renders
// AnimatePresence keys and we want the same card to keep the same look.
const CLOUD_RECIPES = [
  {
    shape: "bubble-blob-a",
    surface: "bg-gradient-to-br from-cream/95 via-blush/40 to-cream/85",
    badge: "bg-petal text-white",
    initialRotate: -1.8
  },
  {
    shape: "bubble-blob-b",
    surface: "bg-gradient-to-br from-blush/85 via-cream/55 to-blush/60",
    badge: "bg-peach text-petal",
    initialRotate: 1.4
  },
  {
    shape: "bubble-blob-c",
    surface: "bg-gradient-to-br from-white/85 via-cream/65 to-blush/35",
    badge: "bg-glow text-ink",
    initialRotate: -0.6
  }
] as const;

function MilestoneCascade({
  items,
  months,
  onBurst,
  onClose
}: {
  items: { number: number; text: string }[];
  months: number;
  onBurst: () => void;
  onClose: () => void;
}) {
  // Respect the user's OS-level "Reduce Motion" preference: 30 staggered cards
  // moving at 0.55s each is a lot for anyone with vestibular sensitivity. We
  // collapse to a single fast fade when reduced motion is requested.
  const reduced = useReducedMotion();
  const childDuration = reduced ? 0 : 0.6;
  const staggerGap = reduced ? 0 : 0.09;
  const leadDelay = reduced ? 0 : 0.22;
  const drift = reduced ? 0 : 28;

  // Fire the confetti burst the moment the cascade opens. Empty-deps on
  // purpose: this is a one-shot celebration, not tied to prop changes.
  useEffect(() => {
    onBurst();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <motion.div
      key="cascade-root"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: reduced ? 0.2 : 0.4, ease: "easeOut" }}
      className="relative isolate"
    >
      {/* Soft pink halo behind the title — gives the cascade a warm
          centre. Lives behind the rest via -z-10 + `isolate` parent. */}
      <div
        aria-hidden
        className="cascade-halo pointer-events-none absolute left-1/2 top-2 -z-10 mx-auto h-72 w-[140%] max-w-5xl"
      />

      <div className="mb-12 text-center">
        <span className="inline-block rounded-full bg-petal/15 px-5 py-1.5 text-xs font-bold uppercase tracking-[0.18em] text-petal">
          С годовщиной
        </span>
        <h2 className="mt-3 font-display text-5xl text-ink sm:text-6xl">
          <span className="text-petal">{months}</span> {pluralMonths(months)} вместе
        </h2>
        <p className="mt-2 text-sm text-ink/60">россыпь из 30 причин специально для этого дня</p>
      </div>

      <motion.ul
        // `gap-x-7 gap-y-9` opens up enough breathing room for the irregular
        // silhouettes + the number badges that sit outside each bubble.
        className="mx-auto grid list-none max-w-3xl gap-x-6 gap-y-8 px-2 sm:grid-cols-2 sm:px-4"
        initial="hidden"
        animate="visible"
        variants={{
          hidden: {},
          visible: { transition: { staggerChildren: staggerGap, delayChildren: leadDelay } }
        }}
      >
        {items.map((item, index) => {
          // `noUncheckedIndexedAccess` treats every array indexing as
          // `T | undefined`. The `?? CLOUD_RECIPES[0]` is intentional: it
          // makes TS happy without affecting behaviour (the modulus would
          // only ever produce 0/1/2 given CLOUD_RECIPES has length 3).
          const recipe = CLOUD_RECIPES[index % CLOUD_RECIPES.length] ?? CLOUD_RECIPES[0];
          const initialRotate = reduced ? 0 : recipe.initialRotate;
          return (
            <motion.li
              // `pt-3 pl-3` makes room for the small numbered badge that
              // intentionally pokes out of the bubble ("thought bubble dot").
              className="relative pl-6 pt-6"
              key={`${item.number}-${index}`}
              variants={{
                hidden: { opacity: 0, y: drift, rotate: initialRotate },
                visible: {
                  opacity: 1,
                  y: 0,
                  rotate: 0,
                  transition: { duration: childDuration, ease: [0.22, 0.9, 0.32, 1] }
                }
              }}
              whileHover={reduced ? undefined : { rotate: 0, scale: 1.035, y: -4 }}
            >
              <div
                className={cn(
                  recipe.shape,
                  recipe.surface,
                  "bubble-shadow relative cursor-default px-7 pb-7 pt-8 text-center font-display leading-relaxed text-ink/85 backdrop-blur-md ring-1 ring-white/70 transition-shadow"
                )}
              >
                <span
                  aria-hidden
                  className={cn(
                    recipe.badge,
                    "absolute -left-3 -top-3 flex h-11 w-11 select-none items-center justify-center rounded-2xl font-display text-xl shadow-glow ring-2 ring-white"
                  )}
                >
                  {item.number}
                </span>
                <p className="px-1 text-[1.05rem] sm:text-[1.1rem]">{item.text}</p>

                {/* Inner twinkling sparkles — gated to skip under reduce-motion
                    since the keyframe loop becomes uncomfortable for some users. */}
                {!reduced ? (
                  <>
                    <span
                      aria-hidden
                      className="sparkle-twinkle pointer-events-none absolute right-5 top-3 select-none font-display text-petal/55"
                      style={{ fontSize: "0.85rem", animationDelay: `${((index * 0.13) % 2.8).toFixed(2)}s` }}
                    >
                      ✦
                    </span>
                    <span
                      aria-hidden
                      className="sparkle-twinkle pointer-events-none absolute bottom-6 left-8 select-none font-display text-petal/45"
                      style={{ fontSize: "0.7rem", animationDelay: `${((index * 0.27 + 1.1) % 2.8).toFixed(2)}s` }}
                    >
                      ✦
                    </span>
                  </>
                ) : null}
              </div>
            </motion.li>
          );
        })}
      </motion.ul>

      <FloatingHeartRain reduced={!!reduced} />

      <div className="mt-12 flex flex-col items-center gap-2">
        <Button onClick={onClose} variant="ghost" className="px-6">
          Спасибо, вернуться к списку
        </Button>
        <p className="text-xs text-ink/45">эта россыпь останется здесь — можно открыть заново в любой момент</p>
      </div>
    </motion.div>
  );
}

/* Soft pink rain of heart glyphs that rises up from below the cascade
   once the bubble stagger is done. 14 hearts at deterministic positions
   so SSR + hydration stay in sync (no Math.random). The `-z-10` puts
   the rain behind the close button column. Reduced motion returns null
   — animating 14 infinite-loop particles would defeat the whole point
   of `prefers-reduced-motion`. */
function FloatingHeartRain({ reduced }: { reduced: boolean }) {
  if (reduced) return null;
  const hearts = Array.from({ length: 14 }, (_, i) => i);
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-x-0 bottom-12 -z-10 mx-auto flex h-72 max-w-3xl items-end justify-center"
    >
      {hearts.map((i) => {
        const leftPct = 4 + ((i * 7 + 3) % 92);
        const size = 12 + ((i * 5) % 12);
        const delay = 2.6 + i * 0.18;
        const duration = 3.2 + ((i * 0.31) % 1.4);
        const lift = -220 - ((i * 17) % 90);
        const tiltSign = i % 2 === 0 ? 1 : -1;
        return (
          <motion.span
            key={i}
            className="absolute bottom-0 select-none font-display text-petal"
            style={{ left: `${leftPct}%`, fontSize: `${size}px` }}
            initial={{ y: 0, opacity: 0, scale: 0.55, rotate: 0 }}
            animate={{
              y: lift,
              opacity: [0, 0.75, 0],
              scale: [0.55, 1.05, 0.7],
              rotate: [0, tiltSign * 10, tiltSign * 22]
            }}
            transition={{ delay, duration, ease: "easeOut" }}
          >
            ♡
          </motion.span>
        );
      })}
    </div>
  );
}
