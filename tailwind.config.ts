import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "#10b981",
          light: "#34d399",
          dark: "#0f766e",
        },
      },
    },
  },
  plugins: [],
};

export default config;
