export const formatDate = (val: unknown): string => {
  const d = String(val ?? "").replace(/\D/g, "");
  let o = "";
  for (let i = 0; i < d.length && i < 8; i++) {
    if (i === 2 || i === 4) o += "/";
    o += d[i];
  }
  return o;
};

// Format-only validity: a complete MM/DD/YYYY (8 digits, month 1–12, day
// 1–31). No date-range restriction — the effective date is unrestricted
// beyond being a well-formed date, so the estimate button only requires a
// filled, valid-format date (never empty/garbage).
export const dateValid = (val: unknown): boolean => {
  const d = String(val ?? "").replace(/\D/g, "");
  if (d.length < 8) return false;
  const m = parseInt(d.slice(0, 2)),
    day = parseInt(d.slice(2, 4));
  return m >= 1 && m <= 12 && day >= 1 && day <= 31;
};

export const fmtDate = (v: unknown): string => {
  const d = String(v ?? "").replace(/\D/g, "");
  return d.length >= 8 ? `${d.slice(0, 2)}/${d.slice(2, 4)}/${d.slice(4, 8)}` : "";
};

/**
 * Coerce assorted date strings to MM/dd/yyyy. Accepts ISO (yyyy-mm-dd…)
 * and falls back to the digits-only `fmtDate` parser. Empty input → "".
 */
export const toMdY = (raw: unknown): string => {
  if (!raw) return "";
  const s = String(raw).trim();
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[2]}/${iso[3]}/${iso[1]}`;
  return fmtDate(s);
};

export const endDateStr = (v: string): string => {
  const d = v.replace(/\D/g, "");
  return d.length >= 8 ? `${d.slice(0, 2)}/${d.slice(2, 4)}/${parseInt(d.slice(4, 8)) + 1}` : "";
};

/**
 * Convert "MM/dd/yyyy" into a sortable integer (yyyy*10000 + MM*100 + dd).
 * Use for ordering comparisons (retro < effective, etc.). Returns NaN if
 * the input doesn't parse to three numbers.
 */
export const mdYToSortInt = (mdY: string): number => {
  const [m, d, y] = String(mdY).split("/").map(Number);
  return y * 10000 + m * 100 + d;
};

/**
 * Whole-year count between two MM/dd/yyyy dates (eff later than retro).
 * Used to derive the rating-calculator "year" field. Returns at least 1.
 */
export const yearsBetweenMdY = (earlierMdY: string, laterMdY: string): number => {
  const [em, ed, ey] = earlierMdY.split("/").map(Number);
  const [lm, ld, ly] = laterMdY.split("/").map(Number);
  const diff =
    ly - ey + (lm > em || (lm === em && ld > ed) ? 0 : lm < em || (lm === em && ld < ed) ? -1 : 0);
  return diff > 0 ? diff : 1;
};

/** Add whole calendar years to a date in MM/dd/yyyy form. */
export function addCalendarYearsToMdY(mmDdYyyy: string, fullYears: number): string {
  const parts = String(mmDdYyyy).split("/");
  if (parts.length !== 3) return "";
  const mo = parseInt(parts[0], 10);
  const da = parseInt(parts[1], 10);
  const yr = parseInt(parts[2], 10);
  if (!mo || !da || !yr || !Number.isFinite(fullYears) || fullYears < 1) return "";
  const d = new Date(yr, mo - 1, da);
  d.setFullYear(d.getFullYear() + fullYears);
  return `${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}/${d.getFullYear()}`;
}
