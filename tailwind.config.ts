import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        primary: { DEFAULT: "#804663", dark: "#69364F", light: "#F3E8E9" },
        navy: "#4D3942", "navy-dark": "#33252C", ink: "#30262A",
        muted: "#756970", surface: "#FFFCF8", bg: "#FAF6F0",
        success: "#39705C", warning: "#B66B23", danger: "#AE4A4A"
      },
      borderRadius: { sm: "10px", md: "16px", lg: "20px" },
      boxShadow: { card: "0 2px 3px rgba(63,42,32,0.04)" },
      fontFamily: { sans: ["Arial", "Helvetica", "ui-sans-serif", "sans-serif"], serif: ["Georgia", "Times New Roman", "serif"] }
    }
  },
  plugins: []
};
export default config;
