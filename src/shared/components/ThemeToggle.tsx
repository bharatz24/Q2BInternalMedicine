import { useEffect, useState } from "react";
import { applyTheme, DEFAULT_THEME, getStoredTheme, THEMES, THEME_LABELS } from "@/theme";

// Small chip in the topbar that flips between the available themes.
// Reads from localStorage (via getStoredTheme) on mount and listens for
// the 'themechange' event so multiple toggles in the same tree stay in
// sync without prop drilling.
export default function ThemeToggle() {
  const [theme, setTheme] = useState<string>(() => getStoredTheme() ?? DEFAULT_THEME);

  useEffect(() => {
    const onChange = (e: Event) => setTheme((e as CustomEvent).detail);
    window.addEventListener("themechange", onChange);
    return () => window.removeEventListener("themechange", onChange);
  }, []);

  const next = THEMES[(THEMES.indexOf(theme) + 1) % THEMES.length];
  const label = (THEME_LABELS as Record<string, string>)[theme] || theme;

  return (
    <button
      type="button"
      onClick={() => applyTheme(next)}
      title={`Switch to ${next} theme`}
      style={{
        padding: "4px 10px",
        borderRadius: 999,
        border: "1px solid #e0e0e0",
        background: "#fff",
        cursor: "pointer",
        fontFamily: "var(--font-body)",
        fontSize: 11,
        color: "#555",
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        lineHeight: 1.2,
      }}
    >
      <span
        aria-hidden="true"
        style={{
          width: 10,
          height: 10,
          borderRadius: "50%",
          background: "var(--brand)",
          display: "inline-block",
        }}
      />
      {label}
    </button>
  );
}
