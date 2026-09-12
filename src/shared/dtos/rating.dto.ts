// Derived from weborder.json (OpenAPI). Now hand-maintained (no generator
// in this repo). Domain: rating. Each class copies fields from an untyped API
// response (`raw`) with safe defaults; `declare` lines are type-only.

import { SpecialityFactorTypeResponse } from "./auth.dto";

/**
 * Anonymous rating calculation (`POST /api/weborder/v1/auth/calculate`).
 * Dates as strings **MM/dd/yyyy**. Optional `submissionid` / rating `id` are
 * cross-checked when present.
 */
export class RatingRequest {
  declare id: number;
  declare zipcode: string;
  declare effectiveDate: string;
  declare hoursPerWeek: string;
  declare parttimeFulltimeFactor: number;
  declare coverageLimitId: number;
  declare retroLimitId: number;
  declare specialtiesid: number;
  declare year: number;
  declare expiredDate: string;
  declare retroCoverageDate: string;
  declare submissionid: number;
  constructor(raw: Record<string, any> = {}) {
    this.id = raw.id ?? 0; // Existing single-rating id when recalculating in submission context.
    this.zipcode = raw.zipcode ?? ""; // ZIP code (5 digits).
    this.effectiveDate = raw.effectiveDate ?? ""; // Effective date **MM/dd/yyyy**.
    this.hoursPerWeek = raw.hoursPerWeek ?? ""; // Weekly hours as text (decimal hours, e.g. "40") or hours-worked lookup label, depending on...
    this.parttimeFulltimeFactor = raw.parttimeFulltimeFactor ?? 0; // Part-time/full-time factor resolved from the selected hours lookup.
    this.coverageLimitId = raw.coverageLimitId ?? 0; // Coverage ILF/DLF limit id (≥1 when sent).
    this.retroLimitId = raw.retroLimitId ?? 0; // Retro ILF/DLF limit id (≥1 when sent).
    this.specialtiesid = raw.specialtiesid ?? 0; // Speciality master id.
    this.year = raw.year ?? 0; // Policy year factor (legacy/int field).
    this.expiredDate = raw.expiredDate ?? ""; // Expiration date **MM/dd/yyyy**.
    this.retroCoverageDate = raw.retroCoverageDate ?? ""; // Retro coverage date **MM/dd/yyyy**.
    this.submissionid = raw.submissionid ?? 0; // Submission id when validating rating in context; must exist if sent.
  }
}

export class RatingResponseDTO {
  declare total: number;
  declare premium: number;
  constructor(raw: Record<string, any> = {}) {
    this.total = raw.total ?? 0;
    this.premium = raw.premium ?? 0;
  }
}

/**
 * Body for PUT /api/weborder/v1/insured/rating. Updates an existing single
 * rating on a submission for the authenticated insured. Insured id is taken
 * from the JWT, not from this payload. Dates use MM/dd/yyyy. Server validates
 * submission, rating id, zipcode, speciality, ILF/DLF limits, and date
 * ordering before applying changes.
 */
export class UpdateRatingRequest {
  declare zipcode: string;
  declare effectiveDate: string;
  declare expiredDate: string;
  declare retroCoverageDate: string;
  declare coverageilfdlfid: number;
  declare retroilfdlfid: number;
  declare hoursperweek: string;
  declare parttimeFulltimeFactor: number;
  declare specialityDetailsId: number;
  declare claims: number;
  declare singleRatingId: number;
  declare submissionId: number;
  constructor(raw: Record<string, any> = {}) {
    this.zipcode = raw.zipcode ?? ""; // Practice or risk location ZIP code. Must be exactly 5 digits.
    this.effectiveDate = raw.effectiveDate ?? ""; // Policy effective date in MM/dd/yyyy format.
    this.expiredDate = raw.expiredDate ?? ""; // Policy expired date in MM/dd/yyyy format.
    this.retroCoverageDate = raw.retroCoverageDate ?? ""; // Policy retro date in MM/dd/yyyy format.
    this.coverageilfdlfid = raw.coverageilfdlfid ?? 0; // Coverage ILF/DLF identifier. Must be greater than 0.
    this.retroilfdlfid = raw.retroilfdlfid ?? 0; // Retro ILF/DLF identifier. Must be greater than 0.
    this.hoursperweek = raw.hoursperweek ?? ""; // Hours worked per week (decimal string or lookup id text).
    this.parttimeFulltimeFactor = raw.parttimeFulltimeFactor ?? 0; // Part time full time factor (decimal).
    this.specialityDetailsId = raw.specialityDetailsId ?? 0; // Speciality identifier. Must be greater than 0.
    this.claims = raw.claims ?? 0; // Number of claims associated. Can be 0 or more.
    this.singleRatingId = raw.singleRatingId ?? 0; // Single rating identifier. Must be greater than 0.
    this.submissionId = raw.submissionId ?? 0; // Submission identifier. Must be greater than 0.
  }
}

