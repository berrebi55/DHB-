// ESLint (lot 15) : erreurs réelles d'abord — règles recommandées JavaScript et
// TypeScript, règles des hooks React. Lancer : npm run lint
import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";

export default tseslint.config(
  { ignores: ["dist", "node_modules"] },
  {
    files: ["**/*.{ts,tsx}"],
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    languageOptions: { ecmaVersion: 2022, globals: globals.browser },
    plugins: { "react-hooks": reactHooks },
    rules: {
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
      // 31 « any » hérités (types Supabase non générés) : signalés, à typer progressivement.
      "@typescript-eslint/no-explicit-any": "warn",
      // Variables volontairement ignorées : préfixe « _ ».
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_", caughtErrors: "none" }],
    },
  },
);
