/**
 * Tiny page-side wrappers around the document views.
 *
 * Each handler matches the shape pages were already using:
 *   handler(submissionId[, isActive], setError) → Promise<void>
 *
 * Binder/Policy are gated by `isActive` (issued policies only). The COI is
 * too, server-side — `ins` returns 404 until the policy is bound — so pages
 * gate all three with `canDownloadPolicyDocuments`; only the quote is always
 * available. Errors go to the page's local error state via the
 * optional `setError` callback — the caller picks where the message renders.
 *
 * Each handler delegates to `paymentApi.js`'s real binary document download
 * (`GET /documents/{id}/{kind}/download`) — no local/specimen fallback.
 */
import {
  downloadBinderPdf,
  downloadCOIPdf,
  downloadInvoicePdf,
  downloadPolicyPdf,
  downloadQuotePdf,
} from "@/modules/Payment/api/paymentApi";

/** Real certificate of insurance — GET /documents/{id}/insured-certificate/download. */
export async function downloadCOI(submissionId: number | string, setError?: (msg: string) => void) {
  try {
    await downloadCOIPdf(submissionId);
  } catch (e: any) {
    setError?.(e?.message || "Could not open the certificate");
  }
}

export async function downloadQuote(
  submissionId: number | string,
  setError?: (msg: string) => void,
) {
  try {
    await downloadQuotePdf(submissionId);
  } catch (e: any) {
    setError?.(e?.message || "Could not open the quote");
  }
}

export async function downloadBinder(
  submissionId: number | string,
  isActive: boolean,
  setError?: (msg: string) => void,
) {
  if (!isActive) return;
  try {
    await downloadBinderPdf(submissionId);
  } catch (e: any) {
    setError?.(e?.message || "Could not open the binder");
  }
}

export async function downloadInvoice(
  submissionId: number | string,
  isActive: boolean,
  setError?: (msg: string) => void,
) {
  if (!isActive) return;
  try {
    await downloadInvoicePdf(submissionId);
  } catch (e: any) {
    setError?.(e?.message || "Could not open the invoice");
  }
}

/** Full policy document — GET /documents/{id}/policy/download (issued policies only). */
export async function downloadPolicy(
  submissionId: number | string,
  isActive: boolean,
  setError?: (msg: string) => void,
) {
  if (!isActive) return;
  try {
    await downloadPolicyPdf(submissionId);
  } catch (e: any) {
    setError?.(e?.message || "Could not open the policy");
  }
}
