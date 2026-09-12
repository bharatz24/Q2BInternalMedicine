/**
 * The practice inputs that drive rating — everything collected on step 0
 * (`/`) and step 2 (`/practice`): designation, specialities, ZIP, effective
 * date, hours worked, work setting, moonlighting, and scope of practice.
 *
 * The plan's §5.2 file list names this store for "designation + specialities
 * + zip + effective date" only; the step-2 fields (hours/setting/moonlight/
 * scope) don't get a store of their own there. They live here too rather
 * than in a second store because they're the same domain object — "the
 * nurse's practice" — and every one of them feeds `nursingRatingService`
 * alongside the step-0 fields.
 *
 * Mirrored to `sessionStorage` (not `localStorage`) so a refresh mid-wizard
 * keeps the user's place, but the values go away with the tab — same
 * survival contract as the sibling student portal's `programStore`.
 *
 * `hoursPerWeek`/`workSetting`/`moonlights`/`moonlightWhere`/`scopeIds` are
 * no longer written by any page — `PracticeDetailsPage.jsx` now renders the
 * real "License, Scope & Practice" question tree group instead (see that
 * file's header). These fields stay here, unused by the real flow, only
 * because `useAppBootstrap`'s step 2 still feeds them to the dead local
 * `nursingRatingService` recompute — kept, not deleted, same as that
 * service itself.
 *
 * `employerName` is also collected on step 2 (`PracticeDetailsPage.jsx`) —
 * a plain field local to this store since no submission exists yet to
 * dual-write against; it rides into the real submission-create call the
 * same way the License/Scope/Practice tree answers do (see that page's
 * header), via `buildSubmissionRequest`'s `visitedQuestionGroups` scoping.
 */

const SS_PREFIX = "q2bnursing:practice:";
const KEYS = Object.freeze({
  DESIGNATION: `${SS_PREFIX}designation`,
  SPECIALITIES: `${SS_PREFIX}specialityCodes`,
  ZIP: `${SS_PREFIX}zip`,
  EFFECTIVE_DATE: `${SS_PREFIX}effectiveDate`,
  HOURS_PER_WEEK: `${SS_PREFIX}hoursPerWeek`,
  WORK_SETTING: `${SS_PREFIX}workSetting`,
  MOONLIGHTS: `${SS_PREFIX}moonlights`,
  MOONLIGHT_WHERE: `${SS_PREFIX}moonlightWhere`,
  SCOPE_IDS: `${SS_PREFIX}scopeIds`,
  LIMIT_TIER_ID: `${SS_PREFIX}limitTierId`,
  EMPLOYER_NAME: `${SS_PREFIX}employerName`,
});

const readSession = (key: string): string | null => {
  try {
    return typeof sessionStorage !== "undefined" ? sessionStorage.getItem(key) : null;
  } catch {
    return null;
  }
};
const writeSession = (key: string, value: string | number | boolean | null | undefined) => {
  try {
    if (typeof sessionStorage === "undefined") return;
    if (value == null || value === "") sessionStorage.removeItem(key);
    else sessionStorage.setItem(key, String(value));
  } catch {
    /* private mode / quota — fall through */
  }
};
// List-getters return the SAME frozen array instance until a setter swaps in
// a new one — so a `useStore(practiceStore, s => s.specialityCodes)` slice is
// a stable dependency for `useEffect` / `useMemo` (audit finding 1.1), and no
// consumer can mutate store state in place.
const freezeArray = <T>(arr: readonly T[]): T[] => Object.freeze([...arr]) as unknown as T[];

const readJsonArray = (key: string): any[] => {
  try {
    const raw = readSession(key);
    const parsed = raw ? JSON.parse(raw) : [];
    return freezeArray(Array.isArray(parsed) ? parsed : []);
  } catch {
    return freezeArray([]);
  }
};
const writeJsonArray = (key: string, arr: unknown[]) =>
  writeSession(key, JSON.stringify(arr || []));

/**
 * ⚠ SUPERSEDED — unused. `PracticeDetailsPage.jsx` now renders the real
 * "License, Scope & Practice" question tree group's own "Work setting"
 * CHECKBOX question/options instead of this list — its labels/shape don't
 * match (this was a single-select RadioCard list; the real question is a
 * CHECKBOX with an "Other"→textbox target). Kept, not deleted, per this
 * project's don't-delete-working-code-you-might-need practice.
 */
export const WORK_SETTINGS = Object.freeze([
  "Correctional Facility",
  "MedSpa",
  "Long Term Care",
  "Physician's Office",
  "Urgent Care",
  "Other",
]);

class PracticeStore {
  #listeners = new Set<() => void>();

