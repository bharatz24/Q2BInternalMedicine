import { useState } from "react";
import type { CSSProperties, FocusEvent, KeyboardEvent } from "react";
import { TextInput } from "@/shared/components/TextInput";
import { EyeIcon } from "@/shared/components/Icon";

/**
 * Password (or SSN-style) field with a show/hide eye toggle.
 * Forwards the same props as `TextInput`, minus `type` (controlled here).
 */
interface PasswordInputProps {
  value?: string | number;
  onChange: (value: string) => void;
  placeholder?: string;
  autoComplete?: string;
  maxLength?: number;
  inputMode?: "text" | "numeric" | "tel" | "email" | "decimal" | "search" | "url" | "none";
  style?: CSSProperties;
  readOnly?: boolean;
  onBlur?: (e: FocusEvent<HTMLInputElement>) => void;
  onKeyDown?: (e: KeyboardEvent<HTMLInputElement>) => void;
  /** Set only when used outside a `<Field>` (no visible label). */
  id?: string;
  "aria-label"?: string;
}

export function PasswordInput({
  value,
  onChange,
  placeholder,
  autoComplete = "current-password",
  maxLength,
  inputMode,
  style: extra,
  readOnly,
  onBlur,
  onKeyDown,
  id,
  "aria-label": ariaLabel,
}: PasswordInputProps) {
  const [show, setShow] = useState(false);
  return (
    <div style={{ position: "relative" }}>
      <TextInput
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        type={show ? "text" : "password"}
        autoComplete={autoComplete}
        maxLength={maxLength}
        inputMode={inputMode}
        readOnly={readOnly}
        onBlur={onBlur}
        onKeyDown={onKeyDown}
        id={id}
        aria-label={ariaLabel}
        style={{ paddingRight: 40, ...extra }}
      />
      <button
        type="button"
        aria-label={show ? "Hide" : "Show"}
        onClick={() => setShow((v) => !v)}
        style={{
          position: "absolute",
          right: 12,
          top: "50%",
          transform: "translateY(-50%)",
          background: "none",
          border: "none",
          cursor: "pointer",
          color: "#595959",
          padding: 0,
          display: "flex",
        }}
      >
        <EyeIcon open={show} />
      </button>
    </div>
  );
}
