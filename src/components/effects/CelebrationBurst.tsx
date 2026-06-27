"use client";

import { AnimatePresence, motion } from "framer-motion";

const PARTICLES = ["♡", "✦", "✧", "♥", "⋆", "♡", "✦"];

export function CelebrationBurst({ trigger }: { trigger: number }) {
  return (
    <AnimatePresence>
      {trigger > 0 ? (
        <span className="pointer-events-none absolute inset-0 overflow-visible" aria-hidden>
          {PARTICLES.map((particle, index) => {
            const side = index % 2 === 0 ? 1 : -1;
            return (
              <motion.span
                key={`${trigger}-${index}`}
                className="absolute left-1/2 top-1/2 text-petal drop-shadow"
                initial={{ opacity: 0, x: 0, y: 0, scale: 0.6, rotate: 0 }}
                animate={{
                  opacity: [0, 1, 0],
                  x: side * (18 + index * 8),
                  y: -26 - index * 7,
                  scale: [0.6, 1.15, 0.8],
                  rotate: side * (18 + index * 6)
                }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.9, ease: "easeOut" }}
              >
                {particle}
              </motion.span>
            );
          })}
        </span>
      ) : null}
    </AnimatePresence>
  );
}
