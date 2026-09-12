import { useCallback } from "react";
import { getCoverageLimits, postIlfDlf } from "@/modules/Quote/api/ratingApi";
import { fetchSpecialityByCode } from "@/modules/Quote/api/specialityApi";
import { QuotesRequest } from "@/shared/dtos";
import type { QuoteFormData, CoverageLimitOptionResponse } from "@/shared/dtos";
import { queryClient } from "@/shared/query/queryClient";
import { queryKeys } from "@/shared/query/keys";
import ilfDlfStore from "@/modules/Quote/store/ilfDlfStore";
import { toError } from "@/shared/utils/misc";

const isPositiveNumberLike = (v: unknown): boolean =>
  v != null && Number.isFinite(Number(v)) && Number(v) > 0;

/**
 * True once a `QuoteFormData` response actually carries a priceable
 * default — a 200 with `total`/`premium` at 0 and no default limit/hours
 * means "we have no rate data for this input", not a real $0 quote.
 */
export function ilfDlfHasRequiredDefaults(ilf: any): boolean {
  if (!ilf) return false;
  return (
    isPositiveNumberLike(ilf.defaultParttimeFulltimeFactor) &&
    isPositiveNumberLike(ilf.defaultIlfDlf) &&
    isPositiveNumberLike(ilf.total)
  );
}

interface IlfDlfFetchInput {
  zipcode: string;
  specialityCode: string;
  effectiveDate: string;
  coverageLimitId?: number | string;
  retroDate?: string;
}

/**
 * Fetches (and caches, by zip+speciality+date) the real `POST
 * /auth/quotedata` estimate for the Home Page calculator. Resolves the
 * speciality-master id from the SP_398–SP_401 code first (per-tab cached in
 * `specialityApi.js`), same as `ratingApi.postIlfDlf`'s contract expects.
 *
 * `coverageLimitId` / `retroDate` are optional: passed through once the Home
 * Page user has an estimate and changes the limit picker or the retro date,
 * so `POST /auth/quotedata` re-prices against them (see `QuotesRequest`).
 */
export function useIlfDlfFetcher() {
  return useCallback(
    async ({
      zipcode,
      specialityCode,
      effectiveDate,
      coverageLimitId,
      retroDate,
    }: IlfDlfFetchInput): Promise<QuoteFormData> => {
      const specialityDto = await fetchSpecialityByCode(specialityCode);
      const specialtiesMasterId: number | null = specialityDto?.id ?? null;
      const reqBody: {
        zipcode: string;
        effectiveDate: string;
        specialtiesMasterId: number | null;
        coverageLimitId?: number;
        retroDate?: string;
      } = { zipcode, effectiveDate, specialtiesMasterId };
      if (coverageLimitId) reqBody.coverageLimitId = Number(coverageLimitId);
      if (retroDate) reqBody.retroDate = retroDate;

      ilfDlfStore.ilfDlfLoading = true;
      ilfDlfStore.ilfDlfError = null;
      try {
        // The shared react-query cache keys the estimate by every pricing input
        // (zip / speciality / date / limit / retro), so repeating a tuple —
        // tabbing back through a field, `/quote` re-pricing to the same numbers
        // — serves from cache with no network hit, and a transient failure
        // retries per the client policy.
        const data = await queryClient.query({
          queryKey: queryKeys.rating.quoteData({
            zipcode,
            specialtiesMasterId,
            effectiveDate,
            coverageLimitId,
            retroDate,
          }),
          queryFn: () => postIlfDlf(new QuotesRequest(reqBody)),
          staleTime: 5 * 60_000,
          // Quote-data failures are deterministic ("zip not found" / no rate
          // data for this input), not transient — surface them immediately.
          retry: false,
        });
        ilfDlfStore.setCurrent(data);
        if (!ilfDlfHasRequiredDefaults(data)) {
          ilfDlfStore.ilfDlfError = toError(new Error("Not data avaliable for this zipcode"));
        }
        return data;
      } catch (e) {
        ilfDlfStore.ilfDlfError = toError(e);
        throw e;
      } finally {
        ilfDlfStore.ilfDlfLoading = false;
      }
    },
    [],
  );
}

/**
 * Loads the coverage-limit options for a ZIP (`GET /auth/{zip}/coverage-limits`)
 * into `ilfDlfStore.coverageLimits`. The Home Page calls this alongside the
 * first estimate fetch (and again whenever the ZIP changes) and auto-selects
 * the `isDefault` row from the result.
 */
export function useCoverageLimitsFetcher() {
  return useCallback(async (zipcode: string): Promise<CoverageLimitOptionResponse[]> => {
    ilfDlfStore.coverageLimitsLoading = true;
    ilfDlfStore.coverageLimitsError = null;
    try {
      const list = await queryClient.query({
        queryKey: queryKeys.rating.coverageLimits(zipcode),
        queryFn: () => getCoverageLimits(zipcode),
        staleTime: 5 * 60_000,
        retry: false,
      });
      ilfDlfStore.coverageLimits = list;
      return list;
    } catch (e) {
      ilfDlfStore.coverageLimits = [];
      ilfDlfStore.coverageLimitsError = toError(e);
      throw e;
    } finally {
      ilfDlfStore.coverageLimitsLoading = false;
    }
  }, []);
}
