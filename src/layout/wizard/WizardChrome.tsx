import { useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { TOTAL_STEPS } from "@/modules/Quote/constants";
import { ArrowLeft, Icon } from "@/shared/components/Icon";
import { ProgressBar } from "@/modules/Quote/components/ProgressBar";
import QuoteSnapshotRail from "@/modules/Quote/components/QuoteSnapshotRail";
import ThemeToggle from "@/shared/components/ThemeToggle";
import HubMarketing from "@/shared/components/desktop/HubMarketing";
import HubCOIPreview from "@/shared/components/desktop/HubCOIPreview";
import { MedMalGuardHeader } from "@/modules/Quote/components/MedMalGuardLanding";

import { useStore } from "@/shared/store/useStore";
import insuredProfileStore from "@/shared/store/insuredProfileStore";
import sessionStore from "@/shared/store/sessionStore";
import modalStore from "@/shared/store/modalStore";
import submissionStore from "@/modules/Quote/store/submissionStore";
import { useQuoteSnapshot } from "@/modules/Quote/utils/useQuoteSnapshot";
import { usePolicyStatus } from "@/modules/Payment/utils/policyStatus";
import { useWizardBackNav } from "@/layout/wizard/useWizardBackNav";

/**
 * The wizard shell for every non-landing `FlowLayout` route (steps 2–10 of
 * `/quote` → `/payment`). Renders: the MedMalGuard header, the slim mobile
 * topbar (back / theme / step), the progress bar, the routed step
 * (`<Outlet/>`), the snapshot rail, the thin legal footer line, and — on
 * `/quote` only — the desktop hub COI previewer + marketing stack.
 *
 * Split out of `FlowLayout` (audit finding 1.2 / action-plan #20). The
 * routing decisions stay in `FlowLayout` via `useWizardGuards`; this
 * component is pure chrome. Its wrapper `<div>`s carry `.wizard-*` classes
 * that `responsive.css` targets (ADR 0004 step 4) — the render tree can now
 * be reshaped without breaking the theme/responsive CSS.
 */
export default function WizardChrome() {
  const navigate = useNavigate();
  const location = useLocation();

  const step = useStore(submissionStore, (s) => s.step);
  const insuredProfile = useStore(insuredProfileStore, (s) => s.insuredProfile);
  const isAuthenticated = Boolean(
    insuredProfile?.id || insuredProfile?.name || insuredProfile?.username,
  );
  const { phaseLabel } = useQuoteSnapshot();
  const { isOpenOrder } = usePolicyStatus();
  const goBack = useWizardBackNav({ step, isOpenOrder, isAuthenticated });

  // The long desktop marketing stack is scoped to the early funnel — only
  // the soft-quote route (`/quote`). The hero chrome above renders on every
  // wizard route.
  const showHubMarketing = location.pathname === "/quote";

  return (
    <>
      {/* MedMalGuard header at EVERY viewport — on phones the NavBar
          collapses to the logo lockup + hamburger, matching the landing.
          The slim mobile bar below keeps only back / theme / step. */}
      <div className="app-header">
        <MedMalGuardHeader />
      </div>

      <div
        className="wizard-topbar"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "12px 18px 8px",
          borderBottom: "1px solid #f0f0f0",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {step > 0 ? (
            <button
              type="button"
              onClick={goBack}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: 0,
                display: "flex",
              }}
            >
              <ArrowLeft />
            </button>
          ) : isAuthenticated ? (
            <button
              type="button"
              onClick={() => {
                sessionStore.dashView = "dashboard";
                navigate("/dashboard");
              }}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: 0,
                display: "flex",
              }}
            >
              <ArrowLeft />
            </button>
          ) : null}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <ThemeToggle />
          <div style={{ textAlign: "right" }}>
            <div
              style={{
                fontSize: 9,
                color: "#595959",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              {phaseLabel}
            </div>
            <div style={{ fontSize: 10, color: "#595959" }}>
              Step {step + 1} of {TOTAL_STEPS}
            </div>
          </div>
        </div>
      </div>
      <div className="wizard-progress" style={{ padding: "0 18px" }}>
        <ProgressBar />
      </div>

      <div
        className="wizard-content"
        style={{
          flex: 1,
          padding: "0 18px 18px",
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Desktop-only back control. The mobile topbar above carries its
            own arrow, but `.hub-desktop`'s sibling rule in responsive.css
            hides that whole bar >=1024px and MedMalGuardHeader (which
            replaces it) has no back affordance — so without this the
            wizard has no way back on desktop. Wrapped in `.hub-desktop`
            so mobile doesn't get a second arrow. Shares goBack() with the
            topbar, keeping the step-7/step-4 rules in one place. */}
        <div className="hub-desktop">
          <BackControl onClick={goBack} />
        </div>
        <Outlet />
      </div>
      <QuoteSnapshotRail />

      <div
        className="wizard-footer-line"
        style={{
          padding: "6px 16px",
          borderTop: "1px solid #f0f0f0",
          textAlign: "center",
          fontSize: 10,
          color: "#595959",
        }}
      >
        SelectFirst Insurance Services · (888) 959-9456 ·{" "}
        <LegalLink
          onClick={() => {
            modalStore.showAbout = true;
          }}
        >
          About
        </LegalLink>{" "}
        ·{" "}
        <LegalLink
          onClick={() => {
            modalStore.showPrivacy = true;
          }}
        >
          Privacy
        </LegalLink>{" "}
        ·{" "}
        <LegalLink
          onClick={() => {
            modalStore.showTerms = true;
          }}
        >
          Terms
        </LegalLink>
      </div>

      {/* Desktop-only hub marketing + COI previewer. Hidden < 1024px via
          `.hub-desktop`; the soft-quote route only. */}
      {showHubMarketing ? (
        <>
          <HubCOIPreview />
          <HubMarketing />
        </>
      ) : null}
    </>
  );
}

// Desktop back control for the wizard form column. Icon-only would match the
// mobile topbar, but at the top of a wide content column a bare 18px grey
// glyph reads as decoration — so this pairs the same ArrowLeft with a "Back"
// label. Hover shifts to --blue, matching the wordmark's phone link.
function BackControl({ onClick }: { onClick: () => void }) {
  const [hover, setHover] = useState(false);
  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        alignSelf: "flex-start",
        background: "none",
        border: "none",
        // Left-aligns the arrow with the column edge while keeping a
        // comfortable click target.
        padding: "0 8px 0 0",
        marginBottom: 16,
        cursor: "pointer",
        fontFamily: "var(--font-body)",
        fontSize: 13,
        fontWeight: 500,
        letterSpacing: 0.2,
        color: hover ? "var(--blue)" : "#888",
        transition: "color 0.15s ease",
      }}
    >
      {/* Base Icon rather than the ArrowLeft wrapper — ArrowLeft hardcodes
          stroke="#888", which would leave the glyph grey while the label
          turns blue on hover. */}
      <Icon
        size={18}
        stroke={hover ? "var(--blue)" : "#888"}
        d={
          <>
            <path d="M19 12H5" />
            <path d="M12 19l-7-7 7-7" />
          </>
        }
      />
      Back
    </button>
  );
}

// Renders the same underlined-link visual as the previous clickable
// <span>, but as a real <button> so keyboard / screen-reader users can
// actually trigger it. Visual parity is preserved (no border, no
// background, inherits inline color/font), so the user journey looks
// identical.
function LegalLink({
  onClick,
  children,
  style,
}: {
  onClick: () => void;
  children: ReactNode;
  style?: CSSProperties;
}) {
  const baseStyle: CSSProperties = {
    background: "none",
    border: "none",
    padding: 0,
    cursor: "pointer",
    font: "inherit",
    color: style?.color || "#aaa",
    textDecoration: "underline",
  };
  return (
    <button type="button" onClick={onClick} style={{ ...baseStyle, ...(style || {}) }}>
      {children}
    </button>
  );
}
