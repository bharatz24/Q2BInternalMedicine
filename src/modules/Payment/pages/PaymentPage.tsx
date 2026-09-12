import { useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Elements } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js/pure";
import type { Stripe } from "@stripe/stripe-js";
import { BRAND, BRAND_DARK, BRAND_LIGHT } from "@/shared/constants";
import { Field } from "@/shared/components/Field";
import { PaymentCardField } from "@/modules/Payment/components/PaymentCardField";
import type { PaymentCardFieldHandle } from "@/modules/Payment/components/PaymentCardField";
import { QuoteStrip } from "@/modules/Quote/components/QuoteStrip";
import { SectionTitle } from "@/shared/components/SectionTitle";
import { Spacer } from "@/shared/components/Spacer";
import { LockIcon } from "@/shared/components/Icon";
import Alert from "@/shared/components/Alert";
import Loader from "@/shared/components/Loader";
import { btnPrimary, dis, inputBase } from "@/shared/utils/styles";
import { toError } from "@/shared/utils/misc";
import { formatUsd } from "@/modules/Quote/utils/decimal";
import { isPaymentStatusSuccess, paymentFailureMessage } from "@/modules/Payment/utils/payment";

import {
  fetchPaymentPublishableKey,
  postPaymentConfirm,
  postPaymentInitiate,
} from "@/modules/Payment/api/paymentApi";
import { PaymentRequest } from "@/shared/dtos";
import { refreshPaymentOrder } from "@/modules/Payment/services/paymentOrderService";
import { readPolicyStatus, POLICY_STATUS } from "@/modules/Payment/utils/policyStatus";
import { queryKeys } from "@/shared/query/keys";

import { useStore } from "@/shared/store/useStore";
import paymentOrderStore from "@/modules/Payment/store/paymentOrderStore";
import bindStore from "@/modules/Payment/store/bindStore";
import submissionStore from "@/modules/Quote/store/submissionStore";
import questionsStore from "@/modules/Quote/store/questionsStore";
import { underwritingAnyYesFromSubmissionGroups } from "@/modules/Quote/api/questionsApi";
import { useQuoteSnapshot } from "@/modules/Quote/utils/useQuoteSnapshot";

/**
 * Step 8 — payment.
 *
 * Real Stripe Elements now — `fetchPaymentPublishableKey`, `postPaymentInitiate`
 * and `postPaymentConfirm` all call `ins` for real (see
 * `Payment/api/paymentApi`'s header comment: correctly wired, but not
 * exercisable end-to-end until a real submission can exist). Ported from
 * `Q2BNfy`'s `PaymentPage.jsx`, adapted to this app's `useQuoteSnapshot()`
 * derivation (real-price-everywhere, see `derivedValues`) instead of
 * Nfy's PA-specific fields.
 */
// `loadStripe` injects the Stripe.js script on first call; memoise the
// promise per publishable key so a PaymentPage remount doesn't re-inject.
const stripePromiseByKey = new Map<string, Promise<Stripe | null>>();
function loadStripeOnce(publishableKey: string): Promise<Stripe | null> {
  let p = stripePromiseByKey.get(publishableKey);
  if (!p) {
    p = loadStripe(publishableKey);
    stripePromiseByKey.set(publishableKey, p);
  }
  return p;
}

