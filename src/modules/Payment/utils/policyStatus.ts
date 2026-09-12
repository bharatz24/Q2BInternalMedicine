/**
 * Single source of truth for `paymentOrderDetails.policyStatus`. Every
 * consumer that needs to read the current policy status, compare it, or
 * gate a redirect should go through this module — no inline
 * `String(... ).toUpperCase()` checks scattered around the codebase.
 */
import { useStore } from "@/shared/store/useStore";
import paymentOrderStore from "@/modules/Payment/store/paymentOrderStore";
import submissionStore from "@/modules/Quote/store/submissionStore";

export const POLICY_STATUS = Object.freeze({
  OPEN_ORDER: "OPEN_ORDER",
  SIGNED: "SIGNED",
  PAID: "PAID",
  POLICY_ACTIVE: "POLICY_ACTIVE",
});

/** Normalise whatever the backend returned to upper-snake-case for comparison. */
export const normalizePolicyStatus = (value: unknown): string =>
  String(value || "")
    .trim()
    .toUpperCase();

/** Pull the status off any object that has a `.policyStatus` field. */
export const readPolicyStatus = (orderLike: any): string =>
  normalizePolicyStatus(orderLike?.policyStatus);

/**
 * React hook — returns `{ status, isOpenOrder, isSigned, isPaid,
 * isPolicyActive, hasOrder, isLoading }`. `hasOrder` is true once a
 * paymentOrderDetails payload has been received (even if it's empty),
 * so callers can distinguish "still loading" from "loaded but no order".
 */
export function usePolicyStatus() {
  const paymentOrderDetails = useStore(paymentOrderStore, (s) => s.paymentOrderDetails);
  const isLoading = useStore(paymentOrderStore, (s) => s.paymentOrderLoading);
  const loadedSubmissionId = useStore(paymentOrderStore, (s) => s.loadedSubmissionId);
  const flowSubmissionId = useStore(submissionStore, (s) => s.flowSubmissionId);
  // The store can briefly hold details from a previous submission (e.g.
  // immediately after signup, before refreshPaymentOrder has fetched the
  // new order). Only report `hasOrder` when the cache belongs to the
  // currently active submission.
  const sidMatches =
    flowSubmissionId != null &&
    loadedSubmissionId != null &&
    String(loadedSubmissionId) === String(flowSubmissionId);
  const hasOrder = Boolean(paymentOrderDetails) && sidMatches;
  const status = hasOrder ? readPolicyStatus(paymentOrderDetails) : "";
  return {
    status,
    hasOrder,
    isLoading,
    isOpenOrder: status === POLICY_STATUS.OPEN_ORDER,
    isSigned: status === POLICY_STATUS.SIGNED,
    isPaid: status === POLICY_STATUS.PAID,
    isPolicyActive: status === POLICY_STATUS.POLICY_ACTIVE,
  };
}
