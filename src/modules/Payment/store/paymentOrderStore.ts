/**
 * Payment order details — what /insured/order returns + the loading/error
 * status while fetching. Read by Review, Payment, BinderInvoice, and
 * CompleteOrder pages; many derived snapshot values key off it.
 */
class PaymentOrderStore {
  #listeners = new Set<() => void>();

  #paymentOrderDetails: any = null;
  #paymentOrderLoading = false;
  #paymentOrderError: string | null = null;
  // Submission id the cached `paymentOrderDetails` belongs to. Lets
  // `refreshPaymentOrder(sid, { ifMissing: true })` short-circuit when
  // the order is already in the store for the requested sid — avoids the
  // duplicate fetch from Resume → LicenseScopePage mount.
  #loadedSubmissionId: string | null = null;

  get paymentOrderDetails(): any {
    return this.#paymentOrderDetails;
  }
  set paymentOrderDetails(v: any) {
    this.#paymentOrderDetails = v;
    this.#notify();
  }

  get paymentOrderLoading(): boolean {
    return this.#paymentOrderLoading;
  }
  set paymentOrderLoading(v: boolean) {
    this.#paymentOrderLoading = !!v;
    this.#notify();
  }

  get paymentOrderError(): string | null {
    return this.#paymentOrderError;
  }
  set paymentOrderError(v: string | null) {
    this.#paymentOrderError = v;
    this.#notify();
  }

  get loadedSubmissionId(): string | null {
    return this.#loadedSubmissionId;
  }
  set loadedSubmissionId(v: string | number | null | undefined) {
    this.#loadedSubmissionId = v == null ? null : String(v);
    this.#notify();
  }

  subscribe(listener: () => void): () => void {
    this.#listeners.add(listener);
    return () => this.#listeners.delete(listener);
  }

  #notify() {
    this.#listeners.forEach((l) => l());
  }

  clear() {
    this.#paymentOrderDetails = null;
    this.#paymentOrderLoading = false;
    this.#paymentOrderError = null;
    this.#loadedSubmissionId = null;
    this.#notify();
  }
}

const paymentOrderStore = new PaymentOrderStore();
export default paymentOrderStore;
