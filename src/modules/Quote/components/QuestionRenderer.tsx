import { useRef } from "react";
import type { ReactNode } from "react";
import { Toggle } from "@/shared/components/Toggle";
import { ChoiceSegments } from "@/modules/Quote/components/ChoiceSegments";
import { TextInput } from "@/shared/components/TextInput";
import { TextArea } from "@/shared/components/TextArea";
import { Icon } from "@/shared/components/Icon";
import { SectionTitle } from "@/shared/components/SectionTitle";
import { InfoBox } from "@/shared/components/InfoBox";
import { fmtDate, formatDate, toMdY } from "@/shared/utils/dateHelpers";
import {
  isYesNoQuestionType,
  normalizeQuestionType,
  sortedOptions,
} from "@/modules/Quote/api/questionsApi";

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}/;
const DATE_ICON_ZONE = 42;

// A short answer deserves a short box: a compact NUMBER_INPUT or date in a
// 560px form column reads as an unfinished layout, not a field. Applied only
// while `isCompactQuestion` is true — full-row NUMBER_INPUTs (DPL specialty
// percentages) stretch like TEXTBOX so the placeholder is readable.
const NUMBER_INPUT_MAX_WIDTH = 180;
const DATE_INPUT_MAX_WIDTH = 220;

// A "Select all" control only earns its row once the list is long enough
// that ticking every box by hand is a chore; over two options it is noise.
const SELECT_ALL_MIN_OPTIONS = 3;

// A question is "compact" — half a row in `.q-grid` — when its answer is a
// short FIXED-WIDTH scalar and its prompt is short enough to read in half the
// form column. Everything else spans the full row.
//
// Free text is not compact, whichever type it arrives as. A TEXT_AREA in half
// a form column is unusable, and a TEXTBOX is barely better: two "please
// explain" boxes sharing a row on /practice'"'"'s "License, Scope & Practice"
// group left each one too narrow to read back what was typed, and made the
// group scan as a grid of fragments rather than a list of questions. Only a
// short count and a date — answers with a known, genuinely short width —
// pair up now; free text and the DPL specialty-percentage NUMBER_INPUTs go
// line by line at full width (their prompts are sentences, and a 180px box
// clips the optionLabel placeholder).
const COMPACT_QUESTION_TYPES = ["NUMBER_INPUT", "DATE_PICKER"];
const COMPACT_QUESTION_TEXT_MAX = 60;
const PERCENTAGE_OF_PRACTICE_RE = /percentage\s*of\s*practice/i;
const SHORT_NUMBER_PLACEHOLDER = "e.g. 40";

/** True when a question should take one column of `.q-grid` rather than the row. */
export function isCompactQuestion(question: any): boolean {
  if (!COMPACT_QUESTION_TYPES.includes(normalizeQuestionType(question?.questionType))) return false;
  const text = String(question?.questionText ?? "");
  if (PERCENTAGE_OF_PRACTICE_RE.test(text)) return false;
  return text.length <= COMPACT_QUESTION_TEXT_MAX;
}

function numberPlaceholder(optionLabel: unknown): string {
  const label = String(optionLabel ?? "").trim();
  if (
    !label ||
    label.length > 24 ||
    PERCENTAGE_OF_PRACTICE_RE.test(label) ||
    /specialty/i.test(label)
  ) {
    return SHORT_NUMBER_PLACEHOLDER;
  }
  return label;
}

/**
 * `DATE_PICKER` answer field — a typed MM/DD/YYYY box plus the OS-native
 * picker, the same pattern the landing page's effective-date field uses:
 * rather than call `showPicker()` on a hidden input (unsupported on iOS
 * Safari, flaky on Android), a real transparent `<input type="date">` is
 * overlaid on the calendar-icon zone, so tapping the icon IS tapping the date
 * input. The answer is stored as MM/DD/YYYY text — the shape
 * `buildFullGroupSavePayload` / `buildOptionImpactsPayload` send to `ins`.
 */
