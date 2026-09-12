/**
 * The current quote: the five rate components plus the total, as returned by
 * `nursingRatingService.calculateQuote()`.
 *
 * In memory only. The quote is a pure function of the practice inputs, which
 * `practiceStore` does persist — so after a refresh it is recomputed rather
 * than restored, and there is no way for a stale figure to outlive the
 * inputs that produced it.
 */

/**
 * The full result object from `calculateQuote()` — shape is the (dead, local)
 * rating engine's and is only read by untyped `.jsx`, so it stays `any`
 * rather than a brittle mirror of `nursingRatingService`'s return literal.
 */
type QuoteResult = any;

class QuoteResultStore {
  #listeners = new Set<() => void>();

  #quote: QuoteResult | null = null;
  /** the rating error, when the dates can't be priced */
  #quoteError: Error | null = null;

  get quote(): QuoteResult | null {
    return this.#quote;
  }
  set quote(v: QuoteResult | null) {
    this.#quote = v || null;
    // A successful quote clears any previous failure — they can never both be
    // meaningful at once, and leaving a stale error visible under a fresh
    // number is the confusing case.
    if (v) this.#quoteError = null;
    this.#notify();
  }

  get quoteError(): Error | null {
    return this.#quoteError;
  }
  set quoteError(v: Error | null) {
    this.#quoteError = v || null;
    if (v) this.#quote = null;
    this.#notify();
  }

  /** The speciality that set the price, or null — see §2.3 of the plan. */
  get governingSpecialityLabel(): string | null {
    return this.#quote?.governingSpecialityLabel ?? null;
  }

  /** The 2 dp total for display, or null when there is no quote. */
  get totalDisplay(): string | null {
    return this.#quote?.amounts?.total?.display ?? null;
  }

  /** The 4 dp total straight from the rate sheet, or null. */
  get totalRaw(): number | null {
    return this.#quote?.amounts?.total?.raw ?? null;
  }

  subscribe(listener: () => void): () => void {
    this.#listeners.add(listener);
    return () => this.#listeners.delete(listener);
  }

  #notify() {
    this.#listeners.forEach((l) => l());
  }

  clear() {
    this.#quote = null;
    this.#quoteError = null;
    this.#notify();
  }
}

const quoteResultStore = new QuoteResultStore();
export default quoteResultStore;
