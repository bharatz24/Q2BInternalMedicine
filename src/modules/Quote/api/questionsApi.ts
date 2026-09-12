/**
 * Questions API surface + the pure question-tree helpers.
 *
 * Real `ins` question-tree API throughout — the same speciality-agnostic
 * endpoints Q2BNfy uses: `GET /questions?specialityId=` (master tree, keyed
 * to a `specialities_master.id`), `GET /questions/{submissionId}/questions`
 * (submission-scoped, carrying saved answers), `POST /questions/save`.
 * Confirmed live against SP_398–SP_401 (all 4 nursing specialities) — `ins`
 * has a real, fully-populated 6-group nursing question tree.
 *
 * Everything from "Display order + Visibility" onwards is unchanged from the
 * hosted app — it was already pure (no HTTP, no React, no store access), so the
 * sorting, hydration, Hide/Show resolution and payload builders all work
 * verbatim regardless of where the tree came from.
 *
 * Type note: the question tree is a deeply-nested, tolerant, backend-shaped
 * structure whose casing and field presence vary by endpoint (see the
 * comments below). Node params are therefore `any`; the value of typing this
 * file is the primitive return types and the typed fetch DTOs, not a model
 * of every tree node.
 */
import axios from "axios";
import { apiUrl, logApiError } from "@/shared/services/config";
import { dateValid, fmtDate, toMdY } from "@/shared/utils/dateHelpers";
import { queryClient } from "@/shared/query/queryClient";
import { queryKeys } from "@/shared/query/keys";
import {
  SpecialityQuestionGroupDto,
  SubmissionQuestionAnswersSaveRequest,
  SubmissionQuestionGroupResponseDto,
} from "@/shared/dtos";

type Sid = number | string;
type AnswerMap = Record<string, any>;
type ImpactMap = Record<string, any>;

/**
 * Master question tree for a speciality (`GET /questions?specialityId=`).
 * Backed by the shared react-query cache — one network call per
 * (specialityId) regardless of how many callers ask (bootstrap + page hook
 * share the round-trip), cached an hour (the master tree rarely changes),
 * failed queries not cached so a retry re-fetches.
 */
export const fetchQuestionsBySpeciality = (
  specialityId: Sid,
): Promise<SpecialityQuestionGroupDto[]> => {
  const key = String(specialityId);
  return queryClient
    .query({
      queryKey: queryKeys.questions.bySpeciality(key),
      queryFn: async () => {
        const response = await axios.get(apiUrl("/questions"), {
          params: { specialityId: key },
          withCredentials: true,
        });
        return Array.isArray(response.data)
          ? response.data.map((g: any) => new SpecialityQuestionGroupDto(g))
          : [];
      },
      staleTime: 60 * 60_000,
    })
    .catch((error) => {
      logApiError(error);
      throw error;
    });
};

/**
 * The submission-scoped question tree, carrying whatever the applicant has
 * already answered. Real `GET /questions/{submissionId}/questions` call.
 *
 * `signal` is honoured so `useAppBootstrap`'s AbortController path behaves as
 * expected.
 */
export const fetchSubmissionQuestions = async (
  submissionId: Sid,
  { signal }: { signal?: AbortSignal } = {},
): Promise<SubmissionQuestionGroupResponseDto[]> => {
  if (signal?.aborted) throw abortError();
  try {
    const response = await axios.get(apiUrl(`/questions/${submissionId}/questions`), {
      withCredentials: true,
      signal,
    });
    const data = response.data;
    return Array.isArray(data)
      ? data.map((g: any) => new SubmissionQuestionGroupResponseDto(g))
      : [];
  } catch (error: any) {
    if (error?.name === "AbortError" || error?.name === "CanceledError") throw error;
    logApiError(error);
    throw error;
  }
};

/**
 * Persist answers for one or more groups. Real `POST /questions/save` call.
 */
export const saveSubmissionQuestionAnswers = async (payload: any): Promise<boolean> => {
  try {
    const request = new SubmissionQuestionAnswersSaveRequest(payload);
    const response = await axios.post(apiUrl("/questions/save"), request, {
      withCredentials: true,
    });
    return response.data === true;
  } catch (error) {
    logApiError(error);
    throw error;
  }
};

/**
 * True when the cached submission tree is usable for the active submission:
 * same sid, at least one group, and the Underwriting group has questions.
 * An empty or headless tree must not short-circuit the fetch — that is what
 * left Underwriting blank on a second visit after a bad/empty cache write.
 */
export function hasUsableSubmissionQuestionCache(
  groups: any,
  cachedSid: any,
  submissionId: Sid,
): boolean {
  if (cachedSid == null || String(cachedSid) !== String(submissionId)) return false;
  if (!Array.isArray(groups) || groups.length === 0) return false;
  const underwriting = groups.find((g: any) => /underwriting/i.test(String(g?.groupName || "")));
  return Array.isArray(underwriting?.questions) && underwriting.questions.length > 0;
}