function DateAnswerInput({
  value,
  onChange,
  label,
}: {
  value: string;
  onChange: (value: string) => void;
  label?: string;
}) {
  const dateRef = useRef<HTMLInputElement>(null);
  // Saved answers can come back ISO; anything mid-typing stays as typed.
  const text = ISO_DATE_RE.test(value) ? toMdY(value) : value;
  const iso = (() => {
    const complete = fmtDate(text); // "" until all 8 digits are present
    if (!complete) return "";
    const [mm, dd, yyyy] = complete.split("/");
    return `${yyyy}-${mm}-${dd}`;
  })();

  return (
    <div style={{ position: "relative", maxWidth: DATE_INPUT_MAX_WIDTH }}>
      <TextInput
        value={text}
        onChange={(v) => onChange(formatDate(v))}
        placeholder="MM/DD/YYYY"
        inputMode="numeric"
        autoComplete="off"
        maxLength={10}
        aria-label={label}
        style={{ paddingRight: DATE_ICON_ZONE }}
      />
      {/* Calendar glyph — visual only, sits behind the transparent overlay. */}
      <span
        aria-hidden="true"
        style={{
          position: "absolute",
          top: "50%",
          right: 12,
          transform: "translateY(-50%)",
          display: "inline-flex",
          pointerEvents: "none",
        }}
      >
        <Icon
          size={18}
          d={
            <>
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </>
          }
        />
      </span>
      <input
        ref={dateRef}
        type="date"
        value={iso}
        aria-label={label ? `Open date picker for ${label}` : "Open date picker"}
        onChange={(e) => onChange(toMdY(e.target.value))}
        onClick={() => {
          const el = dateRef.current;
          if (el && typeof el.showPicker === "function") {
            try {
              el.showPicker();
            } catch {
              /* already opening via the native tap */
            }
          }
        }}
        style={{
          position: "absolute",
          top: 0,
          right: 0,
          height: "100%",
          width: DATE_ICON_ZONE,
          margin: 0,
          padding: 0,
          border: 0,
          background: "transparent",
          color: "transparent",
          opacity: 0,
          cursor: "pointer",
          WebkitAppearance: "none",
          appearance: "none",
        }}
      />
    </div>
  );
}

/**
 * One generic, reusable question row — RADIO_BUTTON/YES_NO/CHECKBOX/
 * TEXTBOX/TEXT_AREA/NUMBER_INPUT/DATE_PICKER — shared across every
 * tree-driven page in this app (PracticeDetailsPage,
 * PreviousInsuranceClaimsPage, UnderwritingPage).
 *
 * Every type in `FREE_TEXT_QUESTION_TYPES` must have a branch here: the data
 * layer (hydrate / required-check / save payload) already treats all four as
 * one text answer on the question's first option, so a type missing from this
 * switch renders as a label with no field and can never be answered.
 *
 * Q2BNfy hand-rolls this same switch per-page rather than sharing a
 * component; Nursing needs the identical pattern in several places (vs.
 * Nfy's 3), so one shared component is the better call here — same
 * rendering logic, not a new abstraction.
 *
 */
interface QuestionRendererProps {
  question: any;
  answer?: string | string[];
  onSetRadio: (question: any, optionId: string | number) => void;
  onToggleCheckbox: (question: any, optionId: string | number) => void;
  onSetText: (question: any, value: string) => void;
  /**
   * Replace a CHECKBOX question's whole answer in one write — what "Select
   * all" needs. It cannot be built by calling `onToggleCheckbox` once per
   * option: every page's handler derives the next answer from the answers
   * object captured in that render, so N calls in one event handler all read
   * the same stale snapshot and only the last one survives.
   *
   * Optional — a page that passes no bulk setter simply gets no "Select all".
   */
  onSetCheckboxes?: (question: any, optionIds: string[]) => void;
  note?: ReactNode;
}

