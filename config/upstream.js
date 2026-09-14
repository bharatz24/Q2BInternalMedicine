// Backend base URL for the production `/api/*` edge proxy —
// `api/[...path].js` on Vercel, `netlify/edge-functions/api-proxy.js` on
// Netlify. Both read VITE_UPSTREAM_URL from the platform's deploy-context
// environment (Vercel: Project Settings → Environment Variables, per
// environment; Netlify: Site settings → Environment variables, per context).
// Edge functions cannot read repo .env files, so when the platform var is
// unset we fall back to DEFAULT_UPSTREAM_URL — the shared default that the dev
// proxy uses too. This mirrors Vite's precedence: a platform env var wins,
// otherwise the default.
//
// The three lookups cover the three runtimes this file is loaded in: Vercel's
// edge runtime exposes `process.env`, Netlify's exposes `Netlify.env`, and a
// plain `netlify dev`/Deno run exposes `Deno.env`.
import { DEFAULT_UPSTREAM_URL } from "./upstream.default.js";

const raw =
  (typeof process !== "undefined" && process.env?.VITE_UPSTREAM_URL) ||
  (typeof Netlify !== "undefined" && Netlify.env?.get("VITE_UPSTREAM_URL")) ||
  (typeof Deno !== "undefined" && Deno.env?.get("VITE_UPSTREAM_URL")) ||
  DEFAULT_UPSTREAM_URL;

export const UPSTREAM_URL = raw.replace(/\/+$/, "");
