/**
 * Submission state — the active submission id + step pointer + status
 * flags for the "create submission" POST. `flowSubmissionId` and `step`
 * are mirrored to sessionStorage so a hard refresh on /payment,
 * /reviewDocusign, /binder-invoice (and friends) keeps the user on the
 * same page instead of bouncing back to /dashboard or the landing page.
 * Mirror clears with the tab (sessionStorage) and on `clear()`.
 */
const SS_KEY_SID = "q2b:submission:flowSubmissionId";
const SS_KEY_STEP = "q2b:submission:step";

const readSession = (key: string): string | null => {
  try {
    return typeof sessionStorage !== "undefined" ? sessionStorage.getItem(key) : null;
  } catch {
    return null;
  }
};
const writeSession = (key: string, value: string | number | null | undefined) => {
  try {
    if (typeof sessionStorage === "undefined") return;
    if (value == null || value === "") sessionStorage.removeItem(key);
    else sessionStorage.setItem(key, String(value));
  } catch {
    /* private mode / quota — fall through */
  }
};

class SubmissionStore {
  #listeners = new Set<() => void>();

  #flowSubmissionId: string | null = (() => {
    const raw = readSession(SS_KEY_SID);
    return raw ? raw : null;
  })();
  #step: number = (() => {
    const raw = readSession(SS_KEY_STEP);
    const n = raw == null ? NaN : Number(raw);
    return Number.isFinite(n) ? n : 0;
  })();

  get flowSubmissionId(): string | null {
    return this.#flowSubmissionId;
  }
  set flowSubmissionId(v: string | number | null | undefined) {
    // Always store as a string (or null). SessionStorage restores strings;
    // createSubmission used to write numbers — the flip re-fired bootstrap
    // resets and raced the question loader.
    this.#flowSubmissionId = v == null || v === "" ? null : String(v);
    writeSession(SS_KEY_SID, this.#flowSubmissionId);
    this.#notify();
  }

  get step(): number {
    return this.#step;
  }
  set step(v: number) {
    this.#step = Number.isFinite(v) ? v : 0;
    writeSession(SS_KEY_STEP, this.#step);
    this.#notify();
  }

  // POST /insured/submission status (auth'd "Create order" button)
  #insuredSubmissionLoading = false;
  #insuredSubmissionError: string | null = null;

  get insuredSubmissionLoading(): boolean {
    return this.#insuredSubmissionLoading;
  }
  set insuredSubmissionLoading(v: boolean) {
    this.#insuredSubmissionLoading = !!v;
    this.#notify();
  }

  get insuredSubmissionError(): string | null {
    return this.#insuredSubmissionError;
  }
  set insuredSubmissionError(v: string | null) {
    this.#insuredSubmissionError = v;
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
    this.#flowSubmissionId = null;
    this.#step = 0;
    this.#insuredSubmissionLoading = false;
    this.#insuredSubmissionError = null;
    writeSession(SS_KEY_SID, null);
    writeSession(SS_KEY_STEP, null);
    this.#notify();
  }
}

const submissionStore = new SubmissionStore();
export default submissionStore;
