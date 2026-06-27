"use client";

import { LogOut } from "lucide-react";
import { signOut } from "@/lib/actions/auth";
import { UNREAD_TOAST_WATERMARK_KEY } from "@/lib/toast";

// We clear the unread-toast watermark on sign-out so that signing back in
// with the same backlog still surfaces the "your partner left you a
// message" toast (otherwise the in-tab sessionStorage would suppress it).
export function SignOutButton() {
  return (
    <button
      type="button"
      onClick={() => {
        try {
          window.sessionStorage.removeItem(UNREAD_TOAST_WATERMARK_KEY);
        } catch {
          // sessionStorage may be unavailable (private mode) — ignore.
        }
        void signOut();
      }}
      className="rounded-full p-2 text-ink/55 transition hover:bg-white/60 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-petal"
      aria-label="Выйти"
    >
      <LogOut className="h-4 w-4" aria-hidden />
    </button>
  );
}
