"use client";

import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";

const STORAGE_KEY = "our-cloud-theme";

export function ThemeToggle() {
  const [theme, setTheme] = useState<"day" | "night">("day");

  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY) === "night" ? "night" : "day";
    setTheme(saved);
    document.documentElement.dataset.theme = saved;
  }, []);

  const toggle = () => {
    const next = theme === "night" ? "day" : "night";
    setTheme(next);
    window.localStorage.setItem(STORAGE_KEY, next);
    document.documentElement.dataset.theme = next;
  };

  return (
    <motion.button
      type="button"
      aria-label={theme === "night" ? "Включить дневную тему" : "Включить ночную тему"}
      className="fixed right-4 top-4 z-50 flex h-11 w-11 items-center justify-center rounded-full bg-white/70 text-ink shadow-cloud ring-1 ring-white/70 backdrop-blur-xl transition hover:bg-white md:right-6 md:top-6"
      whileTap={{ scale: 0.94 }}
      whileHover={{ y: -1 }}
      onClick={toggle}
    >
      {theme === "night" ? <Sun className="h-5 w-5" aria-hidden /> : <Moon className="h-5 w-5" aria-hidden />}
    </motion.button>
  );
}
