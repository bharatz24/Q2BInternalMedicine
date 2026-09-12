import { describe, expect, it } from "vitest";
import { buildSubmissionRequest } from "./submission";

// A minimal `/auth/quotedata` response shape — only the fields
// buildSubmissionRequest reads.
const ILF = {
  defaultIlfDlf: 10,
  defaultyear: 1,
  defaultSurgery: 5,
  defaultClaims: 0,
  defaultHoursWorkedName: "40",
  hoursWorkedList: [{ id: 3, hoursWorked: "40", factor: 1, default: true }],
  defaultParttimeFulltimeFactor: 3,
};

const base = {
  zip: "92653",
  effectiveDate: "01/01/2027",
  ilfDlfResponse: ILF,
  visitedQuestionGroups: [],
  questionGroupsWithIds: [],
  questionAnswers: {},
  impactAnswers: {},
  hiddenQuestionIds: new Set(),
};

describe("buildSubmissionRequest — coverage limit + retro date", () => {
  it("uses the quotedata default limit and omits retroDate when nothing was picked", () => {
    const req = buildSubmissionRequest({ ...base });
    expect(req.coverageilfdlfid).toBe(10);
    expect(req).not.toHaveProperty("retroDate");
    expect(req.zipcode).toBe("92653");
    expect(req.effectiveDate).toBe("01/01/2027");
  });

  it("uses the selected coverage limit id when the applicant picked one", () => {
    const req = buildSubmissionRequest({ ...base, coverageLimitId: 42 });
    expect(req.coverageilfdlfid).toBe(42);
  });

  it("falls back to the default limit for a zero / blank selection", () => {
    expect(buildSubmissionRequest({ ...base, coverageLimitId: 0 }).coverageilfdlfid).toBe(10);
    expect(buildSubmissionRequest({ ...base, coverageLimitId: "" }).coverageilfdlfid).toBe(10);
  });

  it("passes a custom retro date through, normalised to MM/dd/yyyy", () => {
    const req = buildSubmissionRequest({ ...base, retroDate: "12/15/2026" });
    expect(req.retroDate).toBe("12/15/2026");
  });

  it("omits retroDate for an incomplete date string", () => {
    const req = buildSubmissionRequest({ ...base, retroDate: "12/15" });
    expect(req).not.toHaveProperty("retroDate");
  });
});

// The master-tree "License, Scope & Practice" group that `/practice`
// answers and the submission-create call carries (plan F6).
const textOpt = (id) => [{ id, optionLabel: "", optionValue: "", impacts: [] }];
const PRACTICE_GROUP = {
  id: 7,
  groupName: "License, Scope & Practice",
  questions: [
    {
      id: 1,
      questionType: "YES_NO",
      options: [
        { id: 11, optionLabel: "Yes", optionValue: "Yes", impacts: [] },
        { id: 12, optionLabel: "No", optionValue: "No", impacts: [] },
      ],
    },
    { id: 2, questionType: "TEXT_AREA", options: textOpt(21) },
    { id: 3, questionType: "TEXTBOX", options: textOpt(31) },
    // Display-form type string, as some `ins` endpoints send it.
    { id: 4, questionType: "Number Input", options: textOpt(41) },
    {
      id: 5,
      questionType: "CHECKBOX",
      options: [
        { id: 51, optionLabel: "Colonoscopy", optionValue: "true", impacts: [] },
        { id: 52, optionLabel: "Laparoscopy", optionValue: "true", impacts: [] },
      ],
    },
  ],
};
const OTHER_GROUP = {
  id: 8,
  groupName: "Underwriting",
  questions: [{ id: 9, questionType: "TEXT_AREA", options: textOpt(91) }],
};

const withPractice = (overrides = {}) =>
  buildSubmissionRequest({
    ...base,
    visitedQuestionGroups: ["License, Scope & Practice"],
    questionGroupsWithIds: [PRACTICE_GROUP, OTHER_GROUP],
    questionAnswers: { 1: "12", 4: "45" },
    ...overrides,
  });

const answerFor = (req, questionId) =>
  req.questionSaveRequest.groups[0].questions.find((q) => q.submissionQuestionId === questionId);

describe("buildSubmissionRequest — practice group answers (F6)", () => {
  it("sends only the visited group", () => {
    const req = withPractice();
    expect(req.questionSaveRequest.groups).toHaveLength(1);
    expect(req.questionSaveRequest.groups[0].submissionQuestionGroupId).toBe(7);
  });

  it("sends a visible, blank free-text question as an empty answer", () => {
    const req = withPractice();
    expect(answerFor(req, 2).options).toEqual([
      { submissionQuestionOptionId: 21, answerValue: "", impacts: [] },
    ]);
    expect(answerFor(req, 3).options[0].answerValue).toBe("");
  });

  it("treats a display-form 'Number Input' type as free text", () => {
    expect(answerFor(withPractice(), 4).options[0].answerValue).toBe("45");
  });

  it("sends the label for a YES_NO answer", () => {
    expect(answerFor(withPractice(), 1).options[0]).toMatchObject({
      submissionQuestionOptionId: 12,
      answerValue: "No",
    });
  });

  it("sends each ticked checkbox option and skips an untouched checkbox question", () => {
    expect(answerFor(withPractice(), 5)).toBeUndefined();
    const ticked = withPractice({ questionAnswers: { 1: "11", 5: ["51", "52"] } });
    expect(answerFor(ticked, 5).options.map((o) => o.submissionQuestionOptionId)).toEqual([51, 52]);
  });

  it("drops hidden questions, blank or not", () => {
    const req = withPractice({ hiddenQuestionIds: new Set([2, 4]) });
    expect(answerFor(req, 2)).toBeUndefined();
    expect(answerFor(req, 4)).toBeUndefined();
  });
});
