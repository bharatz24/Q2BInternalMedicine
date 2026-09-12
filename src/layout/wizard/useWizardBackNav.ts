import { useNavigate } from "react-router-dom";
import { STEP_PATHS } from "@/modules/Quote/constants";
import submissionStore from "@/modules/Quote/store/submissionStore";
import sessionStore from "@/shared/store/sessionStore";

/**
 * The wizard "back" behaviour, extracted from `FlowLayout` so the mobile
 * topbar arrow and the desktop `<BackControl>` share exactly one
 * implementation of the per-step rules.
 *
 * Rules (unchanged from the original inline `goBack`):
 *  - step 7 (`/payment`): back into `/reviewDocusign` only while the order is
 *    still OPEN_ORDER; otherwise the signing window is past → dashboard.
 *  - step 4 (`/previous-insurance`): the submission already exists, so back
 *    returns to the dashboard rather than walking back through signup.
 *  - steps 1–3 / 5–6: decrement the step and navigate to `STEP_PATHS[next]`.
 *  - step 0: authenticated → dashboard, otherwise stay on step 0.
 *
 */
interface WizardBackNavArgs {
  step: number;
  isOpenOrder: boolean;
  isAuthenticated: boolean;
}

export function useWizardBackNav({
  step,
  isOpenOrder,
  isAuthenticated,
}: WizardBackNavArgs): () => void {
  const navigate = useNavigate();

  return function goBack(): void {
    // /payment back arrow — only walk back into /reviewDocusign when the
    // order is still OPEN_ORDER. Any other policyStatus means the signing
    // window is past, so back lands on the dashboard instead.
    if (step === 7) {
      if (isOpenOrder) {
        submissionStore.step = 6;
        navigate("/reviewDocusign");
      } else {
        submissionStore.flowSubmissionId = null;
        sessionStore.dashView = "dashboard";
        navigate("/dashboard");
      }
      return;
    }
    // Previous insurance & claims (step 4) — submission is already created
    // at this point, so "back" returns to the dashboard rather than walking
    // the user back through signup.
    if (step === 4) {
      sessionStore.dashView = "dashboard";
      navigate("/dashboard");
      return;
    }
    if (step > 0) {
      const next = step - 1;
      submissionStore.step = next;
      navigate(STEP_PATHS[next]);
      return;
    }
    if (isAuthenticated) {
      sessionStore.dashView = "dashboard";
      navigate("/dashboard");
    } else {
      submissionStore.step = 0;
      navigate(STEP_PATHS[0]);
    }
  };
}
