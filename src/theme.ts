// Runtime theme switch.
//
// Themes are CSS-only: tokens live in src/responsive.css under :root
// (classic) and [data-theme="<name>"] for the other three. Setting the
// attribute on <html> swaps every token instantly — no React state, no
// re-renders. We do dispatch a small 'themechange' event so the topbar
// toggle can update its label, since the dataset write itself doesn't
// notify.

export const THEMES: string[] = ["classic", "selectfirst", "skyfirst", "google", "medmalguard"];

// Human-readable labels for the toggle chip, keyed by theme id.
export const THEME_LABELS: Record<string, string> = {
  classic: "Classic",
  selectfirst: "SelectFirst",
  skyfirst: "SelectFirst Ins.",
  google: "Google",
  medmalguard: "Cl1",
};
// Claude1 ("medmalguard") is the new app-wide default per the MedMalGuard
// integration. The switcher still cycles every THEMES entry; this only
// changes which theme loads when nothing is stored / the URL doesn't
// override. "classic" remains a selectable option.
export const DEFAULT_THEME = "medmalguard";

const STORAGE_KEY = "q2b_theme";

export function getStoredTheme(): string {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return v != null && THEMES.includes(v) ? v : DEFAULT_THEME;
  } catch {
    // localStorage can throw in private-mode Safari / sandboxed iframes.
    return "classic";
  }
}

export function applyTheme(theme: string) {
  const t = THEMES.includes(theme) ? theme : DEFAULT_THEME;
  // "classic" is the :root default — remove the attr so it doesn't sit
  // in the DOM advertising a non-default state.
  if (t === "classic") {
    delete document.documentElement.dataset.theme;
  } else {
    document.documentElement.dataset.theme = t;
  }
  try {
    localStorage.setItem(STORAGE_KEY, t);
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new CustomEvent("themechange", { detail: t }));
}

export function applyStoredTheme() {
  // ?theme=<name> in the URL wins over localStorage. Useful for sharing
  // a styled link or for screenshot tooling that can't run JS to flip
  // the toggle. The override also persists (writes to localStorage)
  // so subsequent navigations keep the chosen theme.
  let initial = getStoredTheme();
  try {
    const q = new URLSearchParams(window.location.search).get("theme");
    if (q && THEMES.includes(q)) initial = q;
  } catch {
    /* ignore */
  }
  applyTheme(initial);
}
