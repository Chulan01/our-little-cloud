"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { navItems } from "./nav-items";
import { SignOutButton } from "./SignOutButton";
import { cn } from "@/lib/utils";

export function Navbar({ unreadSecret = 0 }: { unreadSecret?: number } = {}) {
  const pathname = usePathname();
  return (
    <header className="sticky top-4 z-40 mx-auto hidden w-[min(1120px,calc(100%-2rem))] rounded-full bg-white/55 px-3 py-2 shadow-cloud ring-1 ring-white/70 backdrop-blur-xl md:block">
      <nav className="flex items-center justify-between gap-1" aria-label="Основная навигация">
        {navItems.map((item) => {
          const active = pathname === item.href;
          const Icon = item.icon;
          const showBadge = item.href === "/secret" && unreadSecret > 0;
          return (
            <Link key={item.href} href={item.href} className={cn("relative flex min-h-11 items-center gap-2 rounded-full px-3 text-sm font-medium text-ink/70 transition hover:text-ink lg:px-4", active && "text-ink")}>
              {active ? <motion.span className="absolute inset-0 rounded-full bg-blush shadow-cloud" layoutId="desktop-active-nav" /> : null}
              <span className="relative inline-flex">
                <Icon className="h-4 w-4" aria-hidden />
                {showBadge ? (
                  <span aria-label={`${unreadSecret} непрочитанных сообщений`} className="absolute -right-2.5 -top-2 inline-flex min-w-[18px] items-center justify-center rounded-full bg-petal px-1 text-[10px] font-bold leading-none text-white shadow-cloud ring-1 ring-white/70">
                    {unreadSecret >= 10 ? "9+" : unreadSecret}
                  </span>
                ) : null}
              </span>
              <span className="relative">{item.label}</span>
            </Link>
          );
        })}
        <SignOutButton />
      </nav>
    </header>
  );
}
