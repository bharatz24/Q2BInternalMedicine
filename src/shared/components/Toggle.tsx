import type { ReactNode } from "react";
import { BRAND, BRAND_DARK, BRAND_LIGHT } from "@/shared/constants";

interface ToggleProps {
  value?: boolean;
  onChange: (next: boolean) => void;
  label: ReactNode;
  description?: ReactNode;
  disabled?: boolean;
  /**
   * Tri-state: some-but-not-all of what this control governs is on (the
   * "Select all" box over a partly-ticked option list). Renders a dash
   * instead of a tick.
   *
   * Passing the prop at all also switches the ARIA role from `switch` to
   * `checkbox`, because `aria-checked="mixed"` is only valid on the latter —
   * a switch is on or off. Callers that never pass it keep the switch role,
   * and a caller that does pass it passes a boolean every render, so no
   * single instance ever changes role mid-life.
   */
  indeterminate?: boolean;
  /**
   * Shrink-to-fit variant: sized to its own label instead of filling the row,
   * with tighter padding and no bottom margin, so it can sit inline beside
   * something else (the "Select all" box on a question's header row). Its
   * label is kept on one line — a compact control that wraps stops being
   * compact.
   */
  compact?: boolean;
}

export const Toggle = ({
  value,
  onChange,
  label,
  description,
  disabled,
  indeterminate,
  compact,
}: ToggleProps) => (
  <button
    type="button"
    role={indeterminate === undefined ? "switch" : "checkbox"}
    aria-checked={indeterminate ? "mixed" : Boolean(value)}
    disabled={disabled}
    onClick={() => onChange(!value)}
    style={{
      width: compact ? "auto" : "100%",
      textAlign: "left",
      font: "inherit",
      display: "flex",
      alignItems: compact ? "center" : "flex-start",
      gap: compact ? 8 : 10,
      padding: compact ? "6px 10px" : "10px 14px",
      whiteSpace: compact ? "nowrap" : undefined,
      flexShrink: compact ? 0 : undefined,
      background: value || indeterminate ? BRAND_LIGHT : "#f7f7f5",
      borderRadius: 10,
      border: `1px solid ${value || indeterminate ? BRAND : "transparent"}`,
      cursor: disabled ? "default" : "pointer",
      opacity: disabled ? 0.6 : 1,
      transition: "all 0.2s",
      marginBottom: compact ? 0 : 8,
    }}
  >
    <span
      style={{
        width: 18,
        height: 18,
        borderRadius: 4,
        border: `1.5px solid ${value || indeterminate ? BRAND : "#767676"}`,
        background: value || indeterminate ? BRAND : "#fff",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        transition: "all 0.2s",
        flexShrink: 0,
        marginTop: compact ? 0 : 1,
      }}
    >
      {(value || indeterminate) && (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="#fff"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ width: 11, height: 11 }}
          aria-hidden="true"
        >
          {indeterminate ? (
            <line x1="5" y1="12" x2="19" y2="12" />
          ) : (
            <polyline points="20 6 9 17 4 12" />
          )}
        </svg>
      )}
    </span>
    <span style={{ flex: 1 }}>
      <span
        style={{
          display: "block",
          fontSize: compact ? 12 : 13,
          color: value || indeterminate ? BRAND_DARK : "#555",
          fontFamily: "var(--font-body)",
          lineHeight: 1.4,
        }}
      >
        {label}
      </span>
      {description && (
        <span
          style={{
            display: "block",
            fontSize: 11,
            color: "#595959",
            marginTop: 2,
            fontFamily: "var(--font-body)",
            lineHeight: 1.4,
          }}
        >
          {description}
        </span>
      )}
    </span>
  </button>
);
