import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { STEP_PATHS } from "@/modules/Quote/constants";
import { QuoteStrip } from "@/modules/Quote/components/QuoteStrip";
import { QuestionRenderer, isCompactQuestion } from "@/modules/Quote/components/QuestionRenderer";
import { Field } from "@/shared/components/Field";
import { TextInput } from "@/shared/components/TextInput";
import { SectionTitle } from "@/shared/components/SectionTitle";
import { Spacer } from "@/shared/components/Spacer";
import Alert from "@/shared/components/Alert";
import Loader from "@/shared/components/Loader";
import { btnPrimary, dis } from "@/shared/utils/styles";
import { DESIGNATIONS } from "@/modules/Quote/data/designations.js";
import {
  findSubmissionGroup,
  isQuestionVisible,
  recomputeHiddenQuestionIds,
  requiredQuestionsAnswered,
  seedMasterDefaultAnswers,
} from "@/modules/Quote/api/questionsApi";
import { useQuestionsAutoLoad } from "@/hooks/useQuestionsFetcher";

import { useStore } from "@/shared/store/useStore";
import practiceStore from "@/modules/Quote/store/practiceStore";
import submissionStore from "@/modules/Quote/store/submissionStore";
import questionsStore from "@/modules/Quote/store/questionsStore";
import specialityStore from "@/modules/Quote/store/specialityStore";
import { useQuoteSnapshot } from "@/modules/Quote/utils/useQuoteSnapshot";

const GROUP_RE = /license.*scope.*practice/i;
const EMPLOYER_GROUP_RE = /employer\s*information/i;
// DPL Q14 ("…average number of practice hours per week…") carries the
// `Hours Worked Factor` impact (plan decision D2), so editing it can move the
// premium once the submission is rated. Matches Nursing's "hours worked per
// week" wording too.
const HOURS_PER_WEEK_QUESTION_RE = /hours?\s*(worked\s*)?per\s*week/i;
const HOURS_PER_WEEK_RATE_NOTE =
  "Changing your average practice hours per week may change your rate.";
// DPL Q9 / Q10 percentage-of-practice questions. Both are Show targets of
// "Do you have a secondary specialty?" — when they are visible the two
// percentages must add up to 100.
const PRIMARY_PCT_RE = /primary\s*specialty.*percentage/i;
const SECONDARY_PCT_RE = /secondary\s*specialty.*percentage/i;

/**
 * Step 2 — practice details that affect the rate (§V of the paper form).
 *
 * Renders the real `ins` question-tree master group "License, Scope &
 * Practice" for the applicant's chosen speciality — replaces the old
 * hardcoded hours/moonlight/work-setting/scope fields, none of which fed the
 * real rating or submission calls anyway (`postIlfDlf`'s body is just
 * `{zipcode, effectiveDate, specialtiesMasterId}`; `hoursperweek`/
 * `parttimeFulltimeFactor` sent to `ins` are derived from the ILF/DLF
 * response itself, not from this page's fields) — so this rebuild carries no
 * pricing regression risk. Answers ride into the real submission-create call
 * via `buildSubmissionRequest`'s `questionSaveRequest`, same mechanism as
 * `Q2BNfy`'s `ClassificationPage`.
 *
 * Also carries the "Employer name" question — moved here from the deleted
 * `/credentials` step. No submission exists yet at this point in the wizard,
 * so there's no submission-scoped group to dual-write against; the value is
 * a plain field on `practiceStore` that rides into the real submission-create
 * call the same way the License/Scope/Practice answers below do (scoped via
 * `visitedQuestionGroups`), when the real "Employer Information" master group
 * resolves.
 */
