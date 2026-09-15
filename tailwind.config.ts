import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        primary: { DEFAULT: "#148779", dark: "#0F766E", light: "#E8F6F3" },
        navy: "#1E4066", "navy-dark": "#102A43", ink: "#102A43",
        muted: "#526173", surface: "#FFFFFF", bg: "#F3F7FB",
        success: "#148779", warning: "#D97706", danger: "#C2414B"
      },
      borderRadius: { sm: "6px", md: "8px", lg: "10px" },
      boxShadow: { card: "0 1px 2px rgba(16,42,67,0.04)" },
      fontFamily: { sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"] }
    }
  },
  plugins: []
};
export default config;
