import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { routeLabel } from "@/shared/a11y/routeLabel";
import { reportBreadcrumb } from "@/shared/observability/reporter";

export default function Shell({ children }: { children: ReactNode }) {
  const location = useLocation();
  const mainRef = useRef<HTMLDivElement>(null);
  const firstRender = useRef(true);
  const [announcement, setAnnouncement] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") window.scrollTo({ top: 0 });

    // Leave a navigation breadcrumb for the crash reporter — a report then
    // shows the route the user was on and how they got there (path only, no
    // query string / PII). No-op without a Sentry DSN.
    reportBreadcrumb("navigation", { pathname: location.pathname });

    // On navigation, move focus to the main region and announce the new page
    // so screen-reader users are told the view changed (they otherwise keep
    // reading from the old position). Skip the initial mount.
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    mainRef.current?.focus();
    setAnnouncement(`${routeLabel(location.pathname)} — page loaded`);
  }, [location.pathname]);

  return (
    <div style={{ maxWidth: 420, margin: "0 auto", fontFamily: "var(--font-body)" }}>
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>
      {/* Font <link>s used to be injected here — React 18 doesn't hoist them,
          so they loaded late and caused FOUT/CLS. They now live in
          index.html <head> with preconnects (one consolidated request).

          The card element itself carries the `main` landmark + the skip-link
          target + the route-change focus target. Keeping the attributes on
          this existing div (rather than adding a wrapper) means the many
          `#root > div > div > …` structural selectors in responsive.css keep
          matching. */}
      <div
        id="main-content"
        role="main"
        ref={mainRef}
        tabIndex={-1}
        style={{
          background: "#fff",
          borderRadius: 20,
          border: "1px solid #e8e8e8",
          overflow: "hidden",
          minHeight: 640,
          maxHeight: 720,
          display: "flex",
          flexDirection: "column",
          position: "relative",
          outline: "none",
        }}
      >
        {children}
      </div>
      {/* Route-change announcer. Deliberately a <span>, not a <div>: a second
          `#root > div > div` would inherit the phone-frame card rules in
          responsive.css (incl. `min-height: 100vh !important` at the mobile
          and desktop breakpoints), adding a viewport of empty scroll space
          to every carded page. */}
      <span aria-live="polite" role="status" className="sr-only">
        {announcement}
      </span>
    </div>
  );
}
