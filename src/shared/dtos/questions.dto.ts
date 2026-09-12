// Derived from weborder.json (OpenAPI). Now hand-maintained (no generator in
// this repo). Domain: questions. Each class copies fields from an untyped API
// response (`raw`) with safe defaults; `declare` lines are type-only.
//
// HAND-PATCHED for Question Visibility & Display Order:
//   SubmissionQuestionGroupResponseDto.displayOrder
//   SubmissionQuestionResponseDto.{questionId, displayOrder, isHidden}
//   SubmissionQuestionOptionResponseDto.{hideQuestions, showQuestions}
//   SpecialityQuestionOptionDto.{hideQuestions, showQuestions}
// These fields exist on the `ins` backend responses but were added after the
// local `weborder.json` snapshot used to generate this file, so they are not
// reproducible by a regen run against that snapshot. Re-diff this file against
// a fresh `scripts/gen-dtos.py` run once the spec is regenerated from a live
// server — at that point these hand-patches should become redundant.

/**
 * Active rule group (rule_groups_master) for a speciality: group name plus
 * nested active rules, options, and UI-collected outputs.
 */
export class SpecialityQuestionGroupDto {
  declare id: number;
  declare groupName: string;
  declare questions: SpecialityQuestionRuleDto[];
  constructor(raw: Record<string, any> = {}) {
    this.id = raw.id ?? 0; // Group id (rule_groups_master.id).
    this.groupName = raw.groupName ?? ""; // Group display name from question_group.
    this.questions = Array.isArray(raw.questions)
      ? raw.questions.map((x) => new SpecialityQuestionRuleDto(x))
      : [];
  }
}

/**
 * Active rule (rules_master) under a group.
 */
export class SpecialityQuestionRuleDto {
  declare id: number;
  declare questionText: string;
  declare questionDescription: string;
  declare questionType: string;
  declare isRequired: boolean;
  declare options: SpecialityQuestionOptionDto[];
  constructor(raw: Record<string, any> = {}) {
    this.id = raw.id ?? 0; // Rule master id.
    this.questionText = raw.questionText ?? ""; // Question text.
    this.questionDescription = raw.questionDescription ?? ""; // Optional short helper text shown with the question (max 255 characters).
    this.questionType = raw.questionType ?? ""; // Input control type (matches QuestionsInputType).
    this.isRequired = raw.isRequired ?? false; // Whether an answer is required.
    this.options = Array.isArray(raw.options)
      ? raw.options.map((x) => new SpecialityQuestionOptionDto(x))
      : [];
  }
}

/**
 * Active choice for a rule (rule_option).
 */
export class SpecialityQuestionOptionDto {
  declare id: number;
  declare optionLabel: string;
  declare optionValue: string;
  declare optionDescription: string;
  declare displayOrder: number;
  declare isDefault: boolean;
  declare impacts: SpecialityQuestionOutputDto[];
  declare hideQuestions: string[];
  declare showQuestions: string[];
  constructor(raw: Record<string, any> = {}) {
    this.id = raw.id ?? 0; // Option id.
    this.optionLabel = raw.optionLabel ?? ""; // Display label.
    this.optionValue = raw.optionValue ?? ""; // Stored value when selected.
    this.optionDescription = raw.optionDescription ?? ""; // Optional helper text shown under the option (max 255 chars).
    this.displayOrder = raw.displayOrder ?? 0; // Display order among options.
    this.isDefault = raw.isDefault ?? false; // Whether this option is the default.
    this.impacts = Array.isArray(raw.impacts)
      ? raw.impacts.map((x) => new SpecialityQuestionOutputDto(x))
      : [];
    this.hideQuestions = Array.isArray(raw.hideQuestions) ? raw.hideQuestions.map(String) : []; // Master question ids this option's selection hides. Same id space as SpecialityQuestionRuleDto.id.
    this.showQuestions = Array.isArray(raw.showQuestions) ? raw.showQuestions.map(String) : []; // Master question ids this option's selection shows; targets start hidden by default.
  }
}

/**
 * Rule output row collected from the UI for this option (isCollectFromUi =
 * true).
 */
