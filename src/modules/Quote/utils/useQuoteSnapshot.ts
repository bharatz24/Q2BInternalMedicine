import { useMemo } from "react";

import { useStore } from "@/shared/store/useStore";

import practiceStore from "@/modules/Quote/store/practiceStore";
import quoteResultStore from "@/modules/Quote/store/quoteResultStore";
import ilfDlfStore from "@/modules/Quote/store/ilfDlfStore";
import specialityStore from "@/modules/Quote/store/specialityStore";
import physicianProfileStore from "@/modules/Quote/store/physicianProfileStore";
import questionsStore from "@/modules/Quote/store/questionsStore";
import submissionStore from "@/modules/Quote/store/submissionStore";
import paymentOrderStore from "@/modules/Payment/store/paymentOrderStore";
import bindStore from "@/modules/Payment/store/bindStore";
import insuredProfileStore from "@/shared/store/insuredProfileStore";
import { designationByCode } from "@/modules/Quote/data/designations.js";

import { computeDerivedValues } from "./derivedValues";

/**
 * The single hook every page calls when it needs a derived value
 * (`quoteStripAnnualTotal`, `snapshotLimits`, `paymentAmountDue`,
 * `headerUserInitials`, etc.).
 *
 *   const { quoteStripAnnualTotal, snapshotLimits, isReferral } = useQuoteSnapshot();
 *
 * Subscribes to every store the pure `computeDerivedValues` needs, re-runs
 * when any of them change, and returns the same shape it always has — the
 * ILF/DLF and speciality-master inputs are simply replaced by the practice
 * inputs and the locally-computed quote.
 */
export function useQuoteSnapshot() {
  // Step + practice inputs
  const step = useStore(submissionStore, (s) => s.step);
  const effDate = useStore(practiceStore, (s) => s.effectiveDate);
  const designation = useStore(practiceStore, (s) => s.designation);

  // Applicant — one identity store (see docs/ARCHITECTURE.md). `physicianProfileStore`
  // is filled by the registration form and re-filled by `hydrateFromOrder`
  // after a reload, so it is the single source for the review/payment
  // contact summary too.
  const firstName = useStore(physicianProfileStore, (s) => s.firstName);
  const lastName = useStore(physicianProfileStore, (s) => s.lastName);
  const profileEmail = useStore(physicianProfileStore, (s) => s.email);
  const profilePhone = useStore(physicianProfileStore, (s) => s.cellPhone || s.homePhone);
  const homeAddress = useStore(physicianProfileStore, (s) => s.homeAddress);

  // The quote + order state
  const quote = useStore(quoteResultStore, (s) => s.quote);
  const quoteError = useStore(quoteResultStore, (s) => s.quoteError);
  const expDate = quote?.expirationDate || "";

  // The Home Page's real, carrier-backed price (`POST /auth/quotedata`) —
  // only used to override the rail's snapshot on `/quote` (step 1), so that
  // page never shows two different totals at once. See `derivedValues`.
  const ilf = useStore(ilfDlfStore, (s) => s.current);
  // The coverage limit the Home Page user picked (falls back to the
  // quotedata default name downstream when empty).
  const selectedLimitName = useStore(ilfDlfStore, (s) => s.selectedCoverageLimit?.limit || "");
  // Retro date the estimate was priced at ("" → defaults to the effective date).
  const retroDate = useStore(ilfDlfStore, (s) => s.retroDate);
  const specialityTitle = useStore(specialityStore, () => {
    const code = designationByCode(designation)?.specialityCode;
    return code ? specialityStore.getSpeciality(code)?.title || "" : "";
  });
  const paymentOrderDetails = useStore(paymentOrderStore, (s) => s.paymentOrderDetails);
  const paymentOrderLoading = useStore(paymentOrderStore, (s) => s.paymentOrderLoading);
  const flowSubmissionId = useStore(submissionStore, (s) => s.flowSubmissionId);
  const submissionQuestionGroups = useStore(questionsStore, (s) => s.submissionQuestionGroups);
  const underwritingAnswers = useStore(questionsStore, (s) => s.underwritingAnswers);
  const claimsAnswers = useStore(questionsStore, (s) => s.claimsAnswers);
  const hiddenQuestionIds = useStore(questionsStore, (s) => s.hiddenQuestionIds);

  // Bound confirmation
  const boundPolicyNumberFromInvoice = useStore(bindStore, (s) => s.boundPolicyNumberFromInvoice);
  const boundTotalAmount = useStore(bindStore, (s) => s.boundTotalAmount);

  // Header
  const insuredProfile = useStore(insuredProfileStore, (s) => s.insuredProfile);

  // `computeDerivedValues` is a ~280-line pure function that walks the whole
  // question tree (referral detection). Memoize it on its inputs so it only
  // re-runs when one actually changes — every `useStore` value above is a
  // primitive or a reference-stable store slice, so this list is sound. Was
  // re-running on every render of every consumer (WizardChrome, PaymentPage,
  // QuoteSnapshotRail, …) — audit finding 1.5 / 3.1.
  return useMemo(
    () =>
      computeDerivedValues({
        step,
        effDate,
        expDate,
        firstName,
        lastName,
        profileEmail,
        profilePhone,
        homeAddress,
        designation,
        quote,
        quoteError,
        ilf,
        selectedLimitName,
        retroDate,
        specialityTitle,
        paymentOrderDetails,
        paymentOrderLoading,
        flowSubmissionId,
        submissionQuestionGroups,
        underwritingAnswers,
        claimsAnswers,
        hiddenQuestionIds,
        boundPolicyNumberFromInvoice,
        boundTotalAmount,
        insuredProfile,
      }),
    [
      step,
      effDate,
      expDate,
      firstName,
      lastName,
      profileEmail,
      profilePhone,
      homeAddress,
      designation,
      quote,
      quoteError,
      ilf,
      selectedLimitName,
      retroDate,
      specialityTitle,
      paymentOrderDetails,
      paymentOrderLoading,
      flowSubmissionId,
      submissionQuestionGroups,
      underwritingAnswers,
      claimsAnswers,
      hiddenQuestionIds,
      boundPolicyNumberFromInvoice,
      boundTotalAmount,
      insuredProfile,
    ],
  );
}
