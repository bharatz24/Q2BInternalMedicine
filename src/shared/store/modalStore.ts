/**
 * Modal visibility flags. Used by Shell/Modals and the various legal
 * pages that link to the Terms / Privacy / About dialogs.
 */
class ModalStore {
  #listeners = new Set<() => void>();

  #showPrivacy = false;
  #showTerms = false;
  #showAbout = false;
  #showFAQ = false;

  get showPrivacy(): boolean {
    return this.#showPrivacy;
  }
  set showPrivacy(v: boolean) {
    this.#showPrivacy = !!v;
    this.#notify();
  }

  get showTerms(): boolean {
    return this.#showTerms;
  }
  set showTerms(v: boolean) {
    this.#showTerms = !!v;
    this.#notify();
  }

  get showAbout(): boolean {
    return this.#showAbout;
  }
  set showAbout(v: boolean) {
    this.#showAbout = !!v;
    this.#notify();
  }

  get showFAQ(): boolean {
    return this.#showFAQ;
  }
  set showFAQ(v: boolean) {
    this.#showFAQ = !!v;
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
    this.#showPrivacy = false;
    this.#showTerms = false;
    this.#showAbout = false;
    this.#showFAQ = false;
    this.#notify();
  }
}

const modalStore = new ModalStore();
export default modalStore;
