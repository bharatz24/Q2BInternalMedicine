import { useEffect } from "react";
import { useLocation } from "react-router-dom";

import { refreshPaymentOrder } from "@/modules/Payment/services/paymentOrderService";
import { useStore } from "@/shared/store/useStore";
import sessionStore from "@/shared/store/sessionStore";
import submissionStore from "@/modules/Quote/store/submissionStore";

// Refresh-survival paths — when the user reloads on one of these, we
// re-hydrate the active order from `flowSubmissionId` (restored from
// sessionStorage) instead of bouncing to /dashboard.
const ORDER_REHYDRATE_PATHS = new Set([
  "/previous-insurance",
  "/underwriting",
  "/payment",
  "/reviewDocusign",
  "/binder-invoice",
  "/underwriter-review",
]);

/**
 * Refresh-survival rehydrate. `flowSubmissionId` is restored from
 * sessionStorage by submissionStore; re-fetch the order so the page can
 * render its summary instead of being bounced by the wizard guard.
 *
 * Fire-and-forget is safe here: `refreshPaymentOrder` never rejects — it
 * catches internally, logs via `logApiError`, and records the failure on
 * `paymentOrderStore.paymentOrderError` (the flag the Review / Payment /
 * Binder pages render). The `.catch` below is belt-and-braces for any future
 * change that makes it throwable. (Audit finding 2.4.)
 *
 * Was effect 7 of the old monolithic `useAppBootstrap`.
 */
export function useOrderRehydrate(): void {
  const { pathname } = useLocation();
  const sessionReady = useStore(sessionStore, (s) => s.sessionReady);
  const flowSubmissionId = useStore(submissionStore, (s) => s.flowSubmissionId);

  useEffect(() => {
    if (!sessionReady) return;
    if (!ORDER_REHYDRATE_PATHS.has(pathname)) return;
    if (!flowSubmissionId) return;
    refreshPaymentOrder(flowSubmissionId, { ifMissing: true }).catch(() => {
      // already recorded on paymentOrderStore.paymentOrderError
    });
  }, [sessionReady, pathname, flowSubmissionId]);
}
