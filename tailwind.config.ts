import type { Config } from "tailwindcss";

// Palette sampled from buffer.com: mint #B0EC9C, forest ink #213130, dark button #283E3D, banner #121B1B.
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: { DEFAULT: "#283E3D", light: "#4B6B66", navy: "#121B1B", yellow: "#FADE2A", ink: "#213130" },
        mint: { DEFAULT: "#B0EC9C", dark: "#9BE384", soft: "#EAF9E4" },
      },
      fontFamily: { sans: ["var(--font-sans)", "system-ui", "sans-serif"] },
      borderRadius: { md: "0.75rem", lg: "1rem", xl: "1.25rem", "2xl": "1.5rem", "3xl": "2rem" },
      boxShadow: { card: "0 1px 2px rgba(33,49,48,0.05), 0 8px 24px rgba(33,49,48,0.06)", lift: "0 2px 4px rgba(33,49,48,0.06), 0 16px 40px rgba(33,49,48,0.12)" },
    },
  },
  plugins: [],
};
export default config;
