import { defineConfig } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    files: ["tests/**/*.cjs"],
    // Node's built-in test runner and isolated CommonJS module loader.
    rules: { "@typescript-eslint/no-require-imports": "off" },
  },
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "dist/**",
      "build/**",
      "out/**",
      "**/*.min.js",
      "next-env.d.ts"
    ]
  },
  
]);