export class SpecialityQuestionOutputDto {
  declare id: number;
  declare impactType: string;
  declare isRequired: boolean;
  constructor(raw: Record<string, any> = {}) {
    this.id = raw.id ?? 0; // Rule output master id.
    this.impactType = raw.impactType ?? ""; // Impact type (matches QuestionAnswerImpact).
    this.isRequired = raw.isRequired ?? false; // When true, a follow-up answer is required when this option is selected.
  }
}

/**
 * Question group for a speciality with nested questions (lookup rows).
 */
export class QuestionGroupDto {
  declare id: number;
  declare groupName: string;
  declare uniquekey: string;
  declare isActive: boolean;
  declare questions: QuestionDto[];
  constructor(raw: Record<string, any> = {}) {
    this.id = raw.id ?? 0; // Question group id.
    this.groupName = raw.groupName ?? ""; // Group display name.
    this.uniquekey = raw.uniquekey ?? ""; // Stable key for the group, if configured.
    this.isActive = raw.isActive ?? false; // Whether the group is active.
    this.questions = Array.isArray(raw.questions)
      ? raw.questions.map((x) => new QuestionDto(x))
      : [];
  }
}

/**
 * A single rule (question field) under a rule group.
 */
export class QuestionDto {
  declare id: number;
  declare questionText: string;
  declare questionDescription: string;
  declare active: boolean;
  declare required: boolean;
  declare questionType: string;
  declare options: QuestionOptionDto[];
  declare answerValue: string;
  declare answerOptionId: number;
  constructor(raw: Record<string, any> = {}) {
    this.id = raw.id ?? 0; // Rule master id.
    this.questionText = raw.questionText ?? ""; // Question text / field label.
    this.questionDescription = raw.questionDescription ?? ""; // Optional short helper text shown with the question (max 255 characters).
    this.active = raw.active ?? false; // Whether the rule is active.
    this.required = raw.required ?? false; // Whether an answer is required.
    this.questionType = raw.questionType ?? ""; // Input control type (matches QuestionsInputType).
    this.options = Array.isArray(raw.options)
      ? raw.options.map((x) => new QuestionOptionDto(x))
      : [];
    this.answerValue = raw.answerValue ?? ""; // When **`submissionId`** was provided on GET, the saved main answer for this rule (same as ...
    this.answerOptionId = raw.answerOptionId ?? 0; // When **`submissionId`** was provided on GET, the saved `rule_option.id` selection, if any.
  }
}

/**
 * Selectable choice for a rule (dropdown, radio, etc.).
 */
export class QuestionOptionDto {
  declare id: number;
  declare optionLabel: string;
  declare optionValue: string;
  declare optionDescription: string;
  declare displayOrder: number;
  declare defaultOption: boolean;
  declare active: boolean;
  declare impacts: QuestionOptionImpactDto[];
  constructor(raw: Record<string, any> = {}) {
    this.id = raw.id ?? 0; // Option row id.
    this.optionLabel = raw.optionLabel ?? ""; // Label shown to the user.
    this.optionValue = raw.optionValue ?? ""; // Stored value when this option is selected.
    this.optionDescription = raw.optionDescription ?? ""; // Optional helper text shown under the option (max 255 chars).
    this.displayOrder = raw.displayOrder ?? 0; // Sort order among options.
    this.defaultOption = raw.defaultOption ?? false; // Whether this option is the default selection.
    this.active = raw.active ?? false; // Whether this option is available.
    this.impacts = Array.isArray(raw.impacts)
      ? raw.impacts.map((x) => new QuestionOptionImpactDto(x))
      : []; // Follow-up outputs for this option. Only impacts configured with `collectFromUi=true` are i...
  }
}

/**
 * Output and impact wiring when this rule option is selected.
 */
export class QuestionOptionImpactDto {
  declare id: number;
  declare impactOutput: string;
  declare impactType: string;
  declare impactInputType: string;
  declare collectFromUi: boolean;
  declare isRequired: boolean;
  declare impactAction: string;
  declare answerValue: string;
  constructor(raw: Record<string, any> = {}) {
    this.id = raw.id ?? 0; // Rule output master id.
    this.impactOutput = raw.impactOutput ?? ""; // Output / target identifier.
    this.impactType = raw.impactType ?? ""; // Impact type (matches QuestionAnswerImpact).
    this.impactInputType = raw.impactInputType ?? ""; // Follow-up input type (matches QuestionsInputType).
    this.collectFromUi = raw.collectFromUi ?? false; // When true, this impact is meant to be collected in the questionnaire UI. The impacts array...
    this.isRequired = raw.isRequired ?? false; // When true and collectFromUi is true, a non-blank follow-up value is required on submit.
    this.impactAction = raw.impactAction ?? ""; // Impact action (matches QuestionActionType).
    this.answerValue = raw.answerValue ?? ""; // When **`submissionId`** was provided on GET and this impact had a stored answer for the su...
  }
}

