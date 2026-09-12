import { lazy, Suspense } from "react";
import { Navigate, useLocation } from "react-router-dom";

import { useStore } from "@/shared/store/useStore";
import sessionStore from "@/shared/store/sessionStore";
import { useWizardGuards } from "@/layout/wizard/useWizardGuards";
import RouteFallback from "@/routes/RouteFallback";

// Split the two funnel shells apart: a marketing-landing visitor loads only
// LandingView's chunk; WizardChrome (progress bar, snapshot rail, back-nav)
// arrives when the user first steps into the wizard.
const LandingView = lazy(() => import("@/layout/wizard/LandingView"));
const WizardChrome = lazy(() => import("@/layout/wizard/WizardChrome"));

/**
 * The `<Route element>` wrapper for the whole quote funnel. Its only jobs:
 *
 *  1. run the funnel guards (`useWizardGuards`) and `<Navigate>` away if the
 *     user shouldn't be on this route — before AND after the session-boot
 *     loader, in that order (see the hook's doc for the two phases);
 *  2. show the session-boot loader while the session is still resolving;
 *  3. pick the shell — `<LandingView>` on `/`, `<WizardChrome>` everywhere
 *     else.
 *
 * All the chrome (headers, topbar, progress, snapshot rail, footer,
 * marketing sections) lives in those two components now — this was a
 * ~230-line god component (audit finding 1.2 / action-plan #20). The
 * back-nav rules are in `useWizardBackNav`, the redirect ladder in
 * `useWizardGuards`, both under `src/layout/wizard/`.
 */
export default function FlowLayout() {
  const location = useLocation();
  const sessionReady = useStore(sessionStore, (s) => s.sessionReady);
  const bound = useStore(sessionStore, (s) => s.bound);

  const { preSession, postSession } = useWizardGuards();

  if (preSession) {
    return <Navigate to={preSession} replace />;
  }

  // Session bootstrap loader — full-screen backdrop with centered spinner.
  // Styling lives in src/styles/ui.css (.wizard-boot-*); see ADR 0004.
  if (!sessionReady && !bound) {
    return (
      <div className="wizard-boot-overlay">
        <div className="wizard-boot-box">
          <div className="wizard-boot-spinner" />
          <div className="wizard-boot-label">Loading…</div>
        </div>
      </div>
    );
  }

  // The post-session redirects (bound→/complete-order, auth gate, and the
  // "no quote yet" funnel gates) — see useWizardGuards.
  if (postSession) {
    return <Navigate to={postSession} replace />;
  }

  return (
    <Suspense fallback={<RouteFallback />}>
      {location.pathname === "/" ? <LandingView /> : <WizardChrome />}
    </Suspense>
  );
}
