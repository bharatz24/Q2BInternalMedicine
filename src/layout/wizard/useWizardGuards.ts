import { useEffect } from "react";
import { useLocation, useNavigationType } from "react-router-dom";
import { STEP_PATHS } from "@/modules/Quote/constants";
import { useStore } from "@/shared/store/useStore";
import submissionStore from "@/modules/Quote/store/submissionStore";
import sessionStore from "@/shared/store/sessionStore";
import insuredProfileStore from "@/shared/store/insuredProfileStore";
import ilfDlfStore from "@/modules/Quote/store/ilfDlfStore";
import { ilfDlfHasRequiredDefaults } from "@/modules/Quote/utils/ilfHelpers";
import { usePolicyStatus } from "@/modules/Payment/utils/policyStatus";

// Pre-signing wizard steps — only an OPEN_ORDER submission is allowed to
// sit on these via reload/back. Any other policyStatus → /dashboard.
const OPEN_ORDER_ONLY_PATHS = new Set(["/previous-insurance", "/underwriting", "/reviewDocusign"]);

/**
 * Every "should the user be on this wizard route?" decision, extracted from
 * `FlowLayout` so the god component only renders chrome. The rules are
 * unchanged — this is a lift of the inline `<Navigate>` ladder, in the same
 * order, plus the side effect that clears a stale `flowSubmissionId` before
 * a bounce to the dashboard.
 *
 * Two phases, because `FlowLayout` shows a full-screen session-boot loader
 * between them:
 *  - `preSession` is evaluated first (the POP / policy-status bounces that
 *    must win even while the session is still loading);
 *  - `postSession` is evaluated after the loader clears (auth gate + the
 *    "no quote yet" funnel gates, which need `sessionReady`).
 *
 * Returns a route to `<Navigate replace>` to, or `null` to stay.
 */
interface WizardGuardResult {
  preSession: string | null;
  postSession: string | null;
}

export function useWizardGuards(): WizardGuardResult {
  const location = useLocation();
  // "POP" covers browser back/forward AND a hard reload — both are the cases
  // where we re-check policyStatus before letting the user sit on /payment.
  const navigationType = useNavigationType();

  const step = useStore(submissionStore, (s) => s.step);
  const flowSubmissionId = useStore(submissionStore, (s) => s.flowSubmissionId);
  const sessionReady = useStore(sessionStore, (s) => s.sessionReady);
  const bound = useStore(sessionStore, (s) => s.bound);
  const dashView = useStore(sessionStore, (s) => s.dashView);
  const insuredProfile = useStore(insuredProfileStore, (s) => s.insuredProfile);
  const isAuthenticated = Boolean(
    insuredProfile?.id || insuredProfile?.name || insuredProfile?.username,
  );
  // Gate on the REAL `POST /auth/quotedata` response (matches Q2BNfy's own
  // ILF/DLF-response gate) — the local `quoteResultStore` is no longer
  // written by any page in the real flow.
  const hasQuote = useStore(ilfDlfStore, (s) => ilfDlfHasRequiredDefaults(s.current));

  const {
    hasOrder: hasPaymentOrder,
    isLoading: paymentOrderLoading,
    isOpenOrder,
    isSigned,
  } = usePolicyStatus();

  const isReviewDocusignPath = location.pathname === "/reviewDocusign";

  // /previous-insurance, /underwriting, /reviewDocusign — on browser back or
  // reload (navigationType === "POP") only an OPEN_ORDER submission belongs
  // here. Anything else gets bounced to the dashboard. Forward navigation
  // from the wizard uses navigate(..., { replace: true }) so it surfaces as
  // "REPLACE" and skips this check.
  const shouldRedirectFromOpenOrderPath =
    OPEN_ORDER_ONLY_PATHS.has(location.pathname) &&
    navigationType === "POP" &&
    !paymentOrderLoading &&
    hasPaymentOrder &&
    !isOpenOrder;
  // On /payment, back-button or reload (navigationType === "POP") is only
  // valid when the policy is in SIGNED state. Anything else (no order yet,
  // DRAFT, PAID, POLICY_ACTIVE, etc.) bounces back to the dashboard.
  const shouldRedirectFromPayment =
    location.pathname === "/payment" &&
    navigationType === "POP" &&
    !paymentOrderLoading &&
    hasPaymentOrder &&
    !isSigned;
  const shouldRedirectToDashboard = shouldRedirectFromOpenOrderPath || shouldRedirectFromPayment;

  // Clearing flowSubmissionId also removes the `q2b:submission:flowSubmissionId`
  // sessionStorage key (see submissionStore setter) — so a follow-up refresh
  // won't re-rehydrate the order and snap the user back into the wizard.
  useEffect(() => {
    if (shouldRedirectToDashboard && submissionStore.flowSubmissionId != null) {
      submissionStore.flowSubmissionId = null;
    }
  }, [shouldRedirectToDashboard]);

  if (shouldRedirectToDashboard) {
    return { preSession: "/dashboard", postSession: null };
  }

  if (bound && dashView === null) {
    return { preSession: null, postSession: "/complete-order" };
  }

  if (sessionReady && !isAuthenticated && step >= 4 && !isReviewDocusignPath) {
    return { preSession: null, postSession: "/signin" };
  }

  // Steps 1–3 are the pre-account funnel: they only make sense once the
  // program dates have produced a quote. From step 4 on, a saved submission
  // is equally good — the user may have reloaded, losing the in-memory quote
  // while the order itself survives.
  const redirectTo = isAuthenticated ? "/dashboard" : STEP_PATHS[0];
  if (step >= 1 && step <= 3 && !hasQuote) {
    return { preSession: null, postSession: redirectTo };
  }
  if (step === 4 && !hasQuote && !flowSubmissionId) {
    return { preSession: null, postSession: redirectTo };
  }
  if (step >= 5 && sessionReady && !hasQuote && !flowSubmissionId && !isReviewDocusignPath) {
    return { preSession: null, postSession: redirectTo };
  }

  return { preSession: null, postSession: null };
}
