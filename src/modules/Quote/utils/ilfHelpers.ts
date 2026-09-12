import { addCalendarYearsToMdY, endDateStr, fmtDate } from "@/shared/utils/dateHelpers";

/**
 * These helpers read the live `POST /auth/quotedata` response and
 * `/insured/order` payloads, both of which carry more fields than the
 * `QuoteFormData` / order DTO classes model and use tolerant casing
 * fallbacks by design — so the object params stay `any` rather than a
 * fabricated shape. Return types are the real primitives.
 */

// Private — only ilfDlfHasRequiredDefaults reads this.
function isPositiveNumberLike(v: unknown): boolean {
  const n = Number(v);
  return Number.isFinite(n) && n > 0;
}

/**
 * Read the effective date from a /insured/order payload, tolerating every
 * casing variant the backend uses (effectiveDate / effectivedate, on both
 * ratingResponse and the top-level dto). Returns "" when none present.
 */
export function resolveOrderEffectiveDate(paymentOrderDetails: any): string {
  const r = paymentOrderDetails?.ratingResponse;
  return (
    r?.effectiveDate ??
    r?.effectivedate ??
    paymentOrderDetails?.effectivedate ??
    paymentOrderDetails?.effectiveDate ??
    ""
  );
}

/**
 * Read the practice ZIP from a /insured/order payload, tolerating every
 * casing variant the backend uses (practicezipcode on ratingResponse, plus
 * both zipcode casings at the top level). Returns "" when none present.
 */
export function resolveOrderZipcode(paymentOrderDetails: any): string {
  const r = paymentOrderDetails?.ratingResponse;
  return (
    r?.practicezipcode ??
    r?.practiceZipcode ??
    paymentOrderDetails?.practicezipcode ??
    paymentOrderDetails?.zipcode ??
    ""
  );
}

/**
 * Same as resolveOrderEffectiveDate but for expiration date. Covers all
 * four backend casings (expirationDate / expirationdate / expiredDate /
 * expireddate) at the rating level and the top level.
 */
export function resolveOrderExpirationDate(paymentOrderDetails: any): string {
  const r = paymentOrderDetails?.ratingResponse;
  return (
    r?.expirationDate ??
    r?.expirationdate ??
    r?.expiredDate ??
    r?.expireddate ??
    paymentOrderDetails?.expirationDate ??
    paymentOrderDetails?.expireddate ??
    ""
  );
}

/**
 * Pick the most-specific speciality id available: rating response →
 * ILF/DLF defaults → top-level order → the speciality master fetched at
 * landing. Returned as Number(...) so callers can use it directly in a
 * POST body. NaN if nothing resolves.
 */
export function resolveSpecialityId({
  paymentOrderDetails,
  ilfDlfResponse,
  specialityMaster,
}: {
  paymentOrderDetails?: any;
  ilfDlfResponse?: any;
  specialityMaster?: any;
}): number {
  const r = paymentOrderDetails?.ratingResponse;
  return Number(
    r?.surgeryId ||
      r?.specialtiesid ||
      ilfDlfResponse?.defaultSurgery ||
      paymentOrderDetails?.surgeryId ||
      paymentOrderDetails?.specialtiesid ||
      specialityMaster?.id,
  );
}

export function ilfDlfHasRequiredDefaults(ilf: any): boolean {
  if (!ilf) return false;
  return (
    isPositiveNumberLike(ilf.defaultParttimeFulltimeFactor) &&
    isPositiveNumberLike(ilf.defaultIlfDlf) &&
    isPositiveNumberLike(ilf.defaultSurgery) &&
    isPositiveNumberLike(ilf.defaultyear)
  );
}

export function getDefaultHoursWorkedRow(ilf: any): any {
  const list = ilf?.hoursWorkedList;
  if (!Array.isArray(list) || list.length === 0) return null;
  return (
    list.find((x) => x?.default === true) ||
    list.find((x) => x?.id === ilf?.defaultParttimeFulltimeFactor) ||
    list[0]
  );
}

export function deriveHoursFactorFromIlf(ilf: any): number {
  const row = getDefaultHoursWorkedRow(ilf);
  const f = Number(row?.factor);
  return Number.isFinite(f) && f > 0 ? f : 1;
}

