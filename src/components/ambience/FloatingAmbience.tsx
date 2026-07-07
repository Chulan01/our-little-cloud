"use client";

import { motion, useReducedMotion } from "framer-motion";

type HeartItem = {
  left: string;
  top: string;
  size: number;
  opacity: number;
  duration: number;
  delay: number;
  x: [number, number, number, number];
  y: [number, number, number, number];
  rotate: [number, number, number, number];
  symbol: string;
};

const OUTLINE_HEART = "\u2661";
const FILLED_HEART = "\u2665";

const HEARTS: HeartItem[] = [
  { symbol: OUTLINE_HEART, left: "5%", top: "14%", size: 32, opacity: 0.54, duration: 24, delay: 0, x: [0, 80, 24, 0], y: [0, 46, -38, 0], rotate: [0, 18, -12, 0] },
  { symbol: FILLED_HEART, left: "12%", top: "72%", size: 24, opacity: 0.42, duration: 31, delay: 2, x: [0, -44, 74, 0], y: [0, -80, -20, 0], rotate: [0, -16, 10, 0] },
  { symbol: OUTLINE_HEART, left: "18%", top: "34%", size: 40, opacity: 0.48, duration: 35, delay: 5, x: [0, 58, -36, 0], y: [0, -44, 70, 0], rotate: [0, 12, -18, 0] },
  { symbol: OUTLINE_HEART, left: "26%", top: "86%", size: 30, opacity: 0.5, duration: 28, delay: 1, x: [0, 92, 28, 0], y: [0, -92, -36, 0], rotate: [0, 24, 6, 0] },
  { symbol: FILLED_HEART, left: "32%", top: "18%", size: 22, opacity: 0.38, duration: 26, delay: 4, x: [0, -70, -18, 0], y: [0, 58, -52, 0], rotate: [0, -20, 14, 0] },
  { symbol: OUTLINE_HEART, left: "38%", top: "58%", size: 34, opacity: 0.52, duration: 33, delay: 7, x: [0, 36, -86, 0], y: [0, -72, 32, 0], rotate: [0, 10, -22, 0] },
  { symbol: OUTLINE_HEART, left: "45%", top: "8%", size: 27, opacity: 0.43, duration: 30, delay: 3, x: [0, 64, -22, 0], y: [0, 78, 18, 0], rotate: [0, 18, -8, 0] },
  { symbol: FILLED_HEART, left: "51%", top: "42%", size: 23, opacity: 0.4, duration: 25, delay: 6, x: [0, -54, 62, 0], y: [0, -38, 76, 0], rotate: [0, -12, 20, 0] },
  { symbol: OUTLINE_HEART, left: "58%", top: "76%", size: 38, opacity: 0.5, duration: 36, delay: 9, x: [0, -96, -24, 0], y: [0, -64, -112, 0], rotate: [0, -26, 8, 0] },
  { symbol: OUTLINE_HEART, left: "64%", top: "22%", size: 31, opacity: 0.54, duration: 29, delay: 2, x: [0, 48, 92, 0], y: [0, 84, -24, 0], rotate: [0, 16, -18, 0] },
  { symbol: FILLED_HEART, left: "70%", top: "64%", size: 25, opacity: 0.42, duration: 32, delay: 8, x: [0, 72, -46, 0], y: [0, -90, 42, 0], rotate: [0, 22, -10, 0] },
  { symbol: OUTLINE_HEART, left: "78%", top: "12%", size: 44, opacity: 0.44, duration: 39, delay: 10, x: [0, -62, 34, 0], y: [0, 66, 118, 0], rotate: [0, -14, 26, 0] },
  { symbol: OUTLINE_HEART, left: "84%", top: "48%", size: 33, opacity: 0.52, duration: 27, delay: 5, x: [0, -84, -38, 0], y: [0, 52, -76, 0], rotate: [0, -24, 12, 0] },
  { symbol: FILLED_HEART, left: "91%", top: "82%", size: 24, opacity: 0.4, duration: 34, delay: 1, x: [0, -118, -54, 0], y: [0, -74, -126, 0], rotate: [0, -18, 16, 0] },
  { symbol: OUTLINE_HEART, left: "7%", top: "49%", size: 36, opacity: 0.5, duration: 37, delay: 11, x: [0, 104, 42, 0], y: [0, -58, 88, 0], rotate: [0, 28, -6, 0] },
  { symbol: OUTLINE_HEART, left: "22%", top: "6%", size: 29, opacity: 0.44, duration: 30, delay: 13, x: [0, -36, 72, 0], y: [0, 96, 44, 0], rotate: [0, -10, 22, 0] },
  { symbol: FILLED_HEART, left: "41%", top: "92%", size: 22, opacity: 0.4, duration: 23, delay: 6, x: [0, 56, -64, 0], y: [0, -118, -48, 0], rotate: [0, 16, -18, 0] },
  { symbol: OUTLINE_HEART, left: "55%", top: "31%", size: 30, opacity: 0.48, duration: 28, delay: 12, x: [0, -76, 38, 0], y: [0, 60, -90, 0], rotate: [0, -22, 8, 0] },
  { symbol: OUTLINE_HEART, left: "73%", top: "90%", size: 35, opacity: 0.46, duration: 38, delay: 15, x: [0, 44, -102, 0], y: [0, -100, -42, 0], rotate: [0, 12, -28, 0] },
  { symbol: FILLED_HEART, left: "94%", top: "28%", size: 23, opacity: 0.4, duration: 26, delay: 4, x: [0, -86, -132, 0], y: [0, 38, 94, 0], rotate: [0, -18, 20, 0] }
];

export function FloatingAmbience() {
  const reducedMotion = useReducedMotion();

  return (
    <div className="pointer-events-none fixed inset-0 z-30 overflow-hidden" data-floating-layer="true" aria-hidden>
      {HEARTS.map((heart, index) => (
        <motion.span
          key={`${heart.left}-${heart.top}-${index}`}
          data-floating-heart="true"
          className="absolute select-none font-display leading-none"
          style={{
            left: heart.left,
            top: heart.top,
            color: "var(--season-heart, #ec5f9c)",
            fontSize: heart.size,
            opacity: heart.opacity,
            textShadow: "0 8px 22px rgba(236, 95, 156, 0.45), 0 0 2px rgba(255, 255, 255, 0.9)"
          }}
          animate={
            reducedMotion
              ? { opacity: heart.opacity }
              : {
                  x: heart.x,
                  y: heart.y,
                  rotate: heart.rotate,
                  scale: [1, 1.12, 0.92, 1],
                  opacity: [heart.opacity * 0.72, heart.opacity, heart.opacity * 0.86, heart.opacity * 0.72]
                }
          }
          transition={{
            duration: reducedMotion ? 0 : heart.duration,
            delay: heart.delay,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        >
          {heart.symbol}
        </motion.span>
      ))}
    </div>
  );
}
