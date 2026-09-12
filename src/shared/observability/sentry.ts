/**
 * Sentry adapter — loaded dynamically by `./reporter` **only** when
 * `VITE_SENTRY_DSN` is set, so `@sentry/react` never enters a DSN-less build's
 * download path.
 *
 * PII posture (this app's payloads carry name / DOB / SSN / address / card
 * billing, and there is no first-party server, so the browser is the only
 * place that data exists):
 *
 *  - `sendDefaultPii: false` — no IP address, no cookies, no user agent beyond
 *    the default.
 *  - `beforeSend` strips the request **body**, **headers** and **cookies** off
 *    every captured error (an axios rejection carries the full request config)
 *    and drops the query string from the request URL (`returnTo`, tokens).
 *  - breadcrumb `data` and `event.extra` are shallow-scrubbed of known PII keys.
 *  - tracing / session replay are off (`tracesSampleRate: 0`, no Replay
 *    integration) — they capture far more than crash reporting needs.
 */
import * as Sentry from "@sentry/react";

import type { ReportContext } from "./reporter";

/** Keys we never want leaving the browser, matched case-insensitively. */
const PII_KEYS =
  /^(ssn|taxid|tax_id|dob|dateofbirth|date_of_birth|dea|password|card|cardnumber|cvc|cvv|firstname|lastname|name|fullname|address|address1|address2|street|phone|contactnumber|email|authorization|cookie|token|returnto)$/i;

function scrub(obj: unknown): void {
  if (!obj || typeof obj !== "object") return;
  for (const key of Object.keys(obj as Record<string, unknown>)) {
    if (PII_KEYS.test(key)) {
      (obj as Record<string, unknown>)[key] = "[scrubbed]";
    }
  }
}

function stripQuery(url: string): string {
  const cut = url.search(/[?#]/);
  return cut === -1 ? url : url.slice(0, cut);
}

let started = false;

export function startSentry(dsn: string): void {
  if (started) return;
  started = true;

  Sentry.init({
    dsn,
    environment: import.meta.env.VITE_SENTRY_ENVIRONMENT || import.meta.env.MODE,
    release: import.meta.env.VITE_APP_RELEASE || undefined,
    sendDefaultPii: false,
    tracesSampleRate: 0,
    // Keep only what crash reporting needs; drop the noisy default breadcrumbs.
    maxBreadcrumbs: 30,
    beforeSend(event) {
      if (event.request) {
        delete event.request.data;
        delete event.request.cookies;
        delete event.request.headers;
        if (event.request.query_string) delete event.request.query_string;
        if (typeof event.request.url === "string") {
          event.request.url = stripQuery(event.request.url);
        }
      }
      scrub(event.extra);
      if (event.contexts) {
        for (const ctx of Object.values(event.contexts)) scrub(ctx);
      }
      return event;
    },
    beforeBreadcrumb(crumb) {
      scrub(crumb.data);
      return crumb;
    },
  });
}

export function captureError(error: unknown, context: ReportContext): void {
  Sentry.withScope((scope) => {
    scope.setLevel(context.level ?? "error");
    scope.setTag("handled", String(context.handled ?? false));
    if (context.source) scope.setTag("source", context.source);
    if (context.componentStack) {
      scope.setContext("react", { componentStack: context.componentStack });
    }
    if (context.extra) scope.setExtras(context.extra);

    if (error instanceof Error) {
      Sentry.captureException(error);
    } else if (typeof error === "string") {
      Sentry.captureMessage(error, context.level ?? "error");
    } else {
      Sentry.captureException(new Error(`Non-Error thrown: ${safeStringify(error)}`));
    }
  });
}

function safeStringify(value: unknown): string {
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

export function setUser(user: { id?: string | number } | null): void {
  Sentry.setUser(user && user.id != null ? { id: String(user.id) } : null);
}

export function addBreadcrumb(message: string, data?: Record<string, unknown>): void {
  Sentry.addBreadcrumb({ message, data, level: "info" });
}
