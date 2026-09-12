// Desktop "Quote Hub" redesign palette + type tokens.
//
// Ported from the `New design desktop/` Tailwind reference (teal + slate,
// Inter / JetBrains Mono).
//
// The "brand" ramp (formerly fixed teal) now resolves through CSS custom
// properties so the desktop hub follows the classic/selectfirst theme
// toggle, just like mobile: in the classic theme `--hub-brand-*` resolve
// to the original teal ramp; under `[data-theme="selectfirst"]` they
// resolve to the matching blue ramp. The variables are declared in
// src/responsive.css (default + selectfirst blocks). Because they're
// `var()` references, flipping <html data-theme> re-paints every inline
// style with no React rerender — same mechanism the rest of the app uses.
//
// The TEAL_* names are kept as the public token API (callers are
// unchanged); only their *values* became theme-aware. The neutral SLATE
// ramp and accent colors below stay fixed hex — they read identically in
// both themes.
//
// Consumed only by the desktop-only components under
// src/shared/components/desktop/, which are hidden below 1024px via the
// `.hub-desktop` rule in src/responsive.css. Mobile never renders them,
// so these values can never leak into the phone-frame UI.

// Brand ramp — theme-aware via CSS vars (teal in classic, blue in selectfirst).
// Fallbacks in the var() are the original teal hex, so SSR/no-theme renders
// match the previous fixed look exactly.
export const TEAL_50 = "var(--hub-brand-50, #f0fdfa)";
export const TEAL_100 = "var(--hub-brand-100, #ccfbf1)";
export const TEAL_200 = "var(--hub-brand-200, #99f6e4)";
export const TEAL_300 = "var(--hub-brand-300, #5eead4)";
export const TEAL_400 = "var(--hub-brand-400, #2dd4bf)";
export const TEAL_600 = "var(--hub-brand-600, #0d9488)";
export const TEAL_700 = "var(--hub-brand-700, #0f766e)";
export const TEAL_800 = "var(--hub-brand-800, #115e59)";
export const TEAL_900 = "var(--hub-brand-900, #134e4a)";
export const TEAL_950 = "var(--hub-brand-950, #042f2e)";

// Slate ramp (maps to Tailwind slate-*)
export const SLATE_50 = "#f8fafc";
export const SLATE_100 = "#f1f5f9";
export const SLATE_150 = "#e9eef4"; // tailwind has no 150; reference uses it
export const SLATE_200 = "#e2e8f0";
export const SLATE_300 = "#cbd5e1";
export const SLATE_400 = "#94a3b8";
export const SLATE_500 = "#64748b";
export const SLATE_600 = "#475569";
export const SLATE_700 = "#334155";
export const SLATE_800 = "#1e293b";
export const SLATE_900 = "#0f172a";

// Accents
export const EMERALD_500 = "#10b981";
export const EMERALD_600 = "#059669";
export const EMERALD_50 = "#ecfdf5";
export const EMERALD_100 = "#d1fae5";
export const AMBER_400 = "#fbbf24";
export const AMBER_500 = "#f59e0b";
export const SKY_50 = "#f0f9ff";
export const SKY_100 = "#e0f2fe";
export const SKY_600 = "#0284c7";
export const SKY_800 = "#075985";

// Type
export const FONT_SANS = "'Inter', ui-sans-serif, system-ui, sans-serif";
export const FONT_MONO = "'JetBrains Mono', ui-monospace, SFMono-Regular, monospace";

// Layout
export const MAX_W = 1180; // reference uses max-w-7xl (1280) minus our shell gutters
