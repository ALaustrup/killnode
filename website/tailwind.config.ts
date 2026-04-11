import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        neon: {
          red: "#ff0000",
          cyan: "#00ffff",
          dim: "#1a1a1f",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      fontFamily: {
        sans: ["var(--font-geist-sans)", "system-ui", "sans-serif"],
        display: ["var(--font-orbitron)", "system-ui", "sans-serif"],
      },
      keyframes: {
        "pulse-neural": {
          "0%, 100%": {
            opacity: "1",
            filter: "drop-shadow(0 0 8px #ff003c) drop-shadow(0 0 16px #00f0ff)",
          },
          "50%": {
            opacity: "0.85",
            filter: "drop-shadow(0 0 20px #ff003c) drop-shadow(0 0 28px #00f0ff)",
          },
        },
        "border-glow": {
          "0%, 100%": { borderColor: "rgba(255,0,60,0.5)" },
          "50%": { borderColor: "rgba(0,240,255,0.6)" },
        },
      },
      animation: {
        "pulse-neural": "pulse-neural 2.4s ease-in-out infinite",
        "border-glow": "border-glow 3s ease-in-out infinite",
      },
      boxShadow: {
        neon: "0 0 20px rgba(255,0,60,0.35), 0 0 40px rgba(0,240,255,0.15)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
