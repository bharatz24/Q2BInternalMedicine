import { formatUsd } from "@/modules/Quote/utils/decimal";

/**
 * Money for display, always `$1,234.56` — grouped, exactly 2 decimal places,
 * HALF_UP (see `decimal.js`). Returns "—" for nullish / non-numeric input.
 * Every amount the UI shows a dollar figure for goes through this (or
 * `formatUsd` directly) so cents are never dropped.
 */
export function formatMoneyOrDash(n: number | string | null | undefined): string {
  if (n == null || n === "") return "—";
  const x = Number(n);
  if (!Number.isFinite(x)) return "—";
  return formatUsd(x);
}

/**
 * Format an ISO date (or any Date-parseable string) as "MM/DD/YYYY" using
 * the user's locale. Returns "—" for nullish / un-parseable inputs.
 */
export function formatSubmissionListDate(iso: string | null | undefined): string {
  if (iso == null || iso === "") return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, { month: "2-digit", day: "2-digit", year: "numeric" });
}

export function daysUntilDate(iso: string | null | undefined): number | null {
  if (iso == null || iso === "") return null;
  const end = new Date(iso);
  if (Number.isNaN(end.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  return Math.round((end.getTime() - today.getTime()) / 86400000);
}

type LocationLike =
  | {
      address1?: string | null;
      address2?: string | null;
      city?: string | null;
      state?: string | null;
      zipcode?: string | null;
    }
  | null
  | undefined;

export function formatLocationOneLine(loc: LocationLike): string {
  if (!loc) return "-";
  const parts = [loc.address1, loc.address2, loc.city, loc.state, loc.zipcode]
    .filter((x) => x != null && String(x).trim() !== "")
    .map((x) => String(x).trim());
  return parts.length ? parts.join(", ") : "-";
}
