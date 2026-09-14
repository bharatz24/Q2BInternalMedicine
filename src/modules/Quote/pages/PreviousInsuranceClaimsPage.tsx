import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { QuoteStrip } from "@/modules/Quote/components/QuoteStrip";
import { QuestionRenderer, isCompactQuestion } from "@/modules/Quote/components/QuestionRenderer";
import { Spacer } from "@/shared/components/Spacer";
import Alert from "@/shared/components/Alert";
import Loader from "@/shared/components/Loader";
import { btnPrimary, dis } from "@/shared/utils/styles";

import {
  buildFullGroupSavePayload,
  findSubmissionGroup,
  hydrateSubmissionAnswers,
  isQuestionVisible as isVisibilityQuestionVisible,
  mergeAnswerMaps,
  recomputeHiddenQuestionIds,
  normalizeQuestionType,
  requiredQuestionsAnswered,
  saveSubmissionQuestionAnswers,
  sortedQuestions,
} from "@/modules/Quote/api/questionsApi";
import { STEP_PATHS } from "@/modules/Quote/constants";
import { refreshPaymentOrder } from "@/modules/Payment/services/paymentOrderService";

import { useStore } from "@/shared/store/useStore";
import questionsStore from "@/modules/Quote/store/questionsStore";
import submissionStore from "@/modules/Quote/store/submissionStore";
import sessionStore from "@/shared/store/sessionStore";
import { useQuoteSnapshot } from "@/modules/Quote/utils/useQuoteSnapshot";

const PREVIOUS_INSURANCE_GROUP_RE = /previous\s*insurance/i;
const CLAIMS_GROUP_RE = /claims\s*information/i;

// Previous Insurance's carrier / limits / premium TEXTBOXes are short named
// values — they pair in `.q-grid` the same way counts and dates do on
// /practice. Claims' TEXT_AREA explain boxes stay full-row.
function isPageCompact(question: any): boolean {
  if (isCompactQuestion(question)) return true;
  return normalizeQuestionType(question?.questionType) === "TEXTBOX";
}

/**
 * Step 4 (`/previous-insurance`) — Previous Insurance and Claims Information
 * (for the past 10 years). Split out of `UnderwritingPage.jsx` onto its own
 * page so those two real submission-tree groups ("Previous Insurance" /
 * "Claims Information") aren't lumped in with the Underwriting yes/no gate
 * questions. Continue advances straight to `/underwriting` (step 5).
 *
 * Same submission-scoped tree-driven pattern as `UnderwritingPage.jsx` —
 * groups resolved by name regex off
 * `submissionQuestionGroups`, hydrated from saved answers, saved via
 * `buildSingleGroupSavePayload` on Continue. Visibility (Hide/Show) still
 * recomputes against every answer map submission-wide, since a rule here
 * could target a question on another page (e.g. Underwriting).
 */