export function deriveHoursWorkedFromIlf(ilf: any): string {
  const row = getDefaultHoursWorkedRow(ilf);
  const label = row?.hoursWorked ?? ilf?.defaultHoursWorkedName;
  return label == null ? "" : String(label);
}

/** Default ILF/DLF row from `IlfDlfAndYearListResponse` (matches `defaultIlfDlf` id, else `isdefault`, else first). */
export function getDefaultIlfDlfRow(ilf: any): any {
  if (!ilf?.ilfDlfResponse || !Array.isArray(ilf.ilfDlfResponse) || ilf.ilfDlfResponse.length === 0)
    return null;
  const list = ilf.ilfDlfResponse;
  if (ilf.defaultIlfDlf != null) {
    const byId = list.find((r: any) => r.id === ilf.defaultIlfDlf);
    if (byId) return byId;
  }
  return list.find((r: any) => r.isdefault) || list[0];
}

/** Short limit line: per-incident / aggregate as $XK / $YM, falling back to API `limit` text. */
export function formatIlfLimitShort(row: any): string {
  if (!row) return "";
  const pi = row.limitPerIncident;
  const agg = row.aggregateLimit;
  const fmtN = (n: unknown): string => {
    const x = Number(n);
    if (!Number.isFinite(x) || x <= 0) return "";
    if (x >= 1_000_000) {
      const m = x / 1_000_000;
      const t = m % 1 === 0 ? String(m) : m.toFixed(1).replace(/\.0$/, "");
      return `$${t}M`;
    }
    if (x >= 1_000) return `$${Math.round(x / 1_000)}K`;
    return `$${Math.round(x).toLocaleString()}`;
  };
  const a = fmtN(pi);
  const b = fmtN(agg);
  if (a && b) return `${a}/${b}`;
  if (a || b) return a || b;
  if (row.limit != null && String(row.limit).trim() !== "") return String(row.limit).trim();
  return "";
}

export function softQuotePremiumFromIlf(ilf: any): number | null {
  if (ilf?.total == null && ilf?.total !== 0) return null;
  const n = Number(ilf.total);
  return Number.isFinite(n) ? Math.round(n) : null;
}

/** Base premium only from GET /insured/order `ratingResponse`. */
export function premiumOnlyFromOrderRatingResponse(r: any): number | null {
  if (!r || typeof r !== "object") return null;
  if (r.premium != null && Number.isFinite(Number(r.premium))) return Math.round(Number(r.premium));
  return null;
}

/** Annual total (premium + taxes + fees as returned by carrier) from `ratingResponse`. */
export function totalOnlyFromOrderRatingResponse(r: any): number | null {
  if (!r || typeof r !== "object") return null;
  if (r.total != null && Number.isFinite(Number(r.total))) return Math.round(Number(r.total));
  return null;
}

export function policyTypeFromIlf(row: any): string {
  const raw = row?.currentprior;
  if (raw == null) return "Claims-made";
  const s = String(raw).toLowerCase();
  if (s.includes("occ")) return "Occurrence";
  return "Claims-made";
}

/** Term length in years: `yearResponse` row whose `id` matches `defaultyear`, else small `defaultyear` as literal years. */
export function getPolicyTermYearsFromIlf(ilf: any): number | null {
  if (!ilf || ilf.defaultyear == null) return null;
  const list = ilf.yearResponse;
  if (Array.isArray(list) && list.length > 0) {
    const row = list.find((y) => y.id === ilf.defaultyear);
    if (row?.year != null) {
      const n = Number(row.year);
      return Number.isFinite(n) && n >= 1 ? n : null;
    }
  }
  const literal = Number(ilf.defaultyear);
  if (Number.isFinite(literal) && literal >= 1 && literal <= 10) return literal;
  return null;
}

/** Expiration = effective (MM/dd/yyyy) + policy term years from ILF/DLF; else legacy +1 calendar year. */
export function expirationMdYFromEffAndIlf(effRaw: any, ilf: any): string {
  const effMdY = fmtDate(effRaw);
  if (!effMdY) return endDateStr(effRaw);
  const termYears = getPolicyTermYearsFromIlf(ilf);
  if (termYears != null) {
    const exp = addCalendarYearsToMdY(effMdY, termYears);
    if (exp) return exp;
  }
  return endDateStr(effRaw);
}
