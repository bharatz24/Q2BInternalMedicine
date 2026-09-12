import { useEffect } from "react";

import { fetchSpecialityByCode } from "@/modules/Quote/api/specialityApi";
import { designationByCode } from "@/modules/Quote/data/designations.js";
import { useStore } from "@/shared/store/useStore";
import practiceStore from "@/modules/Quote/store/practiceStore";

/**
 * Resolve the real speciality-master record for the CURRENTLY SELECTED
 * designation only — one GET /auth/speciality/{code} per session for the
 * single Internal Medicine code (SP_14). Re-reads come from
 * `fetchSpecialityByCode`'s in-memory map (specialityApi + specialityStore)
 * with no new request — no cookies / localStorage / sessionStorage involved.
 * Non-blocking, best-effort — a failure here doesn't block the quote flow,
 * which doesn't consume the id yet (§1.3/§5.3 of the integration plan).
 *
 * Was effect 0b of the old monolithic `useAppBootstrap`.
 */
export function useSpecialityResolve(): void {
  const designation = useStore(practiceStore, (s) => s.designation);

  useEffect(() => {
    const code = designationByCode(designation)?.specialityCode;
    if (!code) return;
    fetchSpecialityByCode(code).catch(() => {
      /* best-effort; captured by logApiError */
    });
  }, [designation]);
}
