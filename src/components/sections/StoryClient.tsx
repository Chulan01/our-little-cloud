"use client";

import { motion } from "framer-motion";
import { Heart } from "lucide-react";
import { GlassCard } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { StoryReactions } from "@/components/sections/StoryReactions";
import { formatDate } from "@/lib/utils";
import type { EventReactions, StoryEventWithPhoto } from "@/types/domain";

const EMPTY_REACTIONS: EventReactions = { maxim: null, vika: null };

/**
 * Vertical timeline of the couple's first month: a soft spine on the left
 * with a cloud-node per event and a gentle reveal as you scroll.
 */
export function StoryClient({
  events,
  reactions = {}
}: {
  events: StoryEventWithPhoto[];
  reactions?: Record<string, EventReactions>;
}) {
  if (events.length === 0) {
    return (
      <EmptyState
        title="История пока пишется"
        description="Совсем скоро здесь появится хронология вашего первого месяца — день за днём."
      />
    );
  }

  return (
    <div className="relative mx-auto max-w-2xl">
      {/* The timeline spine */}
      <div className="absolute inset-y-2 left-[1.15rem] w-px bg-gradient-to-b from-petal/0 via-petal/45 to-petal/0" aria-hidden />

      <ol className="space-y-8">
        {events.map((event) => (
          <motion.li
            key={event.id}
            className="relative pl-14"
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          >
            {/* Node on the spine */}
            <span
              className="absolute left-0 top-5 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-white text-petal shadow-cloud ring-2 ring-blush"
              aria-hidden
            >
              {event.emoji ? <span className="text-base leading-none">{event.emoji}</span> : <Heart className="h-4 w-4" />}
            </span>

            <GlassCard className="px-6 py-5">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-petal">{formatDate(event.event_date)}</p>
              <h2 className="mt-1 font-display text-2xl text-ink">{event.title}</h2>
              {event.photoSrc ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={event.photoSrc} alt={event.title} className="mt-3 max-h-64 w-full rounded-2xl object-cover" />
              ) : null}
              <p className="mt-3 whitespace-pre-line text-sm leading-6 text-ink/72">{event.body}</p>
              <StoryReactions eventId={event.id} initial={reactions[event.id] ?? EMPTY_REACTIONS} />
            </GlassCard>
          </motion.li>
        ))}
      </ol>
    </div>
  );
}