export function QuestionRenderer({
  question: q,
  answer,
  onSetRadio,
  onToggleCheckbox,
  onSetText,
  onSetCheckboxes,
  note,
}: QuestionRendererProps) {
  const opts = sortedOptions(q.options);
  const qType = normalizeQuestionType(q.questionType);
  const isSingle = isYesNoQuestionType(q.questionType);
  const isNumber = qType === "NUMBER_INPUT";
  const questionLabel = typeof q.questionText === "string" ? q.questionText : undefined;
  // CHECKBOX options flow by width (`.q-option-flow`), so one long label does
  // not set the column width for the whole list — or, worse, stack every
  // option on its own row.
  const checked = Array.isArray(answer) ? answer.map(String) : [];
  const allChecked = opts.length > 0 && opts.every((o) => checked.includes(String(o.id)));
  // CHECKBOX only. A radio / yes-no question takes exactly one answer, so
  // "Select all" is meaningless there — and `onSetCheckboxes` would write an
  // array into an answer the rest of the tree reads as a single option id.
  const showSelectAll =
    qType === "CHECKBOX" && Boolean(onSetCheckboxes) && opts.length >= SELECT_ALL_MIN_OPTIONS;

  return (
    <div style={{ marginBottom: 12 }}>
      {showSelectAll ? (
        <div className="q-question-head">
          <SectionTitle prompt required={q.isRequired}>
            {q.questionText}
          </SectionTitle>
          <Toggle
            compact
            value={allChecked}
            indeterminate={checked.length > 0 && !allChecked}
            onChange={() => onSetCheckboxes?.(q, allChecked ? [] : opts.map((o) => String(o.id)))}
            label={
              <>
                Select all
                <span style={{ color: "#767676", marginLeft: 6 }}>
                  {checked.length}/{opts.length}
                </span>
              </>
            }
          />
        </div>
      ) : (
        <SectionTitle prompt required={q.isRequired}>
          {q.questionText}
        </SectionTitle>
      )}
      {q.questionDescription && (
        <div style={{ fontSize: 11, color: "#595959", marginTop: -6, marginBottom: 8 }}>
          {q.questionDescription}
        </div>
      )}

      {isSingle && (
        <ChoiceSegments
          options={opts}
          name={`q-${q.id}`}
          ariaLabel={String(q.questionText || "")}
          isSelected={(o) => String(answer) === String(o.id)}
          onSelect={(o) => onSetRadio(q, o.id)}
        />
      )}

      {qType === "CHECKBOX" && (
        <div className="q-option-flow">
          {opts.map((o) => (
            <Toggle
              key={o.id}
              value={checked.includes(String(o.id))}
              onChange={() => onToggleCheckbox(q, o.id)}
              label={o.optionLabel}
              description={o.optionDescription || null}
            />
          ))}
        </div>
      )}

      {(qType === "TEXTBOX" || isNumber) && (
        <TextInput
          value={typeof answer === "string" ? answer : ""}
          onChange={(v) => onSetText(q, isNumber ? v.replace(/\D/g, "") : v)}
          placeholder={
            isNumber ? numberPlaceholder(opts[0]?.optionLabel) : opts[0]?.optionLabel || ""
          }
          inputMode={isNumber ? "numeric" : undefined}
          aria-label={questionLabel}
          style={
            isNumber && isCompactQuestion(q) ? { maxWidth: NUMBER_INPUT_MAX_WIDTH } : undefined
          }
        />
      )}

      {qType === "TEXT_AREA" && (
        <TextArea
          value={typeof answer === "string" ? answer : ""}
          onChange={(v) => onSetText(q, v)}
          placeholder={opts[0]?.optionLabel || ""}
          aria-label={questionLabel}
        />
      )}

      {qType === "DATE_PICKER" && (
        <DateAnswerInput
          value={typeof answer === "string" ? answer : ""}
          onChange={(v) => onSetText(q, v)}
          label={questionLabel}
        />
      )}

      {note && (
        <div style={{ marginTop: 8 }}>
          <InfoBox color="orange">{note}</InfoBox>
        </div>
      )}
    </div>
  );
}
