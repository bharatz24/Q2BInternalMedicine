/**
 * Provider-agnostic error reporting — the one sink every crash path funnels
 * through:
 *
 *  - React render errors           → `ErrorBoundary.componentDidCatch`
 *  - unhandled promise rejections  → `main.tsx` `unhandledrejection` handler
 *  - uncaught runtime errors       → `main.tsx` `error` handler
 *  - handled API failures          → `logApiError` (`shared/services/config.ts`)
 *
 * Two back-ends:
 *
 *  1. **console** — always on. In production it prints status + message only:
 *     this app's request payloads carry PII (name, DOB, SSN, address, card
 *     billing) and with no server of our own that data lives only in the
 *     browser, so the console is the one place it could leak. In development
 *     it prints the full error.
 *
 *  2. **Sentry** — on only when `VITE_SENTRY_DSN` is set at build time. The
 *     adapter (`./sentry`) is imported dynamically, so `@sentry/react` lands
 *     in its own chunk that a DSN-less build never downloads. It scrubs the
 *     request body / headers / cookies off captured errors for the same PII
 *     reason (see `./sentry` `beforeSend`).
 *
 * Going live with Sentry needs no code change: set `VITE_SENTRY_DSN` (and
 * optionally `VITE_SENTRY_ENVIRONMENT`, `VITE_APP_RELEASE`) in the Netlify
 * build environment, and flip `vite.config.js` `build.sourcemap` to
 * `'hidden'` + upload `dist/assets/*.map` to Sentry in the deploy step.
 */

export type ReportLevel = "fatal" | "error" | "warning";

export interface ReportContext {
  /** Origin of the report: `"errorBoundary"`, `"unhandledrejection"`, `"window.error"`, `"api"`. */
  source?: string;
  /** Severity. Unhandled crashes are `"error"` / `"fatal"`; caught-and-surfaced API failures are `"warning"`. */
  level?: ReportLevel;
  /** `true` when the app already showed the user something for this — lets alerting rules mute handled noise. */
  handled?: boolean;
  /** React component stack (ErrorBoundary reports only). */
  componentStack?: string;
  /** Extra non-PII tags/context. */
  extra?: Record<string, unknown>;
}

const DSN = import.meta.env.VITE_SENTRY_DSN;
const isDev = import.meta.env.DEV;

/** Pull an HTTP status off whatever error shape the API layer threw. */
function statusOf(error: unknown): number | undefined {
  const res = (error as { response?: { status?: unknown } } | null | undefined)?.response;
  return typeof res?.status === "number" ? res.status : undefined;
}

function messageOf(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  const m = (error as { message?: unknown } | null | undefined)?.message;
  return typeof m === "string" && m ? m : "request failed";
}

function logToConsole(error: unknown, context: ReportContext): void {
  if (isDev) {
    const tag = context.source ? `[observability:${context.source}]` : "[observability]";
    console.error(tag, error);
    if (context.componentStack) {
      console.error(context.componentStack);
    }
    return;
  }
  const status = statusOf(error);
  const label = context.handled ? "API error" : "Unhandled error";
  const where = context.source ? ` [${context.source}]` : "";
  console.error(`${label}${status ? ` (${status})` : ""}${where}: ${messageOf(error)}`);
}

// ── Sentry: lazy, DSN-gated ───────────────────────────────────────────────

type SentryAdapter = typeof import("./sentry");

let sentry: SentryAdapter | null = null;
let sentryPending = false;
let lastUser: { id?: string | number } | null = null;

/** Buffer reports that arrive before the Sentry chunk finishes loading. */
const queue: Array<{ error: unknown; context: ReportContext }> = [];
const QUEUE_CAP = 50;

function loadSentry(): void {
  if (!DSN || sentry || sentryPending) return;
  sentryPending = true;
  import("./sentry")
    .then((mod) => {
      mod.startSentry(DSN);
      sentry = mod;
      if (lastUser) mod.setUser(lastUser);
      const buffered = queue.splice(0, queue.length);
      for (const { error, context } of buffered) mod.captureError(error, context);
    })
    .catch((e) => {
      sentryPending = false;
      console.error("[observability] Sentry adapter failed to load", e);
    });
}

/**
 * Kick off Sentry initialisation (no-op without a DSN). Call once from
 * `main.tsx`. Reporting works before and without this — it just starts the
 * chunk download early instead of on the first error.
 */
export function initObservability(): void {
  loadSentry();
}

/**
 * Report an error. Always logs to the console (PII-safe in prod); forwards to
 * Sentry when a DSN is configured.
 */
export function reportError(error: unknown, context: ReportContext = {}): void {
  logToConsole(error, context);
  if (!DSN) return;
  if (sentry) {
    sentry.captureError(error, context);
    return;
  }
  if (queue.length >= QUEUE_CAP) queue.shift();
  queue.push({ error, context });
  loadSentry();
}

/** Attach (or clear, with `null`) the current user so reports say who was affected. */
export function setObservabilityUser(user: { id?: string | number } | null): void {
  lastUser = user && user.id != null ? { id: user.id } : null;
  if (sentry) sentry.setUser(lastUser);
}

/** Leave a breadcrumb for the next report (route changes, key flow steps). */
export function reportBreadcrumb(message: string, data?: Record<string, unknown>): void {
  if (sentry) sentry.addBreadcrumb(message, data);
}
