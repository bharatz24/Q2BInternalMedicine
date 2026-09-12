import { memo } from "react";
import { Spinner } from "@/shared/components/Icon";

/**
 * Loading indicator with optional label.
 *
 *   <Loader />
 *   <Loader label="Loading policies…" />
 *   <Loader inline label="Saving" />        ← small inline variant
 *
 * The `inline` variant is sized for use inside buttons or list rows
 * (matches the Spinner icon shipped from shared/components/Icon).
 */
interface LoaderProps {
  label?: string;
  inline?: boolean;
  className?: string;
}

function Loader({ label, inline = false, className = "" }: LoaderProps) {
  const variantClass = inline ? "loader loader-inline" : "loader";
  return (
    <div className={`${variantClass} ${className}`.trim()} role="status" aria-live="polite">
      <Spinner />
      {label && <span className="loader-label">{label}</span>}
    </div>
  );
}

export default memo(Loader);
