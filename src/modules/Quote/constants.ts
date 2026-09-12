/**
 * Quote-module constants: wizard step names + URL paths used by the
 * step-driven layout (FlowLayout) and per-step `goTo()` calls.
 *
 * Nine steps. History: the old `/credentials` step was folded into
 * `/practice`; a `/previous-insurance` step was added; and the `/coverage`
 * (limit-of-liability selection) step was removed — the limit of liability
 * and retro date are now chosen on the Home Page "Instant estimate" card
 * (`MedMalGuardLanding.tsx`), so a dedicated wizard step for it was dead
 * weight (it also had no real question-tree group for nursing, so it could
 * never advance).
 */

export const STEP_NAMES = [
  "Practice & location",
  "Soft quote (est. premium)",
  "Your practice & hours",
  "Create your account",
  "Previous insurance & claims",
  "Underwriting questions",
  "Review & attest",
  "Payment",
  "Binder & Invoice",
];

export const STEP_PATHS = [
  "/",
  "/quote",
  "/practice",
  "/register",
  "/previous-insurance",
  "/underwriting",
  "/reviewDocusign",
  "/payment",
  "/binder-invoice",
];

export const TOTAL_STEPS = 9;

export const pathToStepIndex = (pathname: string): number => {
  if (pathname === "/reviewDocusign") return 6;
  const i = STEP_PATHS.indexOf(pathname);
  return i >= 0 ? i : 0;
};
