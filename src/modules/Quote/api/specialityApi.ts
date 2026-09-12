/**
 * Speciality API surface. `GET /auth/speciality/{code}` against INS-SERVICE.
 *
 * The fetched `specialities_master.id` keys the master question tree
 * (`GET /questions?specialityId=`, see `useQuestionsAutoLoad`) and names the
 * rated speciality in the snapshot rail.
 */
import axios from "axios";
import { apiUrl, logApiError } from "@/shared/services/config";
import { SpecialityMasterResponse } from "@/shared/dtos";
import { DESIGNATIONS } from "@/modules/Quote/data/designations.js";
import { queryClient } from "@/shared/query/queryClient";
import { queryKeys } from "@/shared/query/keys";
import specialityStore from "@/modules/Quote/store/specialityStore";

/**
 * `GET /auth/speciality/{code}`, backed by the shared react-query cache:
 * concurrent callers share one request (dedup), the result is cached for an
 * hour (it rarely changes), transient failures retry per the client policy,
 * and a failed query isn't cached so a later call re-tries. Still mirrors the
 * DTO into `specialityStore` for the synchronous readers
 * (`useQuoteSnapshot`, the landing / quote / practice pages).
 */
export const fetchSpecialityByCode = (code: string): Promise<SpecialityMasterResponse> =>
  queryClient
    .query({
      queryKey: queryKeys.speciality.byCode(code),
      queryFn: async () => {
        const response = await axios.get(apiUrl(`/auth/speciality/${encodeURIComponent(code)}`));
        const dto = new SpecialityMasterResponse(response.data);
        specialityStore.setSpeciality(code, dto);
        return dto;
      },
      staleTime: 60 * 60_000,
    })
    .catch((error) => {
      logApiError(error);
      throw error;
    });

/**
 * Fetches every speciality-master code in `designations.js`'s `DESIGNATIONS`
 * (just SP_14 — Internal Medicine) and returns them keyed to that array.
 */
export const fetchAllSpecialities = async (): Promise<
  Array<{ code: string; designation: any; dto: SpecialityMasterResponse | null }>
> => {
  const results = await Promise.all(
    (DESIGNATIONS as any[]).map(async (designation) => {
      try {
        const dto = await fetchSpecialityByCode(designation.specialityCode);
        return { code: designation.specialityCode, designation, dto };
      } catch (error) {
        logApiError(error);
        return { code: designation.specialityCode, designation, dto: null };
      }
    }),
  );
  return results;
};
