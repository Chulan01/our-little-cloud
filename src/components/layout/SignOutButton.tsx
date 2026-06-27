"use client";

import { LogOut } from "lucide-react";
import { signOut } from "@/lib/actions/auth";

export function SignOutButton() {
  return (
    <button
      type="button"
      onClick={() => {
        void signOut();
      }}
      className="rounded-full p-2 text-ink/55 transition hover:bg-white/60 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-petal"
      aria-label="Выйти"
    >
      <LogOut className="h-4 w-4" aria-hidden />
    </button>
  );
}
