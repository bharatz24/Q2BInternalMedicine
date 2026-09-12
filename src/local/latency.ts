/**
 * Artificial latency for the local API layer.
 *
 * Every `api/*.js` call resolves out of `sessionStorage` in microseconds. If
 * they resolved that fast, every Loader, spinner, disabled-button and
 * "Saving…" label in the copied UI would flash for one frame or never render
 * at all — and the day a real backend arrives, all of that would have to be
 * re-added and re-tested. So the local calls wait a plausible moment first.
 *
 * This is the one place that behaviour lives. Set `LOCAL_LATENCY_ENABLED` to
 * false (or delete this module when the backend lands) and every loading path
 * in the app goes instant.
 */

/** Flip to false to make every local call resolve immediately. */
export const LOCAL_LATENCY_ENABLED = true;

const MIN_MS = 150;
const MAX_MS = 400;

/** A plausible round-trip time, jittered so the UI doesn't look metronomic. */
function randomDelayMs(): number {
  return MIN_MS + Math.random() * (MAX_MS - MIN_MS);
}

/**
 * Wait out one simulated network round trip.
 *
 * @param ms override the random delay (tests, tight loops)
 */
export function sleep(ms?: number): Promise<void> {
  const delay = ms != null ? ms : randomDelayMs();
  if (!LOCAL_LATENCY_ENABLED || delay <= 0) return Promise.resolve();
  return new Promise((resolve) => {
    setTimeout(resolve, delay);
  });
}

/**
 * Resolve `value` after one simulated round trip. The shorthand every local
 * API function uses for its happy path.
 */
export async function respond<T>(value: T, ms?: number): Promise<T> {
  await sleep(ms);
  return value;
}

/**
 * Reject after one simulated round trip, with the shape the pages already
 * catch. Callers read `error.message`; `error.response.status` is populated so
 * any code branching on an HTTP status keeps working unchanged.
 *
 */
export async function respondError(message: string, status = 400, ms?: number): Promise<never> {
  await sleep(ms);
  const error: any = new Error(message);
  error.response = { status, data: { message } };
  error.isLocalError = true;
  throw error;
}
