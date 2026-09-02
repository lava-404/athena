import type { Config } from "tailwindcss";

// Design tokens for FocusRoom.
// Palette chosen deliberately for a "study nook" feeling: cool paper
// background, ink navy for structure/text, warm amber for the Buddy's
// warmth, coral reserved ONLY for nudges (so it stays meaningful, not
// decorative), and sage for calm/success confirmations.
const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        paper: "#F4F7F6",
        "paper-dark": "#0F1613",
        ink: "#182620",
        "ink-soft": "#3C5148",
        amber: {
          DEFAULT: "#F2A65A",
          soft: "#FBDDB6",
          deep: "#C97F2F",
        },
        coral: {
          DEFAULT: "#F0665A",
          soft: "#FCD9D5",
        },
        sage: {
          DEFAULT: "#6FA989",
          soft: "#D9EBE1",
          deep: "#3F7A5D",
        },
        teal: {
          DEFAULT: "#1F3B33",
          soft: "#2C4C42",
        },
      },
      fontFamily: {
        display: ["var(--font-display)", "sans-serif"],
        body: ["var(--font-body)", "sans-serif"],
      },
      borderRadius: {
        blob: "42% 58% 63% 37% / 41% 44% 56% 59%",
      },
      boxShadow: {
        soft: "0 8px 30px -12px rgba(24, 38, 32, 0.25)",
        buddy: "0 20px 60px -20px rgba(201, 127, 47, 0.45)",
      },
      keyframes: {
        breathe: {
          "0%, 100%": { transform: "scale(1)" },
          "50%": { transform: "scale(1.035)" },
        },
        blink: {
          "0%, 96%, 100%": { transform: "scaleY(1)" },
          "98%": { transform: "scaleY(0.08)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-6px)" },
        },
      },
      animation: {
        breathe: "breathe 4.5s ease-in-out infinite",
        blink: "blink 4.2s ease-in-out infinite",
        float: "float 5s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
