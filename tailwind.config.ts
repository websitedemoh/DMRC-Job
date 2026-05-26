import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        ink: "#17202a",
        paper: "#f7f8fa",
        accent: "#0f766e",
        warning: "#8a4b10"
      },
      boxShadow: {
        soft: "0 24px 70px rgba(23, 32, 42, 0.08)"
      }
    }
  },
  plugins: []
};

export default config;
