import { BRAND, BRAND_DARK, BRAND_LIGHT } from "@/shared/constants";

interface ChipGridProps {
  options: string[];
  selected: string[];
  onToggle: (option: string) => void;
  /** Accessible name for the group of chips. */
  label?: string;
}

export const ChipGrid = ({ options, selected, onToggle, label }: ChipGridProps) => (
  <div
    role="group"
    aria-label={label}
    style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 14 }}
  >
    {options.map((o) => {
      const on = selected.includes(o);
      return (
        <button
          type="button"
          key={o}
          onClick={() => onToggle(o)}
          aria-pressed={on}
          style={{
            padding: "7px 12px",
            borderRadius: 8,
            fontSize: 12,
            cursor: "pointer",
            fontFamily: "var(--font-body)",
            fontWeight: 500,
            background: on ? BRAND_LIGHT : "#f5f5f3",
            color: on ? BRAND_DARK : "#595959",
            border: `1px solid ${on ? BRAND : "transparent"}`,
            transition: "all 0.15s",
          }}
        >
          {o}
        </button>
      );
    })}
  </div>
);
