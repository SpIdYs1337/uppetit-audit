import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          orange: "#F25C05",
          bg: "#0D0D0D",
        }
      }
    },
  },
  plugins: [],
};
export default config;