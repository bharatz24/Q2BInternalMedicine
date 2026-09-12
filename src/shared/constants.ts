// Brand colors — resolved at runtime via CSS custom properties so the
// theme can swap without re-rendering. Token values for each theme live
// in src/responsive.css under `:root` (classic) and `[data-theme="..."]`.
export const BRAND = "var(--brand)";
export const BRAND_LIGHT = "var(--brand-light)";
export const BRAND_DARK = "var(--brand-dark)";
export const ORANGE = "var(--orange)";
export const ORANGE_BG = "var(--orange-bg)";
export const RED = "var(--red)";
export const RED_BG = "var(--red-bg)";
export const BLUE = "var(--blue)";
export const BLUE_BG = "var(--blue-bg)";

// SelectFirst logo (served from public/icon.jpg)
export const SF_LOGO = "/icon.jpg";
