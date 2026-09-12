/**
 * The single designation this portal writes: Internal Medicine (DPL Short
 * Application, Rev 08-31-26). The applicant's medical degree (MD, DO, PA, NP,
 * CRNA, CNM or Other — DPL Q3, plan decision D3) is a question on `/practice`,
 * not a separate designation: every applicant rates on SP_14.
 *
 * `specialityCode` is the join key into `ins`'s real speciality-master row
 * (`GET /auth/speciality/SP_14`, see `Quote/api/specialityApi`) — the id that
 * row resolves to is what `/auth/quotedata` and the question tree
 * (`GET /questions?specialityId=`) are keyed on.
 *
 * Kept as a one-row list (rather than a constant) so every consumer that was
 * written against Nursing's four-row list keeps working unchanged.
 */

/** @typedef {{ code: string, label: string, subtitle: string, specialityCode: string }} Designation */

/** @type {ReadonlyArray<Designation>} */
export const DESIGNATIONS = Object.freeze([
  Object.freeze({
    code: "INTERNAL_MEDICINE",
    label: "Internal Medicine",
    subtitle: "MD, DO, PA, NP, CRNA, CNM and other providers",
    specialityCode: "SP_14",
  }),
]);

export const DESIGNATION_CODES = Object.freeze(DESIGNATIONS.map((d) => d.code));

export function designationByCode(code) {
  return DESIGNATIONS.find((d) => d.code === code) || null;
}
