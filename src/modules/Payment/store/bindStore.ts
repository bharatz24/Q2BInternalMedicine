/**
 * Pay-and-bind flow status + post-bind result fields.
 * Owns the Payment page's submit button state and the BinderInvoice /
 * CompleteOrder pages' "what was bound" summary inputs.
 */
class BindStore {
  #listeners = new Set<() => void>();

  #bindLoading = false;
  #bindError: string | null = null;
  #boundTotalAmount: number | string | null = null;
  #boundPolicyNumberFromInvoice: string | null = null;
  #signBinderLoading = false;
  #signBinderError: string | null = null;

  get bindLoading(): boolean {
    return this.#bindLoading;
  }
  set bindLoading(v: boolean) {
    this.#bindLoading = !!v;
    this.#notify();
  }

  get bindError(): string | null {
    return this.#bindError;
  }
  set bindError(v: string | null) {
    this.#bindError = v;
    this.#notify();
  }

  get boundTotalAmount(): number | string | null {
    return this.#boundTotalAmount;
  }
  set boundTotalAmount(v: number | string | null) {
    this.#boundTotalAmount = v;
    this.#notify();
  }

  get boundPolicyNumberFromInvoice(): string | null {
    return this.#boundPolicyNumberFromInvoice;
  }
  set boundPolicyNumberFromInvoice(v: string | null) {
    this.#boundPolicyNumberFromInvoice = v;
    this.#notify();
  }

  get signBinderLoading(): boolean {
    return this.#signBinderLoading;
  }
  set signBinderLoading(v: boolean) {
    this.#signBinderLoading = !!v;
    this.#notify();
  }

  get signBinderError(): string | null {
    return this.#signBinderError;
  }
  set signBinderError(v: string | null) {
    this.#signBinderError = v;
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
    this.#bindLoading = false;
    this.#bindError = null;
    this.#boundTotalAmount = null;
    this.#boundPolicyNumberFromInvoice = null;
    this.#signBinderLoading = false;
    this.#signBinderError = null;
    this.#notify();
  }
}

const bindStore = new BindStore();
export default bindStore;
