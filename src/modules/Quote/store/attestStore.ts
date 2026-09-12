/**
 * Attestation answers (Review page). NOT persisted — the user must
 * re-confirm on reload, by design.
 */
type AttestAnswer = boolean | null;

class AttestStore {
  #listeners = new Set<() => void>();

  #attestAnswers: AttestAnswer[] = Array(9).fill(null);
  #attestDetails = "";

  get attestAnswers(): AttestAnswer[] {
    return this.#attestAnswers;
  }
  set attestAnswers(v: AttestAnswer[]) {
    this.#attestAnswers = v;
    this.#notify();
  }

  get attestDetails(): string {
    return this.#attestDetails;
  }
  set attestDetails(v: string) {
    this.#attestDetails = v;
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
    this.#attestAnswers = Array(9).fill(null);
    this.#attestDetails = "";
    this.#notify();
  }
}

const attestStore = new AttestStore();
export default attestStore;
