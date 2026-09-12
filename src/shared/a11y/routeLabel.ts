import { STEP_NAMES, STEP_PATHS } from "@/modules/Quote/constants";

/**
 * Human-readable name for a route, used to announce navigation to
 * screen-reader users on route change (REACT_FRONTEND_AUDIT.md §5) and as a
 * per-view label. Wizard steps reuse `STEP_NAMES`; the rest are spelled out.
 */
const STATIC_LABELS: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/signin": "Sign in",
  "/profile": "My profile",
  "/order-details": "Policy details",
  "/complete-order": "Complete your order",
  "/underwriter-review": "Underwriter review",
  "/articles": "Articles",
};

export function routeLabel(pathname: string): string {
  const stepIdx = STEP_PATHS.indexOf(pathname);
  if (stepIdx >= 0 && STEP_NAMES[stepIdx]) return STEP_NAMES[stepIdx];
  if (STATIC_LABELS[pathname]) return STATIC_LABELS[pathname];
  // Fall back to a title-cased last path segment.
  const seg = pathname.split("/").filter(Boolean).pop() || "Home";
  return seg.replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
