import { useEffect, useRef } from "react";
import {
  fetchQuestionsBySpeciality,
  recomputeHiddenQuestionIds,
  resolveMasterVisibilityTargets,
} from "@/modules/Quote/api/questionsApi";
import questionsStore from "@/modules/Quote/store/questionsStore";
import { useStore } from "@/shared/store/useStore";

/**
 * Auto-load the master question tree for a speciality (idempotent across
 * mounts). Reads + writes from/to questionsStore — the cache marker
 * `questionGroupsSpecId` is what lets us short-circuit a duplicate fetch.
 * Ported verbatim from Q2BNfy.
 *
 * Returns `{ questions, loading, error }`.
 */
export function useQuestionsAutoLoad(specialityId: string | number | null | undefined) {
  const questions = useStore(
    questionsStore,
    (s) => s.getQuestionGroupsBySpec(specialityId ?? "") ?? EMPTY_ARRAY,
  );
  const loading = useStore(questionsStore, (s) => s.questionsLoading);
  const error = useStore(questionsStore, (s) => s.questionsError);
  // Which spec the cached tree currently belongs to. `questionsStore.clear()`
  // resets both this marker and the tree, so depending on it re-runs the
  // fetch effect the moment the cache is dropped — even if this component
  // happened to stay mounted across the reset.
  const cachedSpecId = useStore(questionsStore, (s) => s.questionGroupsSpecId);

  // Monotonic run token: only the newest fetch is allowed to touch the store.
  // `questionsLoading` is a GLOBAL flag, so it must never be stranded `true`
  // by a superseded run. With a run token the latest run always reaches its
  // `.finally` and clears loading (no AbortController needed —
  // fetchQuestionsBySpeciality ignores the signal anyway).
  const runRef = useRef(0);

  useEffect(() => {
    if (!specialityId) return undefined;
    if (questionsStore.getQuestionGroupsBySpec(specialityId)) {
      // Tree already cached for this spec. Clear any loading flag left over
      // from an interrupted fetch on a prior page so the loader can't strand.
      if (questionsStore.questionsLoading) questionsStore.questionsLoading = false;
      return undefined;
    }
    const myRun = ++runRef.current;
    const isCurrent = () => myRun === runRef.current;

    questionsStore.questionsLoading = true;
    questionsStore.questionsError = null;
    fetchQuestionsBySpeciality(specialityId)
      .then((data) => {
        if (!isCurrent()) return;
        // Master-tree Visibility/Display-Order resolution (choke-point). Same
        // three-step order as the submission tree: augment first (the cached
        // tree is the augmented one), seed the show-target set, then compute +
        // commit the initial hidden set via setMasterHiddenQuestionIds so FR4
        // applies on first load. Only one answer map here → no merge step.
        const { groups, showTargetQuestionIds } = resolveMasterVisibilityTargets(
          Array.isArray(data) ? data : [],
        );
        questionsStore.setQuestionGroupsForSpec(specialityId, groups);
        questionsStore.masterShowTargetQuestionIds = showTargetQuestionIds;
        questionsStore.setMasterHiddenQuestionIds(
          recomputeHiddenQuestionIds(groups, questionsStore.questionAnswers, showTargetQuestionIds),
        );
      })
      .catch((e: any) => {
        if (!isCurrent() || e?.name === "AbortError") return;
        questionsStore.questionsError = e;
      })
      .finally(() => {
        if (isCurrent()) questionsStore.questionsLoading = false;
      });
    // No cleanup abort: a later run just bumps `runRef`, which supersedes this
    // one. The winning run still settles and resets loading either way.
    return undefined;
  }, [specialityId, cachedSpecId]);

  return { questions, loading, error };
}

const EMPTY_ARRAY: any[] = [];
