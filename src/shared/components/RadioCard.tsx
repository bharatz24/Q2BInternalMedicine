import type { ReactNode } from "react";
import { BRAND, BRAND_DARK, BRAND_LIGHT } from "@/shared/constants";

interface RadioCardProps {
  selected?: boolean;
  onClick?: () => void;
  title: ReactNode;
  subtitle?: ReactNode;
  disabled?: boolean;
}

export const RadioCard = ({ selected, onClick, title, subtitle, disabled }: RadioCardProps) => (
  <button
    type="button"
    aria-pressed={Boolean(selected)}
    disabled={disabled}
    onClick={onClick}
    style={{
      width: "100%",
      textAlign: "left",
      font: "inherit",
      padding: "12px 14px",
      borderRadius: 10,
      cursor: disabled ? "default" : "pointer",
      border: `1.5px solid ${selected ? BRAND : "#e0e0de"}`,
      background: selected ? BRAND_LIGHT : "#fff",
      opacity: disabled ? 0.6 : 1,
      transition: "all 0.2s",
      marginBottom: 8,
    }}
  >
    <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <span
        style={{
          width: 16,
          height: 16,
          borderRadius: "50%",
          border: `2px solid ${selected ? BRAND : "#767676"}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        {selected && (
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: BRAND }} />
        )}
      </span>
      <span>
        <span
          style={{
            display: "block",
            fontSize: 14,
            fontWeight: 500,
            color: selected ? BRAND_DARK : "#333",
            fontFamily: "var(--font-body)",
          }}
        >
          {title}
        </span>
        {subtitle && (
          <span
            style={{
              display: "block",
              fontSize: 11,
              color: "#595959",
              marginTop: 2,
              fontFamily: "var(--font-body)",
            }}
          >
            {subtitle}
          </span>
        )}
      </span>
    </span>
  </button>
);