/**
 * ILF/DLF limits by zip and speciality (`POST
 * /api/weborder/v1/auth/ilf-dlf`). Optional `submissionId` must exist when
 * sent. Optional `effectiveDate` (**MM/dd/yyyy**).
 */
export class IlfDlfRequest {
  declare zipcode: string;
  declare effectiveDate: string;
  declare specialtiesid: number;
  declare submissionId: number;
  constructor(raw: Record<string, any> = {}) {
    this.zipcode = raw.zipcode ?? ""; // ZIP code (5 digits).
    this.effectiveDate = raw.effectiveDate ?? ""; // Optional rating context date **MM/dd/yyyy**.
    this.specialtiesid = raw.specialtiesid ?? 0; // Speciality master id.
    this.submissionId = raw.submissionId ?? 0; // Optional submission id; must exist when provided.
  }
}

export class IlfDlfAndYearListResponse {
  declare ilfDlfResponse: IlfDlfLookupResponse[];
  declare yearResponse: YearResponse[];
  declare state: string;
  declare st: string;
  declare county: string;
  declare surgeryList: SpecialityFactorTypeResponse[];
  declare total: number;
  declare hoursWorkedList: HoursWorkedFactorLookup[];
  declare defaultIlfDlf: number;
  declare defaultyear: number;
  declare defaultHoursWorked: number;
  declare defaultSurgery: number;
  declare defaultClaims: number;
  declare city: string;
  declare defense: string;
  constructor(raw: Record<string, any> = {}) {
    this.ilfDlfResponse = Array.isArray(raw.ilfDlfResponse)
      ? raw.ilfDlfResponse.map((x) => new IlfDlfLookupResponse(x))
      : [];
    this.yearResponse = Array.isArray(raw.yearResponse)
      ? raw.yearResponse.map((x) => new YearResponse(x))
      : [];
    this.state = raw.state ?? "";
    this.st = raw.st ?? "";
    this.county = raw.county ?? "";
    this.surgeryList = Array.isArray(raw.surgeryList)
      ? raw.surgeryList.map((x) => new SpecialityFactorTypeResponse(x))
      : [];
    this.total = raw.total ?? 0;
    this.hoursWorkedList = Array.isArray(raw.hoursWorkedList)
      ? raw.hoursWorkedList.map((x) => new HoursWorkedFactorLookup(x))
      : [];
    this.defaultIlfDlf = raw.defaultIlfDlf ?? 0;
    this.defaultyear = raw.defaultyear ?? 0;
    this.defaultHoursWorked = raw.defaultHoursWorked ?? 0;
    this.defaultSurgery = raw.defaultSurgery ?? 0;
    this.defaultClaims = raw.defaultClaims ?? 0;
    this.city = raw.city ?? "";
    this.defense = raw.defense ?? "";
  }
}

export class IlfDlfLookupResponse {
  declare id: number;
  declare currentprior: string;
  declare state: string;
  declare limit: string;
  declare limitPerIncident: number;
  declare aggregateLimit: number;
  declare factor: number;
  declare isdefault: boolean;
  declare isallowdelete: boolean;
  constructor(raw: Record<string, any> = {}) {
    this.id = raw.id ?? 0;
    this.currentprior = raw.currentprior ?? "";
    this.state = raw.state ?? "";
    this.limit = raw.limit ?? "";
    this.limitPerIncident = raw.limitPerIncident ?? 0;
    this.aggregateLimit = raw.aggregateLimit ?? 0;
    this.factor = raw.factor ?? 0;
    this.isdefault = raw.isdefault ?? false;
    this.isallowdelete = raw.isallowdelete ?? false;
  }
}

export class YearResponse {
  declare id: number;
  declare year: number;
  declare domacileStateTaxRate: number;
  declare stateTax: number;
  constructor(raw: Record<string, any> = {}) {
    this.id = raw.id ?? 0;
    this.year = raw.year ?? 0;
    this.domacileStateTaxRate = raw.domacileStateTaxRate ?? 0;
    this.stateTax = raw.stateTax ?? 0;
  }
}

