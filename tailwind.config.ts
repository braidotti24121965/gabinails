import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        primary: { DEFAULT: "#7C3AED", dark: "#6D28D9", light: "#F3E8FF" },
        navy: "#33264A", "navy-dark": "#241A35", ink: "#2D2438",
        muted: "#73677D", surface: "#FFFFFF", bg: "#FAF8FC",
        success: "#15803D", warning: "#B45309", danger: "#BE123C"
      },
      borderRadius: { sm: "8px", md: "12px", lg: "16px" },
      boxShadow: { card: "0 3px 16px rgba(45,36,56,0.06)" },
      fontFamily: { sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"] }
    }
  },
  plugins: []
};
export default config;
