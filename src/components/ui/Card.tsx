import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("rounded-3xl bg-white/72 p-5 shadow-cloud ring-1 ring-white/70", className)} {...props} />;
}

export function GlassCard({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("rounded-3xl bg-white/45 p-5 shadow-glow ring-1 ring-white/60 backdrop-blur-xl", className)} {...props} />;
}
