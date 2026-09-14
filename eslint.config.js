// Flat ESLint config (ESLint 9). REACT_FRONTEND_AUDIT.md §10.1.
//
// Scope of this first adoption, deliberately narrow so the gate can go
// blocking without a multi-day cleanup:
//   - correctness/bug rules from @eslint/js + typescript-eslint `recommended`
//     (NOT the type-checked configs — those need a slow per-file type build
//     and surface hundreds of `any`-related findings that CLAUDE.md says are
//     by-design for the loose domain objects);
//   - `react-hooks` (this repo has hand-disabled `exhaustive-deps` in ~10
//     spots — the whole point of wiring the linter is to see them);
//   - `jsx-a11y` `recommended` (would have caught most of audit §5);
//   - `import-x` only for the cheap resolvable-import + no-duplicates checks
//     (cycle detection stays with madge — `npm run lint:cycles`).
// Formatting is Prettier's job; `eslint-config-prettier` turns off every
// stylistic rule here so the two never fight.

import js from "@eslint/js";
import tseslint from "typescript-eslint";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import jsxA11y from "eslint-plugin-jsx-a11y";
import importX from "eslint-plugin-import-x";
import prettier from "eslint-config-prettier";
import globals from "globals";

export default tseslint.config(
  {
    // Not source — never linted.
    ignores: ["dist/**", "node_modules/**", "coverage/**", "public/**"],
  },

  {
    // A `// eslint-disable` that no longer suppresses anything is a lie about
    // the code — fail on it so the suppression list stays honest (audit §10.1
    // "justify or delete every remaining disable").
    linterOptions: { reportUnusedDisableDirectives: "error" },
  },

  // ---- Base: all JS/TS source ------------------------------------------------
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.{js,jsx,ts,tsx}"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: { ...globals.browser, ...globals.es2024 },
    },
    plugins: { "import-x": importX },
    settings: {
      "import-x/resolver": { typescript: true, node: true },
    },
    rules: {
      "no-console": ["warn", { allow: ["warn", "error"] }],
      "no-debugger": "error",
      "no-unused-vars": "off",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_", ignoreRestSiblings: true },
      ],
      // Off by design, not by neglect: CLAUDE.md commits to typing the loose
      // domain rows (order / policy / question / submission — shapes `ins`
      // owns and does not publish) as `any`, matching `local/db.ts`'s
      // predicate contract. ~475 call sites; a `warn` here would bury every
      // other finding. `tsc --strict` still guards everything that *is* typed.
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-empty-object-type": "off",
      "import-x/no-duplicates": "warn",
      "import-x/no-useless-path-segments": "warn",
    },
  },

  // ---- React (TSX/JSX) -----------------------------------------------------
  {
    files: ["**/*.{jsx,tsx}"],
    ...react.configs.flat.recommended,
    ...react.configs.flat["jsx-runtime"],
    languageOptions: {
      ...react.configs.flat.recommended.languageOptions,
      globals: { ...globals.browser },
    },
    settings: { react: { version: "detect" } },
  },
  {
    files: ["**/*.{js,jsx,ts,tsx}"],
    plugins: { "react-hooks": reactHooks, "jsx-a11y": jsxA11y },
    rules: {
      ...reactHooks.configs.recommended.rules,
      ...jsxA11y.flatConfigs.recommended.rules,
      "react/prop-types": "off", // TypeScript covers this.
      "react/react-in-jsx-scope": "off", // react-jsx runtime.
      // Stripe's card Elements render cross-origin iframes wrapped in a
      // custom component — a `htmlFor`/`id` pair can't reach them, so we
      // nest them in the <label> and tell the rule they count as controls.
      "jsx-a11y/label-has-associated-control": [
        "error",
        {
          controlComponents: ["CardNumberElement", "CardExpiryElement", "CardCvcElement"],
          assert: "either",
        },
      ],
    },
  },

  // ---- The two `.js` islands: placeholder rate tables + dead engine --------
  // CLAUDE.md keeps these `.js` on purpose (`checkJs: false`). They are
  // data/vestigial, not app code — don't hold them to the TS rules.
  {
    files: ["src/modules/Quote/data/**/*.js", "src/modules/Quote/services/nursingRatingService.js"],
    rules: {
      "@typescript-eslint/no-unused-vars": "off",
      "no-unused-vars": "off",
    },
  },

  // ---- Tests -------------------------------------------------------------
  {
    files: ["**/*.{test,spec}.{js,jsx,ts,tsx}", "**/test/**"],
    languageOptions: { globals: { ...globals.node } },
    rules: {
      "no-console": "off",
      "@typescript-eslint/no-explicit-any": "off",
    },
  },

  // ---- Node-side files (build config, tooling) ---------------------------
  {
    files: ["*.config.{js,ts}", "config/upstream.default.js", "tools/**/*.{js,cjs}"],
    languageOptions: { globals: { ...globals.node } },
    rules: {
      "no-console": "off",
      "@typescript-eslint/no-require-imports": "off",
    },
  },

  // ---- Edge runtimes (Vercel + Netlify) ----------------------------------
  // Web-standard globals, not a DOM and not full Node. `process` is readable on
  // Vercel's edge runtime and `Netlify`/`Deno` on Netlify's — `config/upstream.js`
  // feature-detects all three, so declare the union here.
  {
    files: ["api/**/*.js", "netlify/edge-functions/**/*.js", "config/upstream.js"],
    languageOptions: {
      globals: {
        ...globals.deno,
        Netlify: "readonly",
        Deno: "readonly",
        process: "readonly",
      },
    },
    rules: { "no-console": "off" },
  },

  // Must stay LAST — disables every rule Prettier owns.
  prettier,
);
