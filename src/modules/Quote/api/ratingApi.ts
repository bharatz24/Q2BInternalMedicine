/**
 * Rating API surface. Wires the real `ins` rating contract for real —
 * every page's live price now reads from here (see CLAUDE.md "The live
 * estimate calls the real pricing endpoint"). Expect every call here to
 * fail until nursing rate data lands in `ins` (§2.5/§9 of the integration
 * plan) — that's a known, accepted state, not a bug.
 *
 * Request-body params stay loosely typed (`any` / `Record<string, any>`) —
 * they are hand-built partials fed straight into the DTO constructors; the
 * value here is the fully-typed return DTOs.
 */
import axios from "axios";
import { apiUrl, logApiError } from "@/shared/services/config";
import { ZIPCODE_NOT_AVAILABLE_MSG } from "@/shared/utils/misc";
import {
  CoverageLimitOptionResponse,
  IlfDlfAndYearListResponse,
  IlfDlfRequest,
  QuoteFormData,
  QuotesRequest,
  RatingRequest,
  RatingResponseDTO,
  UpdateRatingRequest,
  ZipcodeDetailsRespose,
} from "@/shared/dtos";

const getApiErrorMessage = (error: any): string | undefined =>
  error?.response?.data?.apierror?.message || error?.response?.data?.message || error?.message;

/**
 * POST /auth/quotedata — fetch ILF/DLF defaults + limits for a (zip,
 * speciality, effective-date) tuple. `specialtiesMasterId` should come from
 * `specialityApi.fetchSpecialityByCode`/`fetchAllSpecialities`, not a
 * local table.
 */
export const postIlfDlf = async (body: any): Promise<QuoteFormData> => {
  try {
    const response = await axios.post(apiUrl("/auth/quotedata"), new QuotesRequest(body), {
      withCredentials: true,
    });
    return new QuoteFormData(response.data);
  } catch (error) {
    const message = getApiErrorMessage(error);
    if (
      String(message || "")
        .toLowerCase()
        .includes("zip code not found")
    ) {
      throw new Error(ZIPCODE_NOT_AVAILABLE_MSG);
    }
    throw new Error(message || "Could not load coverage options for this zip. Please try again.");
  }
};

/**
 * POST /auth/ilf-dlf — the full list of candidate coverage-limit rows
 * (`IlfDlfLookupResponse[]`, each with `id`/`limitPerIncident`/
 * `aggregateLimit`/`factor`) for a (zip, speciality) tuple — unlike
 * `postIlfDlf`'s `QuoteFormData`, which only carries the single DEFAULT
 * row's id (`defaultIlfDlf`), this is what a limit-of-liability picker
 * would need to price every option, not just the default.
 *
 * No longer called — its only consumer was the removed `/coverage` wizard
 * step. The Home Page limit picker uses `GET /auth/{zip}/coverage-limits`
 * (`getCoverageLimits`) instead. Kept, not deleted, per this project's
 * don't-delete-working-code-you-might-need practice.
 */
export const postIlfDlfList = async (body: any): Promise<IlfDlfAndYearListResponse> => {
  try {
    const response = await axios.post(apiUrl("/auth/ilf-dlf"), new IlfDlfRequest(body), {
      withCredentials: true,
    });
    return new IlfDlfAndYearListResponse(response.data);
  } catch (error) {
    const message = getApiErrorMessage(error);
    throw new Error(message || "Could not load coverage options for this zip. Please try again.");
  }
};

/**
 * GET /auth/{zipcode}/coverage-limits — the ILF/DLF coverage-limit options
 * available for a ZIP code's state (`CoverageLimitOptionResponse[]`, each
 * `{ id, limit, isDefault }`). The Home Page "Instant estimate" card fills
 * its limit picker from this and auto-selects the `isDefault` row.
 */
export const getCoverageLimits = async (
  zipcode: string,
): Promise<CoverageLimitOptionResponse[]> => {
  try {
    const response = await axios.get(
      apiUrl(`/auth/${encodeURIComponent(zipcode)}/coverage-limits`),
      { withCredentials: true },
    );
    return Array.isArray(response.data)
      ? response.data.map((x: any) => new CoverageLimitOptionResponse(x))
      : [];
  } catch (error) {
    const message = getApiErrorMessage(error);
    throw new Error(message || "Could not load coverage limits for this zip. Please try again.");
  }
};

/**
 * GET /auth/{zip}/zipcodedata — resolve a ZIP to its city/state/county.
 *
 * Safe to use for real independent of the rate-data gap (§1.3) — this is
 * generic geocoding, not rate data.
 */
export const getZipcodeData = async (zipcode: string): Promise<ZipcodeDetailsRespose> => {
  try {
    const response = await axios.get(apiUrl(`/auth/${zipcode}/zipcodedata`), {
      withCredentials: true,
    });
    return new ZipcodeDetailsRespose(response.data);
  } catch (error) {
    const message = getApiErrorMessage(error);
    throw new Error(message || "Could not validate this zip code. Please try again.");
  }
};

/**
 * POST /auth/calculate — compute a rating quote. `id`/`submissionid` stay
 * `0`/unset for the anonymous, pre-submission case.
 */
export const postCalculateRating = async (body: any): Promise<RatingResponseDTO> => {
  try {
    const response = await axios.post(apiUrl("/auth/calculate"), new RatingRequest(body), {
      withCredentials: true,
    });
    return new RatingResponseDTO(response.data);
  } catch (error) {
    logApiError(error);
    throw error;
  }
};

/**
 * PUT /insured/rating — update an existing submission's rating.
 * Submission-scoped: cannot be exercised until a real submission exists
 * (§9 of the plan).
 */
export const putUpdateRating = async (body: any): Promise<RatingResponseDTO> => {
  try {
    const response = await axios.put(apiUrl("/insured/rating"), new UpdateRatingRequest(body), {
      withCredentials: true,
    });
    return new RatingResponseDTO(response.data);
  } catch (error) {
    const message = getApiErrorMessage(error);
    throw new Error(message || "Could not update rating. Please try again.");
  }
};
