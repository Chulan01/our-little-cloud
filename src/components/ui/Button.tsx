"use client";

import { motion } from "framer-motion";
import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { cn } from "@/lib/utils";

type ButtonVariant = "primary" | "soft" | "ghost";

export interface ButtonProps extends Omit<ComponentPropsWithoutRef<typeof motion.button>, "children"> {
  variant?: ButtonVariant;
  icon?: ReactNode;
  children?: ReactNode;
}

export function Button({ className, variant = "primary", icon, children, ...props }: ButtonProps) {
  return (
    <motion.button
      whileTap={{ scale: 0.97 }}
      whileHover={{ y: -1 }}
      className={cn(
        "inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold outline-none transition focus-visible:ring-2 focus-visible:ring-petal focus-visible:ring-offset-2 focus-visible:ring-offset-cloud",
        variant === "primary" && "bg-petal text-white shadow-cloud hover:shadow-glow",
        variant === "soft" && "bg-white/70 text-ink shadow-cloud hover:bg-white",
        variant === "ghost" && "bg-transparent text-ink hover:bg-white/50",
        className
      )}
      {...props}
    >
      {icon}
      {children}
    </motion.button>
  );
}
