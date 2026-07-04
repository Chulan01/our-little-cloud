import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { GlassCard } from "@/components/ui/Card";

/**
 * Shown when a non-admin lands on /admin. Intentionally plain — it reveals
 * nothing about the surprise, just that this area isn't for them.
 */
export function AdminLocked() {
  return (
    <main className="mx-auto flex min-h-[80vh] max-w-lg flex-col items-center justify-center px-5 text-center">
      <GlassCard className="w-full px-7 py-10">
        <span className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-blush text-petal">
          <ShieldAlert className="h-8 w-8" aria-hidden />
        </span>
        <h1 className="font-display text-3xl text-ink">Только для хранителя</h1>
        <p className="mt-3 leading-7 text-ink/70">
          Эта страница доступна лишь одному человеку. Если это ты — войди под своим аккаунтом.
        </p>
        <Link
          href="/"
          className="mt-7 inline-flex min-h-11 items-center justify-center rounded-full bg-petal px-6 py-2.5 text-sm font-semibold text-white shadow-cloud transition hover:shadow-glow"
        >
          На главную
        </Link>
      </GlassCard>
    </main>
  );
}
