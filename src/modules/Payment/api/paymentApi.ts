/**
 * Payment + document API surface. Talks to INS-SERVICE for real — no local
 * fallback, matching every other module in this app (see CLAUDE.md).
 *
 * Every export below is submission-scoped, so — like `quoteApi` and
 * `ratingApi` — these are **correctly wired but not yet exercisable
 * end-to-end**: `ins` will 404 submission creation itself until nursing
 * rate/speciality data is seeded (see `quoteApi`'s header comment), so no
 * real submission id ever reaches these calls today. Known, accepted state.
 */
import axios from "axios";
import { apiUrl, logApiError } from "@/shared/services/config";
import { downloadBlob } from "@/shared/utils/misc";
import {
  DocuSignEmbeddedSigningResponse,
  PaymentCheckoutResponse,
  PaymentInitiateResponse,
  PaymentPublishableKeyResponse,
  PaymentRequest,
  PaymentStatusResponse,
} from "@/shared/dtos";

type SubmissionId = number | string;

export const fetchPaymentPublishableKey = async ({
  signal,
}: { signal?: AbortSignal } = {}): Promise<PaymentPublishableKeyResponse> => {
  try {
    const response = await axios.get(apiUrl("/payment/publishable-key"), {
      withCredentials: true,
      signal,
    });
    return new PaymentPublishableKeyResponse(response.data);
  } catch (error: any) {
    if (axios.isCancel?.(error) || error?.name === "CanceledError" || error?.name === "AbortError")
      throw error;
    logApiError(error);
    throw error;
  }
};

/** POST /payment/initiate */
export const postPaymentInitiate = async (payload: any): Promise<PaymentInitiateResponse> => {
  try {
    const response = await axios.post(apiUrl("/payment/initiate"), new PaymentRequest(payload), {
      withCredentials: true,
    });
    return new PaymentInitiateResponse(response.data);
  } catch (error) {
    logApiError(error);
    throw error;
  }
};

/**
 * POST /payment/confirm. The local build's card-last-digit decline rule is
 * deliberately NOT ported here — it was local-only test behavior, not part
 * of the real contract; `ins`/the gateway decides success or failure.
 */
export const postPaymentConfirm = async (payload: any): Promise<PaymentStatusResponse> => {
  try {
    const response = await axios.post(apiUrl("/payment/confirm"), new PaymentRequest(payload), {
      withCredentials: true,
    });
    return new PaymentStatusResponse(response.data);
  } catch (error) {
    logApiError(error);
    throw error;
  }
};

/** POST /invoice/{submissionid}/generate-binder-invoice */
export const postGenerateBinderInvoice = async (submissionId: SubmissionId): Promise<any> => {
  try {
    const id = encodeURIComponent(String(submissionId));
    const response = await axios.post(apiUrl(`/invoice/${id}/generate-binder-invoice`), null, {
      withCredentials: true,
    });
    return response.data;
  } catch (error) {
    logApiError(error);
    throw error;
  }
};

// `invoice`/`quote` are real-and-live but not present on Q2BNfy's client —
// confirmed at `DocumentsController` (see the integration plan §5.8) and
// matched to this app's existing local `documentLocal.js` DOCUMENT_KINDS
// (`INVOICE`, `QUOTE`), so both map 1:1 to a real download.
const DOCUMENT_KINDS: Record<string, { path: string; filenamePrefix: string }> = {
  binder: { path: "binder/download", filenamePrefix: "binder" },
  coi: { path: "insured-certificate/download", filenamePrefix: "coi" },
  policy: { path: "policy/download", filenamePrefix: "policy" },
  invoice: { path: "invoice/download", filenamePrefix: "invoice" },
  quote: { path: "estimate-quote/download", filenamePrefix: "quote" },
};

/**
 * Real, binary document download — replaces the local build's "open a
 * print-ready HTML window" behavior with an actual PDF file save.
 */
export const downloadDocumentPdf = async (
  submissionId: SubmissionId,
  kind: string,
): Promise<void> => {
  const cfg = DOCUMENT_KINDS[kind];
  if (!cfg) throw new Error(`Unknown document kind: ${kind}`);
  try {
    const url = apiUrl(`/documents/${encodeURIComponent(String(submissionId))}/${cfg.path}`);
    const response = await axios.get(url, { responseType: "arraybuffer", withCredentials: true });
    const blob = new Blob([response.data], { type: "application/pdf" });
    downloadBlob(blob, `${cfg.filenamePrefix}-${submissionId}.pdf`);
  } catch (error) {
    logApiError(error);
    throw error;
  }
};

export const downloadQuotePdf = (submissionId: SubmissionId) =>
  downloadDocumentPdf(submissionId, "quote");
export const downloadBinderPdf = (submissionId: SubmissionId) =>
  downloadDocumentPdf(submissionId, "binder");
export const downloadInvoicePdf = (submissionId: SubmissionId) =>
  downloadDocumentPdf(submissionId, "invoice");
export const downloadCOIPdf = (submissionId: SubmissionId) =>
  downloadDocumentPdf(submissionId, "coi");
export const downloadPolicyPdf = (submissionId: SubmissionId) =>
  downloadDocumentPdf(submissionId, "policy");

/**
 * POST /documents/{sid}/docusign — start (or resume) the embedded signing
 * ceremony. Matches Q2BNfy's exact contract, including the
 * signingUrl/signedCompleted presence check.
 */
export const createDocuSignSigningSessionUrl = async (
  submissionId: SubmissionId,
  returnUrl: string | null = null,
): Promise<DocuSignEmbeddedSigningResponse> => {
  try {
    const params = returnUrl == null ? {} : { returnUrl };
    const response = await axios.post(
      apiUrl(`/documents/${encodeURIComponent(String(submissionId))}/docusign`),
      null,
      { params, withCredentials: true },
    );
    const data = new DocuSignEmbeddedSigningResponse(response.data ?? {});
    if (!data.signingUrl && !data.signedCompleted) {
      throw new Error("Unable to start document signing. Please try again.");
    }
    return data;
  } catch (error) {
    logApiError(error);
    throw error;
  }
};

/**
 * PUT /insured/{submissionId}/underwriter-review-status
 * @returns true when underwriter review is required
 */
export const putUnderwriterReviewStatus = async (submissionId: SubmissionId): Promise<boolean> => {
  try {
    const id = encodeURIComponent(String(submissionId));
    const response = await axios.put(apiUrl(`/insured/${id}/underwriter-review-status`), null, {
      withCredentials: true,
    });
    return response.data;
  } catch (error) {
    logApiError(error);
    throw error;
  }
};

/** Kept for the checkout DTO import parity with the hosted module. No real caller — Nfy doesn't wire /payment/checkout either. */
export const postPaymentCheckout = async (payload: any): Promise<PaymentCheckoutResponse> =>
  new PaymentCheckoutResponse({ ...payload, demo: true });
