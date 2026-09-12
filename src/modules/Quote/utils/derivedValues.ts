import { fmtDate } from "@/shared/utils/dateHelpers";
import { parsePositiveSubmissionId } from "@/modules/Quote/utils/submission";
import {
  isQuestionVisible,
  isYesNoQuestionType,
  isYesOption,
} from "@/modules/Quote/api/questionsApi";
import { designationByCode } from "@/modules/Quote/data/designations.js";
import { expirationMdYFromEffAndIlf } from "@/modules/Quote/utils/ilfHelpers";
import type { QuoteFormData } from "@/shared/dtos";
import type { Address } from "@/modules/Quote/store/physicianProfileStore";
import type { InsuredProfile } from "@/shared/store/insuredProfileStore";

/** A question-tree group node (the /submission-questions response shape). */
type QuestionGroupNode = Record<string, any>;

/** Every input `useQuoteSnapshot` feeds the pure derivation. */
export interface DerivedValuesInput {
  step: number;
  effDate: string;
  expDate: string;
  firstName: string;
  lastName: string;
  profileEmail: string;
  profilePhone: string;
  homeAddress: Address | null;
  designation: string;
  quote: any;
  quoteError: Error | null;
  ilf: QuoteFormData | null;
  selectedLimitName: string;
  retroDate: string;
  specialityTitle: string;
  paymentOrderDetails: any;
  paymentOrderLoading: boolean;
  flowSubmissionId: string | null;
  submissionQuestionGroups: QuestionGroupNode[];
  underwritingAnswers: Record<string, any>;
  claimsAnswers: Record<string, any>;
  hiddenQuestionIds: Set<string | number>;
  boundPolicyNumberFromInvoice: string | null;
  boundTotalAmount: number | string | null;
  insuredProfile: InsuredProfile | null;
}

/**
 * Pure derivation of every read-only value the pages consume.
 *
 * Every key in the returned object has the same name it had in the PA and
 * student portals, so `QuoteStrip`, `QuoteSnapshotRail`, the review page,
 * `PaymentPage` and the bound-confirmation screens read exactly what they
 * read before. What changed: the real, carrier-backed `POST /auth/quotedata`
 * response (`ilf`) is now the price source on every step, not just step 1 —
 * the local `nursingRatingService` quote (`quote`) is no longer consumed
 * here at all (kept as a passthrough field only for any caller that still
 * reads `.quote` directly).
 *
 * `ilf` (`QuoteFormData`) has no premium/tax/fees breakdown the way the
 * local engine's `quote.amounts` did — `ins` returns a flat `premium`/
 * `total`. `reviewHasApiBreakdown` reflects that: it's only true once a real
 * order (`paymentOrderDetails.ratingResponse`) is loaded, which is the one
 * place a fuller breakdown could come from. Until nursing rate data exists
 * in `ins`, expect this to stay false in practice.
 *
 * No React, no setters, no side effects.
 */
