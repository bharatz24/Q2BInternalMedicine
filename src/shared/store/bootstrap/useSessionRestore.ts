import { useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import { fetchInsuredSession, hasAuthHint } from "@/modules/Auth/api/authApi";
import { syncAccountShadow } from "@/local/authLocal";
import { isInsuredSessionPayload } from "@/modules/Quote/utils/submission";
import insuredProfileStore from "@/shared/store/insuredProfileStore";
import sessionStore from "@/shared/store/sessionStore";

// Paths the session-restore redirect must NOT bounce away from — the user
// reloaded deep in the funnel / dashboard and should stay where they are.
const STAY_ON_RESTORE_PATHS = new Set([
  "/reviewDocusign",
  "/payment",
  "/binder-invoice",
  "/underwriter-review",
  "/order-details",
  "/profile",
  "/complete-order",
  "/dashboard",
]);

/**
 * Session restore on first boot. The `q2b_auth` hint cookie tells us whether
 * a session call is worth making — same contract as the hosted app.
 *
 * Runs exactly once (`bootRef`). `navigate` / `location.pathname` are read
 * through refs kept current each render so the effect can legitimately take
 * an empty dependency array — no `exhaustive-deps` disable, and no re-run
 * (which would `ctrl.abort()` an in-flight session call the moment the user
 * navigated during boot).
 *
 * Was effect 1 of the old monolithic `useAppBootstrap`.
 */
export function useSessionRestore(): void {
  const navigate = useNavigate();
  const location = useLocation();

  const navigateRef = useRef(navigate);
  navigateRef.current = navigate;
  const pathnameRef = useRef(location.pathname);
  pathnameRef.current = location.pathname;

  const bootRef = useRef(false);

  useEffect(() => {
    if (bootRef.current) return undefined;
    bootRef.current = true;

    // Pathname at first boot — the landing route the app was opened on.
    const bootPathname = pathnameRef.current;

    if (!hasAuthHint()) {
      sessionStore.sessionReady = true;
      return undefined;
    }

    const ctrl = new AbortController();
    (async () => {
      try {
        const data = await fetchInsuredSession({ signal: ctrl.signal });
        if (ctrl.signal.aborted) return;
        if (data && isInsuredSessionPayload(data)) {
          insuredProfileStore.insuredProfile = data;
          // Local submission creation/rating still key off a local "current
          // account" — mirror the real identity into that shadow.
          syncAccountShadow(data);
          if (!STAY_ON_RESTORE_PATHS.has(bootPathname)) {
            sessionStore.dashView = "dashboard";
            navigateRef.current("/dashboard", { replace: true });
          }
        }
      } catch (e: any) {
        if (e?.name === "AbortError") return;
        // Not signed in. No action needed.
      } finally {
        if (!ctrl.signal.aborted) sessionStore.sessionReady = true;
      }
    })();
    return () => {
      ctrl.abort();
    };
  }, []);
}
