/**
 * Client config.
 *
 * The API modules under `modules/{Name}/api/` talk to INS-SERVICE over HTTP.
 * A few things stay local regardless (rating math, and a couple of
 * Nursing-only invented endpoints with no real `ins` counterpart — see
 * `quoteApi.js`'s header) because `ins` has no nursing product/rate data yet —
 * see each of those modules' own comments for why. That is a per-endpoint
 * decision made in each API module, not a build-wide switch.
 */

import { reportError } from "@/shared/observability/reporter";

/**
 * App environment label. Defaults to Vite's build MODE (development /
 * production), overridable via VITE_APP_ENV.
 */
export const APP_ENV = import.meta.env.VITE_APP_ENV || import.meta.env.MODE;

/**
 * Origin of INS-SERVICE. Empty means same-origin, which is the right default
 * when the portal is served behind the same host as the API — the session is
 * carried by HttpOnly cookies, and a cross-origin base needs CORS credentials
 * configured on the service before it will work at all.
 */
export const API_BASE = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/+$/, "");

/** INS-SERVICE's WebOrder API prefix. Every path this app calls sits under it. */
export const API_PREFIX = "/api/weborder/v1";

/**
 * Builds an absolute API URL from a path relative to {@link API_PREFIX}.
 *
 * @param path e.g. `"/orders"` or `"/orders/9001/documents/coi/download"`
 */
export const apiUrl = (path: string): string =>
  `${API_BASE}${API_PREFIX}${path.startsWith("/") ? path : `/${path}`}`;

/**
 * Centralised API error logging. Thin wrapper over
 * `shared/observability/reportError` tagged as a handled API failure
 * (`source: "api"`, `level: "warning"`) — the caller has already surfaced
 * something to the user, this is the monitoring backstop.
 *
 * `reportError` owns the PII posture: in production it logs status + message
 * only (this app's payloads carry name / DOB / SSN / address / card billing
 * and, with no server of our own, live only in the browser), and forwards to
 * Sentry — after scrubbing — when `VITE_SENTRY_DSN` is set. In development it
 * logs the full error.
 */
export const logApiError = (error: unknown): void => {
  reportError(error, { source: "api", level: "warning", handled: true });
};
