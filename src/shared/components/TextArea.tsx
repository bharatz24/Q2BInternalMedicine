import type { CSSProperties } from "react";
import { BRAND } from "@/shared/constants";
import { inputBase } from "@/shared/utils/styles";
import { useFieldControlProps } from "@/shared/components/Field";

interface TextAreaProps {
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  maxLength?: number;
  style?: CSSProperties;
  /** Set only when used outside a `<Field>` (no visible label). */
  id?: string;
  "aria-label"?: string;
}

export const TextArea = ({
  value,
  onChange,
  placeholder,
  rows,
  maxLength,
  style: extra,
  id,
  "aria-label": ariaLabel,
}: TextAreaProps) => {
  const fieldProps = useFieldControlProps();
  return (
    <textarea
      {...fieldProps}
      {...(id ? { id } : {})}
      {...(ariaLabel ? { "aria-label": ariaLabel } : {})}
      style={{ ...inputBase, minHeight: 80, resize: "vertical", ...extra }}
      value={value}
      rows={rows}
      maxLength={maxLength}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      onFocus={(e) => {
        e.target.style.borderColor = BRAND;
      }}
      onBlur={(e) => {
        e.target.style.borderColor = "#d0d0d0";
      }}
    />
  );
};