export default function PreviousInsuranceClaimsPage() {
  const navigate = useNavigate();

  const submissionQuestionGroups = useStore(questionsStore, (s) => s.submissionQuestionGroups);
  const submissionQuestionsLoading = useStore(questionsStore, (s) => s.submissionQuestionsLoading);
  const submissionQuestionsError = useStore(questionsStore, (s) => s.submissionQuestionsError);
  const previousInsuranceAnswers = useStore(questionsStore, (s) => s.previousInsuranceAnswers);
  const claimsAnswers = useStore(questionsStore, (s) => s.claimsAnswers);
  const hiddenQuestionIds = useStore(questionsStore, (s) => s.hiddenQuestionIds);
  const flowSubmissionId = useStore(submissionStore, (s) => s.flowSubmissionId);

  const { quoteStripAnnualTotal, snapshotLimits, snapshotPolicyLine, quoteStripAmountPending } =
    useQuoteSnapshot();

  const previousInsuranceGroup = findSubmissionGroup(
    submissionQuestionGroups,
    PREVIOUS_INSURANCE_GROUP_RE,
  );
  const claimsGroup = findSubmissionGroup(submissionQuestionGroups, CLAIMS_GROUP_RE);

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);

  // ── Browser Back → dashboard ──────────────────────────────────────────
  // Both the register and underwriting steps PUSH /previous-insurance onto
  // the history stack, so the native browser Back button would otherwise
  // return to whichever page the user came from. Per spec, Back from this
  // step (submission already created) must ALWAYS land on the dashboard —
  // matching the in-app back arrow (FlowLayout goBack, step 4). The in-app
  // arrow already does this; this handles the browser/hardware Back button
  // too. We seed one sentinel history entry on mount; the first Back press
  // pops it (the URL is still /previous-insurance, so React Router doesn't
  // change routes) and this popstate handler redirects to the dashboard,
  // keeping flowSubmissionId so the order stays resumable.
  useEffect(() => {
    window.history.pushState(null, "", window.location.href);
    const onPopState = () => {
      sessionStore.dashView = "dashboard";
      navigate("/dashboard", { replace: true });
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [navigate]);

  // Visibility (Hide/Show) recompute — submission-wide, same as Coverage/
  // Underwriting, since a rule can target a question on another page.
  const recomputeHidden = () => {
    const liveAnswers = mergeAnswerMaps(
      questionsStore.questionAnswers,
      questionsStore.coverageAnswers,
      questionsStore.underwritingAnswers,
      questionsStore.employerAnswers,
      questionsStore.previousInsuranceAnswers,
      questionsStore.claimsAnswers,
    );
    questionsStore.setHiddenQuestionIds(
      recomputeHiddenQuestionIds(
        questionsStore.submissionQuestionGroups,
        liveAnswers,
        questionsStore.showTargetQuestionIds,
      ),
    );
  };

  // Hydrate saved answers from the submission tree. Merges UNDER current
  // store values so in-progress edits aren't clobbered on re-render.
  useEffect(() => {
    if (!previousInsuranceGroup) return;
    const { answers } = hydrateSubmissionAnswers(previousInsuranceGroup);
    if (Object.keys(answers).length > 0) {
      questionsStore.previousInsuranceAnswers = {
        ...answers,
        ...questionsStore.previousInsuranceAnswers,
      };
      recomputeHidden();
    }
  }, [previousInsuranceGroup]);

  useEffect(() => {
    if (!claimsGroup) return;
    const { answers } = hydrateSubmissionAnswers(claimsGroup);
    if (Object.keys(answers).length > 0) {
      questionsStore.claimsAnswers = { ...answers, ...questionsStore.claimsAnswers };
      recomputeHidden();
    }
  }, [claimsGroup]);

  const isTreeVisible = (q: any) => isVisibilityQuestionVisible(q, hiddenQuestionIds);

  // Previous Insurance is all optional TEXTBOX fields — no radio/checkbox.
  const setPreviousInsuranceText = (q: any, value: any) => {
    questionsStore.previousInsuranceAnswers = {
      ...previousInsuranceAnswers,
      [String(q.id)]: value,
    };
  };

  const setClaimsRadio = (q: any, optionId: any) => {
    questionsStore.claimsAnswers = { ...claimsAnswers, [String(q.id)]: String(optionId) };
    recomputeHidden();
  };
  const setClaimsText = (q: any, value: any) => {
    questionsStore.claimsAnswers = { ...claimsAnswers, [String(q.id)]: value };
  };

  const requiredAnswered =
    requiredQuestionsAnswered(previousInsuranceGroup?.questions, previousInsuranceAnswers, {
      isVisible: isTreeVisible,
    }) &&
    requiredQuestionsAnswered(claimsGroup?.questions, claimsAnswers, { isVisible: isTreeVisible });
  const canContinue = requiredAnswered && !saving;

  const handleContinue = async () => {
    if (!canContinue) return;
    if (!flowSubmissionId) {
      submissionStore.step = 5;
      navigate(STEP_PATHS[5], { replace: true });
      return;
    }

    setSaving(true);
    setSaveError(null);
    try {
      // Both groups always go in the payload — every visible question in each,
      // answered or blank (`buildFullGroupSavePayload`). The two groups can't
      // be saved separately: the backend enforces group save order (rejects a
      // later group if an earlier one, by `order`, isn't saved in the same
      // request/txn yet), so an unanswered "Previous Insurance" would
      // otherwise be dropped and make the "Claims Information" save fail.
      const previousInsurancePayload = buildFullGroupSavePayload(
        PREVIOUS_INSURANCE_GROUP_RE,
        flowSubmissionId,
        submissionQuestionGroups,
        previousInsuranceAnswers,
        {},
        hiddenQuestionIds,
      );
      const claimsPayload = buildFullGroupSavePayload(
        CLAIMS_GROUP_RE,
        flowSubmissionId,
        submissionQuestionGroups,
        claimsAnswers,
        {},
        hiddenQuestionIds,
      );
      const groups = [
        ...(previousInsurancePayload?.groups || []),
        ...(claimsPayload?.groups || []),
      ];
      if (groups.length > 0) {
        await saveSubmissionQuestionAnswers({ submissionId: Number(flowSubmissionId), groups });
      }
      await refreshPaymentOrder(flowSubmissionId);
      submissionStore.step = 5;
      navigate(STEP_PATHS[5], { replace: true });
    } catch (err: any) {
      setSaveError(err?.message || "Could not save your answers.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <QuoteStrip
        total={quoteStripAnnualTotal}
        limits={snapshotLimits}
        claims={snapshotPolicyLine}
        amountPending={quoteStripAmountPending}
        amountSuffix="/yr"
      />
      <h2
        className="ui-heading"
        style={{
          fontFamily: "var(--font-heading)",
          fontSize: 19,
          fontWeight: 600,
          color: "#1a1a1a",
          margin: "6px 0 4px",
        }}
      >
        Previous Insurance and Claims Information
      </h2>
      <p style={{ fontSize: 12, color: "#595959", marginBottom: 14, lineHeight: 1.5 }}>
        For the past 10 years — tell us about your prior coverage and any claims history.
      </p>

      {submissionQuestionsLoading && !previousInsuranceGroup && !claimsGroup && (
        <Loader label="Loading questions…" />
      )}
      {submissionQuestionsError && (
        <Alert type="error">Couldn&apos;t load questions. {submissionQuestionsError.message}</Alert>
      )}

      {previousInsuranceGroup && (
        <>
          <h3
            className="ui-heading"
            style={{
              fontFamily: "var(--font-heading)",
              fontSize: 15,
              fontWeight: 600,
              color: "#1a1a1a",
              margin: "4px 0 8px",
            }}
          >
            {previousInsuranceGroup.groupName}
          </h3>
          {/* Same `.q-grid` as /practice — short TEXTBOXes pair, Yes/No and
              explain TEXT_AREAs span the row. */}
          <div className="q-grid">
            {sortedQuestions(previousInsuranceGroup.questions)
              .filter(isTreeVisible)
              .map((q) => (
                <div key={q.id} className={isPageCompact(q) ? undefined : "q-grid-item--full"}>
                  <QuestionRenderer
                    question={q}
                    answer={previousInsuranceAnswers[String(q.id)]}
                    onSetRadio={() => {}}
                    onToggleCheckbox={() => {}}
                    onSetText={setPreviousInsuranceText}
                  />
                </div>
              ))}
          </div>
        </>
      )}

      {claimsGroup && (
        <>
          <h3
            className="ui-heading"
            style={{
              fontFamily: "var(--font-heading)",
              fontSize: 15,
              fontWeight: 600,
              color: "#1a1a1a",
              margin: "4px 0 8px",
            }}
          >
            {claimsGroup.groupName}
          </h3>
          <div className="q-grid">
            {sortedQuestions(claimsGroup.questions)
              .filter(isTreeVisible)
              .map((q) => (
                <div key={q.id} className={isPageCompact(q) ? undefined : "q-grid-item--full"}>
                  <QuestionRenderer
                    question={q}
                    answer={claimsAnswers[String(q.id)]}
                    onSetRadio={setClaimsRadio}
                    onToggleCheckbox={() => {}}
                    onSetText={setClaimsText}
                  />
                </div>
              ))}
          </div>
        </>
      )}

      <Spacer />
      <Alert type="error" message={saveError} className="alert-center" />

      <button
        type="button"
        disabled={!canContinue}
        className="ui-btn-primary"
        style={dis(btnPrimary, canContinue)}
        onClick={handleContinue}
      >
        {saving ? "Saving…" : "Continue"}
      </button>
    </>
  );
}
