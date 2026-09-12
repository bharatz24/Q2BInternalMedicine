import { useRef } from "react";
import type { ReactNode } from "react";
import { RadioCard } from "@/shared/components/RadioCard";
import { Toggle } from "@/shared/components/Toggle";
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

// A short answer deserves a short box: a 2-digit percentage or a date in a
// 560px form column reads as an unfinished layout, not a field.
const NUMBER_INPUT_MAX_WIDTH = 180;
const DATE_INPUT_MAX_WIDTH = 220;

// Option-grid track widths, longest-label cut-off → track minimum. A choice
// list is laid out as a multi-column grid (`.q-option-grid`, styles/ui.css)
// whose track width is picked from the longest option label, so "Yes / No"
// splits the form column in half, short procedure names sit three-up, and a
// sentence-length option keeps a full row to itself.
const OPTION_GRID_TRACKS: Array<[number, number]> = [
  [14, 120],
  [26, 160],
  [44, 220],
];

/**
 * `grid-template-columns` for a question's option list, or `null` to keep the
 * options stacked one per row.
 *
 * Options carrying their own description line always stack — a two-line card
 * needs the full width to stay readable.
 */
function optionGridColumns(options: any[]): string | null {
  if (options.length < 2) return null;
  if (options.some((o) => o?.optionDescription)) return null;
  const longest = options.reduce(
    (max: number, o: any) => Math.max(max, String(o?.optionLabel ?? "").length),
    0,
  );
  const track = OPTION_GRID_TRACKS.find(([maxLen]) => longest <= maxLen)?.[1];
  return track ? `repeat(auto-fit, minmax(${track}px, 1fr))` : null;
}

// A question is "compact" — half a row in `.q-grid` — when its answer is a
// short scalar and its prompt is short enough to read in half the form
// column. Everything else (choice lists, text areas, long prompts) spans the
// full row.
const COMPACT_QUESTION_TYPES = ["NUMBER_INPUT", "DATE_PICKER", "TEXTBOX"];
const COMPACT_QUESTION_TEXT_MAX = 60;

/** True when a question should take one column of `.q-grid` rather than the row. */
export function isCompactQuestion(question: any): boolean {
  if (!COMPACT_QUESTION_TYPES.includes(normalizeQuestionType(question?.questionType))) return false;
  return String(question?.questionText ?? "").length <= COMPACT_QUESTION_TEXT_MAX;
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
  note?: ReactNode;
}

export function QuestionRenderer({
  question: q,
  answer,
  onSetRadio,
  onToggleCheckbox,
  onSetText,
  note,
}: QuestionRendererProps) {
  const opts = sortedOptions(q.options);
  const qType = normalizeQuestionType(q.questionType);
  const isSingle = isYesNoQuestionType(q.questionType);
  const isNumber = qType === "NUMBER_INPUT";
  const questionLabel = typeof q.questionText === "string" ? q.questionText : undefined;
  const optionColumns = optionGridColumns(opts);
  const optionListProps = optionColumns
    ? { className: "q-option-grid", style: { gridTemplateColumns: optionColumns } }
    : {};

  return (
    <div style={{ marginBottom: 12 }}>
      <SectionTitle required={q.isRequired}>{q.questionText}</SectionTitle>
      {q.questionDescription && (
        <div style={{ fontSize: 11, color: "#595959", marginTop: -6, marginBottom: 8 }}>
          {q.questionDescription}
        </div>
      )}

      {isSingle && (
        <div {...optionListProps}>
          {opts.map((o) => (
            <RadioCard
              key={o.id}
              selected={String(answer) === String(o.id)}
              onClick={() => onSetRadio(q, o.id)}
              title={o.optionLabel}
              subtitle={o.optionDescription || null}
            />
          ))}
        </div>
      )}

      {qType === "CHECKBOX" && (
        <div {...optionListProps}>
          {opts.map((o) => {
            const cur = Array.isArray(answer) ? answer : [];
            return (
              <Toggle
                key={o.id}
                value={cur.includes(String(o.id))}
                onChange={() => onToggleCheckbox(q, o.id)}
                label={o.optionLabel}
                description={o.optionDescription || null}
              />
            );
          })}
        </div>
      )}

      {(qType === "TEXTBOX" || isNumber) && (
        <TextInput
          value={typeof answer === "string" ? answer : ""}
          onChange={(v) => onSetText(q, isNumber ? v.replace(/\D/g, "") : v)}
          placeholder={opts[0]?.optionLabel || ""}
          inputMode={isNumber ? "numeric" : undefined}
          aria-label={questionLabel}
          style={isNumber ? { maxWidth: NUMBER_INPUT_MAX_WIDTH } : undefined}
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
