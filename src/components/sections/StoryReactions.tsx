"use client";

import { useState, useTransition } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Heart, HeartHandshake, HeartPulse, type LucideIcon } from "lucide-react";
import { clearStoryReaction, setStoryReaction } from "@/lib/actions/story";
import { cn } from "@/lib/utils";
import type { EventReactions, HeartKind, ReactionPerson } from "@/types/domain";

type HeartDef = { kind: HeartKind; label: string; color: string; Icon: LucideIcon };

/** The palette of hearts each partner can pick from. Keep keys in sync with
 *  the `heartKindSchema` in validations and the `HeartKind` domain type. */
const HEART_KINDS: HeartDef[] = [
  { kind: "tender", label: "нежность", color: "#ec5f9c", Icon: Heart },
  { kind: "pulse", label: "трепет", color: "#ff7a9c", Icon: HeartPulse },
  { kind: "forever", label: "навсегда", color: "#c56ba0", Icon: HeartHandshake },
  { kind: "spark", label: "восторг", color: "#e6a24e", Icon: Heart }
];

/**
 * Reaction strip shown under each timeline entry. Максим reacts from the left,
 * Вика from the right; each may keep one heart per event. Selecting a heart is
 * optimistic and persisted via server actions, with a little rising-hearts
 * burst to celebrate the tap.
 */
export function StoryReactions({ eventId, initial }: { eventId: string; initial: EventReactions }) {
  const [reactions, setReactions] = useState<EventReactions>(initial);
  const [, startTransition] = useTransition();

  function react(person: ReactionPerson, kind: HeartKind) {
    const current = reactions[person];
    const next = current === kind ? null : kind; // tapping the active heart clears it
    setReactions((prev) => ({ ...prev, [person]: next }));
    startTransition(async () => {
      const res = next
        ? await setStoryReaction({ eventId, person, heart: kind })
        : await clearStoryReaction({ eventId, person });
      if (!res.ok) setReactions((prev) => ({ ...prev, [person]: current })); // revert on failure
    });
  }

  return (
    <div className="mt-5 flex items-start justify-between gap-3 border-t border-petal/15 pt-4">
      <ReactionSide person="maxim" name="Максим" align="left" selected={reactions.maxim} onReact={react} />
      <ReactionSide person="vika" name="Вика" align="right" selected={reactions.vika} onReact={react} />
    </div>
  );
}

function ReactionSide({
  person,
  name,
  align,
  selected,
  onReact
}: {
  person: ReactionPerson;
  name: string;
  align: "left" | "right";
  selected: HeartKind | null;
  onReact: (person: ReactionPerson, kind: HeartKind) => void;
}) {
  const [burst, setBurst] = useState(0);
  const right = align === "right";

  function handle(kind: HeartKind) {
    if (selected !== kind) setBurst((value) => value + 1); // only celebrate on select
    onReact(person, kind);
  }

  return (
    <div className={cn("flex min-w-0 flex-col gap-2", right ? "items-end" : "items-start")}>
      <span className="font-script text-lg leading-none text-petal">{name}</span>
      <div className={cn("flex items-center gap-1", right && "flex-row-reverse")}>
        {HEART_KINDS.map(({ kind, label, color, Icon }) => {
          const active = selected === kind;
          return (
            <motion.button
              key={kind}
              type="button"
              title={label}
              aria-label={`${name}: ${label}`}
              aria-pressed={active}
              onClick={() => handle(kind)}
              whileHover={{ scale: 1.18 }}
              whileTap={{ scale: 0.82 }}
              animate={active ? { scale: [1, 1.28, 1] } : { scale: 1 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              className={cn(
                "relative flex h-9 w-9 items-center justify-center rounded-full transition-colors duration-300",
                active ? "bg-white/70 shadow-cloud" : "opacity-40 hover:opacity-90"
              )}
            >
              <Icon className="h-[18px] w-[18px]" style={{ color, fill: active ? color : "transparent" }} aria-hidden />
              <AnimatePresence>{active ? <ReactionBurst key={burst} color={color} /> : null}</AnimatePresence>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}

/** A one-shot cluster of little hearts drifting up from a tapped reaction. */
function ReactionBurst({ color }: { color: string }) {
  return (
    <span className="pointer-events-none absolute inset-0 flex items-center justify-center" aria-hidden>
      {[0, 1, 2, 3, 4].map((i) => {
        const dx = (i - 2) * 9 + (Math.random() * 6 - 3);
        const dy = -32 - Math.random() * 18;
        const size = 9 + Math.random() * 5;
        return (
          <motion.span
            key={i}
            className="absolute"
            initial={{ opacity: 0.95, x: 0, y: 0, scale: 0.4 }}
            animate={{ opacity: 0, x: dx, y: dy, scale: 1 }}
            transition={{ duration: 0.8 + Math.random() * 0.3, ease: "easeOut" }}
          >
            <Heart style={{ color, fill: color, width: size, height: size }} />
          </motion.span>
        );
      })}
    </span>
  );
}