export class HoursWorkedFactorLookup {
  declare id: number;
  declare hoursWorked: string;
  declare factor: number;
  declare default: boolean;
  declare fullTime: boolean;
  constructor(raw: Record<string, any> = {}) {
    this.id = raw.id ?? 0;
    this.hoursWorked = raw.hoursWorked ?? "";
    this.factor = raw.factor ?? 0;
    this.default = raw.default ?? false;
    this.fullTime = raw.fullTime ?? false;
  }
}

export class QuoteFormData {
  declare zipcode: string;
  declare specialtiesid: number;
  declare state: string;
  declare st: string;
  declare county: string;
  declare total: number;
  declare defaultIlfDlf: number;
  declare defaultyear: number;
  declare defaultParttimeFulltimeFactor: number;
  declare defaultSurgery: number;
  declare defaultClaims: number;
  declare city: string;
  declare defaultDefense: string;
  declare effectiveDate: string;
  declare defaultIlfDlfName: string;
  declare defaultHoursWorkedName: string;
  declare premium: number;
  declare country: string;
  declare fees: Array<{ label: string; value: number }>;
  declare feesTotal: number;
  declare taxes: Array<{ label: string; value: number }>;
  declare taxTotal: number;
  constructor(raw: Record<string, any> = {}) {
    this.zipcode = raw.zipcode ?? "";
    this.specialtiesid = raw.specialtiesid ?? 0;
    this.state = raw.state ?? "";
    this.st = raw.st ?? "";
    this.county = raw.county ?? "";
    this.total = raw.total ?? 0;
    this.defaultIlfDlf = raw.defaultIlfDlf ?? 0;
    this.defaultyear = raw.defaultyear ?? 0;
    this.defaultParttimeFulltimeFactor = raw.defaultParttimeFulltimeFactor ?? 0;
    this.defaultSurgery = raw.defaultSurgery ?? 0;
    this.defaultClaims = raw.defaultClaims ?? 0;
    this.city = raw.city ?? "";
    this.defaultDefense = raw.defaultDefense ?? "";
    this.effectiveDate = raw.effectiveDate ?? ""; // Effective date **MM/dd/yyyy**.
    this.defaultIlfDlfName = raw.defaultIlfDlfName ?? "";
    this.defaultHoursWorkedName = raw.defaultHoursWorkedName ?? "";
    this.premium = raw.premium ?? 0;
    this.country = raw.country ?? "";
    this.fees = Array.isArray(raw.fees) ? raw.fees : [];
    this.feesTotal = raw.feesTotal ?? 0;
    this.taxes = Array.isArray(raw.taxes) ? raw.taxes : [];
    this.taxTotal = raw.taxTotal ?? 0;
  }
}

/**
 * One ILF/DLF coverage-limit option for a ZIP code's state
 * (`GET /api/weborder/v1/auth/{zipcode}/coverage-limits`).
 */
export class CoverageLimitOptionResponse {
  declare id: number;
  declare limit: string;
  declare isDefault: boolean;
  constructor(raw: Record<string, any> = {}) {
    this.id = raw.id ?? 0;
    this.limit = raw.limit ?? "";
    this.isDefault = raw.isDefault ?? false;
  }
}

/**
 * QuotesRequest limits by zip and speciality (`POST
 * /api/weborder/v1/auth/quotedata`).
 */
export class QuotesRequest {
  declare zipcode: string;
  declare effectiveDate: string;
  declare specialtiesMasterId: number;
  // Both optional — only assigned when set, so they stay absent from the
  // serialized payload (the backend rejects `0` / empty; see below).
  declare coverageLimitId?: number;
  declare retroDate?: string;
  constructor(raw: Record<string, any> = {}) {
    this.zipcode = raw.zipcode ?? ""; // ZIP code (5 digits).
    this.effectiveDate = raw.effectiveDate ?? ""; // Optional rating context date **MM/dd/yyyy**.
    this.specialtiesMasterId = raw.specialtiesMasterId ?? 0; // Speciality master id.
    // Optional. Only sent when set — the backend rejects `0` (`@Min(1)`), so
    // an unset value must be absent from the payload, not zero.
    if (raw.coverageLimitId) {
      this.coverageLimitId = Number(raw.coverageLimitId);
    }
    if (raw.retroDate) {
      this.retroDate = raw.retroDate;
    }
  }
}
