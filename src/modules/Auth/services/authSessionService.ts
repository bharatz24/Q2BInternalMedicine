import { postLogout } from "@/modules/Auth/api/authApi";
import authFormStore from "@/modules/Auth/store/authFormStore";
import insuredProfileStore from "@/shared/store/insuredProfileStore";
import sessionStore from "@/shared/store/sessionStore";
import modalStore from "@/shared/store/modalStore";
import dashboardStore from "@/modules/Dashboard/store/dashboardStore";
import practiceStore from "@/modules/Quote/store/practiceStore";
import quoteResultStore from "@/modules/Quote/store/quoteResultStore";
import physicianProfileStore from "@/modules/Quote/store/physicianProfileStore";
import cvStore from "@/modules/Quote/store/cvStore";
import questionsStore from "@/modules/Quote/store/questionsStore";
import submissionStore from "@/modules/Quote/store/submissionStore";
import attestStore from "@/modules/Quote/store/attestStore";
import paymentOrderStore from "@/modules/Payment/store/paymentOrderStore";
import bindStore from "@/modules/Payment/store/bindStore";
import declUploadStore from "@/modules/Payment/store/declUploadStore";
import { queryClient } from "@/shared/query/queryClient";

/**
 * Reset only the submission-scoped state when a signed-in user (re)starts
 * the quote funnel from the landing calculator / step 0 — the landing
 * "Continue", "Get my estimate" and "Start the full application" actions.
 *
 * Unlike `resetQuoteFlow` this deliberately KEEPS `practiceStore` /
 * `ilfDlfStore`: the user just entered those on the estimate card and is
 * continuing from them. What it drops is any `flowSubmissionId` / order /
 * question-tree state left over from a previously created or bound
 * submission — without this, `RegistrationPage`'s "already signed in"
 * effect sees the stale `flowSubmissionId`, skips `POST /insured/submission`
 * entirely, and the "new" quote just re-opens (and edits) the old order.
 * Answer maps are left alone here — the bootstrap wipes them on the
 * `/quote` landing (useAppBootstrap effect 3).
 */
/**
 * Drop the react-query cache for everything keyed by the (now abandoned)
 * submission — the order read and the underwriting question tree — so the
 * next submission fetches its own fresh state instead of serving a stale hit
 * (`useSubmissionQuestionsFetch` runs with `staleTime: Infinity`).
 */
export function dropSubmissionScopedQueries() {
  queryClient.removeQueries({ queryKey: ["order"] });
  queryClient.removeQueries({ queryKey: ["questions"] });
}

export function resetSubmissionForNewQuote() {
  submissionStore.clear();
  questionsStore.resetSubmissionQuestionState();
  paymentOrderStore.clear();
  bindStore.clear();
  attestStore.clear();
  dropSubmissionScopedQueries();
  sessionStore.bound = false;
}

/** Reset every quote-flow store. Use when starting a brand-new quote. */
export function resetQuoteFlow() {
  authFormStore.clearSignup();
  practiceStore.clear();
  quoteResultStore.clear();
  physicianProfileStore.clear();
  cvStore.clear();
  questionsStore.clear();
  submissionStore.clear();
  attestStore.clear();
  paymentOrderStore.clear();
  bindStore.clear();
  declUploadStore.clear();
  dropSubmissionScopedQueries();
  sessionStore.bound = false;
}

/**
 * Full sign-out: end the session, clear every store, and wipe cookies +
 * per-tab storage so a reload starts from a clean slate.
 *
 * The `sessionStorage.clear()` below wipes the local "database" too (account
 * shadow, counters, any submission shadow rows) — that store now lives in
 * sessionStorage (see `src/local/db.ts`), so a full sign-out leaves nothing
 * behind on the device. Everything real is re-fetched from `ins` on the next
 * sign-in; the local shadows are re-created on demand. `localStorage` is left
 * alone so the theme preference survives.
 */
export async function signOut() {
  try {
    await postLogout();
  } catch {
    /* still continue */
  }
  resetQuoteFlow();
  authFormStore.clearLogin();
  dashboardStore.clear();
  // Drop every cached server response — profile, dashboard, order, questions,
  // Stripe key — so the next signed-in user never sees the previous one's data.
  queryClient.clear();
  modalStore.clear();
  insuredProfileStore.insuredProfile = null;
  sessionStore.clear();
  try {
    document.cookie.split(";").forEach((c) => {
      const name = c.split("=")[0].trim();
      if (name) document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
    });
    sessionStorage.clear();
  } catch {
    /* storage may be unavailable */
  }
}
