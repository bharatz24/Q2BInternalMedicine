/**
 * Exact decimal helpers for money.
 *
 * Every amount in this app arrives as a STRING copied verbatim from the
 * rate spreadsheet (see `data/studentRatingTable.js`). Nothing here ever
 * touches `Number`, `parseFloat` or `toFixed`:
 *
 *   - `toFixed()` rounds the underlying binary double, not the decimal the
 *     user typed, so `(1.005).toFixed(2)` yields "1.00" — the wrong answer
 *     for a premium. Insurance amounts round HALF_UP.
 *   - a float round-trip would also let the displayed number drift away
 *     from the sheet, which is the one thing this portal must never do.
 *
 * So each value is decomposed into a sign, a BigInt magnitude and a scale,
 * rescaled with true HALF_UP (round half away from zero), and rendered back
 * to a string. This module is the ONLY place in the app allowed to do
 * arithmetic on money.
 */

const DECIMAL_RE = /^-?\d+(?:\.\d+)?$/;

interface Decomposed {
  neg: boolean;
  digits: bigint;
  scale: number;
}

/**
 * Split a decimal string into `{ neg, digits, scale }`, where `digits` is a
 * non-negative BigInt holding every digit and `scale` is the number of
 * fractional places. "12.69" → `{ neg: false, digits: 1269n, scale: 2 }`.
 */
function decompose(raw: string | number): Decomposed {
  const s = String(raw).trim();
  if (!DECIMAL_RE.test(s)) {
    throw new TypeError(`Not a decimal string: ${JSON.stringify(raw)}`);
  }
  const neg = s.startsWith("-");
  const body = neg ? s.slice(1) : s;
  const dot = body.indexOf(".");
  const intPart = dot === -1 ? body : body.slice(0, dot);
  const fracPart = dot === -1 ? "" : body.slice(dot + 1);
  return { neg, digits: BigInt(intPart + fracPart), scale: fracPart.length };
}

/**
 * Move a decomposed value to `target` fractional places. Scaling up is
 * exact; scaling down rounds HALF_UP on the magnitude, which — because the
 * sign is carried separately — means "half away from zero", so -1.005 at
 * 2 dp is -1.01, mirroring +1.005 → 1.01.
 */
function rescale({ neg, digits, scale }: Decomposed, target: number): Decomposed {
  if (target === scale) return { neg, digits, scale };
  if (target > scale) {
    return { neg, digits: digits * 10n ** BigInt(target - scale), scale: target };
  }
  const divisor = 10n ** BigInt(scale - target);
  const quotient = digits / divisor;
  const remainder = digits % divisor;
  const rounded = remainder * 2n >= divisor ? quotient + 1n : quotient;
  return { neg, digits: rounded, scale: target };
}

/** Render a decomposed value back to a plain decimal string. */
function render({ neg, digits, scale }: Decomposed): string {
  const padded = digits.toString().padStart(scale + 1, "0");
  const intPart = scale === 0 ? padded : padded.slice(0, -scale);
  const fracPart = scale === 0 ? "" : padded.slice(-scale);
  const sign = neg && digits !== 0n ? "-" : "";
  return `${sign}${intPart}${fracPart ? `.${fracPart}` : ""}`;
}

/**
 * Round a decimal string to `dp` places, HALF_UP, returning a string with
 * exactly `dp` fractional digits.
 *
 *   roundHalfUp("1.005")     → "1.01"   (toFixed gets this wrong)
 *   roundHalfUp("217.9646")  → "217.96"
 *   roundHalfUp("-2.675")    → "-2.68"
 *
 */
export function roundHalfUp(raw: string | number, dp = 2): string {
  if (!Number.isInteger(dp) || dp < 0) {
    throw new RangeError(`dp must be a non-negative integer, got ${dp}`);
  }
  return render(rescale(decompose(raw), dp));
}

/**
 * The 2 dp form of a 4 dp sheet amount — what the UI shows.
 */
export function toDisplay(raw: string | number): string {
  return roundHalfUp(raw, 2);
}

/**
 * Exact sum of decimal strings, carried at the widest scale present so
 * nothing is lost. Used for invoice subtotals; the rate table already
 * carries its own `total`, so quoting never needs this.
 *
 */
export function addRaw(...raws: Array<string | number>): string {
  if (raws.length === 0) return "0";
  const parts = raws.map(decompose);
  const scale = parts.reduce((max, p) => (p.scale > max ? p.scale : max), 0);
  let total = 0n;
  for (const part of parts) {
    const { neg, digits } = rescale(part, scale);
    total += neg ? -digits : digits;
  }
  const neg = total < 0n;
  return render({ neg, digits: neg ? -total : total, scale });
}

/**
 * Compare two decimal strings. Returns -1, 0 or 1.
 */
export function compareRaw(a: string | number, b: string | number): -1 | 0 | 1 {
  const pa = decompose(a);
  const pb = decompose(b);
  const scale = Math.max(pa.scale, pb.scale);
  const va = (() => {
    const r = rescale(pa, scale);
    return r.neg ? -r.digits : r.digits;
  })();
  const vb = (() => {
    const r = rescale(pb, scale);
    return r.neg ? -r.digits : r.digits;
  })();
  if (va < vb) return -1;
  if (va > vb) return 1;
  return 0;
}

/**
 * Money for display: `$1,234.56`. Grouping is applied to the integer part
 * as a string — the value never becomes a Number.
 *
 */
export function formatUsd(
  raw: string | number,
  { dp = 2, symbol = "$" }: { dp?: number; symbol?: string } = {},
): string {
  const rounded = roundHalfUp(raw, dp);
  const neg = rounded.startsWith("-");
  const body = neg ? rounded.slice(1) : rounded;
  const dot = body.indexOf(".");
  const intPart = dot === -1 ? body : body.slice(0, dot);
  const fracPart = dot === -1 ? "" : body.slice(dot);
  const grouped = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `${neg ? "-" : ""}${symbol}${grouped}${fracPart}`;
}

/**
 * The pair every amount is exposed as: `raw` is the sheet's 4 dp string,
 * `display` is the 2 dp HALF_UP rounding of it.
 *
 */
export function amount(raw: string | number): { raw: string; display: string } {
  return Object.freeze({ raw: String(raw), display: toDisplay(raw) });
}
