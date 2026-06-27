"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { getUnreadMessageCount } from "@/lib/actions/messages";
import { pushToast, UNREAD_TOAST_WATERMARK_KEY } from "@/lib/toast";

const POLL_INTERVAL_MS = 15_000;

// We track the highest unread count we've already announced in sessionStorage
// so that a manual page refresh (which unmounts + remounts the layout) doesn't
// re-fire the same toast for the same backlog. The watermark is bumped on
// every increase *and* lowered when the user reads messages, so a new
// message arriving after a partial read still surfaces a fresh toast.

function readShownCount(): number {
  if (typeof window === "undefined") return 0;
  const raw = window.sessionStorage.getItem(UNREAD_TOAST_WATERMARK_KEY);
  const parsed = raw === null ? 0 : Number(raw);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

function writeShownCount(value: number): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(UNREAD_TOAST_WATERMARK_KEY, String(value));
  } catch {
    // sessionStorage may be unavailable (private mode, etc.) — silently ignore.
  }
}

function pluralizeMessages(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return "новое сообщение";
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return "новых сообщения";
  return "новых сообщений";
}

/**
 * Polls `getUnreadMessageCount()` on the client and fires a toast:
 *   • once on first mount, if there is anything unread AND we haven't
 *     already announced this backlog in the current tab session;
 *   • again whenever the count grows, so a fresh message arriving while
 *     the user is already browsing still surfaces a notification.
 * Also calls `router.refresh()` on growth so server-rendered badges
 * (Navbar / BottomTabBar) update without waiting for the next poll.
 */
export function MessageNotifListener({ initial }: { initial: number }) {
  const router = useRouter();
  const lastCount = useRef<number>(initial);
  const mounted = useRef<boolean>(false);

  useEffect(() => {
    if (mounted.current) return;
    mounted.current = true;

    // Mount-time announcement: only if this backlog hasn't been announced yet.
    if (lastCount.current > 0 && lastCount.current > readShownCount()) {
      pushToast({
        title: "Твоя половинка оставила тебе сообщение",
        body: lastCount.current === 1 ? "Открой Тайную, чтобы прочитать" : `У тебя ${lastCount.current} ${pluralizeMessages(lastCount.current)} в Тайной`,
        icon: <span aria-hidden>💌</span>,
        href: "/secret",
        duration: 7000
      });
      writeShownCount(lastCount.current);
    }

    let cancelled = false;
    const tick = async () => {
      if (cancelled) return;
      try {
        const count = await getUnreadMessageCount();
        if (cancelled) return;
        if (count > lastCount.current) {
          pushToast({
            title: "Новое сообщение в Тайной",
            body: "Твоя половинка написала тебе",
            icon: <span aria-hidden>💌</span>,
            href: "/secret",
            duration: 6000
          });
          writeShownCount(count);
          router.refresh();
        } else if (count < lastCount.current) {
          // The user read some messages. Lower the watermark so a future
          // new message (even if the count is still below the previous
          // peak) will fire a toast again.
          const watermark = readShownCount();
          if (watermark > count) writeShownCount(count);
        }
        lastCount.current = count;
      } catch {
        // Silently ignore network blips; the next tick will retry.
      }
    };

    const timer = window.setInterval(tick, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [router]);

  return null;
}
