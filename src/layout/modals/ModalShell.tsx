import type { ReactNode } from "react";
import { BRAND_DARK } from "@/shared/constants";
import { btnPrimary } from "@/shared/utils/styles";
import { useDialogA11y } from "@/shared/a11y/useDialogA11y";

/**
 * Shared modal wrapper: overlay + header (title + ×) + scrollable body +
 * footer (Close button).
 *
 * `useDialogA11y` provides `role="dialog"` / `aria-modal`, a focus trap,
 * focus restoration on close, Escape-to-close, and body scroll-lock
 * (REACT_FRONTEND_AUDIT.md §5).
 */
interface ModalShellProps {
  title: ReactNode;
  onClose: () => void;
  children: ReactNode;
}

export default function ModalShell({ title, onClose, children }: ModalShellProps) {
  const { dialogProps, titleId } = useDialogA11y(onClose);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 100,
        padding: 16,
      }}
    >
      {/* Click-outside-to-close: a real <button> so it is keyboard/AT-inert
          rather than a div with a click handler. Escape-to-close is wired by
          useDialogA11y. */}
      <button
        type="button"
        aria-label="Close dialog"
        tabIndex={-1}
        onClick={onClose}
        style={{
          position: "absolute",
          inset: 0,
          background: "rgba(0,0,0,0.4)",
          border: "none",
          cursor: "default",
          padding: 0,
        }}
      />
      <div
        {...dialogProps}
        aria-labelledby={titleId}
        style={{
          position: "relative",
          background: "#fff",
          borderRadius: 16,
          maxHeight: "85%",
          width: "100%",
          maxWidth: 560,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "14px 18px",
            borderBottom: "1px solid #f0f0f0",
          }}
        >
          <span
            id={titleId}
            className="ui-heading"
            style={{
              fontFamily: "var(--font-heading)",
              fontSize: 16,
              fontWeight: 600,
              color: BRAND_DARK,
            }}
          >
            {title}
          </span>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              fontSize: 20,
              color: "#595959",
              padding: 0,
              lineHeight: 1,
            }}
          >
            ×
          </button>
        </div>
        <div
          style={{
            overflowY: "auto",
            padding: "16px 18px",
            fontSize: 12,
            color: "#555",
            lineHeight: 1.7,
            fontFamily: "var(--font-body)",
          }}
        >
          {children}
        </div>
        <div style={{ padding: "10px 18px", borderTop: "1px solid #f0f0f0" }}>
          <button
            type="button"
            onClick={onClose}
            className="ui-btn-primary"
            style={{ ...btnPrimary, fontSize: 13, padding: "11px 0" }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
