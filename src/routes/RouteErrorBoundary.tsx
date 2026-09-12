import type { ReactNode } from "react";
import { useLocation } from "react-router-dom";

import ErrorBoundary from "@/shared/components/ErrorBoundary";

/**
 * Route-scoped error boundary. Sits inside `<BrowserRouter>` (so it can read
 * the location) but wraps `<Routes>`, so a render crash in any page shows the
 * page-level fallback instead of bubbling to the root boundary and blanking
 * the entire app.
 *
 * It keys its reset on `pathname` — navigating to another route (via the
 * fallback's "Back to dashboard", the browser back button, anything) clears
 * the error and the new page renders normally.
 *
 * The root `<ErrorBoundary level="root">` in `App.tsx` stays as the last
 * resort for crashes in the providers / `Shell` / `Modals` themselves.
 */
export default function RouteErrorBoundary({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  return (
    <ErrorBoundary level="route" name={pathname} resetKeys={[pathname]}>
      {children}
    </ErrorBoundary>
  );
}
