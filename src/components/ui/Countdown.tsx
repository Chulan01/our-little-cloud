"use client";

import { useEffect, useState } from "react";

type Parts = { days: number; hours: number; minutes: number; seconds: number; done: boolean };

function partsUntil(target: number, now: number): Parts {
  const diff = Math.max(0, target - now);
  return {
    days: Math.floor(diff / 86_400_000),
    hours: Math.floor((diff % 86_400_000) / 3_600_000),
    minutes: Math.floor((diff % 3_600_000) / 60_000),
    seconds: Math.floor((diff % 60_000) / 1000),
    done: diff <= 0
  };
}

const labels: Array<{ key: keyof Omit<Parts, "done">; label: string }> = [
  { key: "days", label: "дней" },
  { key: "hours", label: "часов" },
  { key: "minutes", label: "минут" },
  { key: "seconds", label: "секунд" }
];

/**
 * Live countdown to `target` (ms timestamp). Renders nothing until mounted
 * so the server and client markup never disagree.
 */
export function Countdown({ target, onDone, compact = false }: { target: number; onDone?: () => void; compact?: boolean }) {
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setNow(Date.now());
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const parts = now === null ? null : partsUntil(target, now);

  useEffect(() => {
    if (parts?.done) onDone?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parts?.done]);

  if (!parts) {
    return <div className={compact ? "h-14" : "h-24"} aria-hidden />;
  }

  return (
    <div className="flex items-stretch justify-center gap-2 sm:gap-3" role="timer" aria-live="polite">
      {labels.map(({ key, label }) => (
        <div
          key={key}
          className={
            compact
              ? "home-days-card flex min-w-14 flex-col items-center rounded-2xl px-2 py-2 backdrop-blur"
              : "home-days-card flex min-w-16 flex-col items-center rounded-3xl px-3 py-3 backdrop-blur sm:min-w-20 sm:px-4 sm:py-4"
          }
        >
          <span className={compact ? "home-days-number font-display text-2xl leading-none text-petal" : "home-days-number font-display text-4xl leading-none text-petal sm:text-5xl"}>
            {String(parts[key]).padStart(2, "0")}
          </span>
          <span className={compact ? "home-days-label mt-1 text-[10px] font-semibold uppercase tracking-wide text-ink/55" : "home-days-label mt-2 text-xs font-semibold uppercase tracking-[0.14em] text-ink/55"}>
            {label}
          </span>
        </div>
      ))}
    </div>
  );
}