/**
 * Whether every option already carries the resolved Visibility id lists.
 * PaymentPage used to overwrite the store with raw DTO rows (no augmentation);
 * coming back to Underwriting then skipped the bootstrap fetch and rendered
 * against a tree the Hide/Show helpers could not read.
 */
export function isSubmissionQuestionTreeAugmented(groups: any): boolean {
  if (!Array.isArray(groups) || groups.length === 0) return false;
  for (const g of groups) {
    for (const q of g?.questions || []) {
      for (const o of q?.options || []) {
        if (
          !Array.isArray(o.visibilityHideTargetIds) ||
          !Array.isArray(o.visibilityShowTargetIds)
        ) {
          return false;
        }
      }
    }
  }
  return true;
}

/**
 * Resolve Visibility targets, write the augmented tree into `questionsStore`,
 * and recompute the hidden set. Shared by bootstrap and PaymentPage so every
 * writer leaves the store in the same shape UnderwritingPage expects.
 */
export function applySubmissionQuestionGroups(
  groups: any,
  submissionId: Sid,
  questionsStore: any,
): any[] {
  const list = Array.isArray(groups) ? groups : [];
  const { groups: augmentedGroups, showTargetQuestionIds } = resolveVisibilityTargets(list);
  questionsStore.submissionQuestionGroups = augmentedGroups;
  questionsStore.submissionQuestionsSid = submissionId;
  questionsStore.showTargetQuestionIds = showTargetQuestionIds;
  const liveAnswers = mergeAnswerMaps(
    questionsStore.questionAnswers,
    questionsStore.coverageAnswers,
    questionsStore.underwritingAnswers,
    questionsStore.employerAnswers,
    questionsStore.previousInsuranceAnswers,
    questionsStore.claimsAnswers,
  );
  questionsStore.setHiddenQuestionIds(
    recomputeHiddenQuestionIds(augmentedGroups, liveAnswers, showTargetQuestionIds),
  );
  return augmentedGroups;
}

function abortError(): Error {
  const e = new Error("Aborted");
  e.name = "AbortError";
  return e;
}

export function buildOptionImpactsPayload(option: any, impactAnswers: ImpactMap): any[] {
  const impacts = Array.isArray(option?.impacts) ? option.impacts : [];
  if (impacts.length === 0) return [];
  return impacts.map((imp: any) => {
    const userVal = impactAnswers?.[String(imp.id)];
    const inputType = String(imp?.impactInputType || "").toUpperCase();
    const isDate = inputType === "DATE_PICKER" || inputType === "DATE";
    let answerValue: string;
    if (userVal != null && userVal !== "") {
      answerValue = isDate ? fmtDate(String(userVal)) : String(userVal);
    } else {
      answerValue = imp?.answerValue == null ? "" : String(imp.answerValue);
      if (isDate && answerValue !== "") answerValue = fmtDate(answerValue) || answerValue;
    }
    return { submissionQuestionImpactId: imp.id, answerValue };
  });
}

// ── Display order + Visibility (Hide/Show) resolution ────────────────────
// Everything below is pure: no HTTP, no React, no store access. Two question
// trees run through these helpers:
//   - the SUBMISSION tree (/questions/{sid}/questions) — option
//     hideQuestions/showQuestions hold MASTER question ids, so they must be
//     remapped to submission row ids first (`resolveVisibilityTargets`).
//   - the MASTER tree (/questions?specialityId=) — its own question ids ARE
//     the master ids, so no remapping is needed
//     (`resolveMasterVisibilityTargets`).
// Both produce the same augmented shape, after which every other helper here
// (`recomputeHiddenQuestionIds`, `isQuestionVisible`, the sorters) is shared
// verbatim between the two trees. Their hidden-id SETS must never be shared —
// see questionsStore's masterHiddenQuestionIds comment for why.

/** Ascending `displayOrder` sort. Non-mutating; missing order counts as 0. */
function sortedByDisplayOrder(list: any): any[] {
  if (!Array.isArray(list)) return [];
  return [...list].sort((a: any, b: any) => (a?.displayOrder ?? 0) - (b?.displayOrder ?? 0));
}

// Groups, questions and options all carry the same `displayOrder` shape, so
// one comparator serves all three. Named aliases keep call sites readable.
export const sortedGroups = sortedByDisplayOrder;
export const sortedQuestions = sortedByDisplayOrder;
export const sortedOptions = sortedByDisplayOrder;

/**
 * Shallow-merge the page-scoped answer maps into one question-id-keyed map.
 * Key spaces can't collide — a question belongs to exactly one group, and
 * each group is owned by exactly one page.
 */
export function mergeAnswerMaps(...maps: any[]): Record<string, any> {
  return Object.assign({}, ...maps.filter((m: any) => m && typeof m === "object"));
}

/**
 * "What is this question answered with right now", for hidden-set purposes.
 *
 * A live in-progress answer wins, so Hide/Show fires the instant the user
 * clicks on the page they're editing. Otherwise we fall back to the persisted
 * `option.answerValue` the API ships on every question — that's what makes a
 * cross-group cascade resolve without first visiting the page that owns the
 * source question.
 */
