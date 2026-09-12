import { QueryClient } from "@tanstack/react-query";

/**
 * The app's single QueryClient. Owns server-state caching, dedup, staleness
 * and retry/backoff for every `GET` — replacing the per-module `loading` /
 * `error` store fields and hand-rolled `inflightBySid` / `cacheKey` maps the
 * prior audit (area 2) flagged as "a place a stale-data or double-fetch bug
 * can live".
 *
 * Defaults chosen for a linear quote-to-bind funnel — not a dashboard app:
 *
 * - `staleTime: 30s` — a page revisited inside 30s (Back/Continue in the
 *   wizard) serves from cache with no refetch. Long enough to kill the
 *   double-fetch, short enough that a resumed order re-reads fresh state.
 * - `gcTime: 5m` — an unmounted query's data survives a few route changes.
 * - `refetchOnWindowFocus: false` — the user tabbing to their bank / DocuSign
 *   and back must NOT silently re-fire `/insured/order` mid-payment.
 * - `refetchOnReconnect: true` — but a dropped connection coming back should.
 * - `retry` — up to 2 retries for transient (5xx / network) failures with
 *   exponential backoff + jitter; never retry a 4xx (the answer won't change)
 *   and never retry a 401 (httpClient's interceptor owns refresh-and-retry).
 *
 * Mutations are NOT retried here — POSTs in this app (submission create,
 * payment confirm, question save) are not idempotent.
 */

/** Pull an HTTP status off whatever error shape the api layer threw. */
export function httpStatusOf(error: unknown): number | undefined {
  const res = (error as { response?: { status?: unknown } } | null | undefined)?.response;
  const status = res?.status;
  return typeof status === "number" ? status : undefined;
}

export function makeQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        gcTime: 5 * 60_000,
        refetchOnWindowFocus: false,
        refetchOnReconnect: true,
        retry: (failureCount, error) => {
          const status = httpStatusOf(error);
          if (status != null && status >= 400 && status < 500) return false;
          return failureCount < 2;
        },
        retryDelay: (attempt) =>
          Math.min(1_000 * 2 ** attempt, 8_000) + Math.floor(Math.random() * 250),
      },
      mutations: {
        retry: false,
      },
    },
  });
}

/**
 * Module-level singleton. The app has exactly one client; sharing it here
 * (rather than only through context) lets non-component code — the bootstrap
 * hooks' imperative rehydrate, the resume-order handler — reach the same
 * cache via `queryClient.query(...)`.
 */
export const queryClient = makeQueryClient();

// Dev-only console handle for cache inspection (replaces the devtools panel,
// which rendered in normal flow and left a full-viewport blank strip under
// every page). `window.__qc.getQueryCache().getAll()` etc.
if (import.meta.env.DEV && typeof window !== "undefined") {
  (window as unknown as { __qc?: QueryClient }).__qc = queryClient;
}