  #designation: string = readSession(KEYS.DESIGNATION) || "";
  #specialityCodes: string[] = readJsonArray(KEYS.SPECIALITIES);
  #zip: string = readSession(KEYS.ZIP) || "";
  #effectiveDate: string = readSession(KEYS.EFFECTIVE_DATE) || "";
  #hoursPerWeek: string = readSession(KEYS.HOURS_PER_WEEK) || "";
  #workSetting: string = readSession(KEYS.WORK_SETTING) || "";
  #moonlights: boolean = readSession(KEYS.MOONLIGHTS) === "true";
  #moonlightWhere: string = readSession(KEYS.MOONLIGHT_WHERE) || "";
  #scopeIds: number[] = readJsonArray(KEYS.SCOPE_IDS);
  #employerName: string = readSession(KEYS.EMPLOYER_NAME) || "";
  #limitTierId: number | null = (() => {
    const raw = readSession(KEYS.LIMIT_TIER_ID);
    const n = raw == null ? NaN : Number(raw);
    return Number.isFinite(n) ? n : null;
  })();

  get designation(): string {
    return this.#designation;
  }
  set designation(v: string | null | undefined) {
    this.#designation = v || "";
    writeSession(KEYS.DESIGNATION, this.#designation);
    this.#notify();
  }

  get specialityCodes(): string[] {
    return this.#specialityCodes;
  }
  set specialityCodes(arr: string[] | null | undefined) {
    this.#specialityCodes = freezeArray(Array.isArray(arr) ? arr : []);
    writeJsonArray(KEYS.SPECIALITIES, this.#specialityCodes);
    this.#notify();
  }
  toggleSpeciality(code: string) {
    const has = this.#specialityCodes.includes(code);
    this.specialityCodes = has
      ? this.#specialityCodes.filter((c) => c !== code)
      : [...this.#specialityCodes, code];
  }
  /** Drop any selected speciality the current designation no longer allows. Returns the codes that were dropped. */
  pruneSpecialitiesFor(allowedCodes: string[] | null | undefined): string[] {
    const allowed = new Set(allowedCodes || []);
    const kept = this.#specialityCodes.filter((c) => allowed.has(c));
    const dropped = this.#specialityCodes.filter((c) => !allowed.has(c));
    if (dropped.length > 0) this.specialityCodes = kept;
    return dropped;
  }

  get zip(): string {
    return this.#zip;
  }
  set zip(v: string | null | undefined) {
    this.#zip = v || "";
    writeSession(KEYS.ZIP, this.#zip);
    this.#notify();
  }

  get effectiveDate(): string {
    return this.#effectiveDate;
  }
  set effectiveDate(v: string | null | undefined) {
    this.#effectiveDate = v || "";
    writeSession(KEYS.EFFECTIVE_DATE, this.#effectiveDate);
    this.#notify();
  }

  get hoursPerWeek(): string {
    return this.#hoursPerWeek;
  }
  set hoursPerWeek(v: string | null | undefined) {
    this.#hoursPerWeek = v || "";
    writeSession(KEYS.HOURS_PER_WEEK, this.#hoursPerWeek);
    this.#notify();
  }

  get workSetting(): string {
    return this.#workSetting;
  }
  set workSetting(v: string | null | undefined) {
    this.#workSetting = v || "";
    writeSession(KEYS.WORK_SETTING, this.#workSetting);
    this.#notify();
  }

  get moonlights(): boolean {
    return this.#moonlights;
  }
  set moonlights(v: boolean) {
    this.#moonlights = !!v;
    writeSession(KEYS.MOONLIGHTS, this.#moonlights ? "true" : "");
    this.#notify();
  }

  get moonlightWhere(): string {
    return this.#moonlightWhere;
  }
  set moonlightWhere(v: string | null | undefined) {
    this.#moonlightWhere = v || "";
    writeSession(KEYS.MOONLIGHT_WHERE, this.#moonlightWhere);
    this.#notify();
  }

  get scopeIds(): number[] {
    return this.#scopeIds;
  }
  set scopeIds(arr: number[] | null | undefined) {
    this.#scopeIds = freezeArray(Array.isArray(arr) ? arr : []);
    writeJsonArray(KEYS.SCOPE_IDS, this.#scopeIds);
    this.#notify();
  }
  toggleScope(id: number) {
    const has = this.#scopeIds.includes(id);
    this.scopeIds = has ? this.#scopeIds.filter((x) => x !== id) : [...this.#scopeIds, id];
  }

  get employerName(): string {
    return this.#employerName;
  }
  set employerName(v: string | null | undefined) {
    this.#employerName = v || "";
    writeSession(KEYS.EMPLOYER_NAME, this.#employerName);
    this.#notify();
  }

  /** Selected limit of liability tier id (§3.9), or null to use the engine's default. */
  get limitTierId(): number | null {
    return this.#limitTierId;
  }
  set limitTierId(v: number | string | null | undefined) {
    const n = Number(v);
    this.#limitTierId = Number.isFinite(n) ? n : null;
    writeSession(KEYS.LIMIT_TIER_ID, this.#limitTierId);
    this.#notify();
  }

  /** True once designation, at least one speciality, ZIP and effective date are all present. */
  get hasStep0Inputs(): boolean {
    return Boolean(
      this.#designation && this.#specialityCodes.length > 0 && this.#zip && this.#effectiveDate,
    );
  }

  subscribe(listener: () => void): () => void {
    this.#listeners.add(listener);
    return () => this.#listeners.delete(listener);
  }

  #notify() {
    this.#listeners.forEach((l) => l());
  }

  clear() {
    this.#designation = "";
    this.#specialityCodes = freezeArray<string>([]);
    this.#zip = "";
    this.#effectiveDate = "";
    this.#hoursPerWeek = "";
    this.#workSetting = "";
    this.#moonlights = false;
    this.#moonlightWhere = "";
    this.#scopeIds = freezeArray<number>([]);
    this.#employerName = "";
    this.#limitTierId = null;
    Object.values(KEYS).forEach((k) => writeSession(k, null));
    this.#notify();
  }
}

const practiceStore = new PracticeStore();
export default practiceStore;
