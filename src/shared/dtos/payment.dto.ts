// Originally generated from weborder.json (OpenAPI). Now hand-maintained
// (no generator in this repo). Domain: payment.
//
// Each class copies fields from an untyped API response (`raw`) with safe
// defaults, so a missing/null field never crashes a consumer. `declare`
// field lines are type-only (zero runtime emit) — they mirror what the
// constructor assigns.

/**
 * Request body shared by the payment initiate and confirm endpoints. The
 * `paymentId` field carries a Stripe payment-method ID (`pm_…`) on
 * `/initiate` and a Stripe payment-intent ID (`pi_…`) on `/confirm` and
 * `/status`.
 */
export class PaymentRequest {
  declare paymentId: string;
  declare submissionId: number;
  constructor(raw: Record<string, any> = {}) {
    this.paymentId = raw.paymentId ?? ""; // Stripe identifier for the request. Pass the payment-method ID (`pm_…`) when calling `/init...
    this.submissionId = raw.submissionId ?? 0; // Submission id owned by the authenticated insured.
  }
}

/**
 * Payment Gateway payment intent details returned after initiation.
 */
export class PaymentInitiateResponse {
  declare paymentIntentId: string;
  declare clientSecret: string;
  declare status: string;
  constructor(raw: Record<string, any> = {}) {
    this.paymentIntentId = raw.paymentIntentId ?? ""; // Payment Gateway payment intent id.
    this.clientSecret = raw.clientSecret ?? ""; // Stripe client secret used by the frontend to complete payment confirmation.
    this.status = raw.status ?? ""; // Current payment intent status.
  }
}

/**
 * Payment Gateway status for a payment intent.
 */
export class PaymentStatusResponse {
  declare paymentIntentId: string;
  declare status: string;
  declare failureCode: string;
  declare failureMessage: string;
  constructor(raw: Record<string, any> = {}) {
    this.paymentIntentId = raw.paymentIntentId ?? ""; // Payment Gateway payment intent id.
    this.status = raw.status ?? ""; // Current payment status.
    this.failureCode = raw.failureCode ?? ""; // Gateway failure code when payment fails.
    this.failureMessage = raw.failureMessage ?? ""; // Gateway failure message when payment fails.
  }
}

/**
 * Request to create a hosted Stripe Checkout session for a web order
 * submission.
 */
export class PaymentCheckoutRequest {
  declare submissionId: number;
  declare successUrl: string;
  declare cancelUrl: string;
  constructor(raw: Record<string, any> = {}) {
    this.submissionId = raw.submissionId ?? 0; // Submission id owned by the authenticated insured.
    this.successUrl = raw.successUrl ?? ""; // Absolute HTTP(S) URL where Stripe redirects after successful checkout.
    this.cancelUrl = raw.cancelUrl ?? ""; // Absolute HTTP(S) URL where Stripe redirects when checkout is cancelled.
  }
}

/**
 * Hosted checkout session details returned by the Payment Gateway.
 */
export class PaymentCheckoutResponse {
  declare paymentUrl: string;
  constructor(raw: Record<string, any> = {}) {
    this.paymentUrl = raw.paymentUrl ?? ""; // Stripe Checkout redirect URL.
  }
}

/**
 * Stripe publishable key configuration for the web order frontend.
 */
export class PaymentPublishableKeyResponse {
  declare publishableKey: string;
  constructor(raw: Record<string, any> = {}) {
    this.publishableKey = raw.publishableKey ?? ""; // Stripe publishable key.
  }
}