export default function PaymentPage() {
  const navigate = useNavigate();
  const paymentCardRef = useRef<PaymentCardFieldHandle>(null);
  // Synchronous double-submit lock. `bindLoading` is React state and doesn't
  // flip until after the current tick — two rapid clicks on "Pay" can both
  // pass the `bindLoading` guard. A ref flips immediately, so the second click
  // bails before any Stripe call fires.
  const payInProgressRef = useRef(false);

  // Card form completeness — only this page cares.
  const [cardComplete, setCardComplete] = useState(false);
  const [cardError, setCardError] = useState<string | null>(null);

  // ── Store reads ─────────────────────────────────────────────────────────
  const paymentOrderLoading = useStore(paymentOrderStore, (s) => s.paymentOrderLoading);
  const paymentOrderError = useStore(paymentOrderStore, (s) => s.paymentOrderError);
  const paymentOrderDetails = useStore(paymentOrderStore, (s) => s.paymentOrderDetails);
  const bindLoading = useStore(bindStore, (s) => s.bindLoading);
  const bindError = useStore(bindStore, (s) => s.bindError);
  const flowSubmissionId = useStore(submissionStore, (s) => s.flowSubmissionId);
  const submissionQuestionGroups = useStore(questionsStore, (s) => s.submissionQuestionGroups);
  const submissionQuestionsSid = useStore(questionsStore, (s) => s.submissionQuestionsSid);

  const {
    quoteStripAnnualTotal,
    snapshotLimits,
    snapshotPolicyLine,
    quoteStripAmountPending,
    reviewApplicantName,
    reviewApplicantEmail,
    reviewApplicantPhone,
    reviewApplicantAddr,
    reviewPolicyPeriod,
    reviewLimitsLabel,
    reviewStateLabel,
    snapshotDurationLabel,
    anyYes,
    paymentBillingDetails,
    premium,
    total,
    paymentAmountDue,
  } = useQuoteSnapshot();

  // ── Stripe publishable key (react-query — stable per session) ──────────
  const stripeKeyQ = useQuery({
    queryKey: queryKeys.payment.publishableKey(),
    queryFn: () => fetchPaymentPublishableKey(),
    staleTime: Infinity,
  });
  const stripeKeyLoading = stripeKeyQ.isPending;
  const stripeKeyError = stripeKeyQ.isError ? toError(stripeKeyQ.error).message : null;
  const stripePromise = useMemo(
    () => (stripeKeyQ.data?.publishableKey ? loadStripeOnce(stripeKeyQ.data.publishableKey) : null),
    [stripeKeyQ.data?.publishableKey],
  );

  // The submission question tree (its "Underwriting" summary line) is fetched
  // by the app-level `useSubmissionQuestionsFetch` bootstrap hook, which now
  // covers /payment too — no page-local fetch here any more.

  const canBind =
    Boolean(stripePromise) && cardComplete && !cardError && !stripeKeyError && !bindLoading;

  // ── Pay & bind ─────────────────────────────────────────────────────────
  const handlePayAndBind = async () => {
    if (payInProgressRef.current) return;
    if (bindLoading) return;
    if (!canBind) return;
    if (!flowSubmissionId) {
      bindStore.bindError = "Missing submission id. Please resume your application and try again.";
      return;
    }
    if (!paymentCardRef.current) {
      bindStore.bindError = "Payment form is still loading. Please try again in a moment.";
      return;
    }
    if (!paymentAmountDue || paymentAmountDue <= 0) {
      bindStore.bindError =
        "Payment amount is unavailable. Please refresh the quote and try again.";
      return;
    }
    // Lock BEFORE any await so a second click in the same tick bails.
    payInProgressRef.current = true;
    bindStore.bindError = null;
    bindStore.bindLoading = true;
    try {
      const submissionId = Number(flowSubmissionId);
      const paymentMethod = await paymentCardRef.current!.createPaymentMethod();
      const initiatedPayment = await postPaymentInitiate(
        new PaymentRequest({
          paymentId: paymentMethod.id,
          submissionId,
        }),
      );

      let paymentIntentId = initiatedPayment?.paymentIntentId;
      let paymentStatus = initiatedPayment?.status;
      if (!paymentIntentId) throw new Error("Payment processor did not return a payment intent.");

      if (!isPaymentStatusSuccess(paymentStatus) && initiatedPayment?.clientSecret) {
        const paymentIntent = await paymentCardRef.current!.confirmCardPayment(
          initiatedPayment.clientSecret,
        );
        paymentIntentId = paymentIntent?.id || paymentIntentId;
        paymentStatus = paymentIntent?.status || paymentStatus;
      }

      const confirmedPayment = await postPaymentConfirm(
        new PaymentRequest({ submissionId, paymentId: paymentIntentId }),
      );
      if (!isPaymentStatusSuccess(confirmedPayment?.status || paymentStatus)) {
        throw new Error(paymentFailureMessage(confirmedPayment));
      }

      // Payment confirmed at Stripe — pull the authoritative order from
      // /insured/order so the policyStatus the backend just flipped is in
      // the store before BinderInvoicePage mounts (its mount effect kicks
      // the user back to /dashboard when policyStatus !== 'PAID').
      const refreshedOrder = await refreshPaymentOrder(submissionId);
      if (readPolicyStatus(refreshedOrder) !== POLICY_STATUS.PAID) {
        throw new Error(
          "Payment processed but the order status hasn't updated yet. Please refresh in a moment.",
        );
      }

      const r = refreshedOrder?.ratingResponse ?? paymentOrderDetails?.ratingResponse;
      const apiTotal =
        r?.total != null && Number.isFinite(Number(r.total)) ? Number(r.total) : null;
      bindStore.boundTotalAmount = apiTotal != null ? apiTotal : total;

      navigate("/binder-invoice");
    } catch (e) {
      bindStore.bindError = toError(e).message;
    } finally {
      bindStore.bindLoading = false;
      payInProgressRef.current = false;
    }
  };

  // ── Summary fields ─────────────────────────────────────────────────────
  const od = paymentOrderDetails;
  const submissionNumberDisplay =
    (od?.policynumber && String(od.policynumber).trim()) ||
    (od?.quotenumber && String(od.quotenumber).trim()) ||
    (flowSubmissionId ? `#${flowSubmissionId}` : null);

  // Only read answers from the tree once it's confirmed to belong to the
  // active submission — otherwise a just-resumed submission would briefly show
  // the previously-loaded one's answers.
  const questionGroupsForSubmission =
    submissionQuestionsSid === String(flowSubmissionId) ? submissionQuestionGroups : [];
  const underwritingAnyYes =
    underwritingAnyYesFromSubmissionGroups(questionGroupsForSubmission) ?? anyYes;
  const underwritingLabel = underwritingAnyYes ? "Yes responses — referral" : "All clear";

  const orderRating = paymentOrderDetails?.ratingResponse;
  const totalLabel =
    orderRating?.total != null && Number.isFinite(Number(orderRating.total))
      ? formatUsd(String(orderRating.total))
      : total > 0
        ? formatUsd(String(total))
        : "—";

  return (
    <>
      <QuoteStrip
        total={quoteStripAnnualTotal}
        limits={snapshotLimits}
        claims={snapshotPolicyLine}
        amountPending={quoteStripAmountPending}
        amountLabel="Your total"
      />
      <h2
        className="ui-heading"
        style={{
          fontFamily: "var(--font-heading)",
          fontSize: 19,
          fontWeight: 600,
          color: "#1a1a1a",
          margin: "6px 0 4px",
        }}
      >
        Payment
      </h2>
      <p style={{ fontSize: 12, color: "#595959", marginBottom: 14, lineHeight: 1.5 }}>
        Secure payment via Stripe. We never store card details.
      </p>

      {paymentOrderLoading && <Loader label="Loading submission…" />}
      {flowSubmissionId != null && <Alert type="error" message={paymentOrderError} />}

      <div
        style={{ background: "#f7f7f5", borderRadius: 12, padding: "12px 14px", marginBottom: 12 }}
      >
        <div style={{ fontSize: 13, fontWeight: 500, color: "#333", marginBottom: 8 }}>
          Submission summary
        </div>
        {[
          submissionNumberDisplay && ["Submission #", submissionNumberDisplay],
          ["Applicant", reviewApplicantName],
          ["Email", reviewApplicantEmail],
          ["Phone", reviewApplicantPhone],
          reviewApplicantAddr && ["Address", reviewApplicantAddr],
          ["Policy period", reviewPolicyPeriod],
          snapshotDurationLabel && ["Speciality", snapshotDurationLabel],
          ["Limits", reviewLimitsLabel],
          reviewStateLabel && reviewStateLabel !== "Your state" && ["State", reviewStateLabel],
          ["Underwriting", underwritingLabel],
        ]
          .filter(Boolean)
          .map(([l, v]) => (
            <div
              key={l}
              style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}
            >
              <span style={{ fontSize: 11.5, color: "#595959" }}>{l}</span>
              <span
                style={{
                  fontSize: 11.5,
                  color: "#444",
                  fontWeight: 500,
                  textAlign: "right",
                  maxWidth: "60%",
                }}
              >
                {v}
              </span>
            </div>
          ))}
      </div>

      {stripeKeyLoading && <Loader label="Loading secure payment form…" />}
      <Alert type="error" message={stripeKeyError} />
      <Field label="Credit/Debit card payment">
        {stripePromise ? (
          <Elements stripe={stripePromise}>
            <PaymentCardField
              ref={paymentCardRef}
              disabled={bindLoading}
              billingDetails={paymentBillingDetails}
              onCompleteChange={setCardComplete}
              onErrorChange={setCardError}
            />
          </Elements>
        ) : (
          <div style={{ ...inputBase, padding: "13px 14px", color: "#595959" }}>
            {stripeKeyError ? "Payment form unavailable" : "Loading Stripe…"}
          </div>
        )}
      </Field>
      <Alert type="error" message={cardError} />

      <div style={{ background: "#f7f7f5", borderRadius: 12, padding: "14px 16px", marginTop: 8 }}>
        <SectionTitle>Order summary</SectionTitle>
        {(() => {
          const r = orderRating;
          const hasApi =
            r && (r.premium != null || r.tax != null || r.fees != null || r.total != null);
          if (hasApi) {
            const rows = [];
            if (r.premium != null) rows.push(["Premium", formatUsd(String(r.premium))]);
            if (r.tax != null) rows.push(["Taxes", formatUsd(String(r.tax))]);
            if (r.fees != null) rows.push(["Fees", formatUsd(String(r.fees))]);
            if (rows.length === 0 && r.total != null)
              rows.push(["Quoted total", formatUsd(String(r.total))]);
            return rows;
          }
          return [
            ["Estimated premium", premium > 0 ? formatUsd(String(premium)) : "—"],
            ["Taxes", "—"],
            ["Fees", "—"],
          ];
        })().map(([l, v]) => (
          <div
            key={l}
            style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}
          >
            <span style={{ fontSize: 12, color: "#595959" }}>{l}</span>
            <span
              style={{
                fontSize: 12,
                fontWeight: 500,
                color: "#333",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {v}
            </span>
          </div>
        ))}
        <div style={{ height: 1, background: "#e0e0de", margin: "8px 0" }} />
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span style={{ fontSize: 15, fontWeight: 500, color: "#333" }}>Total due today</span>
          <span style={{ fontSize: 16, fontWeight: 500, color: BRAND_DARK }}>{totalLabel}</span>
        </div>
      </div>

      <div
        style={{
          background: BRAND_LIGHT,
          borderRadius: 10,
          padding: "10px 14px",
          marginTop: 10,
          display: "flex",
          alignItems: "flex-start",
          gap: 8,
        }}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke={BRAND}
          strokeWidth="2"
          strokeLinecap="round"
          style={{ width: 15, height: 15, flexShrink: 0, marginTop: 1 }}
        >
          <circle cx="12" cy="12" r="10" />
          <path d="M12 16v-4" />
          <line x1="12" y1="8" x2="12.01" y2="8" />
        </svg>
        <span
          style={{
            fontSize: 11,
            color: BRAND_DARK,
            lineHeight: 1.5,
            fontFamily: "var(--font-body)",
          }}
        >
          <strong>Cancellation rights:</strong> You may cancel your policy before your policy
          effective date for a full refund of all premiums, fees, and contributions.
        </span>
      </div>

      <Spacer />
      <Alert type="error" message={bindError} className="alert-center" />

      <button
        type="button"
        disabled={!canBind}
        className="ui-btn-primary"
        style={dis({ ...btnPrimary, fontSize: 15 }, canBind)}
        onClick={handlePayAndBind}
      >
        <LockIcon /> {bindLoading ? "Processing…" : `Pay ${totalLabel}`}
      </button>
      <p style={{ fontSize: 10, color: "#595959", textAlign: "center", marginTop: 8 }}>
        256-bit SSL encrypted · PCI-DSS compliant
      </p>
    </>
  );
}
