/**
 * Payment-module constants.
 *
 * BINDER_NEEDED_STATUSES — list/workflow labels that mean payment is done
 * and the applicant still needs to generate binder + invoice. Locally,
 * `markSubmissionPaid` sets workflowStatus to "Pay" (and policyStatus PAID);
 * "paid" / "binding policy" cover alternate spellings from list DTO fields.
 */
export const BINDER_NEEDED_STATUSES = new Set(["pay", "paid", "binding policy"]);

/** List/workflow labels that mean attestation is done and payment is next. */
export const PAYMENT_NEEDED_STATUSES = new Set(["signed", "sign"]);
