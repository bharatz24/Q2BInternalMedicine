// Backend base URL for the Netlify edge proxy (netlify/edge-functions/api-proxy.js).
// The proxy runs on Deno and reads VITE_UPSTREAM_URL from the Netlify deploy-context
// environment (Site settings → Environment variables, set per context). Edge
// functions cannot read repo .env files, so when the platform var is unset we fall
// back to DEFAULT_UPSTREAM_URL — the shared default that the dev proxy uses too.
// This mirrors Vite's precedence: a platform env var wins, otherwise the default.
import { DEFAULT_UPSTREAM_URL } from "./upstream.default.js";

const raw =
  (typeof Netlify !== "undefined" && Netlify.env?.get("VITE_UPSTREAM_URL")) ||
  (typeof Deno !== "undefined" && Deno.env?.get("VITE_UPSTREAM_URL")) ||
  DEFAULT_UPSTREAM_URL;

export const UPSTREAM_URL = raw.replace(/\/+$/, "");
