"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { ShieldCheck } from "lucide-react";
import { visibleNavItems } from "./nav-items";
import { cn } from "@/lib/utils";

export function BottomTabBar({ unreadSecret = 0, canViewAll = false, isAdmin = false }: { unreadSecret?: number; canViewAll?: boolean; isAdmin?: boolean } = {}) {
  const pathname = usePathname();
  const items = visibleNavItems(canViewAll || isAdmin);
  const columns = items.length + (isAdmin ? 1 : 0);
  return (
    <nav className="fixed inset-x-2 bottom-3 z-40 rounded-3xl bg-white/72 p-1.5 shadow-glow ring-1 ring-white/70 backdrop-blur-xl md:hidden" aria-label="Нижняя навигация">
      <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
        {items.map((item) => {
          const active = pathname === item.href;
          const Icon = item.icon;
          const showBadge = item.href === "/secret" && unreadSecret > 0;
          return (
            <Link key={item.href} href={item.href} prefetch className={cn("relative flex min-h-14 flex-col items-center justify-center gap-1 rounded-2xl text-[9px] font-semibold text-ink/55", active && "text-ink")}>
              {active ? <motion.span layoutId="mobile-active-nav" className="absolute inset-0 rounded-2xl bg-blush shadow-cloud" /> : null}
              <span className="relative inline-flex">
                <Icon className="h-5 w-5" aria-hidden />
                {showBadge ? (
                  <span aria-label={`${unreadSecret} непрочитанных сообщений`} className="absolute -right-2 -top-1 inline-flex min-w-[16px] items-center justify-center rounded-full bg-petal px-1 text-[9px] font-bold leading-none text-white shadow-cloud ring-1 ring-white/70">
                    {unreadSecret >= 10 ? "9+" : unreadSecret}
                  </span>
                ) : null}
              </span>
              <span className="relative leading-none">{item.shortLabel}</span>
            </Link>
          );
        })}
        {isAdmin ? (
          <Link
            href="/admin"
            className={cn(
              "relative flex min-h-14 flex-col items-center justify-center gap-1 rounded-2xl text-[9px] font-semibold text-petal",
              pathname === "/admin" && "text-petal"
            )}
          >
            {pathname === "/admin" ? (
              <motion.span layoutId="mobile-active-nav" className="absolute inset-0 rounded-2xl bg-blush shadow-cloud" />
            ) : null}
            <span className="relative inline-flex">
              <ShieldCheck className="h-5 w-5" aria-hidden />
            </span>
            <span className="relative leading-none">Админ</span>
          </Link>
        ) : null}
      </div>
    </nav>
  );
}
