"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { TOAST_EVENT, type ToastDetail } from "@/lib/toast";
import { cn } from "@/lib/utils";

/**
 * Renders a stack of toasts in the top-right corner. Driven by
 * `pushToast()` from `lib/toast.ts`, so any client component can fire one
 * without prop-drilling.
 */
export function ToastContainer() {
  const [toasts, setToasts] = useState<ToastDetail[]>([]);
  const timers = useRef<Map<string, number>>(new Map());

  useEffect(() => {
    const handle = (event: Event) => {
      const detail = (event as CustomEvent<ToastDetail>).detail;
      if (!detail?.id) return;
      setToasts((prev) => [...prev, detail]);
      const duration = detail.duration ?? 6000;
      const timer = window.setTimeout(() => dismiss(detail.id), duration);
      timers.current.set(detail.id, timer);
    };
    window.addEventListener(TOAST_EVENT, handle);
    return () => {
      window.removeEventListener(TOAST_EVENT, handle);
      timers.current.forEach((timer) => window.clearTimeout(timer));
      timers.current.clear();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function dismiss(id: string) {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
    const timer = timers.current.get(id);
    if (timer !== undefined) {
      window.clearTimeout(timer);
      timers.current.delete(id);
    }
  }

  return (
    <div className="pointer-events-none fixed right-3 top-3 z-[80] flex w-full max-w-sm flex-col gap-2 sm:right-4 sm:top-4" aria-live="polite" aria-atomic="false">
      <AnimatePresence initial={false}>
        {toasts.map((toast) => {
          const body = (
            <div
              className={cn(
                "pointer-events-auto flex w-full items-start gap-3 rounded-2xl bg-white/85 p-4 text-ink shadow-glow ring-1 ring-white/70 backdrop-blur-xl",
                "dark:bg-ink/80 dark:text-cream dark:ring-white/10"
              )}
            >
              {toast.icon ? <div className="text-2xl leading-none" aria-hidden>{toast.icon}</div> : null}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold leading-snug">{toast.title}</p>
                {toast.body ? <p className="mt-1 text-xs leading-5 text-ink/65 dark:text-cream/70">{toast.body}</p> : null}
              </div>
              <button
                type="button"
                onClick={() => dismiss(toast.id)}
                aria-label="Закрыть"
                className="rounded-full p-1 text-ink/45 transition hover:bg-white/60 hover:text-ink dark:text-cream/50 dark:hover:bg-ink/60 dark:hover:text-cream"
              >
                <X className="h-3.5 w-3.5" aria-hidden />
              </button>
            </div>
          );
          return (
            <motion.div
              key={toast.id}
              layout
              initial={{ opacity: 0, y: -16, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, x: 24, scale: 0.96 }}
              transition={{ duration: 0.28, ease: "easeOut" }}
            >
              {toast.href ? (
                <Link href={toast.href} onClick={() => dismiss(toast.id)} className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-petal/60 rounded-2xl">
                  {body}
                </Link>
              ) : (
                body
              )}
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
