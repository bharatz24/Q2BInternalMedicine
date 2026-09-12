/**
 * Local id generation. Ids only have to be unique within one browser, so a
 * per-table counter kept alongside the data is enough — no uuid dependency.
 */

import { nextCounter } from "@/local/db";

/** Zero-padded sequence, e.g. 7 -> "000007". */
const pad = (n: number | string, width = 6): string => String(n).padStart(width, "0");

/**
 * Numeric submission id. The DTOs and every `Number(flowSubmissionId)` guard
 * in the app expect a positive number, so this stays numeric rather than
 * becoming a string id.
 *
 */
export function nextSubmissionId(): number {
  return 1000 + nextCounter("submission");
}

/** Numeric account id, in a range that can't collide with submission ids. */
export function nextAccountId(): number {
  return 500000 + nextCounter("account");
}

/**
 * Quote number in the format the rest of the UI renders,
 * e.g. `NUR-2026-000123`.
 *
 * @returns {string}
 */
export function nextQuoteNumber(): string {
  return `NUR-${new Date().getFullYear()}-${pad(nextCounter("quote"))}`;
}

/** Policy number issued at bind, e.g. `NUR-P-2026-000123`. */
export function nextPolicyNumber(): string {
  return `NUR-P-${new Date().getFullYear()}-${pad(nextCounter("policy"))}`;
}

/** Invoice number, e.g. `INV-2026-000123`. */
export function nextInvoiceNumber(): string {
  return `INV-${new Date().getFullYear()}-${pad(nextCounter("invoice"))}`;
}

/** Simulated payment-intent id, shaped like the ones Stripe returns. */
export function nextPaymentIntentId(): string {
  return `pi_local_${pad(nextCounter("payment"), 8)}`;
}
