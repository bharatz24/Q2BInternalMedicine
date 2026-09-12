/**
 * Cross-module session + navigation state.
 *
 *   sessionReady — true once the boot effect has checked the session
 *                  marker and (if present) called /insured/session. UI
 *                  shouldn't redirect away from /signin until this is true.
 *   dashView     — "dashboard" or null; non-null routes the user to
 *                  /dashboard. Set by sign-in success + sign-out resets.
 *   bound        — true once a policy is bound (post-pay confirmation UI).
 */
export type DashView = "dashboard" | null;

class SessionStore {
  #listeners = new Set<() => void>();

  #sessionReady = false;
  #dashView: DashView = null;
  #bound = false;

  get sessionReady(): boolean {
    return this.#sessionReady;
  }
  set sessionReady(v: boolean) {
    this.#sessionReady = !!v;
    this.#notify();
  }

  get dashView(): DashView {
    return this.#dashView;
  }
  set dashView(v: DashView) {
    this.#dashView = v;
    this.#notify();
  }

  get bound(): boolean {
    return this.#bound;
  }
  set bound(v: boolean) {
    this.#bound = !!v;
    this.#notify();
  }

  subscribe(listener: () => void): () => void {
    this.#listeners.add(listener);
    return () => this.#listeners.delete(listener);
  }

  #notify() {
    this.#listeners.forEach((l) => l());
  }

  /**
   * Reset everything except `sessionReady`. The boot check already ran,
   * so even after sign-out the app knows current auth state — flipping
   * `sessionReady` back to false would re-trigger FlowLayout's loading
   * overlay forever (the boot effect only runs once per mount).
   */
  clear() {
    this.#dashView = null;
    this.#bound = false;
    this.#notify();
  }
}

const sessionStore = new SessionStore();
export default sessionStore;