export default function PracticeDetailsPage() {
  const navigate = useNavigate();

  const designation = useStore(practiceStore, (s) => s.designation);
  const currentDesignation = DESIGNATIONS.find((d) => d.code === designation) || null;
  const specialityRecord = useStore(specialityStore, () =>
    currentDesignation ? specialityStore.getSpeciality(currentDesignation.specialityCode) : null,
  );
  const specialityId = specialityRecord?.id ?? null;

  const { questions: questionGroups, loading, error } = useQuestionsAutoLoad(specialityId);
  const questionAnswers = useStore(questionsStore, (s) => s.questionAnswers);
  const masterHiddenQuestionIds = useStore(questionsStore, (s) => s.masterHiddenQuestionIds);
  const employerName = useStore(practiceStore, (s) => s.employerName);

  const { quoteStripAnnualTotal, snapshotLimits, snapshotPolicyLine, quoteStripAmountPending } =
    useQuoteSnapshot();

  const group = questionGroups.find((g) => GROUP_RE.test(String(g?.groupName || ""))) || null;
  const employerGroup = findSubmissionGroup(questionGroups, EMPLOYER_GROUP_RE);
  const employerQuestion = employerGroup?.questions?.[0] || null;

  useEffect(() => {
    if (group) questionsStore.markGroupVisited(group.groupName);
  }, [group]);

  useEffect(() => {
    if (employerGroup) questionsStore.markGroupVisited(employerGroup.groupName);
  }, [employerGroup]);

  const isVisible = (q: any) => isQuestionVisible(q, masterHiddenQuestionIds);

  const recomputeMasterHidden = () => {
    questionsStore.setMasterHiddenQuestionIds(
      recomputeHiddenQuestionIds(
        questionsStore.questionGroups,
        questionsStore.questionAnswers,
        questionsStore.masterShowTargetQuestionIds,
      ),
    );
  };

  // Seed each question's server-flagged default option for anything the user
  // hasn't answered yet. The master tree carries no saved answers, so without
  // this the "Average number of hours worked per week?" default never lands
  // (the submission-scoped pages get this for free via hydrateSubmissionAnswers).
  useEffect(() => {
    if (!group) return;
    const seeded = seedMasterDefaultAnswers(group, questionsStore.questionAnswers);
    if (Object.keys(seeded).length > 0) {
      questionsStore.questionAnswers = { ...seeded, ...questionsStore.questionAnswers };
      recomputeMasterHidden();
    }
  }, [group]);

  const setRadio = (q: any, optionId: any) => {
    questionsStore.questionAnswers = { ...questionAnswers, [String(q.id)]: String(optionId) };
    recomputeMasterHidden();
  };

  const toggleCheckbox = (q: any, optionId: any) => {
    const qid = String(q.id);
    const cur: string[] = Array.isArray(questionAnswers[qid]) ? questionAnswers[qid] : [];
    const has = cur.includes(String(optionId));
    const next = has ? cur.filter((x) => x !== String(optionId)) : [...cur, String(optionId)];
    questionsStore.questionAnswers = { ...questionAnswers, [qid]: next };
    recomputeMasterHidden();
  };

  const setText = (q: any, value: any) => {
    questionsStore.questionAnswers = { ...questionAnswers, [String(q.id)]: value };
  };

  // Percentage split (DPL Q9 + Q10). Only enforced while both questions are
  // visible, i.e. the applicant said they have a secondary specialty.
  const findQuestion = (re: RegExp) =>
    (group?.questions || []).find((q: any) => re.test(String(q?.questionText || ""))) || null;
  const primaryPctQ = findQuestion(PRIMARY_PCT_RE);
  const secondaryPctQ = findQuestion(SECONDARY_PCT_RE);
  const splitShown = Boolean(
    primaryPctQ && secondaryPctQ && isVisible(primaryPctQ) && isVisible(secondaryPctQ),
  );
  const primaryPctRaw = splitShown ? String(questionAnswers[String(primaryPctQ.id)] ?? "") : "";
  const secondaryPctRaw = splitShown ? String(questionAnswers[String(secondaryPctQ.id)] ?? "") : "";
  const bothPctEntered = primaryPctRaw.trim() !== "" && secondaryPctRaw.trim() !== "";
  const pctSum = Number(primaryPctRaw) + Number(secondaryPctRaw);
  const pctSumOk = !splitShown || (bothPctEntered && pctSum === 100);
  const pctSumError =
    splitShown && bothPctEntered && pctSum !== 100
      ? `Primary and secondary specialty percentages must add up to 100 (currently ${pctSum}).`
      : null;

  // No Employer Information group in the Internal Medicine tree (the DPL
  // application has no employer), so the employer name is only required when
  // a tree actually carries that group.
  const canContinue =
    (!employerGroup || employerName.trim() !== "") &&
    pctSumOk &&
    requiredQuestionsAnswered(group?.questions, questionAnswers, {
      isVisible,
    });

  const handleContinue = () => {
    if (!canContinue) return;
    submissionStore.step = 3;
    navigate(STEP_PATHS[3]);
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
        {group?.groupName || "Your practice & hours"}
      </h2>
      <p style={{ fontSize: 12, color: "#595959", marginBottom: 14, lineHeight: 1.5 }}>
        Tell us about your license, scope and where you practice.
      </p>

      {loading && <Loader label="Loading questions…" />}
      {error && <Alert type="error">Couldn&apos;t load questions. {error.message}</Alert>}

      {/* Two-column form grid — this group runs to ~30 questions, so the
          short-answer ones (the two specialty percentages, the weekly
          patient count, the follow-up text boxes) pair up instead of each
          taking a row of its own. `.q-grid` (styles/ui.css) drops back to
          one column in the phone-width form column. */}
      <div className="q-grid">
        {group?.questions?.filter(isVisible)?.map((q: any) => (
          <div key={q.id} className={isCompactQuestion(q) ? undefined : "q-grid-item--full"}>
            <QuestionRenderer
              question={q}
              answer={questionAnswers[String(q.id)]}
              onSetRadio={setRadio}
              onToggleCheckbox={toggleCheckbox}
              onSetText={setText}
              note={
                HOURS_PER_WEEK_QUESTION_RE.test(String(q.questionText || ""))
                  ? HOURS_PER_WEEK_RATE_NOTE
                  : undefined
              }
            />
          </div>
        ))}
      </div>

      <Alert type="error" message={pctSumError} />

      {employerGroup && (
        <>
          <SectionTitle>Employer</SectionTitle>
          <Field label="Employer name" required>
            <TextInput
              value={employerName}
              onChange={(v) => {
                practiceStore.employerName = v;
                if (employerQuestion) {
                  questionsStore.questionAnswers = {
                    ...questionAnswers,
                    [String(employerQuestion.id)]: v,
                  };
                }
              }}
              placeholder="e.g. Mission Hospital"
            />
          </Field>
        </>
      )}

      <Spacer />
      <button
        type="button"
        disabled={!canContinue}
        className="ui-btn-primary"
        style={dis(btnPrimary, canContinue)}
        onClick={handleContinue}
      >
        Continue
      </button>
    </>
  );
}
