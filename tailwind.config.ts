import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        cloud: "#fff0f8",
        blush: "#ffe4f3",
        petal: "#fcc6e0",
        peach: "#ffe0d4",
        mist: "#f7f7fb",
        ink: "#6b5563",
        glow: "#ffd6ec",
        cream: "#fffaf6"
      },
      fontFamily: {
        display: ["var(--font-playfair)", "serif"],
        sans: ["var(--font-inter)", "ui-sans-serif", "system-ui"],
        script: ["var(--font-caveat)", "cursive"]
      },
      boxShadow: {
        cloud: "0 8px 40px -12px rgba(252, 198, 224, 0.6)",
        glow: "0 0 0 1px rgba(255,255,255,0.7), 0 18px 60px -24px rgba(252, 198, 224, 0.9)"
      },
      keyframes: {
        breathe: {
          "0%, 100%": { transform: "scale(1)", opacity: "0.75" },
          "50%": { transform: "scale(1.06)", opacity: "1" }
        }
      },
      animation: {
        breathe: "breathe 3.5s ease-in-out infinite"
      }
    }
  },
  plugins: []
};

export default config;
