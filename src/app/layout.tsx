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
  return (
    <html lang="ru" className={`${playfair.variable} ${inter.variable} ${caveat.variable}`}>
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
