import type { ReactNode } from "react";
import { BRAND, BRAND_DARK, BRAND_LIGHT } from "@/shared/constants";

interface ToggleProps {
  value?: boolean;
  onChange: (next: boolean) => void;
  label: ReactNode;
  description?: ReactNode;
  disabled?: boolean;
}

export const Toggle = ({ value, onChange, label, description, disabled }: ToggleProps) => (
  <button
    type="button"
    role="switch"
    aria-checked={Boolean(value)}
    disabled={disabled}
    onClick={() => onChange(!value)}
    style={{
      width: "100%",
      textAlign: "left",
      font: "inherit",
      display: "flex",
      alignItems: "flex-start",
      gap: 10,
      padding: "10px 14px",
      background: value ? BRAND_LIGHT : "#f7f7f5",
      borderRadius: 10,
      border: `1px solid ${value ? BRAND : "transparent"}`,
      cursor: disabled ? "default" : "pointer",
      opacity: disabled ? 0.6 : 1,
      transition: "all 0.2s",
      marginBottom: 8,
    }}
  >
    <span
      style={{
        width: 18,
        height: 18,
        borderRadius: 4,
        border: `1.5px solid ${value ? BRAND : "#767676"}`,
        background: value ? BRAND : "#fff",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        transition: "all 0.2s",
        flexShrink: 0,
        marginTop: 1,
      }}
    >
      {value && (
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
          <polyline points="20 6 9 17 4 12" />
        </svg>
      )}
    </span>
    <span style={{ flex: 1 }}>
      <span
        style={{
          display: "block",
          fontSize: 13,
          color: value ? BRAND_DARK : "#555",
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
