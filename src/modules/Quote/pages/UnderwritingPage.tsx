import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { BRAND, RED, RED_BG } from "@/shared/constants";
import { QuoteStrip } from "@/modules/Quote/components/QuoteStrip";
import { QuestionRenderer } from "@/modules/Quote/components/QuestionRenderer";
import { AttachmentField } from "@/shared/components/AttachmentField";
import { Spacer } from "@/shared/components/Spacer";
import Alert from "@/shared/components/Alert";
import Loader from "@/shared/components/Loader";
import { btnPrimary, dis } from "@/shared/utils/styles";

import {
  buildUnderwritingGroupSavePayload,
  findSubmissionGroup,
  hydrateSubmissionAnswers,
  isQuestionVisible as isVisibilityQuestionVisible,
  isYesNoQuestionType,
  isYesOption,
  mergeAnswerMaps,
  recomputeHiddenQuestionIds,
  requiredQuestionsAnswered,
  saveSubmissionQuestionAnswers,
  sortedOptions,
  sortedQuestions,
} from "@/modules/Quote/api/questionsApi";
import { STEP_PATHS } from "@/modules/Quote/constants";
import { refreshPaymentOrder } from "@/modules/Payment/services/paymentOrderService";

import { useStore } from "@/shared/store/useStore";
import questionsStore from "@/modules/Quote/store/questionsStore";
import submissionStore from "@/modules/Quote/store/submissionStore";
import { useQuoteSnapshot } from "@/modules/Quote/utils/useQuoteSnapshot";

const LICENSING_QUESTION_RE = /licensing board|board of medical examiners/i;

/**
 * Step 5 (`/underwriting`) — the "Underwriting" group of the submission tree
 * (DPL Q23–Q34 + Remarks).
 *
 * Every Visibility-visible question renders in `displayOrder`: yes/no
 * questions with the red/brand buttons, everything else through the shared
 * `QuestionRenderer`. Follow-up "please explain" boxes are Show targets of
 * their own question's Yes (configured in `ins`), so they appear directly
 * under that question — Nursing instead showed every free-text box once ANY
 * Yes was picked, which would hide Q23 (hospital privileges) and Remarks
 * until a Yes was answered (plan F5).
 */
