import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";

import {
  fetchSubmissionQuestions,
  applySubmissionQuestionGroups,
  hasUsableSubmissionQuestionCache,
  isSubmissionQuestionTreeAugmented,
} from "@/modules/Quote/api/questionsApi";
import { toError } from "@/shared/utils/misc";
import { queryKeys } from "@/shared/query/keys";
import { useStore } from "@/shared/store/useStore";
import sessionStore from "@/shared/store/sessionStore";
import submissionStore from "@/modules/Quote/store/submissionStore";
import questionsStore from "@/modules/Quote/store/questionsStore";

// The submission question tree is needed on the wizard pages that render it
// *and* on /payment + /reviewDocusign, where `useQuoteSnapshot` walks the
// tree for referral detection. Other routes must not trigger the fetch.
const SUBMISSION_QUESTIONS_PATHS = new Set([
  "/previous-insurance",
  "/underwriting",
  "/reviewDocusign",
  "/payment",
]);

/**
 * The **single** fetch path for the submission-scoped underwriting question
 * tree — replaces the three hand-rolled copies (this hook's old body,
 * `PaymentPage`'s mount effect, `ensureUnderwritingQuestions`).
 *
 * react-query (`queryKeys.questions.submission(sid)`) owns dedup, retry and
 * caching; `questionsStore` stays the **working copy** (augmented tree +
 * answer maps + Hide/Show sets). This hook seeds the store from the raw
 * response once per sid and mirrors the fetch status onto the
 * `submissionQuestions{Loading,Error}` flags the pages still read.
 *
 * `staleTime: Infinity` — the client never refetches after a
 * `/questions/save`; a submission switch / resume drops the cache explicitly
 * (`resetSubmissionQuestionState` call sites also call
 * `queryClient.removeQueries({ queryKey: ["questions"] })`).
 *
 * Was effect 4 of the old monolithic `useAppBootstrap`.
 */
export function useSubmissionQuestionsFetch(): void {
  const { pathname } = useLocation();
  const flowSubmissionId = useStore(submissionStore, (s) => s.flowSubmissionId);
  const sessionReady = useStore(sessionStore, (s) => s.sessionReady);

  const sidNum = Number(flowSubmissionId);
  const validSid = flowSubmissionId != null && Number.isFinite(sidNum) && sidNum > 0;
  const sid = String(flowSubmissionId);
  const wantsQuestions = sessionReady && validSid && SUBMISSION_QUESTIONS_PATHS.has(pathname);

  const query = useQuery({
    queryKey: queryKeys.questions.submission(validSid ? sid : "none"),
    queryFn: ({ signal }) => fetchSubmissionQuestions(sid, { signal }),
    enabled: wantsQuestions,
    staleTime: Infinity,
  });

  useEffect(() => {
    questionsStore.submissionQuestionsLoading = wantsQuestions && query.isFetching;
  }, [wantsQuestions, query.isFetching]);

  useEffect(() => {
    questionsStore.submissionQuestionsError = query.error ? toError(query.error) : null;
  }, [query.error]);

  // Seed / re-augment the store's working tree from the raw response.
  useEffect(() => {
    if (!validSid || !query.data) return;
    const cached = questionsStore.submissionQuestionGroups;
    const cacheOk = hasUsableSubmissionQuestionCache(
      cached,
      questionsStore.submissionQuestionsSid,
      sid,
    );
    // Store already holds a current, augmented tree for this sid — leave it
    // (it may carry answers merged since the fetch).
    if (cacheOk && isSubmissionQuestionTreeAugmented(cached)) return;
    // A usable-but-unaugmented store tree (e.g. an older writer) gets
    // re-augmented in place; otherwise seed from the raw response.
    const source = cacheOk && !isSubmissionQuestionTreeAugmented(cached) ? cached : query.data;
    applySubmissionQuestionGroups(source, sid, questionsStore);
  }, [validSid, sid, query.data]);
}
