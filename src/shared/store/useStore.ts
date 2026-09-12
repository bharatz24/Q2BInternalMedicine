import { useRef, useSyncExternalStore } from "react";

/**
 * The one shape every store class in this app exposes: a `subscribe` that
 * registers a listener and returns an unsubscribe. The class-store pattern
 * (private `#listeners` Set + `#notify()`) satisfies this structurally.
 */
export interface Subscribable {
  subscribe(listener: () => void): () => void;
}

/**
 * Subscribe a React component to a store class. Re-renders whenever the
 * store's `subscribe(listener)` fires, then reads the latest value via
 * `selector(store)`.
 *
 *   const insuredProfile = useStore(insuredProfileStore, (s) => s.insuredProfile);
 *   const zip = useStore(quoteStore, (s) => s.zip);
 *
 * `selector` lets a component subscribe to a single field without
 * re-rendering when unrelated fields in the same domain change. Pass
 * `(s) => s` if you actually want the whole store object.
 *
 * ## Selector rule (audit finding 8.4 / 10.4)
 *
 * `selector` runs as `useSyncExternalStore`'s `getSnapshot`. React compares
 * successive snapshots with `Object.is`; if a selector builds a **fresh
 * object/array every call** (`(s) => ({ a: s.a, b: s.b })`, `(s) => s.xs.map(...)`)
 * every render looks like a change — React warns "getSnapshot should be
 * cached" and can spin into an infinite re-render loop.
 *
 * So a selector must return **either**:
 *   - a primitive or an already-stable reference (the default, 99% of uses); or
 *   - a fresh value **plus** an `isEqual` comparator as the third argument —
 *     the hook then memoizes the last result and only yields a new one when
 *     `isEqual(prev, next)` is false. Use {@link shallowEqual} for the common
 *     "bag of primitive fields" case.
 *
 *   const limits = useStore(
 *     ilfDlfStore,
 *     (s) => ({ id: s.selectedCoverageLimitId, retro: s.retroDate }),
 *     shallowEqual,
 *   );
 */
export function useStore<S extends Subscribable, T>(
  store: S,
  selector: (s: S) => T,
  isEqual?: (a: T, b: T) => boolean,
): T {
  // Mirrors React's own `useSyncExternalStoreWithSelector`: cache the last
  // selected value and hand the same reference back while it is still
  // "equal", so a selector that constructs a fresh object stays snapshot-safe.
  const cache = useRef<{ value: T } | null>(null);

  const getSnapshot = () => {
    const next = selector(store);
    const prev = cache.current;
    if (prev) {
      const same = isEqual ? isEqual(prev.value, next) : Object.is(prev.value, next);
      if (same) return prev.value;
    }
    cache.current = { value: next };
    return next;
  };

  return useSyncExternalStore((listener) => store.subscribe(listener), getSnapshot, getSnapshot);
}

/**
 * Shallow structural equality — same key set, each value `Object.is`-equal.
 * The comparator to pass as `useStore`'s third argument when a selector
 * returns a small object of primitive fields.
 *
 * @public — companion API to `useStore`'s `isEqual` param; kept exported even
 * with no call site yet (every current selector returns a primitive).
 */
export function shallowEqual(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true;
  if (typeof a !== "object" || a === null || typeof b !== "object" || b === null) {
    return false;
  }
  const ka = Object.keys(a as Record<string, unknown>);
  const kb = Object.keys(b as Record<string, unknown>);
  if (ka.length !== kb.length) return false;
  for (const k of ka) {
    if (
      !Object.prototype.hasOwnProperty.call(b, k) ||
      !Object.is((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k])
    ) {
      return false;
    }
  }
  return true;
}
