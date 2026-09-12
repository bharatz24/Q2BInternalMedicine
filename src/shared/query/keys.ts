/**
 * Central query-key factory. One place that names every server resource so
 * key shapes can't drift between the page that reads a query and the code
 * that invalidates it.
 *
 * Convention: `[domain, resource, ...params]`. Params that scope a resource
 * (a submission id, a zip) are part of the key; pass them as strings so
 * `123` and `"123"` don't cache separately.
 */
export const queryKeys = {
  dashboard: {
    submissions: () => ["dashboard", "submissions"] as const,
  },
  profile: {
    details: () => ["profile", "details"] as const,
    contacts: () => ["profile", "contacts"] as const,
    locations: () => ["profile", "locations"] as const,
  },
  order: {
    /** `GET /insured/order` for one submission — Review, Payment, Binder, OrderDetails. */
    detail: (submissionId: string | number) => ["order", "detail", String(submissionId)] as const,
  },
  payment: {
    /** `GET /payment/publishable-key` — Stripe publishable key (stable per session). */
    publishableKey: () => ["payment", "publishableKey"] as const,
  },
  questions: {
    /** Submission-scoped underwriting question tree. */
    submission: (submissionId: string | number) =>
      ["questions", "submission", String(submissionId)] as const,
    /** Master question tree for a speciality (`GET /questions?specialityId=`). */
    bySpeciality: (specialityId: string | number) =>
      ["questions", "bySpeciality", String(specialityId)] as const,
  },
  rating: {
    /** `POST /auth/quotedata` — the live ILF/DLF estimate for a pricing tuple. */
    quoteData: (parts: {
      zipcode?: string | number | null;
      specialtiesMasterId?: string | number | null;
      effectiveDate?: string | null;
      coverageLimitId?: string | number | null;
      retroDate?: string | null;
    }) =>
      [
        "rating",
        "quoteData",
        String(parts.zipcode ?? ""),
        String(parts.specialtiesMasterId ?? ""),
        String(parts.effectiveDate ?? ""),
        String(parts.coverageLimitId ?? ""),
        String(parts.retroDate ?? ""),
      ] as const,
    /** `GET /auth/{zip}/coverage-limits`. */
    coverageLimits: (zipcode: string) => ["rating", "coverageLimits", zipcode] as const,
  },
  speciality: {
    /** `GET /auth/speciality/{code}` for one SP_* code. */
    byCode: (code: string) => ["speciality", "byCode", code] as const,
  },
} as const;