export default function UnderwritingPage() {
  const navigate = useNavigate();

  // ── Store-backed reads ─────────────────────────────────────────────────
  const submissionQuestionGroups = useStore(questionsStore, (s) => s.submissionQuestionGroups);
  const submissionQuestionsLoading = useStore(questionsStore, (s) => s.submissionQuestionsLoading);
  const underwritingAnswers = useStore(questionsStore, (s) => s.underwritingAnswers);
  const hiddenQuestionIds = useStore(questionsStore, (s) => s.hiddenQuestionIds);
  const impactAnswers = useStore(questionsStore, (s) => s.impactAnswers);
  const underwritingSaving = useStore(questionsStore, (s) => s.underwritingSaving);
  const underwritingSaveError = useStore(questionsStore, (s) => s.underwritingSaveError);
  const submissionQuestionsError = useStore(questionsStore, (s) => s.submissionQuestionsError);
  const flowSubmissionId = useStore(submissionStore, (s) => s.flowSubmissionId);

  // Derived (premium, snapshot, allAnswered) all from one hook.
  const {
    quoteStripAnnualTotal,
    snapshotLimits,
    snapshotPolicyLine,
    quoteStripAmountPending,
    allAnswered,
  } = useQuoteSnapshot();

  // The real submission-scoped question tree is fetched by the app-level
  // `useSubmissionQuestionsFetch` bootstrap hook. This page just reads the
  // store it seeds.
  const underwritingGroup = findSubmissionGroup(submissionQuestionGroups, /underwriting/i);
  const heading = "Underwriting";

  // ── Visibility (Hide/Show) recompute ──────────────────────────────────
  // Reads live state straight off the store so a call right after an answer
  // write in the same tick sees the new answer. Merges every answer map
  // submission-wide — Hide/Show rules can span groups on other pages.
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

  // Hydrate saved answers + defaults from the submission tree. Merges UNDER
  // current store values so in-progress edits aren't clobbered on re-render.
  useEffect(() => {
    if (!underwritingGroup) return;
    const { answers, impacts } = hydrateSubmissionAnswers(underwritingGroup);
    if (Object.keys(answers).length > 0) {
      questionsStore.underwritingAnswers = { ...answers, ...questionsStore.underwritingAnswers };
    }
    if (Object.keys(impacts).length > 0) {
      questionsStore.impactAnswers = { ...impacts, ...questionsStore.impactAnswers };
    }
    recomputeHidden();
  }, [underwritingGroup]);

  const allQuestions = sortedQuestions(underwritingGroup?.questions);
  const isVisible = (q: any) => isVisibilityQuestionVisible(q, hiddenQuestionIds);
  const visibleQuestions = allQuestions.filter(isVisible);
  const yesNoQuestions = visibleQuestions.filter((q) => isYesNoQuestionType(q?.questionType));
  // 1-based number shown in front of each yes/no question.
  const yesNoNumber = new Map<any, number>(yesNoQuestions.map((q, i) => [q.id, i + 1]));

  // `isYesOption` keys off `optionLabel`, not `optionValue`.
  const isYesAnswered = (q: any) => {
    const sel = underwritingAnswers[String(q.id)];
    if (sel == null) return false;
    const opt = (q.options || []).find((o: any) => String(o.id) === String(sel));
    return Boolean(opt) && isYesOption(opt);
  };
  const isAnyYesSelected = yesNoQuestions.some(isYesAnswered);
  // DPL Q29 (licensing board / DEA / agency matters) — a Yes asks for
  // "copies of complaint and disposition documents".
  const licensingQuestion = yesNoQuestions.find((q) =>
    LICENSING_QUESTION_RE.test(String(q?.questionText || "")),
  );
  const licensingYes = Boolean(licensingQuestion && isYesAnswered(licensingQuestion));
  const isOptionSelected = (q: any, optionId: any) =>
    String(underwritingAnswers[String(q.id)]) === String(optionId);

  // Continue gate: every visible yes/no question answered (`allAnswered`) AND
  // every visible required question satisfied. Hidden follow-ups never gate.
  const requiredAnswered = requiredQuestionsAnswered(allQuestions, underwritingAnswers, {
    isVisible,
  });
  const canContinue = allAnswered && requiredAnswered && !underwritingSaving;

  // ── Answer setters (write straight to questionsStore) ──────────────────
  // Only the choice-option setters recompute Visibility — a Hide/Show rule is
  // always configured against an option, never a free-text answer.
  const setRadio = (q: any, optionId: any) => {
    questionsStore.underwritingAnswers = {
      ...underwritingAnswers,
      [String(q.id)]: String(optionId),
    };
    recomputeHidden();
  };
  const toggleCheckbox = (q: any, optionId: any) => {
    const qid = String(q.id);
    const cur: string[] = Array.isArray(underwritingAnswers[qid]) ? underwritingAnswers[qid] : [];
    const id = String(optionId);
    const next = cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id];
    questionsStore.underwritingAnswers = { ...underwritingAnswers, [qid]: next };
    recomputeHidden();
  };
  const setText = (q: any, value: any) => {
    questionsStore.underwritingAnswers = {
      ...underwritingAnswers,
      [String(q.id)]: value,
    };
  };

  // ── Continue: save underwriting answers, then route to /reviewDocusign ──
  const handleContinue = async () => {
    if (underwritingSaving) return;
    if (!allAnswered || !requiredAnswered) return;
    if (!flowSubmissionId) {
      questionsStore.underwritingSaveError =
        "Your application was not opened. Go back to your practice details and try again.";
      return;
    }
    const payload = buildUnderwritingGroupSavePayload(
      flowSubmissionId,
      submissionQuestionGroups,
      underwritingAnswers,
      impactAnswers,
      hiddenQuestionIds,
    );
    if (!payload) {
      questionsStore.underwritingSaveError = "Could not build your answers. Please try again.";
      return;
    }

    questionsStore.underwritingSaveError = null;
    questionsStore.underwritingSaving = true;
    try {
      await saveSubmissionQuestionAnswers(payload);
      // Re-fetch the order so `questionRequired` reflects the just-saved state.
      // Use refreshPaymentOrder so loadedSubmissionId stays in sync with
      // usePolicyStatus (setting paymentOrderDetails alone left hasOrder false).
      const freshOrder = await refreshPaymentOrder(flowSubmissionId);
      if (freshOrder?.questionRequired === true) {
        questionsStore.underwritingSaveError =
          "Please answer all required questions before proceeding.";
        return;
      }
      submissionStore.step = 6;
      navigate(STEP_PATHS[6], { replace: true });
    } catch (err: any) {
      questionsStore.underwritingSaveError = err?.message || "Could not save underwriting answers.";
    } finally {
      questionsStore.underwritingSaving = false;
    }
  };

  const renderYesNo = (q: any) => {
    const qid = String(q.id);
    const opts = sortedOptions(q.options);
    const yesOpt = opts.find(isYesOption);
    const yesSelected = yesOpt && isOptionSelected(q, yesOpt.id);
    return (
      <div
        key={qid}
        style={{
          marginBottom: 8,
          padding: "10px 12px",
          background: yesSelected ? RED_BG : "#fafafa",
          borderRadius: 10,
          border: `1px solid ${yesSelected ? "#f0c0c0" : "transparent"}`,
          transition: "all 0.2s",
        }}
      >
        <div
          style={{
            fontSize: 12,
            fontWeight: 500,
            color: yesSelected ? RED : "#333",
            marginBottom: q.questionDescription ? 4 : 8,
          }}
        >
          <span style={{ color: "#595959", fontWeight: 500 }}>{yesNoNumber.get(q.id)}.</span>{" "}
          {q.questionText}
          {q.isRequired && <span style={{ color: RED, marginLeft: 4 }}>*</span>}
        </div>
        {q.questionDescription && (
          <div
            style={{
              fontSize: 11,
              color: "#595959",
              marginBottom: 8,
              lineHeight: 1.4,
              paddingLeft: 16,
            }}
          >
            {q.questionDescription}
          </div>
        )}
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {opts.map((o) => {
            const isYes = isYesOption(o);
            const sel = isOptionSelected(q, o.id);
            const desc = o.optionDescription || o.description || null;
            return (
              <div
                key={o.id}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "flex-start",
                  gap: 2,
                }}
              >
                <button
                  onClick={() => setRadio(q, o.id)}
                  style={{
                    padding: "6px 18px",
                    borderRadius: 6,
                    fontSize: 12,
                    fontWeight: 500,
                    cursor: "pointer",
                    fontFamily: "var(--font-body)",
                    border: "none",
                    background: sel ? (isYes ? RED : BRAND) : "#e8e8e6",
                    color: sel ? "#fff" : "#666",
                    transition: "all 0.15s",
                  }}
                >
                  {o.optionLabel}
                </button>
                {desc && (
                  <div
                    style={{
                      fontSize: 10,
                      color: "#595959",
                      lineHeight: 1.4,
                      paddingLeft: 2,
                      fontFamily: "var(--font-body)",
                    }}
                  >
                    {desc}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <>
      <QuoteStrip
        total={quoteStripAnnualTotal}
        limits={snapshotLimits}
        claims={snapshotPolicyLine}
        amountPending={quoteStripAmountPending}
        amountLabel="Your total"
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
        {heading}
      </h2>
      <p style={{ fontSize: 12, color: "#595959", marginBottom: 14, lineHeight: 1.5 }}>
        Answer every question. A &quot;Yes&quot; doesn&apos;t disqualify you — it means an
        underwriter reviews your application, and you&apos;ll be asked to explain it right below the
        question.
      </p>

      {submissionQuestionsLoading && visibleQuestions.length === 0 && (
        <Loader label="Loading questions…" />
      )}
      {submissionQuestionsError && (
        <Alert type="error">Couldn&apos;t load questions. {submissionQuestionsError.message}</Alert>
      )}

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
        {underwritingGroup?.groupName || "Underwriting questions"}
      </h3>

      {visibleQuestions.map((q) =>
        isYesNoQuestionType(q?.questionType) ? (
          renderYesNo(q)
        ) : (
          <QuestionRenderer
            key={q.id}
            question={q}
            answer={underwritingAnswers[String(q.id)]}
            onSetRadio={setRadio}
            onToggleCheckbox={toggleCheckbox}
            onSetText={setText}
          />
        ),
      )}

      {licensingYes && (
        <AttachmentField
          slot="licensingDocs"
          label="Copies of complaint and disposition documents"
          hint="Optional here — your underwriter will also request them."
        />
      )}

      <Spacer />
      <Alert type="error" message={underwritingSaveError} className="alert-center" />

      <button
        type="button"
        disabled={!canContinue}
        className="ui-btn-primary"
        style={dis(btnPrimary, canContinue)}
        onClick={handleContinue}
      >
        {underwritingSaving
          ? "Saving…"
          : isAnyYesSelected
            ? "Submit for review"
            : "See my final quote"}
      </button>
    </>
  );
}
