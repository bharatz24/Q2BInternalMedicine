import { createRoot } from "react-dom/client";
import App from "./App";
import { applyStoredTheme } from "./theme";
import { installAuthInterceptor } from "@/shared/services/httpClient";
import { initObservability, reportError } from "@/shared/observability/reporter";
import "./responsive.css";
import "@/shared/styles.css";
import "@/styles/ui.css";

// Global async / runtime error capture. Without these, a forgotten
// `.catch()` on any store action silently fails and the user is left
// staring at a stuck UI.
//
// Both handlers route through `reportError` (shared/observability), which:
//  - always logs to the console, in production as `status + message` only —
//    an axios rejection carries the full request config (name, DOB, SSN,
//    address, card billing) in `.config.data`, and with no server of our own
//    that data exists only in the browser, so the console is the one place it
//    could leak;
//  - forwards to Sentry when `VITE_SENTRY_DSN` is configured (after the same
//    PII-scrubbing — see `observability/sentry.ts`).
if (typeof window !== "undefined") {
  window.addEventListener("unhandledrejection", (event) => {
    reportError(event?.reason, { source: "unhandledrejection" });
  });
  window.addEventListener("error", (event) => {
    reportError(event?.error || event?.message, { source: "window.error" });
  });
}

initObservability();
installAuthInterceptor();
applyStoredTheme();

createRoot(document.getElementById("root")!).render(<App />);
