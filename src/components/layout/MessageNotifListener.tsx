"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { getUnreadMessageCount } from "@/lib/actions/messages";
import { pushToast } from "@/lib/toast";

const POLL_INTERVAL_MS = 15_000;

function pluralizeMessages(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return "новое сообщение";
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return "новых сообщения";
  return "новых сообщений";
}

/**
 * Polls `getUnreadMessageCount()` on the client and fires a toast:
 *   • once on first mount, if there is anything unread (so a partner who
 *     left a message gets a "your other half left you a message" prompt
 *     when the second user lands on the site);
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

    if (lastCount.current > 0) {
      pushToast({
        title: "Твоя половинка оставила тебе сообщение",
        body: lastCount.current === 1 ? "Открой Тайную, чтобы прочитать" : `У тебя ${lastCount.current} ${pluralizeMessages(lastCount.current)} в Тайной`,
        icon: <span aria-hidden>💌</span>,
        href: "/secret",
        duration: 7000
      });
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
          router.refresh();
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
