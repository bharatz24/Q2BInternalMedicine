/**
 * Question trees + answer maps + visited groups + question-fetch status.
 *
 * All "Q&A" state lives here so a junior touching the questions flow has
 * one file to open:
 *   - questionGroups          — speciality master tree (rendered on
 *                                Classification + License pages). The
 *                                /questions response already includes
 *                                group `id`s, so this also serves as
 *                                `questionGroupsWithIds` (aliased getter
 *                                kept for back-compat with consumers).
 *   - submissionQuestionGroups — submission-scoped tree returned by
 *                                /submission-questions; used on Coverage
 *                                + Underwriting pages.
 *   - questionAnswers / coverageAnswers / impactAnswers / underwritingAnswers
 *     — answer maps keyed by question id.
 *   - visitedQuestionGroups   — names of groups the user actually landed on,
 *                                so the signup request saves only those.
 *   - hiddenQuestionIds / showTargetQuestionIds (+ their `master*` twins)
 *     — Question Visibility (Hide/Show) state, one pair per question tree.
 *
 * Status flags for the corresponding fetches live here too.
 */

/** A question-tree group/question node — the /questions response shape. */
type QuestionGroup = Record<string, any>;
/** Answer map keyed by (stringified) question id. */
type AnswerMap = Record<string, any>;
type QuestionId = string | number;

class QuestionsStore {
  #listeners = new Set<() => void>();

  // ── Question trees ─────────────────────────────────────────────────────
  #questionGroups: QuestionGroup[] = [];
  #submissionQuestionGroups: QuestionGroup[] = [];

  // Cache marker — which speciality id `questionGroups` belongs to. Lets
  // useQuestionsAutoLoad short-circuit when the cached tree is for the
  // requested spec id (avoids a duplicate fetch on remount).
  #questionGroupsSpecId: string | null = null;

  get questionGroups(): QuestionGroup[] {
    return this.#questionGroups;
  }
  set questionGroups(v: QuestionGroup[]) {
    this.#questionGroups = v;
    this.#notify();
  }

  get questionGroupsSpecId(): string | null {
    return this.#questionGroupsSpecId;
  }
  setQuestionGroupsForSpec(specId: QuestionId | null | undefined, data: QuestionGroup[]) {
    this.#questionGroups = Array.isArray(data) ? data : [];
    this.#questionGroupsSpecId = specId == null ? null : String(specId);
    this.#notify();
  }
  getQuestionGroupsBySpec(specId: QuestionId): QuestionGroup[] | null {
    return this.#questionGroupsSpecId === String(specId) ? this.#questionGroups : null;
  }

  // Alias — /questions ships group ids inline now, so this just returns
  // the master tree. Setter is a no-op kept for legacy call sites.
  get questionGroupsWithIds(): QuestionGroup[] {
    return this.#questionGroups;
  }
  set questionGroupsWithIds(_v: QuestionGroup[]) {
    /* no-op: see getter */
  }

  get submissionQuestionGroups(): QuestionGroup[] {
    return this.#submissionQuestionGroups;
  }
  set submissionQuestionGroups(v: QuestionGroup[]) {
    this.#submissionQuestionGroups = v;
    this.#notify();
  }

  // Submission id the cached `submissionQuestionGroups` belong to. The tree
  // isn't wiped when the user resumes a different submission, so callers
  // compare this marker against the active sid to know when the cache is
  // stale and a refetch is needed (without it, resuming submission B after A
  // would keep showing A's answers).
  #submissionQuestionsSid: string | null = null;

  get submissionQuestionsSid(): string | null {
    return this.#submissionQuestionsSid;
  }
  set submissionQuestionsSid(v: QuestionId | null | undefined) {
    this.#submissionQuestionsSid = v == null ? null : String(v);
    this.#notify();
  }

  // ── Answer maps (keyed by question id) ────────────────────────────────
  #questionAnswers: AnswerMap = {};
  #coverageAnswers: AnswerMap = {};
  #impactAnswers: AnswerMap = {};
  #underwritingAnswers: AnswerMap = {};
  // One dedicated map per tree-driven page/section added for the 6-group
  // nursing rebuild — same one-map-per-page convention as coverageAnswers/
  // underwritingAnswers above, not a new concept.
  #employerAnswers: AnswerMap = {};
  #previousInsuranceAnswers: AnswerMap = {};
  #claimsAnswers: AnswerMap = {};

  get questionAnswers(): AnswerMap {
    return this.#questionAnswers;
  }
  set questionAnswers(v: AnswerMap) {
    this.#questionAnswers = v;
    this.#notify();
  }

  get coverageAnswers(): AnswerMap {
    return this.#coverageAnswers;
  }
  set coverageAnswers(v: AnswerMap) {
    this.#coverageAnswers = v;
    this.#notify();
  }

  get impactAnswers(): AnswerMap {
    return this.#impactAnswers;
  }
  set impactAnswers(v: AnswerMap) {
    this.#impactAnswers = v;
    this.#notify();
  }

