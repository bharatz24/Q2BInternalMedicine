import type { QuoteFormData, CoverageLimitOptionResponse } from "@/shared/dtos";

/**
 * The live carrier-backed price projection — `#current` is the latest
 * `POST /auth/quotedata` (`QuoteFormData`) response, read synchronously by
 * `useQuoteSnapshot` / `derivedValues` / `useWizardGuards` / `submission.ts`.
 *
 * The response *cache* (dedup by zip+speciality+date+limit+retro, staleness,
 * retry) now lives in the shared react-query cache
 * (`queryKeys.rating.quoteData`) — `useIlfDlfFetcher` fetches through it and
 * pushes the result here. This store keeps only what react-query does not
 * manage: the current price + fetch-status projection, and the user's
 * limit / retro-date **selection** (`#selectedCoverageLimitId` / `#retroDate`).
 *
 * Deliberately separate from `quoteResultStore` — that holds the local
 * `nursingRatingService` price (retained-but-inactive; see docs/ARCHITECTURE).
 */
class IlfDlfStore {
  #listeners = new Set<() => void>();
  #current: QuoteFormData | null = null;
  #loading = false;
  #error: Error | null = null;

  // Coverage-limit options for the current ZIP's state
  // (`GET /auth/{zip}/coverage-limits`) — what the Home Page "Instant
  // estimate" limit picker renders. Kept here (not a page-local state) so
  // it survives the calculator card remounting after "Continue".
  #coverageLimits: CoverageLimitOptionResponse[] = [];
  #coverageLimitsLoading = false;
  #coverageLimitsError: Error | null = null;

  // The limit the Home Page user has picked (an `id` from `#coverageLimits`),
  // or null to mean "use the state default". Persisted here — not page-local —
  // so `/quote`, the snapshot rail and review all show the same limit the
  // estimate was priced at. When null, consumers fall back to the quotedata
  // response's `defaultIlfDlfName`.
  #selectedCoverageLimitId: number | null = null;

  // The retro date the estimate was priced at (MM/DD/YYYY), or "" to mean
  // "derive it from the effective date" (the backend default). Persisted for
  // the same reason as the selected limit — so `/quote` re-prices to match.
  #retroDate = "";

  /** Push the latest priced `QuoteFormData` (from `useIlfDlfFetcher`). */
  setCurrent(data: QuoteFormData | null) {
    this.#current = data;
    this.#notify();
  }

  get current(): QuoteFormData | null {
    return this.#current;
  }

  get ilfDlfLoading(): boolean {
    return this.#loading;
  }
  set ilfDlfLoading(v: boolean) {
    this.#loading = !!v;
    this.#notify();
  }

  get ilfDlfError(): Error | null {
    return this.#error;
  }
  set ilfDlfError(v: Error | null) {
    this.#error = v;
    this.#notify();
  }

  get coverageLimits(): CoverageLimitOptionResponse[] {
    return this.#coverageLimits;
  }
  set coverageLimits(v: CoverageLimitOptionResponse[]) {
    this.#coverageLimits = Array.isArray(v) ? v : [];
    this.#notify();
  }

  get coverageLimitsLoading(): boolean {
    return this.#coverageLimitsLoading;
  }
  set coverageLimitsLoading(v: boolean) {
    this.#coverageLimitsLoading = !!v;
    this.#notify();
  }

  get coverageLimitsError(): Error | null {
    return this.#coverageLimitsError;
  }
  set coverageLimitsError(v: Error | null) {
    this.#coverageLimitsError = v;
    this.#notify();
  }

  get selectedCoverageLimitId(): number | null {
    return this.#selectedCoverageLimitId;
  }
  set selectedCoverageLimitId(v: number | string | null | undefined) {
    this.#selectedCoverageLimitId = v == null || v === "" ? null : Number(v);
    this.#notify();
  }

  /** The selected coverage-limit row, or null (→ fall back to `defaultIlfDlfName`). */
  get selectedCoverageLimit(): CoverageLimitOptionResponse | null {
    return this.#coverageLimits.find((l) => l.id === this.#selectedCoverageLimitId) || null;
  }

  /**
   * The coverage limit id to actually send to `/auth/quotedata` — null when
   * the selection is the state default (the backend applies that anyway, so
   * the default estimate stays on one cache key).
   */
  get pricingCoverageLimitId(): number | null {
    const sel = this.selectedCoverageLimit;
    return sel && !sel.isDefault ? sel.id : null;
  }

  get retroDate(): string {
    return this.#retroDate;
  }
  set retroDate(v: string | null | undefined) {
    this.#retroDate = v || "";
    this.#notify();
  }

  clear() {
    this.#current = null;
    this.#error = null;
    this.#loading = false;
    this.#coverageLimits = [];
    this.#coverageLimitsLoading = false;
    this.#coverageLimitsError = null;
    this.#selectedCoverageLimitId = null;
    this.#retroDate = "";
    this.#notify();
  }

  subscribe(listener: () => void): () => void {
    this.#listeners.add(listener);
    return () => this.#listeners.delete(listener);
  }

  #notify() {
    this.#listeners.forEach((l) => l());
  }
}

const ilfDlfStore = new IlfDlfStore();
export default ilfDlfStore;
