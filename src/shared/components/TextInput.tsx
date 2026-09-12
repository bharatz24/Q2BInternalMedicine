import type { CSSProperties, FocusEvent, KeyboardEvent } from "react";
import { BRAND } from "@/shared/constants";
import { inputBase } from "@/shared/utils/styles";
import { useFieldControlProps } from "@/shared/components/Field";

interface TextInputProps {
  value?: string | number;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  inputMode?: "text" | "numeric" | "tel" | "email" | "decimal" | "search" | "url" | "none";
  maxLength?: number;
  autoComplete?: string;
  pattern?: string;
  title?: string;
  onBlur?: (e: FocusEvent<HTMLInputElement>) => void;
  onKeyDown?: (e: KeyboardEvent<HTMLInputElement>) => void;
  style?: CSSProperties;
  readOnly?: boolean;
  /** Set only when the input is used outside a `<Field>` (no visible label). */
  id?: string;
  "aria-label"?: string;
}

export const TextInput = ({
  value,
  onChange,
  placeholder,
  type = "text",
  inputMode,
  maxLength,
  autoComplete,
  pattern,
  title,
  onBlur: onBlurProp,
  onKeyDown,
  style: extra,
  readOnly,
  id,
  "aria-label": ariaLabel,
}: TextInputProps) => {
  // id / aria-describedby / aria-invalid / aria-required from the enclosing <Field>.
  const fieldProps = useFieldControlProps();
  return (
    <input
      {...fieldProps}
      {...(id ? { id } : {})}
      {...(ariaLabel ? { "aria-label": ariaLabel } : {})}
      style={{ ...inputBase, ...(readOnly ? { opacity: 0.6, cursor: "default" } : {}), ...extra }}
      type={type}
      inputMode={inputMode}
      maxLength={maxLength}
      autoComplete={autoComplete}
      pattern={pattern}
      title={title}
      placeholder={placeholder}
      value={value}
      onChange={readOnly ? undefined : (e) => onChange(e.target.value)}
      readOnly={readOnly}
      onKeyDown={readOnly ? undefined : onKeyDown}
      onFocus={(e) => {
        if (!readOnly) e.target.style.borderColor = BRAND;
      }}
      onBlur={(e) => {
        e.target.style.borderColor = "#d0d0d0";
        if (onBlurProp) onBlurProp(e);
      }}
    />
  );
};