export class GroupQuestionsDto {
  declare id: number;
  declare groupName: string;
  declare attemptQuestion: number;
  declare totalQuestion: number;
  constructor(raw: Record<string, any> = {}) {
    this.id = raw.id ?? 0;
    this.groupName = raw.groupName ?? "";
    this.attemptQuestion = raw.attemptQuestion ?? 0;
    this.totalQuestion = raw.totalQuestion ?? 0;
  }
}

export class SubmissionQuestionGroupResponseDto {
  declare id: number;
  declare groupName: string;
  declare displayOrder: number;
  declare questions: SubmissionQuestionResponseDto[];
  constructor(raw: Record<string, any> = {}) {
    this.id = raw.id ?? 0;
    this.groupName = raw.groupName ?? "";
    this.displayOrder = raw.displayOrder ?? 0; // Render order among groups.
    this.questions = Array.isArray(raw.questions)
      ? raw.questions.map((x) => new SubmissionQuestionResponseDto(x))
      : [];
  }
}

export class SubmissionQuestionResponseDto {
  declare id: number;
  declare questionId: number;
  declare questionText: string;
  declare questionDescription: string;
  declare isRequired: boolean;
  declare questionType: string;
  declare displayOrder: number;
  declare isHidden: boolean;
  declare options: SubmissionQuestionOptionResponseDto[];
  constructor(raw: Record<string, any> = {}) {
    this.id = raw.id ?? 0;
    this.questionId = raw.questionId ?? 0; // Master `question.id` this row was snapshotted from. String-matched against option hideQuestions/showQuestions.
    this.questionText = raw.questionText ?? "";
    this.questionDescription = raw.questionDescription ?? "";
    this.isRequired = raw.isRequired ?? false;
    this.questionType = raw.questionType ?? "";
    this.displayOrder = raw.displayOrder ?? 0; // Render order within the group.
    this.isHidden = raw.isHidden ?? false; // Server-authoritative hidden state as of the last save. Informational only — the client computes its own live hidden set and never reads this.
    this.options = Array.isArray(raw.options)
      ? raw.options.map((x) => new SubmissionQuestionOptionResponseDto(x))
      : [];
  }
}

export class SubmissionQuestionOptionResponseDto {
  declare id: number;
  declare optionLabel: string;
  declare optionValue: string;
  declare optionDescription: string;
  declare answerValue: string | null;
  declare displayOrder: number;
  declare impacts: SubmissionQuestionImpactResponseDto[];
  declare isDefault: boolean;
  declare hideQuestions: string[];
  declare showQuestions: string[];
  constructor(raw: Record<string, any> = {}) {
    this.id = raw.id ?? 0;
    this.optionLabel = raw.optionLabel ?? "";
    this.optionValue = raw.optionValue ?? "";
    this.optionDescription = raw.optionDescription ?? "";
    this.answerValue =
      raw.answerValue != null && String(raw.answerValue).trim() !== ""
        ? String(raw.answerValue)
        : null;
    this.displayOrder = raw.displayOrder ?? 0;
    this.impacts = Array.isArray(raw.impacts)
      ? raw.impacts.map((x) => new SubmissionQuestionImpactResponseDto(x))
      : [];
    this.isDefault = raw.isDefault ?? false;
    this.hideQuestions = Array.isArray(raw.hideQuestions) ? raw.hideQuestions.map(String) : []; // Master `question.id`s this option's selection hides. Resolve to submission ids before use (resolveVisibilityTargets).
    this.showQuestions = Array.isArray(raw.showQuestions) ? raw.showQuestions.map(String) : []; // Master `question.id`s this option's selection shows; targets start hidden by default.
  }
}

