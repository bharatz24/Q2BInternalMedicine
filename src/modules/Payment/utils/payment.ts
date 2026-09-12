const SUCCESS_STATUSES = new Set(["succeeded", "success", "paid", "complete", "completed"]);

export function isPaymentStatusSuccess(status: unknown): boolean {
  if (status == null) return false;
  return SUCCESS_STATUSES.has(String(status).trim().toLowerCase());
}

export function paymentFailureMessage(body: any, fallback = "Payment was not successful."): string {
  return body?.failureMessage || body?.failureCode || fallback;
}