  get underwritingAnswers(): AnswerMap {
    return this.#underwritingAnswers;
  }
  set underwritingAnswers(v: AnswerMap) {
    this.#underwritingAnswers = v;
    this.#notify();
  }

  get employerAnswers(): AnswerMap {
    return this.#employerAnswers;
  }
  set employerAnswers(v: AnswerMap) {
    this.#employerAnswers = v;
    this.#notify();
  }

  get previousInsuranceAnswers(): AnswerMap {
    return this.#previousInsuranceAnswers;
  }
  set previousInsuranceAnswers(v: AnswerMap) {
    this.#previousInsuranceAnswers = v;
    this.#notify();
  }

  get claimsAnswers(): AnswerMap {
    return this.#claimsAnswers;
  }
  set claimsAnswers(v: AnswerMap) {
    this.#claimsAnswers = v;
    this.#notify();
  }

  // ── Question Visibility (Hide/Show) ───────────────────────────────────
  // Two INDEPENDENT pairs, one per question tree. They must never be merged:
  // master `question.id` and `submission_question.id` come from different DB
  // sequences with no guaranteed disjointness, so a single shared Set could
  // let a master id hide an unrelated submission question (or vice versa).
  //
  // A submission-wide single set (rather than one per page) is deliberate —
  // the whole submission tree arrives in one fetch, so cross-group rules
  // ("answering a Coverage question hides an Underwriting one") resolve
  // correctly only when every group is in scope.
  //
  //   hiddenQuestionIds        — currently-hidden ids, recomputed on every
  //                              choice-option answer change.
  //   showTargetQuestionIds    — structural: every question targeted by ANY
  //                              Show rule. Written once per tree load.
  #hiddenQuestionIds = new Set<QuestionId>();
  #showTargetQuestionIds = new Set<QuestionId>();
  #masterHiddenQuestionIds = new Set<QuestionId>();
  #masterShowTargetQuestionIds = new Set<QuestionId>();

  get hiddenQuestionIds(): Set<QuestionId> {
    return this.#hiddenQuestionIds;
  }

