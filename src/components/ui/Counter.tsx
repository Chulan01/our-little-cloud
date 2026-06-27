"use client";

import { animate, motion, useMotionValue, useTransform } from "framer-motion";
import { useEffect } from "react";

export function Counter({ value }: { value: number }) {
  const finiteValue = Number.isFinite(value) ? value : 0;
  const motionValue = useMotionValue(finiteValue);
  const rounded = useTransform(motionValue, (latest) => (Number.isFinite(value) ? Math.round(latest).toLocaleString("ru-RU") : "\u221e"));

  useEffect(() => {
    const controls = animate(motionValue, finiteValue, { duration: 0.7, ease: "easeInOut" });
    return controls.stop;
  }, [motionValue, finiteValue]);

  return <motion.span>{rounded}</motion.span>;
}
