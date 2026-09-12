import { memo } from "react";
import type { ReactNode } from "react";
import { BLUE, BLUE_BG, BRAND_DARK, BRAND_LIGHT, ORANGE, ORANGE_BG } from "@/shared/constants";

interface InfoBoxProps {
  children: ReactNode;
  color?: "green" | "blue" | "orange";
}

export const InfoBox = memo(({ children, color = "green" }: InfoBoxProps) => {
  const bg = color === "green" ? BRAND_LIGHT : color === "blue" ? BLUE_BG : ORANGE_BG;
  const fg = color === "green" ? BRAND_DARK : color === "blue" ? BLUE : ORANGE;
  return (
    <div
      style={{
        background: bg,
        borderRadius: 10,
        padding: "10px 14px",
        display: "flex",
        alignItems: "flex-start",
        gap: 8,
        marginBottom: 12,
      }}
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke={fg}
        strokeWidth="2"
        strokeLinecap="round"
        style={{ width: 15, height: 15, flexShrink: 0, marginTop: 1 }}
      >
        <circle cx="12" cy="12" r="10" />
        <path d="M12 16v-4" />
        <line x1="12" y1="8" x2="12.01" y2="8" />
      </svg>
      <span style={{ fontSize: 12, color: fg, lineHeight: 1.5, fontFamily: "var(--font-body)" }}>
        {children}
      </span>
    </div>
  );
});
