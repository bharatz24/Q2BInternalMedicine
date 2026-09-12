import { useEffect } from "react";
import { useLocation } from "react-router-dom";

import questionsStore from "@/modules/Quote/store/questionsStore";

/**
 * Landing on `/quote` (the soft-quote step) wipes every transient answer map
 * and the visited-groups list, so a re-entry into the wizard starts clean.
 *
 * Was effect 3 of the old monolithic `useAppBootstrap`.
 */
export function useAnswerResetOnQuoteLanding(): void {
  const { pathname } = useLocation();

  useEffect(() => {
    if (pathname !== "/quote") return;
    questionsStore.questionAnswers = {};
    questionsStore.coverageAnswers = {};
    questionsStore.impactAnswers = {};
    questionsStore.underwritingAnswers = {};
    questionsStore.employerAnswers = {};
    questionsStore.previousInsuranceAnswers = {};
    questionsStore.claimsAnswers = {};
    questionsStore.visitedQuestionGroups = [];
  }, [pathname]);
}