  /**
   * The ONLY way to write `hiddenQuestionIds` (no plain setter, on purpose).
   * Un-hiding a question must never restore its previous answer, so any id
   * that is newly entering the hidden set gets dropped from all three answer
   * maps in this same call — atomically, before subscribers are notified.
   * Keep it that way if this store is ever ported to Redux/Zustand: a
   * separate clear-on-hide effect can run out of order and resurrect answers.
   */
  setHiddenQuestionIds(nextHidden: Set<QuestionId> | null | undefined) {
    const next = nextHidden instanceof Set ? nextHidden : new Set<QuestionId>();
    const newlyHidden = [...next].filter((id) => !this.#hiddenQuestionIds.has(id));
    if (newlyHidden.length > 0) {
      const drop = (map: AnswerMap): AnswerMap => {
        let changed = false;
        const copy: AnswerMap = { ...map };
        for (const id of newlyHidden) {
          const key = String(id);
          if (Object.prototype.hasOwnProperty.call(copy, key)) {
            delete copy[key];
            changed = true;
          }
        }
        return changed ? copy : map;
      };
      // Which page's map an id belongs to is unknowable here — and doesn't
      // matter, since the key spaces don't overlap.
      this.#questionAnswers = drop(this.#questionAnswers);
      this.#coverageAnswers = drop(this.#coverageAnswers);
      this.#underwritingAnswers = drop(this.#underwritingAnswers);
      this.#employerAnswers = drop(this.#employerAnswers);
      this.#previousInsuranceAnswers = drop(this.#previousInsuranceAnswers);
      this.#claimsAnswers = drop(this.#claimsAnswers);
    }
    this.#hiddenQuestionIds = next;
    this.#notify();
  }

  get showTargetQuestionIds(): Set<QuestionId> {
    return this.#showTargetQuestionIds;
  }
  set showTargetQuestionIds(v: Set<QuestionId> | null | undefined) {
    this.#showTargetQuestionIds = v instanceof Set ? v : new Set();
    this.#notify();
  }

  get masterHiddenQuestionIds(): Set<QuestionId> {
    return this.#masterHiddenQuestionIds;
  }

  /**
   * Master-tree counterpart of `setHiddenQuestionIds`, enforcing the same
   * "un-hiding never restores an answer" contract. Scoped to `questionAnswers`
   * only — that's the sole map any master-tree page writes to.
   */
  setMasterHiddenQuestionIds(nextHidden: Set<QuestionId> | null | undefined) {
    const next = nextHidden instanceof Set ? nextHidden : new Set<QuestionId>();
    const newlyHidden = [...next].filter((id) => !this.#masterHiddenQuestionIds.has(id));
    if (newlyHidden.length > 0) {
      const copy: AnswerMap = { ...this.#questionAnswers };
      let changed = false;
      for (const id of newlyHidden) {
        const key = String(id);
        if (Object.prototype.hasOwnProperty.call(copy, key)) {
          delete copy[key];
          changed = true;
        }
      }
      if (changed) this.#questionAnswers = copy;
    }
    this.#masterHiddenQuestionIds = next;
    this.#notify();
  }

  get masterShowTargetQuestionIds(): Set<QuestionId> {
    return this.#masterShowTargetQuestionIds;
  }
  set masterShowTargetQuestionIds(v: Set<QuestionId> | null | undefined) {
    this.#masterShowTargetQuestionIds = v instanceof Set ? v : new Set();
    this.#notify();
  }

  // ── Visited groups (pre-signup save uses these to scope the payload) ──
  #visitedQuestionGroups: string[] = [];

  get visitedQuestionGroups(): string[] {
    return this.#visitedQuestionGroups;
  }
  set visitedQuestionGroups(v: string[]) {
    this.#visitedQuestionGroups = v;
    this.#notify();
  }

  /** Record a group the user landed on. No-op if already recorded. */
  markGroupVisited(groupName: string | null | undefined) {
    const name = String(groupName || "").trim();
    if (!name) return;
    if (this.#visitedQuestionGroups.includes(name)) return;
    this.#visitedQuestionGroups = [...this.#visitedQuestionGroups, name];
    this.#notify();
  }

  // ── Fetch status flags ─────────────────────────────────────────────────
  #questionsLoading = false;
  #questionsError: Error | null = null;
  #submissionQuestionsLoading = false;
  #submissionQuestionsError: Error | null = null;
  #underwritingSaving = false;
  #underwritingSaveError: string | null = null;

  get questionsLoading(): boolean {
    return this.#questionsLoading;
  }
  set questionsLoading(v: boolean) {
    this.#questionsLoading = !!v;
    this.#notify();
  }

  get questionsError(): Error | null {
    return this.#questionsError;
  }
  set questionsError(v: Error | null) {
    this.#questionsError = v;
    this.#notify();
  }

  get submissionQuestionsLoading(): boolean {
    return this.#submissionQuestionsLoading;
  }
  set submissionQuestionsLoading(v: boolean) {
    this.#submissionQuestionsLoading = !!v;
    this.#notify();
  }

  get submissionQuestionsError(): Error | null {
    return this.#submissionQuestionsError;
  }
  set submissionQuestionsError(v: Error | null) {
    this.#submissionQuestionsError = v;
    this.#notify();
  }

  get underwritingSaving(): boolean {
    return this.#underwritingSaving;
  }
  set underwritingSaving(v: boolean) {
    this.#underwritingSaving = !!v;
    this.#notify();
  }

  get underwritingSaveError(): string | null {
    return this.#underwritingSaveError;
  }
  set underwritingSaveError(v: string | null) {
    this.#underwritingSaveError = v;
    this.#notify();
  }

  /**
   * Drop every bit of submission-scoped question state — the cached tree, its
   * sid marker, all page answer maps, and the Visibility sets — WITHOUT
   * touching the speciality master tree. Use when switching submissions
   * (dashboard Resume): the cached tree's `answerValue`s go stale the moment
   * the user answers + saves (the client never refetches after a save), so a
   * resume must start from a clean slate and let the bootstrap refetch a
   * fresh, answer-bearing tree for the resumed submission.
   */
  resetSubmissionQuestionState() {
    this.#submissionQuestionGroups = [];
    this.#submissionQuestionsSid = null;
    this.#coverageAnswers = {};
    this.#impactAnswers = {};
    this.#underwritingAnswers = {};
    this.#employerAnswers = {};
    this.#previousInsuranceAnswers = {};
    this.#claimsAnswers = {};
    this.#hiddenQuestionIds = new Set();
    this.#showTargetQuestionIds = new Set();
    this.#submissionQuestionsError = null;
    this.#notify();
  }

  subscribe(listener: () => void): () => void {
    this.#listeners.add(listener);
    return () => this.#listeners.delete(listener);
  }

  #notify() {
    this.#listeners.forEach((l) => l());
  }

  clear() {
    this.#questionGroups = [];
    // Reset the spec cache marker too. Leaving it set while `#questionGroups`
    // is emptied poisons `getQuestionGroupsBySpec` (which returns the empty —
    // but truthy — array), so any fetch guard that trusts the cache would
    // never refetch on the next quote.
    this.#questionGroupsSpecId = null;
    this.#submissionQuestionGroups = [];
    this.#submissionQuestionsSid = null;
    this.#questionAnswers = {};
    this.#coverageAnswers = {};
    this.#impactAnswers = {};
    this.#underwritingAnswers = {};
    this.#employerAnswers = {};
    this.#previousInsuranceAnswers = {};
    this.#claimsAnswers = {};
    this.#hiddenQuestionIds = new Set();
    this.#showTargetQuestionIds = new Set();
    this.#masterHiddenQuestionIds = new Set();
    this.#masterShowTargetQuestionIds = new Set();
    this.#visitedQuestionGroups = [];
    this.#questionsLoading = false;
    this.#questionsError = null;
    this.#submissionQuestionsLoading = false;
    this.#submissionQuestionsError = null;
    this.#underwritingSaving = false;
    this.#underwritingSaveError = null;
    this.#notify();
  }
}

const questionsStore = new QuestionsStore();
export default questionsStore;