export function effectiveAnswerForQuestion(question: any, liveAnswersByQuestionId: any): any {
  const qid = String(question?.id);
  if (
    liveAnswersByQuestionId &&
    Object.prototype.hasOwnProperty.call(liveAnswersByQuestionId, qid)
  ) {
    return liveAnswersByQuestionId[qid];
  }
  const opts = Array.isArray(question?.options) ? question.options : [];
  const answered = opts.filter(
    (o: any) => o?.answerValue != null && String(o.answerValue).trim() !== "",
  );
  if (answered.length === 0) return undefined;
  const qType = String(question?.questionType || "").toUpperCase();
  if (qType === "CHECKBOX") return answered.map((o: any) => String(o.id));
  if (
    qType === "TEXTBOX" ||
    qType === "TEXT_AREA" ||
    qType === "NUMBER_INPUT" ||
    qType === "DATE_PICKER"
  ) {
    return String(answered[0].answerValue);
  }
  return String(answered[0].id);
}

/**
 * Submission tree → augmented tree + the structural show-target set.
 *
 * Takes the WHOLE tree (not one page's group) because Visibility rules cross
 * group boundaries. Returns a new tree — spread-copied at every level, never
 * mutated — where each option additionally carries
 * `visibilityHideTargetIds` / `visibilityShowTargetIds`: the raw master-id
 * strings resolved to submission-scoped question ids via each question's
 * `questionId` field.
 *
 * `showTargetQuestionIds` is every question targeted by ANY Show rule in the
 * tree — those start hidden regardless of what's answered.
 */
export function resolveVisibilityTargets(submissionGroups: any): {
  groups: any[];
  showTargetQuestionIds: Set<any>;
} {
  const groups = Array.isArray(submissionGroups) ? submissionGroups : [];
  const submissionIdByMasterQuestionId = new Map<string, any>();
  for (const g of groups) {
    for (const q of g?.questions || []) {
      if (q?.questionId != null) submissionIdByMasterQuestionId.set(String(q.questionId), q.id);
    }
  }
  const showTargetQuestionIds = new Set<any>();
  const resolveIds = (masterIds: any): any[] => {
    const out: any[] = [];
    for (const masterId of Array.isArray(masterIds) ? masterIds : []) {
      const resolved = submissionIdByMasterQuestionId.get(String(masterId));
      if (resolved != null) out.push(resolved);
    }
    return out;
  };
  const augmentedGroups = groups.map((g: any) => ({
    ...g,
    questions: (g?.questions || []).map((q: any) => ({
      ...q,
      options: (q?.options || []).map((o: any) => {
        const visibilityHideTargetIds = resolveIds(o?.hideQuestions);
        const visibilityShowTargetIds = resolveIds(o?.showQuestions);
        for (const id of visibilityShowTargetIds) showTargetQuestionIds.add(id);
        return { ...o, visibilityHideTargetIds, visibilityShowTargetIds };
      }),
    })),
  }));
  return { groups: augmentedGroups, showTargetQuestionIds };
}

/** True unless `hiddenQuestionIds` (a Set) contains this question's id. */
export function isQuestionVisible(question: any, hiddenQuestionIds: any): boolean {
  return !(hiddenQuestionIds instanceof Set && hiddenQuestionIds.has(question?.id));
}

/**
 * Canonical form of a question-type string. `ins` sends the enum NAME
 * (`YES_NO`, `RADIO_BUTTON`, `TEXT_AREA`, …) on some endpoints and the human
 * display form (`Yes-No`, `Radio Button`, `Text Area`, …) on others — both
 * collapse to the same token here: uppercased, every run of non-alphanumeric
 * characters turned into a single `_`. So `"Yes-No"` and `"YES_NO"` match,
 * and every `questionType` check must go through this rather than compare a
 * raw string.
 */
