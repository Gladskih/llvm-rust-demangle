import js from "@eslint/js";
import globals from "globals";

export default [
  { ignores: [".build/**", "artifacts/**", "dist/**", "node_modules/**", "test-results/**"] },
  js.configs.recommended,
  { files: ["**/*.js", "**/*.mjs"], languageOptions: {
    globals: { ...globals.es2025, ...globals.node, ...globals.browser },
  } },
  { files: ["src/*.js"], rules: {
    "no-console": ["error", { allow: ["warn", "error"] }],
    "complexity": ["error", 9],
    "max-lines-per-function": ["error", 50],
    "quotes": ["error", "double", { avoidEscape: true }],
    "no-unused-vars": "error",
  } },
];
