import type { CSSProperties } from "react";
import { BRAND, BRAND_DARK, BRAND_LIGHT } from "@/shared/constants";

export const inputBase: CSSProperties = {
  // NB: no `outline: none` here — keyboard focus visibility is provided by the
  // global `:focus-visible` rule in styles/ui.css (REACT_FRONTEND_AUDIT.md §5).
  width: "100%",
  padding: "11px 14px",
  border: "1px solid #d0d0d0",
  borderRadius: 10,
  fontFamily: "var(--font-body)",
  fontSize: 14,
  color: "#1a1a1a",
  background: "#fff",
  boxSizing: "border-box",
  transition: "border-color 0.2s",
};

export const labelBase: CSSProperties = {
  fontFamily: "var(--font-body)",
  fontSize: 12,
  fontWeight: 500,
  color: "#666",
  marginBottom: 5,
  display: "block",
};

export const btnPrimary: CSSProperties = {
  width: "100%",
  padding: "14px 0",
  border: "none",
  borderRadius: 10,
  fontFamily: "var(--font-body)",
  fontSize: 14,
  fontWeight: 500,
  background: BRAND,
  color: "#fff",
  cursor: "pointer",
  transition: "transform 0.12s",
  boxShadow: "0 2px 12px var(--brand-shadow)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 6,
};

export const btnOutline: CSSProperties = {
  ...btnPrimary,
  background: "transparent",
  color: "#555",
  border: "1px solid #d0d0d0",
  boxShadow: "none",
  fontSize: 13,
  padding: "11px 0",
  marginTop: 8,
};

export const dis = (style: CSSProperties, ok: boolean): CSSProperties => ({
  ...style,
  opacity: ok ? 1 : 0.4,
  pointerEvents: ok ? "auto" : "none",
});

export const insuredHeaderAvatarStyle: CSSProperties = {
  width: 30,
  height: 30,
  borderRadius: "50%",
  background: BRAND_LIGHT,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: 12,
  fontWeight: 600,
  color: BRAND_DARK,
  fontFamily: "var(--font-body)",
  flexShrink: 0,
};
