"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { navItems } from "./nav-items";
import { cn } from "@/lib/utils";

export function BottomTabBar() {
  const pathname = usePathname();
  return (
    <nav className="fixed inset-x-2 bottom-3 z-40 rounded-3xl bg-white/72 p-1.5 shadow-glow ring-1 ring-white/70 backdrop-blur-xl md:hidden" aria-label="Нижняя навигация">
      <div className="grid grid-cols-6 gap-1">
        {navItems.map((item) => {
          const active = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link key={item.href} href={item.href} className={cn("relative flex min-h-14 flex-col items-center justify-center gap-1 rounded-2xl text-[9px] font-semibold text-ink/55", active && "text-ink")}>
              {active ? <motion.span layoutId="mobile-active-nav" className="absolute inset-0 rounded-2xl bg-blush shadow-cloud" /> : null}
              <Icon className="relative h-5 w-5" aria-hidden />
              <span className="relative leading-none">{item.shortLabel}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