export function normalizeQuestionType(questionType: unknown): string {
  return String(questionType || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

/**
 * The free-text question-type family: one text answer carried on the
 * question's single option row (as opposed to a choice made between options).
 * The real `ins` question tree uses `TEXT_AREA` / `NUMBER_INPUT` alongside
 * plain `TEXTBOX` — every helper that special-cases text answers must accept
 * the whole family, not just `"TEXTBOX"`.
 */
export const FREE_TEXT_QUESTION_TYPES = ["TEXTBOX", "TEXT_AREA", "NUMBER_INPUT", "DATE_PICKER"];

/** True when a question takes a single free-text answer. */
export function isFreeTextQuestionType(questionType: unknown): boolean {
  return FREE_TEXT_QUESTION_TYPES.includes(normalizeQuestionType(questionType));
}

/**
 * True for a yes/no question. `ins`'s nursing tree types these as `YES_NO`,
 * but older seeds (and this app's own local fallback tree) use `RADIO_BUTTON`
 * for the same two-option Yes/No shape — this app has always treated the two
 * identically, so both count.
 */
export function isYesNoQuestionType(questionType: unknown): boolean {
  const t = normalizeQuestionType(questionType);
  return t === "YES_NO" || t === "RADIO_BUTTON";
}

/**
 * "Is this the Yes option?" — `ins`'s nursing seed sets `optionValue` to
 * "true" on BOTH the Yes and the No option (a seed-data quirk), so the label
 * is the only reliable signal; `optionValue` is consulted only when there's
 * no label at all.
 */
export function isYesOption(option: any): boolean {
  const label = String(option?.optionLabel ?? "").trim();
  if (label) return /^y(es)?\b/i.test(label);
  const value = String(option?.optionValue ?? "").trim();
  return /^(y|yes|true|1)$/i.test(value);
}

/**
 * The string to persist as `submission_question_option.selected_value` for a
 * chosen option. For every question type this is the option's stored
 * `optionValue` — EXCEPT `YES_NO`, where `ins`'s nursing seed sets
 * `optionValue` to "true" on both options: there the label ("Yes" / "No") is
 * what carries the meaning, so that's what we send. `RADIO_BUTTON` options
 * keep their real `optionValue` (they're distinct per option).
 */
export function answerValueForOption(question: any, option: any): string {
  if (normalizeQuestionType(question?.questionType) === "YES_NO") {
    return String(option?.optionLabel ?? option?.optionValue ?? "");
  }
  return String(option?.optionValue ?? option?.optionLabel ?? "");
}

/**
 * Master tree counterpart of `resolveVisibilityTargets` — same output shape,
 * minus the id-remapping step: on this tree a question's own `id` IS the
 * master id that hideQuestions/showQuestions reference, so the raw ids are
 * just coerced to Number and used directly.
 */
export function resolveMasterVisibilityTargets(questionGroups: any): {
  groups: any[];
  showTargetQuestionIds: Set<any>;
} {
  const groups = Array.isArray(questionGroups) ? questionGroups : [];
  const showTargetQuestionIds = new Set<any>();
  const toIds = (rawIds: any): number[] =>
    (Array.isArray(rawIds) ? rawIds : [])
      .map((id: any) => Number(id))
      .filter((n: number) => !Number.isNaN(n));
  const augmentedGroups = groups.map((g: any) => ({
    ...g,
    questions: (g?.questions || []).map((q: any) => ({
      ...q,
      options: (q?.options || []).map((o: any) => {
        const visibilityHideTargetIds = toIds(o?.hideQuestions);
        const visibilityShowTargetIds = toIds(o?.showQuestions);
        for (const id of visibilityShowTargetIds) showTargetQuestionIds.add(id);
        return { ...o, visibilityHideTargetIds, visibilityShowTargetIds };
      }),
    })),
  }));
  return { groups: augmentedGroups, showTargetQuestionIds };
}

/**
 * The option(s) currently selected on a question — the only place Visibility
 * rules can hang off. Free-text types are excluded outright: a Hide/Show rule
 * is always configured against a choice option, never a text field.
 */
function activeOptionsForQuestion(question: any, effectiveAnswer: any): any[] {
  if (effectiveAnswer == null) return [];
  const qType = String(question?.questionType || "").toUpperCase();
  const opts = Array.isArray(question?.options) ? question.options : [];
  if (
    qType === "TEXTBOX" ||
    qType === "TEXT_AREA" ||
    qType === "NUMBER_INPUT" ||
    qType === "DATE_PICKER"
  )
    return [];
  if (qType === "CHECKBOX") {
    const ids = Array.isArray(effectiveAnswer) ? effectiveAnswer.map(String) : [];
    return opts.filter((o: any) => ids.includes(String(o.id)));
  }
  const selected = opts.find((o: any) => String(o.id) === String(effectiveAnswer));
  return selected ? [selected] : [];
}

/**
 * The core Visibility algorithm. Pure — returns a NEW Set, never mutates the
 * one it was handed.
 *
 *   1. Seed with `showTargetQuestionIds`: every Show target starts hidden,
 *      independent of any answer.
 *   2. Walk the tree in (group.displayOrder, question.displayOrder) order,
 *      single pass.
 *   3. Skip a question as a *source* when it is itself hidden — a hidden
 *      question's answer can't hide or show anything.
 *   4. For each active option, add its hide targets and remove its show
 *      targets.
 *
 * OR semantics fall out of this naturally (any active Hide adds, any active
 * Show removes). There is no fixed-point iteration: on conflict the
 * later-ordered source wins, and a source hidden by a later-ordered rule
 * doesn't retroactively un-apply its own cascade.
 *
 * Must run against an AUGMENTED tree (from `resolveVisibilityTargets` or
 * `resolveMasterVisibilityTargets`) — it reads the resolved
 * `visibilityHideTargetIds`/`visibilityShowTargetIds`, not the raw ids.
 */
export function recomputeHiddenQuestionIds(
  submissionGroups: any,
  liveAnswersByQuestionId: any,
  showTargetQuestionIds: any,
): Set<any> {
  const hidden = new Set<any>(showTargetQuestionIds instanceof Set ? showTargetQuestionIds : []);
  const groups = sortedGroups(submissionGroups);
  for (const g of groups) {
    const questions = sortedQuestions(g?.questions || []);
    for (const q of questions) {
      if (hidden.has(q.id)) continue;
      const effectiveAnswer = effectiveAnswerForQuestion(q, liveAnswersByQuestionId);
      for (const opt of activeOptionsForQuestion(q, effectiveAnswer)) {
        for (const id of opt.visibilityHideTargetIds || []) hidden.add(id);
        for (const id of opt.visibilityShowTargetIds || []) hidden.delete(id);
      }
    }
  }
  return hidden;
}

export function buildSingleGroupSavePayload(
  groupRegex: RegExp,
  submissionId: Sid,
  submissionGroups: any,
  answers: AnswerMap,
  impactAnswers: ImpactMap,
  hiddenQuestionIds: any,
): any {
  if (!Array.isArray(submissionGroups)) return null;
  const subGroup = submissionGroups.find((g: any) => groupRegex.test(String(g?.groupName || "")));
  if (!subGroup) return null;

  const questions: any[] = [];
  for (const subQ of subGroup.questions || []) {
    // A hidden question never contributes an answer, even when a stale value
    // is still sitting in the answer map.
    if (hiddenQuestionIds instanceof Set && hiddenQuestionIds.has(subQ.id)) continue;
    const qid = String(subQ.id);
    const ans = answers[qid];
    if (ans == null) continue;

    const options: any[] = [];

    if (isFreeTextQuestionType(subQ.questionType)) {
      const text = String(ans);
      if (text.trim() !== "") {
        const opt = (subQ.options || [])[0];
        if (opt) {
          options.push({
            submissionQuestionOptionId: opt.id,
            answerValue: text,
            impacts: buildOptionImpactsPayload(opt, impactAnswers),
          });
        }
      }
    } else if (subQ.questionType === "CHECKBOX") {
      const ids = Array.isArray(ans) ? ans : [];
      for (const id of ids) {
        const opt = (subQ.options || []).find((o: any) => String(o.id) === id);
        if (opt) {
          options.push({
            submissionQuestionOptionId: opt.id,
            answerValue: String(opt.optionValue ?? opt.optionLabel ?? ""),
            impacts: buildOptionImpactsPayload(opt, impactAnswers),
          });
        }
      }
    } else {
      const opt = (subQ.options || []).find((o: any) => String(o.id) === String(ans));
      if (opt) {
        options.push({
          submissionQuestionOptionId: opt.id,
          answerValue: answerValueForOption(subQ, opt),
          impacts: buildOptionImpactsPayload(opt, impactAnswers),
        });
      }
    }

    if (options.length > 0) {
      questions.push({ submissionQuestionId: subQ.id, options });
    }
  }

  if (questions.length === 0) return null;
  return {
    submissionId: Number(submissionId),
    groups: [{ submissionQuestionGroupId: subGroup.id, questions }],
  };
}

export function buildUnderwritingGroupSavePayload(
  submissionId: Sid,
  submissionGroups: any,
  underwritingAnswers: AnswerMap,
  impactAnswers: ImpactMap,
  hiddenQuestionIds: any,
): any {
  return buildSingleGroupSavePayload(
    /underwriting/i,
    submissionId,
    submissionGroups,
    underwritingAnswers,
    impactAnswers,
    hiddenQuestionIds,
  );
}

/**
 * Like `buildSingleGroupSavePayload`, but ALWAYS returns the group (when it
 * exists in the tree) with an entry for EVERY visible question — answered
 * ones carry their answer, unanswered ones are sent blank: `answerValue: ""`
 * for a text field, an empty `options` list for a choice question (which
 * clears any stale server value, per the save DTO).
 *
 * Used by `/previous-insurance`, where the "Previous Insurance" and "Claims
 * Information" groups must BOTH be present in the same `/questions/save`
 * call even when one has no answers yet — the backend rejects a
 * later-ordered group if an earlier one isn't saved in the same transaction.
 * Hidden questions are still skipped, exactly as in the single-group build.
 */
export function buildFullGroupSavePayload(
  groupRegex: RegExp,
  submissionId: Sid,
  submissionGroups: any,
  answers: AnswerMap,
  impactAnswers: ImpactMap,
  hiddenQuestionIds: any,
): any {
  if (!Array.isArray(submissionGroups)) return null;
  const subGroup = submissionGroups.find((g: any) => groupRegex.test(String(g?.groupName || "")));
  if (!subGroup) return null;

  const questions: any[] = [];
  for (const subQ of subGroup.questions || []) {
    // A hidden question never contributes an answer, even when a stale value
    // is still sitting in the answer map.
    if (hiddenQuestionIds instanceof Set && hiddenQuestionIds.has(subQ.id)) continue;
    const ans = answers[String(subQ.id)];
    const options: any[] = [];

    if (isFreeTextQuestionType(subQ.questionType)) {
      const opt = (subQ.options || [])[0];
      if (opt) {
        options.push({
          submissionQuestionOptionId: opt.id,
          answerValue: ans == null ? "" : String(ans),
          impacts: buildOptionImpactsPayload(opt, impactAnswers),
        });
      }
    } else if (subQ.questionType === "CHECKBOX") {
      const ids = Array.isArray(ans) ? ans : [];
      for (const id of ids) {
        const opt = (subQ.options || []).find((o: any) => String(o.id) === id);
        if (opt) {
          options.push({
            submissionQuestionOptionId: opt.id,
            answerValue: String(opt.optionValue ?? opt.optionLabel ?? ""),
            impacts: buildOptionImpactsPayload(opt, impactAnswers),
          });
        }
      }
    } else {
      const opt = (subQ.options || []).find((o: any) => String(o.id) === String(ans));
      if (opt) {
        options.push({
          submissionQuestionOptionId: opt.id,
          answerValue: answerValueForOption(subQ, opt),
          impacts: buildOptionImpactsPayload(opt, impactAnswers),
        });
      }
    }

    // Every visible question goes in — an empty `options` list is a valid
    // "blank / cleared" answer for that question.
    questions.push({ submissionQuestionId: subQ.id, options });
  }

  return {
    submissionId: Number(submissionId),
    groups: [{ submissionQuestionGroupId: subGroup.id, questions }],
  };
}

export function buildSignupQuestionSaveRequest(
  questionGroups: any,
  questionAnswers: AnswerMap,
  impactAnswers: ImpactMap,
  hiddenQuestionIds: any,
): any {
  if (!Array.isArray(questionGroups) || questionGroups.length === 0) return null;
  const groups: any[] = [];
  for (const group of questionGroups) {
    if (!group?.id || !Array.isArray(group.questions)) continue;
    const questions: any[] = [];
    for (const q of group.questions) {
      // Same rule as buildSingleGroupSavePayload — hidden questions are
      // dropped from the payload regardless of any stale answer.
      if (hiddenQuestionIds instanceof Set && hiddenQuestionIds.has(q.id)) continue;
      const ans = questionAnswers?.[String(q.id)];
      const isText = isFreeTextQuestionType(q.questionType);
      // A visible free-text question is always sent — blank as "" — because
      // `ins` treats a group as complete only when every visible question
      // carries an answer ("" counts, GroupAnswerStatusDto). An optional box
      // left out here would block every later group's save with "Complete the
      // earlier group(s) first". Choice questions still need a real selection.
      if (ans == null && !isText) continue;
      const options: any[] = [];
      const qType = normalizeQuestionType(q.questionType);
      if (isText) {
        const opt = Array.isArray(q.options) && q.options.length > 0 ? q.options[0] : null;
        if (opt) {
          options.push({
            submissionQuestionOptionId: opt.id,
            answerValue: ans == null ? "" : String(ans),
            impacts: buildOptionImpactsPayload(opt, impactAnswers),
          });
        }
      } else if (qType === "CHECKBOX") {
        const ids = Array.isArray(ans) ? ans : [];
        for (const id of ids) {
          const opt = (q.options || []).find((o: any) => String(o.id) === String(id));
          if (opt) {
            options.push({
              submissionQuestionOptionId: opt.id,
              answerValue: String(opt.optionValue ?? opt.optionLabel ?? ""),
              impacts: buildOptionImpactsPayload(opt, impactAnswers),
            });
          }
        }
      } else {
        const opt = (q.options || []).find((o: any) => String(o.id) === String(ans));
        if (opt) {
          options.push({
            submissionQuestionOptionId: opt.id,
            answerValue: answerValueForOption(q, opt),
            impacts: buildOptionImpactsPayload(opt, impactAnswers),
          });
        }
      }
      if (options.length > 0) {
        questions.push({ submissionQuestionId: q.id, options });
      }
    }
    groups.push({ submissionQuestionGroupId: group.id, questions });
  }
  return groups.length > 0 ? { groups } : null;
}

/**
 * True when a single answer value counts as "provided": a non-blank string
 * (radio option id / textbox text) or a non-empty array (checkbox selections).
 */
function isAnswerProvided(ans: any): boolean {
  if (ans == null) return false;
  if (Array.isArray(ans)) return ans.length > 0;
  return String(ans).trim() !== "";
}

/**
 * Continue-gate helper: returns true only when every *required*, currently
 * visible question in `questions` has a non-empty answer (and, when
 * `checkImpacts` is set, every required follow-up impact on the selected
 * option has a value). Pages call this from `canAdvance` so the Continue
 * button stays disabled until required questions are answered.
 *
 * Works for both master (`SpecialityQuestionRuleDto`) and submission
 * (`SubmissionQuestionResponseDto`) trees — both expose `id`, `isRequired`,
 * `questionType`, and `options`.
 */
export function requiredQuestionsAnswered(
  questions: any,
  answers: AnswerMap,
  opts: {
    isVisible?: (q: any) => boolean;
    impactAnswers?: Record<string, any>;
    checkImpacts?: boolean;
  } = {},
): boolean {
  const { isVisible = () => true, impactAnswers = {}, checkImpacts = false } = opts;
  if (!Array.isArray(questions)) return true;
  for (const q of questions) {
    if (!isVisible(q)) continue;
    const ans = answers?.[String(q.id)];
    if (q?.isRequired && !isAnswerProvided(ans)) return false;
    // A half-typed date ("12/3") is "provided" but saves as a broken value —
    // a required DATE_PICKER needs a complete MM/DD/YYYY. `toMdY` first, since
    // an answer hydrated from `ins` can still be ISO.
    if (
      q?.isRequired &&
      normalizeQuestionType(q?.questionType) === "DATE_PICKER" &&
      !dateValid(toMdY(ans))
    ) {
      return false;
    }
    if (!checkImpacts || !isAnswerProvided(ans)) continue;

    // Required follow-up impacts hang off the selected option(s).
    const selectedIds = Array.isArray(ans)
      ? ans.map(String)
      : String(q?.questionType).toUpperCase() === "TEXTBOX"
        ? []
        : [String(ans)];
    for (const opt of q?.options || []) {
      if (!selectedIds.includes(String(opt.id))) continue;
      for (const imp of opt.impacts || []) {
        // Submission DTOs omit `collectFromUi`; treat only an explicit false
        // as "not collected here" so required impacts still gate.
        if (imp?.isRequired && imp?.collectFromUi !== false) {
          const v = impactAnswers?.[String(imp.id)];
          if (v == null || String(v).trim() === "") return false;
        }
      }
    }
  }
  return true;
}

/** Find a submission group by name regex (matches the master group). */
export function findSubmissionGroup(submissionGroups: any, regex: RegExp): any {
  if (!Array.isArray(submissionGroups)) return null;
  return submissionGroups.find((g: any) => regex.test(String(g?.groupName || ""))) || null;
}

/**
 * Hydrate answers + impacts directly from a submission-scoped group. Used
 * by pages (Coverage / Underwriting) that render questions straight from
 * the submission tree, so answers are keyed by the submission question id
 * (and the option id) — no master-to-submission re-mapping needed.
 *
 * Seeds `isDefault` options when the user has never answered a question.
 */
export function hydrateSubmissionAnswers(subGroup: any): {
  answers: Record<string, any>;
  impacts: Record<string, any>;
} {
  const answers: Record<string, any> = {};
  const impacts: Record<string, any> = {};
  if (!subGroup) return { answers, impacts };

  for (const q of subGroup.questions || []) {
    const qid = String(q.id);
    const qType = String(q.questionType || "").toUpperCase();
    const opts = Array.isArray(q.options) ? q.options : [];

    const answered = opts.filter(
      (o: any) => o?.answerValue != null && String(o.answerValue).trim() !== "",
    );

    if (answered.length > 0) {
      if (
        qType === "TEXTBOX" ||
        qType === "TEXT_AREA" ||
        qType === "NUMBER_INPUT" ||
        qType === "DATE_PICKER"
      ) {
        answers[qid] = String(answered[0].answerValue);
      } else if (qType === "CHECKBOX") {
        answers[qid] = answered.map((o: any) => String(o.id));
      } else {
        answers[qid] = String(answered[0].id);
      }
      for (const opt of answered) {
        for (const imp of opt.impacts || []) {
          if (imp?.answerValue != null && String(imp.answerValue).trim() !== "") {
            impacts[String(imp.id)] = String(imp.answerValue);
          }
        }
      }
      continue;
    }

    // No saved answer — seed the option flagged as default, if any.
    const def = opts.find((o: any) => o?.isDefault);
    if (!def) continue;
    if (qType === "CHECKBOX") answers[qid] = [String(def.id)];
    else if (
      qType !== "TEXTBOX" &&
      qType !== "TEXT_AREA" &&
      qType !== "NUMBER_INPUT" &&
      qType !== "DATE_PICKER"
    ) {
      answers[qid] = String(def.id);
    }
  }

  return { answers, impacts };
}

/**
 * Seed the server-flagged default option for MASTER-tree questions the user
 * has never answered. The master tree (`GET /questions?specialityId=`) carries
 * no saved answers, so `hydrateSubmissionAnswers`'s default branch never runs
 * for it — pages that render the master tree directly (PracticeDetailsPage)
 * need this to land a question's `isDefault` choice on first view.
 *
 * Keyed by the master question id / option id — the same id space
 * `questionsStore.questionAnswers` and `QuestionRenderer` use. Returns entries
 * ONLY for questions absent from `existingAnswers`, so the caller can spread it
 * UNDER the live map without clobbering an in-progress edit.
 */
export function seedMasterDefaultAnswers(
  group: any,
  existingAnswers: Record<string, any> = {},
): Record<string, any> {
  const seeded: Record<string, any> = {};
  for (const q of group?.questions || []) {
    const qid = String(q.id);
    if (isAnswerProvided(existingAnswers?.[qid])) continue;
    const def = (Array.isArray(q.options) ? q.options : []).find((o: any) => o?.isDefault);
    if (!def) continue;
    if (isFreeTextQuestionType(q.questionType)) {
      const val = String(def.optionValue ?? "").trim();
      if (val !== "") seeded[qid] = val;
    } else if (normalizeQuestionType(q.questionType) === "CHECKBOX") {
      seeded[qid] = [String(def.id)];
    } else {
      seeded[qid] = String(def.id);
    }
  }
  return seeded;
}

/**
 * In a submission-scoped single-select question (RADIO_BUTTON / YES_NO), the
 * chosen option is the one the API ships back carrying a non-empty
 * `answerValue`. Returns that option, or null when the question is unanswered.
 */
function selectedSubmissionOption(question: any): any {
  return (
    (question?.options || []).find(
      (o: any) => o?.answerValue != null && String(o.answerValue).trim() !== "",
    ) || null
  );
}

/**
 * PA classification ("PA1" / "PA2") read straight from the submission tree's
 * "About your practice" → "PA classification" answer (an option whose value
 * mentions "obstet" means PA2). Returns null when the group/question/answer
 * isn't present yet, so callers can fall back to wizard-store state.
 */
export function classificationFromSubmissionGroups(submissionGroups: any): string | null {
  const aboutGroup = findSubmissionGroup(submissionGroups, /about\s*your\s*practice/i);
  const q = (aboutGroup?.questions || []).find((qq: any) =>
    /pa\s*classification/i.test(String(qq?.questionText || "")),
  );
  const opt = selectedSubmissionOption(q);
  if (!opt) return null;
  return /obstet/i.test(String(opt.optionValue || opt.optionLabel || "")) ? "PA2" : "PA1";
}

/**
 * Whether any underwriting question was answered "Yes" — read from the
 * submission tree's "Underwriting" group answers. Returns null when the group
 * has no yes/no questions to evaluate (tree not loaded yet), so callers can
 * fall back to wizard-store state.
 */
export function underwritingAnyYesFromSubmissionGroups(submissionGroups: any): boolean | null {
  const group = findSubmissionGroup(submissionGroups, /underwriting/i);
  const questions = (group?.questions || []).filter((q: any) =>
    isYesNoQuestionType(q?.questionType),
  );
  if (questions.length === 0) return null;
  return questions.some((q: any) => {
    const opt = selectedSubmissionOption(q);
    return Boolean(opt) && isYesOption(opt);
  });
}

export function buildAboutGroupSavePayload(
  submissionId: Sid,
  submissionGroups: any,
  masterAboutGroup: any,
  answers: AnswerMap,
): any {
  if (!Array.isArray(submissionGroups) || !masterAboutGroup) return null;
  const norm = (s: any) =>
    String(s || "")
      .trim()
      .toLowerCase();
  const subGroup = submissionGroups.find((g: any) =>
    /about\s*your\s*practice/i.test(g?.groupName || ""),
  );
  if (!subGroup) return null;

  const questions: any[] = [];
  for (const masterQ of masterAboutGroup.questions || []) {
    const qid = String(masterQ.id);
    const ans = answers[qid];
    if (ans == null) continue;

    const subQ = (subGroup.questions || []).find(
      (sq: any) => norm(sq.questionText) === norm(masterQ.questionText),
    );
    if (!subQ) continue;

    const options: any[] = [];

    if (masterQ.questionType === "TEXTBOX") {
      const text = String(ans);
      if (text.trim() !== "") {
        const subOpt = (subQ.options || [])[0];
        if (subOpt) options.push({ submissionQuestionOptionId: subOpt.id, answerValue: text });
      }
    } else if (masterQ.questionType === "CHECKBOX") {
      const selectedIds = Array.isArray(ans) ? ans : [];
      for (const mid of selectedIds) {
        const masterOpt = (masterQ.options || []).find((o: any) => String(o.id) === String(mid));
        if (!masterOpt) continue;
        const subOpt = (subQ.options || []).find(
          (so: any) => norm(so.optionLabel) === norm(masterOpt.optionLabel),
        );
        if (subOpt) {
          options.push({
            submissionQuestionOptionId: subOpt.id,
            answerValue: String(masterOpt.optionValue ?? masterOpt.optionLabel ?? ""),
          });
        }
      }
    } else {
      const masterOpt = (masterQ.options || []).find((o: any) => String(o.id) === String(ans));
      if (masterOpt) {
        const subOpt = (subQ.options || []).find(
          (so: any) => norm(so.optionLabel) === norm(masterOpt.optionLabel),
        );
        if (subOpt) {
          options.push({
            submissionQuestionOptionId: subOpt.id,
            answerValue: answerValueForOption(masterQ, masterOpt),
          });
        }
      }
    }

    if (options.length > 0) {
      questions.push({ submissionQuestionId: subQ.id, options });
    }
  }

  if (questions.length === 0) return null;
  return {
    submissionId: Number(submissionId),
    groups: [{ submissionQuestionGroupId: subGroup.id, questions }],
  };
}