export function computeDerivedValues({
  // form / step
  step,
  effDate,
  expDate,
  firstName,
  lastName,
  profileEmail,
  profilePhone,
  homeAddress,
  designation,
  // quote + order state
  quote,
  quoteError,
  // real, carrier-backed `POST /auth/quotedata` price — the price source on
  // every step now.
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
}: DerivedValuesInput) {
  // ── Amounts ──────────────────────────────────────────────────────────
  const num = (value: unknown): number | null => {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  };
  const rating = paymentOrderDetails?.ratingResponse;
  const orderTotal = num(paymentOrderDetails?.total) ?? num(rating?.total);
  const orderPremium = num(paymentOrderDetails?.premium) ?? num(rating?.premium);

  // Once a submission exists AND its order has come back from
  // GET /insured/order?submissionid=<id> carrying a rating, that server-side
  // rating is the authoritative "active quote" — it's what `ins` actually
  // rated THIS submission at, which the pre-submission `/auth/quotedata`
  // estimate (`ilf`) can diverge from (limit defaulted server-side, taxes /
  // fees applied, hours factor resolved, …). On the landing / soft-quote
  // steps there's no submission yet, so `ilf` stays the only source. Every
  // `snapshot*` field below follows this same order-wins-once-rated rule —
  // mirrors Q2BNfy's `derivedValues` (`orderRatedTotal ?? softQuotePremiumApi`).
  const hasRatedOrder =
    Boolean(flowSubmissionId) && rating != null && (orderTotal != null || orderPremium != null);

  const premium = hasRatedOrder
    ? (orderPremium ?? num(ilf?.premium) ?? 0)
    : (num(ilf?.premium) ?? orderPremium ?? 0);
  const total = hasRatedOrder
    ? (orderTotal ?? num(ilf?.total) ?? 0)
    : (num(ilf?.total) ?? orderTotal ?? 0);

  // ── State / classification equivalents ───────────────────────────────
  // The rated (practice) state — from the live quote, else the practice
  // location carried on a loaded order (Resume — the `ilf` snapshot is gone
  // after a reload but the order still holds it).
  const orderState = rating?.practiceLocation || paymentOrderDetails?.locationResponse?.state || "";
  const state = String((hasRatedOrder && orderState) || ilf?.st || orderState || "")
    .trim()
    .toUpperCase()
    .slice(0, 2);
  // The picked designation's label, else the speciality title carried on a
  // loaded order — `practiceStore` is empty after a reload/Resume but the
  // order (and its rating response) still names the speciality.
  const actualClass =
    (hasRatedOrder && String(rating?.specialtyTitle || "").trim()) ||
    designationByCode(designation)?.label ||
    String(rating?.specialtyTitle || "").trim();

  // ── Quote strip ──────────────────────────────────────────────────────
  const quoteStripPremium = premium;
  const quoteStripAnnualTotal = total;
  // Pending only while an order fetch is genuinely in flight AND we have no
  // number to show. A live quote means there is always something to render.
  const quoteStripAmountPending =
    Boolean(flowSubmissionId) && paymentOrderLoading && ilf == null && orderTotal == null;

  // ── Snapshot block ───────────────────────────────────────────────────
  const snapshotPremium = premium;
  const snapshotBasePremium = premium;
  const snapshotState = state || "Your state";
  const snapshotZip = "";
  // The limit the user picked on the Home Page calculator, else the state
  // default the quotedata response reports, else the coverage limit carried
  // on a loaded order (Resume — the live `ilf` snapshot is gone after a
  // reload but the order still holds the bound limit).
  const orderLimitTitle = String(rating?.coverageLimitTitle || "").trim();
  const snapshotLimits =
    (hasRatedOrder && orderLimitTitle) ||
    selectedLimitName ||
    ilf?.defaultIlfDlfName ||
    orderLimitTitle ||
    "—";
  const snapshotPolicyType = "Claims made";
  const snapshotPolicyLine = `${snapshotPolicyType} · $0.00 deductible`;
  const snapshotClaimsShort = snapshotPolicyType;
  // Policy period from the live real quote, else the restored order dates
  // (Resume).
  const orderEffMdY = fmtDate(String(rating?.effectiveDate || ""));
  const orderExpMdY = fmtDate(String(rating?.expirationDate || ""));
  const snapshotEffMdY =
    (hasRatedOrder && orderEffMdY) ||
    ilf?.effectiveDate ||
    fmtDate(String(effDate || "")) ||
    orderEffMdY ||
    "";
  const snapshotExpMdY =
    (hasRatedOrder && orderExpMdY) ||
    (ilf ? expirationMdYFromEffAndIlf(ilf.effectiveDate, ilf) : "") ||
    fmtDate(String(expDate || "")) ||
    orderExpMdY ||
    "";
  // The rail's "duration" row becomes the rated speciality — the driver that
  // actually explains the number, per §2.3 of the plan.
  const snapshotDurationLabel =
    specialityTitle || String(rating?.specialtyTitle || "").trim() || "";
  // Retro date the estimate was priced at. Prefer the retro the Home Page
  // user explicitly set; else the retro carried on a loaded order (Resume —
  // the live `ilfDlfStore` value is gone after a reload but the order still
  // holds the bound retro date, which for a prior-acts policy is NOT the
  // effective date); else fall back to the effective date, which is this
  // field's default for a fresh claims-made policy with no prior acts.
  const orderRetroMdY = fmtDate(
    String(
      rating?.retroDate ||
        paymentOrderDetails?.retroDate ||
        paymentOrderDetails?.orderDetailsResponse?.retroDate ||
        "",
    ),
  );
  const snapshotRetroMdY =
    (hasRatedOrder && orderRetroMdY) ||
    fmtDate(String(retroDate || "")) ||
    orderRetroMdY ||
    snapshotEffMdY;

  // ── Underwriting gate (any-yes / all-answered) ───────────────────────
  // Scoped to the 3 groups UnderwritingPage actually renders/gates
  // (Previous Insurance, Claims Information, Underwriting questions) — NOT
  // every group in the tree. `ins`'s real question tree has 6 groups now
  // (License/Scope/Practice and Limits Of Liability also carry RADIO_BUTTON
  // questions), so an unscoped flatMap here would wrongly require those to
  // be answered before Underwriting's Continue enables.
  const UNDERWRITING_GATE_GROUPS_RE = /underwriting|claims information|previous insurance/i;
  const underwritingGateGroups = submissionQuestionGroups.filter((g) =>
    UNDERWRITING_GATE_GROUPS_RE.test(String(g?.groupName || "")),
  );
  const underwritingGateQuestions: any[] = underwritingGateGroups
    .flatMap((g): any[] => g.questions || [])
    .filter((q) => isYesNoQuestionType(q?.questionType) && isQuestionVisible(q, hiddenQuestionIds));
  // Claims Information's 2 RADIO_BUTTON questions ("sued?"/"aware of
  // circumstances?") live in their own dedicated answer map, not
  // underwritingAnswers — merge both so this gate sees either group's answer.
  const underwritingGateAnswers = { ...claimsAnswers, ...underwritingAnswers };
  const anyYes = underwritingGateQuestions.some((q: any) => {
    const sel = underwritingGateAnswers[String(q.id)];
    if (sel == null) return false;
    const opt = ((q.options as any[]) || []).find((o: any) => String(o.id) === String(sel));
    return Boolean(opt) && isYesOption(opt);
  });
  const allAnswered =
    underwritingGateQuestions.length > 0 &&
    underwritingGateQuestions.every((q) => underwritingGateAnswers[String(q.id)] != null);
  const isReferral = anyYes;

  // ── Review page ──────────────────────────────────────────────────────
  const reviewOd = paymentOrderDetails;
  const reviewDisplayTotal = total;
  const paymentAmountDue = (() => {
    const n = Number(total);
    return Number.isFinite(n) && n > 0 ? Math.round(n * 100) / 100 : 0;
  })();
  const nameFromOrder =
    reviewOd &&
    [reviewOd.insuredfirstname, reviewOd.insuredlastname].filter(Boolean).join(" ").trim();
  const reviewApplicantName = (nameFromOrder || `${firstName} ${lastName}`).trim() || "—";
  const pickContact = (...vals: unknown[]): string => {
    for (const v of vals) {
      const s = v != null ? String(v).trim() : "";
      if (s) return s;
    }
    return "—";
  };
  const sessionEmail = insuredProfile?.email || insuredProfile?.username || "";
  const reviewApplicantEmail = pickContact(
    profileEmail,
    reviewOd?.contactResponse?.email,
    sessionEmail.includes("@") ? sessionEmail : "",
  );
  const reviewApplicantPhone = pickContact(
    profilePhone,
    reviewOd?.contactResponse?.contactnumber,
    insuredProfile?.contactnumber,
    insuredProfile?.phone,
  );
  const reviewApplicantAddr = [
    homeAddress?.address1,
    homeAddress?.address2,
    homeAddress?.city,
    homeAddress?.state,
    homeAddress?.zip,
  ]
    .filter((x) => x != null && String(x).trim() !== "")
    .join(", ");
  const paymentBillingDetails = {
    name: reviewApplicantName !== "—" ? reviewApplicantName : undefined,
    email: reviewApplicantEmail !== "—" ? reviewApplicantEmail : undefined,
    phone: reviewApplicantPhone !== "—" ? reviewApplicantPhone : undefined,
  };
  // Only a loaded real order can carry a fuller premium/tax/fees breakdown —
  // `ilf`'s flat premium/total never can (see file header).
  const reviewHasApiBreakdown =
    rating != null && num(rating?.premium) != null && num(rating?.total) != null;
  const reviewR = reviewHasApiBreakdown
    ? {
        premium: num(rating.premium),
        tax: num(rating.tax),
        fees: num(rating.fees),
        total: num(rating.total),
        effectiveDate: rating.effectiveDate || rating.effectivedate,
        expirationDate: rating.expirationDate || rating.expireddate,
        coverageLimitTitle: snapshotLimits,
      }
    : null;
  const reviewPolicyPeriod =
    snapshotEffMdY || snapshotExpMdY ? `${snapshotEffMdY || "—"} – ${snapshotExpMdY || "—"}` : "—";
  const reviewLimitsLabel = snapshotLimits;
  const reviewStateLabel = snapshotState;

  // ── Bound confirmation ───────────────────────────────────────────────
  const boundOrderNumberDisplay = (() => {
    if (
      boundPolicyNumberFromInvoice != null &&
      String(boundPolicyNumberFromInvoice).trim() !== ""
    ) {
      return String(boundPolicyNumberFromInvoice).trim();
    }
    const od = paymentOrderDetails;
    if (od && typeof od === "object") {
      const pn = od.policynumber ?? od.policyNumber;
      if (pn != null && String(pn).trim() !== "") return String(pn).trim();
      const qn = od.quotenumber ?? od.quoteNumber;
      if (qn != null && String(qn).trim() !== "") return String(qn).trim();
      const sidOd = parsePositiveSubmissionId(od.submissionId ?? od.submissionid);
      if (sidOd != null) return `#${sidOd}`;
    }
    const sid = parsePositiveSubmissionId(flowSubmissionId);
    return sid != null ? `#${sid}` : "—";
  })();
  const boundConfirmationAmount = boundTotalAmount != null ? boundTotalAmount : reviewDisplayTotal;
  const boundConfirmationAmountRounded = (() => {
    const n = Number(boundConfirmationAmount);
    return Number.isFinite(n) ? Math.round(n) : Math.round(Number(total));
  })();
  const boundSummaryLine = [snapshotLimits, snapshotPolicyType, actualClass]
    .filter((x) => x != null && String(x).trim() !== "")
    .join(" · ");

  // ── Header / phase chip ──────────────────────────────────────────────
  const headerUserInitials = (insuredProfile?.abbreviation || insuredProfile?.username || "JD")
    .toString()
    .slice(0, 2)
    .toUpperCase();
  const phaseLabel = step <= 2 ? "Soft quote" : step === 3 ? "Registration" : "Full application";

  return {
    // state / class
    state,
    actualClass,
    // premium / total
    premium,
    total,
    // the local quote object, kept only for any remaining direct reader —
    // no longer feeds anything above.
    quote,
    quoteError,
    // snapshot
    snapshotPremium,
    snapshotBasePremium,
    snapshotState,
    snapshotZip,
    snapshotLimits,
    snapshotPolicyType,
    snapshotPolicyLine,
    snapshotClaimsShort,
    snapshotExpMdY,
    snapshotEffMdY,
    snapshotRetroMdY,
    snapshotDurationLabel,
    // quote strip
    quoteStripPremium,
    quoteStripAnnualTotal,
    quoteStripAmountPending,
    // underwriting gate
    anyYes,
    allAnswered,
    isReferral,
    // review
    reviewR,
    reviewDisplayTotal,
    reviewApplicantName,
    reviewApplicantEmail,
    reviewApplicantPhone,
    reviewApplicantAddr,
    reviewHasApiBreakdown,
    reviewPolicyPeriod,
    reviewLimitsLabel,
    reviewStateLabel,
    paymentAmountDue,
    paymentBillingDetails,
    // bound confirmation
    boundOrderNumberDisplay,
    boundConfirmationAmountRounded,
    boundSummaryLine,
    // header
    headerUserInitials,
    phaseLabel,
  };
}
