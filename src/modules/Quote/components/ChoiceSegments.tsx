import type { CSSProperties } from "react";
import { BRAND } from "@/shared/constants";
import { RadioCard } from "@/shared/components/RadioCard";

interface ChoiceSegmentsProps {
  /** Options in display order (already through `sortedOptions`). */
  options: any[];
  /** Radio-group name — must be unique per question, e.g. `q-${question.id}`. */
  name: string;
  /** Accessible name for the group; the question text. */
  ariaLabel: string;
  isSelected: (option: any) => boolean;
  onSelect: (option: any) => void;
  /**
   * Fill colour for the selected segment, per option. Defaults to BRAND.
   * `UnderwritingPage` overrides it so a Yes — the adverse answer on a
   * disclosure question — fills RED to match the row it sits in.
   */
  accentFor?: (option: any) => string;
}

/**
 * The single-choice control for a question tree option list: one bordered
 * track, options splitting it evenly.
 *
 * Was private to `UnderwritingPage`'s yes/no rows while every other page drew
 * the same questions as stacked `RadioCard`s, so the same question looked like
 * two different controls depending on which page reached it. Shared now, so
 * `/practice`, `/previous-insurance` and `/underwriting` agree.
 *
 * Each segment is a `<label>` around a visually hidden native radio: arrow-key
 * navigation, the roving tab stop and the checked state come from the platform
 * rather than being re-implemented on `<button>`.
 *
 * EXCEPT when the options carry their own description lines — then the list
 * renders as stacked `RadioCard`s instead. A description cannot hang under its
 * own segment without breaking the shared track, and listing them all beneath
 * the control separates each explanation from the option it explains. A card
 * keeps the two together, which is the whole reason the tree author wrote a
 * description in the first place.
 */
export function ChoiceSegments({
  options,
  name,
  ariaLabel,
  isSelected,
  onSelect,
  accentFor,
}: ChoiceSegmentsProps) {
  const described = options.some((o: any) => o.optionDescription || o.description);

  if (described) {
    return (
      // Cards flow by width like every other option list — one per row only
      // when a card actually needs the room.
      <div className="q-option-flow q-option-flow--cards">
        {options.map((o: any) => (
          <RadioCard
            key={o.id}
            selected={isSelected(o)}
            onClick={() => onSelect(o)}
            title={o.optionLabel}
            subtitle={o.optionDescription || o.description || null}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="q-segments" role="radiogroup" aria-label={ariaLabel}>
      {options.map((o: any) => {
        const selected = isSelected(o);
        return (
          <label
            key={o.id}
            className="q-segment"
            data-checked={selected ? "true" : undefined}
            style={{ "--q-segment-accent": accentFor ? accentFor(o) : BRAND } as CSSProperties}
          >
            <input
              type="radio"
              className="sr-only"
              name={name}
              value={String(o.id)}
              checked={Boolean(selected)}
              onChange={() => onSelect(o)}
            />
            {o.optionLabel}
          </label>
        );
      })}
    </div>
  );
}
