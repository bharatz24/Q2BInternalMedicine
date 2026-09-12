/// <reference types="vite/client" />

/**
 * Build-time env this app reads (in addition to Vite's own `MODE` / `DEV` /
 * `PROD`). All optional — the app runs with none of them set.
 */
interface ImportMetaEnv {
  /** INS-SERVICE origin; empty = same-origin (the deployed default). */
  readonly VITE_API_BASE_URL?: string;
  /** Dev-proxy upstream (`vite.config.js` only). */
  readonly VITE_UPSTREAM_URL?: string;
  /** Environment label; falls back to Vite's `MODE`. */
  readonly VITE_APP_ENV?: string;

  /**
   * Sentry ingest DSN. When set, `src/shared/observability/` lazy-loads
   * `@sentry/react` and forwards crashes + handled API errors to it. Unset
   * (the default) → console-only reporting, and the Sentry chunk is never
   * downloaded.
   */
  readonly VITE_SENTRY_DSN?: string;
  /** Sentry `environment` tag; falls back to `MODE`. */
  readonly VITE_SENTRY_ENVIRONMENT?: string;
  /** Release identifier for Sentry (e.g. the deploy commit SHA). */
  readonly VITE_APP_RELEASE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
