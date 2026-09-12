// Canonical default backend base URL — the single source of truth for the
// upstream host when no platform env var overrides it.
//
// Consumed by:
//   - config/upstream.js         → the Netlify edge proxy (runtime, Deno).
//   - vite.config.js             → the dev-server proxy target (`npm run dev`).
//
// Override per environment WITHOUT editing this file:
//   - Local:   VITE_UPSTREAM_URL in .env.local (gitignored).
//   - Netlify: Site settings → Environment variables, scoped per deploy context.
//
// Plain ESM so it can be imported from both Node (Vite config) and Deno (edge).
export const DEFAULT_UPSTREAM_URL = "http://localhost:8089";
