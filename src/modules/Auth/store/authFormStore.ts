/**
 * Auth-module form + status state — the sign-in form and the registration
 * flow, in one store. Merged from the old `loginStore` + `signupStore`
 * (ADR 0003, "Remaining"): both were small auth-module form/status stores
 * with the same lifecycle, so they live together now.
 *
 *   import authFormStore from "@/modules/Auth/store/authFormStore";
 *   authFormStore.loginEmail = "jane@example.com";
 *   useStore(authFormStore, (s) => s.signInLoading);
 *
 * The applicant's identity (name, email, phone, address) is NOT held here.
 * It lives once, in `physicianProfileStore` — the registration form binds
 * straight to it. See `docs/ARCHITECTURE.md` → "Identity-store consolidation".
 *
 * Passwords (`loginPassword`, `regPassword`) are in-memory only and are
 * never persisted for any reason; a reload resets them.
 */
class AuthFormStore {
  #listeners = new Set<() => void>();

  // ── Sign-in form ──────────────────────────────────────────────────────
  #loginEmail = "";
  #loginPassword = ""; // memory-only — never persisted
  #signInLoading = false;
  #signInError: string | null = null;

  get loginEmail(): string {
    return this.#loginEmail;
  }
  set loginEmail(v: string) {
    this.#loginEmail = v;
    this.#notify();
  }

  get loginPassword(): string {
    return this.#loginPassword;
  }
  set loginPassword(v: string) {
    this.#loginPassword = v;
    this.#notify();
  }

  get signInLoading(): boolean {
    return this.#signInLoading;
  }
  set signInLoading(v: boolean) {
    this.#signInLoading = !!v;
    this.#notify();
  }

  get signInError(): string | null {
    return this.#signInError;
  }
  set signInError(v: string | null) {
    this.#signInError = v;
    this.#notify();
  }

  // ── Registration flow ─────────────────────────────────────────────────
  #regPassword = ""; // memory-only — never persisted
  #signupLoading = false;
  #signupError: string | null = null;
  #signupDone = false;
  #needsSignupCompletion = false;
  #googleSignupLoading = false;
  #googleSignupError: string | null = null;

  get regPassword(): string {
    return this.#regPassword;
  }
  set regPassword(v: string) {
    this.#regPassword = v;
    this.#notify();
  }

  get signupLoading(): boolean {
    return this.#signupLoading;
  }
  set signupLoading(v: boolean) {
    this.#signupLoading = !!v;
    this.#notify();
  }

  get signupError(): string | null {
    return this.#signupError;
  }
  set signupError(v: string | null) {
    this.#signupError = v;
    this.#notify();
  }

  get signupDone(): boolean {
    return this.#signupDone;
  }
  set signupDone(v: boolean) {
    this.#signupDone = !!v;
    this.#notify();
  }

  get needsSignupCompletion(): boolean {
    return this.#needsSignupCompletion;
  }
  set needsSignupCompletion(v: boolean) {
    this.#needsSignupCompletion = !!v;
    this.#notify();
  }

  get googleSignupLoading(): boolean {
    return this.#googleSignupLoading;
  }
  set googleSignupLoading(v: boolean) {
    this.#googleSignupLoading = !!v;
    this.#notify();
  }

  get googleSignupError(): string | null {
    return this.#googleSignupError;
  }
  set googleSignupError(v: string | null) {
    this.#googleSignupError = v;
    this.#notify();
  }

  subscribe(listener: () => void): () => void {
    this.#listeners.add(listener);
    return () => this.#listeners.delete(listener);
  }

  #notify() {
    this.#listeners.forEach((l) => l());
  }

  /** Reset the sign-in form only (used on full sign-out). */
  clearLogin() {
    this.#loginEmail = "";
    this.#loginPassword = "";
    this.#signInLoading = false;
    this.#signInError = null;
    this.#notify();
  }

  /** Reset the registration flow only (used when starting a brand-new quote). */
  clearSignup() {
    this.#regPassword = "";
    this.#signupLoading = false;
    this.#signupError = null;
    this.#signupDone = false;
    this.#needsSignupCompletion = false;
    this.#googleSignupLoading = false;
    this.#googleSignupError = null;
    this.#notify();
  }

  clear() {
    this.clearLogin();
    this.clearSignup();
  }
}

const authFormStore = new AuthFormStore();
export default authFormStore;
