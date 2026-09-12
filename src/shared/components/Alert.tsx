/**
 * Inline status banner. Use anywhere a page needs to surface a
 * user-friendly message (form errors, validation, success notes).
 *
 *   <Alert type="error" message={signupError} />
 *   <Alert type="warning">Your application auto-saves as you go.</Alert>
 *   <Alert type="info" message="Loading your policies…" />
 *
 * `type` drives the CSS class (`error-message` / `warning-message` /
 * `info-message`). When the message is falsy the component renders nothing
 * — callers can pass error state directly without an `if`.
 */
import { memo } from "react";
import type { ReactNode } from "react";

interface AlertProps {
  type?: "error" | "warning" | "info" | "success";
  message?: ReactNode;
  children?: ReactNode;
  className?: string;
}

function Alert({ type = "error", message, children, className = "" }: AlertProps) {
  const body = message ?? children;
  if (!body) return null;
  const variantClass = `${type}-message`;
  return (
    <div
      className={`alert ${variantClass} ${className}`.trim()}
      role={type === "error" ? "alert" : "status"}
    >
      {body}
    </div>
  );
}

export default memo(Alert);
