import type { CSSProperties, ReactNode } from "react";

interface LegalLinkProps {
  onClick: () => void;
  children: ReactNode;
  style?: CSSProperties;
}

/**
 * Link-styled control for in-text actions that open a modal or start a flow
 * (Terms / Privacy / About, "Get a quote", "Sign in", …).
 *
 * A real <button> — keyboard-focusable, Enter/Space activated, and announced
 * as a control by assistive tech. Replaces the ~15 `<span onClick>` /
 * `<div onClick>` pseudo-links flagged in REACT_FRONTEND_AUDIT.md §5.
 */
export function LegalLink({ onClick, children, style }: LegalLinkProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        background: "none",
        border: "none",
        padding: 0,
        margin: 0,
        font: "inherit",
        color: "inherit",
        textDecoration: "underline",
        cursor: "pointer",
        ...style,
      }}
    >
      {children}
    </button>
  );
}
