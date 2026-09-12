import { useAuthNavigatorSync } from "@/shared/store/bootstrap/useAuthNavigatorSync";
import { useSpecialityResolve } from "@/shared/store/bootstrap/useSpecialityResolve";
import { useSessionRestore } from "@/shared/store/bootstrap/useSessionRestore";
import { useAnswerResetOnQuoteLanding } from "@/shared/store/bootstrap/useAnswerResetOnQuoteLanding";
import { useSubmissionQuestionsFetch } from "@/shared/store/bootstrap/useSubmissionQuestionsFetch";
import { useAnswerResetOnSubmissionChange } from "@/shared/store/bootstrap/useAnswerResetOnSubmissionChange";
import { usePathStepSync } from "@/shared/store/bootstrap/usePathStepSync";
import { useOrderRehydrate } from "@/shared/store/bootstrap/useOrderRehydrate";
import { useObservabilityUser } from "@/shared/store/bootstrap/useObservabilityUser";

/**
 * App-level bootstrap. Mount this once from <App/> — it renders nothing, it
 * just runs the cross-cutting effects. Each concern is its own named hook in
 * `src/shared/store/bootstrap/` (split out of what used to be one ~266-line
 * hook — audit finding 1.1); the order below is the order they ran in:
 *
 *   1. `useAuthNavigatorSync`          — SPA navigator ↔ httpClient 401 redirect
 *   2. `useSpecialityResolve`          — on-demand speciality-master resolve
 *   3. `useSessionRestore`             — session restore on first boot
 *   4. `useAnswerResetOnQuoteLanding`  — wipe transient answers when landing on /quote
 *   5. `useSubmissionQuestionsFetch`   — submission-scoped question tree fetch
 *   6. `useAnswerResetOnSubmissionChange` — reset answers when the submission id changes
 *   7. `usePathStepSync`               — URL → `submissionStore.step`
 *   8. `useOrderRehydrate`             — refresh-survival order rehydrate
 *   9. `useObservabilityUser`          — crash-reporter user context ↔ session
 *
 * The question tree is real (`ins`'s speciality-agnostic question API — see
 * `questionsApi.ts`'s header) and every displayed price comes from the real
 * `ilfDlfStore`. Nursing's local rating engine was not carried into this
 * portal (plan F9).
 */
export function useAppBootstrap() {
  useAuthNavigatorSync();
  useSpecialityResolve();
  useSessionRestore();
  useAnswerResetOnQuoteLanding();
  useSubmissionQuestionsFetch();
  useAnswerResetOnSubmissionChange();
  usePathStepSync();
  useOrderRehydrate();
  useObservabilityUser();
}