export class SubmissionQuestionImpactResponseDto {
  declare id: number;
  declare impactType: string;
  declare isRequired: boolean;
  declare impactInputType: string;
  declare impactOutput: string;
  declare impactAction: string;
  declare answerValue: string;
  constructor(raw: Record<string, any> = {}) {
    this.id = raw.id ?? 0;
    this.impactType = raw.impactType ?? ""; // QuestionAnswerImpact enum name from the submission snapshot.
    this.isRequired = raw.isRequired ?? false;
    this.impactInputType = raw.impactInputType ?? "";
    this.impactOutput = raw.impactOutput ?? "";
    this.impactAction = raw.impactAction ?? "";
    this.answerValue = raw.answerValue ?? "";
  }
}

/**
 * Body for POST /api/weborder/v1/questions/save. Requires an authenticated
 * insured JWT (not available anonymously). Updates `selected_value` on
 * `submission_question_option` and `submission_question_impact` rows only
 * (nested under the insured's submission). Answers are grouped by
 * `submission_question_group`. Send one or more groups per call; for each
 * group, every `isRequired` question in that group must appear under that
 * group and be answered.
 */
export class SubmissionQuestionAnswersSaveRequest {
  declare submissionId: number;
  declare groups: SubmissionQuestionGroupAnswersItemDto[];
  constructor(raw: Record<string, any> = {}) {
    this.submissionId = raw.submissionId ?? 0; // Target submission id (> 0); must belong to the authenticated insured.
    this.groups = Array.isArray(raw.groups)
      ? raw.groups.map((x) => new SubmissionQuestionGroupAnswersItemDto(x))
      : []; // One entry per submission question group being updated (subset of the submission). Nested `...
  }
}

/**
 * One submission question group and the question/option answers to persist
 * for that group.
 */
export class SubmissionQuestionGroupAnswersItemDto {
  declare submissionQuestionGroupId: number;
  declare questions: SubmissionQuestionAnswerItemDto[];
  constructor(raw: Record<string, any> = {}) {
    this.submissionQuestionGroupId = raw.submissionQuestionGroupId ?? 0; // `submission_question_group.id` for this submission (> 0).
    this.questions = Array.isArray(raw.questions)
      ? raw.questions.map((x) => new SubmissionQuestionAnswerItemDto(x))
      : []; // One entry per submission_question in this group (every isRequired row must be included).
  }
}

/**
 * One submission question and its option/impact answer payload.
 */
export class SubmissionQuestionAnswerItemDto {
  declare submissionQuestionId: number;
  declare options: SubmissionQuestionOptionAnswerDto[];
  constructor(raw: Record<string, any> = {}) {
    this.submissionQuestionId = raw.submissionQuestionId ?? 0; // `submission_question.id` (> 0)
    this.options = Array.isArray(raw.options)
      ? raw.options.map((x) => new SubmissionQuestionOptionAnswerDto(x))
      : []; // Options to persist for this question. Empty list clears all option and impact `selected_va...
  }
}

/**
 * Option row id, chosen value, and nested impact answers.
 */
export class SubmissionQuestionOptionAnswerDto {
  declare submissionQuestionOptionId: number;
  declare answerValue: string;
  declare impacts: SubmissionQuestionImpactAnswerDto[];
  constructor(raw: Record<string, any> = {}) {
    this.submissionQuestionOptionId = raw.submissionQuestionOptionId ?? 0; // `submission_question_option.id` (> 0)
    this.answerValue = raw.answerValue ?? ""; // Answer stored as `submission_question_option.selected_value` (max 255).
    this.impacts = Array.isArray(raw.impacts)
      ? raw.impacts.map((x) => new SubmissionQuestionImpactAnswerDto(x))
      : []; // Impact follow-ups for this option (collect-from-UI rows only).
  }
}

/**
 * Impact row id and captured answer
 * (`submission_question_impact.answer_value`).
 */
export class SubmissionQuestionImpactAnswerDto {
  declare submissionQuestionImpactId: number;
  declare answerValue: string;
  constructor(raw: Record<string, any> = {}) {
    this.submissionQuestionImpactId = raw.submissionQuestionImpactId ?? 0; // `submission_question_impact.id` (> 0)
    this.answerValue = raw.answerValue ?? ""; // Answer stored as `answer_value` (max 255). Null or blank clears the value.
  }
}
