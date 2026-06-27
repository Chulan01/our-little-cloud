import type { Variants } from "framer-motion";

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 18 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.55, ease: "easeInOut" } }
};

export const stagger: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.08
    }
  }
};

export const pageTransition: Variants = {
  // The previous 450 ms + 250 ms transition was the dominant source of the
  // perceived 1-2 second tab-switch lag on top of `force-dynamic` server
  // renders. The fade is now opacity-only and short, so the new page can
  // paint as soon as the server response lands instead of sliding in late.
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.15, ease: "easeOut" } },
  exit: { opacity: 0, transition: { duration: 0.1, ease: "easeIn" } }
};
