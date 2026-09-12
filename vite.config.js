/// <reference types="vitest" />
import { defineConfig, loadEnv } from "vite";
import { fileURLToPath, URL } from "node:url";
import react from "@vitejs/plugin-react";
import { DEFAULT_UPSTREAM_URL } from "./config/upstream.default.js";

// Auth, profile, dashboard, speciality and (non-submission-scoped) payment
// calls talk to INS-SERVICE for real; submission creation, the question
// tree and rating math stay local under `src/local/` (see
// shared/services/config.js and each api/*.js module for why). This dev
// proxy forwards /api/* to a local `ins` so source can use same-origin URLs
// during `npm run dev`. A production build doesn't use this — the deployed
// app calls same-origin /api/* which the Netlify edge proxy
// (netlify/edge-functions/api-proxy.js) forwards upstream.
//
// Port 4500 (Nfy 4200, Student 4201/5174, Nursing 4400) so this can run side
// by side with the other portals while they're being visually diffed.
export default defineConfig(({ mode, command }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const upstreamUrl = String(env.VITE_UPSTREAM_URL || DEFAULT_UPSTREAM_URL).replace(/\/+$/, "");

  return {
    plugins: [react()],
    resolve: {
      alias: {
        "@": fileURLToPath(new URL("./src", import.meta.url)),
      },
    },
    server: {
      port: 4500,
      // Dev proxy: forwards /api/* to upstream so source can use same-origin
      // URLs. Rewrites Set-Cookie the same way Nfy's Netlify edge proxy does
      // in prod — drops Domain, drops Secure (localhost is http), and
      // downgrades SameSite=None to Lax so the browser actually stores the
      // auth cookie on localhost.
      proxy: {
        "/api": {
          target: upstreamUrl,
          changeOrigin: true,
          configure: (proxy) => {
            proxy.on("proxyRes", (proxyRes) => {
              const cookies = proxyRes.headers["set-cookie"];
              if (!cookies) return;
              proxyRes.headers["set-cookie"] = cookies.map((c) =>
                c
                  .replace(/;\s*Domain=[^;]+/gi, "")
                  .replace(/;\s*Path=[^;]+/gi, "; Path=/")
                  .replace(/;\s*Secure/gi, "")
                  .replace(/;\s*SameSite=None/gi, "; SameSite=Lax")
                  .replace(/;\s*Partitioned/gi, ""),
              );
            });
          },
        },
      },
    },
    preview: { port: 4500 },
    build: {
      outDir: "dist",
      // Source maps: OFF by default (a published .map reconstructs the full
      // commented source — internal rationale, endpoint list, the validator
      // regexes that mirror the backend contract — REACT_FRONTEND_AUDIT.md
      // area 4).
      //
      // When the build carries a Sentry DSN, emit them as 'hidden' instead:
      // the .map files are written WITHOUT the `//# sourceMappingURL` comment,
      // so they don't self-advertise on the CDN. The deploy step should then
      // upload `dist/assets/*.map` to Sentry (`sentry-cli sourcemaps`) and
      // delete them from `dist/` before publish, so stack traces de-minify in
      // the error tracker but the maps never reach a browser.
      sourcemap: env.VITE_SENTRY_DSN ? "hidden" : false,
      rollupOptions: {
        output: {
          // Split the heavy, rarely-changing third-party code out of the app
          // chunk so (a) a marketing-landing visitor doesn't pay for the
          // payment/query stack up front and (b) these chunks stay in the
          // browser cache across app deploys. Route-level `React.lazy` in
          // AppRoutes.tsx / FlowLayout.tsx does the per-page splitting.
          manualChunks: {
            "vendor-react": ["react", "react-dom", "react-router", "react-router-dom"],
            "vendor-query": ["@tanstack/react-query"],
            "vendor-stripe": ["@stripe/react-stripe-js", "@stripe/stripe-js"],
          },
        },
      },
    },
    // Strip stray `debugger` statements from production bundles. We deliberately
    // keep `console.*` — every call in the codebase is an intentional diagnostic
    // (ErrorBoundary, global error handlers, logApiError) and the PII-safe
    // formatting lives in logApiError itself. Dropping console.* would silently
    // hide real production errors.
    //
    // Gated on Vite's own `command` (`"build"` for every `vite build`), NOT on
    // `process.env.NODE_ENV` — a plain `vite build` does not guarantee that env
    // var is exported by the build environment, so the old check could let
    // `debugger` survive in a prod bundle (REACT_FRONTEND_AUDIT.md §8.5).
    esbuild: {
      drop: command === "build" ? ["debugger"] : [],
    },
    // The suite covers the rating engine and its two helpers — all pure, no DOM,
    // so the default node environment is enough and jsdom stays out of the tree.
    test: {
      environment: "node",
      include: ["src/**/*.test.js"],
    },
  };
});
