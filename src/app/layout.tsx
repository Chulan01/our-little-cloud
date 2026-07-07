import type { Metadata } from "next";
import { Caveat, Inter, Playfair_Display } from "next/font/google";
import type { ReactNode } from "react";
import { FloatingAmbience } from "@/components/ambience/FloatingAmbience";
import { HugWidget } from "@/components/effects/HugWidget";
import { BottomTabBar } from "@/components/layout/BottomTabBar";
import { MessageNotifListener } from "@/components/layout/MessageNotifListener";
import { Navbar } from "@/components/layout/Navbar";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { ToastContainer } from "@/components/ui/ToastContainer";
import { getUnreadMessageCount } from "@/lib/actions/messages";
import { getSiteAccess } from "@/lib/auth/admin";
import { getCurrentSeason } from "@/lib/season";
import "./globals.css";

const playfair = Playfair_Display({ subsets: ["cyrillic", "latin"], variable: "--font-playfair", display: "swap" });
const inter = Inter({ subsets: ["cyrillic", "latin"], variable: "--font-inter", display: "swap" });
const caveat = Caveat({ subsets: ["cyrillic", "latin"], variable: "--font-caveat", display: "swap" });

export const metadata: Metadata = {
  title: "Наше Облачко",
  description: "Приватный дневник для двух влюбленных."
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  // Fetched on every server render (the layout is revalidated on
  // sendMessage / markAsRead via `revalidatePath("/", "layout")`).
  const [unreadSecret, access] = await Promise.all([getUnreadMessageCount(), getSiteAccess()]);
  // Seasonal accent theming is decided server-side from the current date so
  // there's no flash of the wrong palette on load. The base pink brand stays
  // the same all year; only accents shift (see globals.css [data-season]).
  const season = getCurrentSeason();
  return (
    <html lang="ru" data-season={season} className={`${playfair.variable} ${inter.variable} ${caveat.variable}`}>
      <body className="font-sans">
        <FloatingAmbience />
        <ThemeToggle />
        <Navbar unreadSecret={unreadSecret} canViewAll={access.canView} isAdmin={access.admin} />
        {children}
        <HugWidget />
        <BottomTabBar unreadSecret={unreadSecret} canViewAll={access.canView} isAdmin={access.admin} />
        <ToastContainer />
        <MessageNotifListener initial={unreadSecret} />
      </body>
    </html>
  );
}
