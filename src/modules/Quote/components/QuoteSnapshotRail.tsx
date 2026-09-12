import { STEP_NAMES } from "@/modules/Quote/constants";
import type { CSSProperties, ReactNode } from "react";
import { CheckIcon, ShieldIcon } from "@/shared/components/Icon";
import { ProgressBar } from "@/modules/Quote/components/ProgressBar";
import { useStore } from "@/shared/store/useStore";
import practiceStore from "@/modules/Quote/store/practiceStore";
import submissionStore from "@/modules/Quote/store/submissionStore";
import physicianProfileStore from "@/modules/Quote/store/physicianProfileStore";
import insuredProfileStore from "@/shared/store/insuredProfileStore";
import { useQuoteSnapshot } from "@/modules/Quote/utils/useQuoteSnapshot";
import { formatUsd } from "@/modules/Quote/utils/decimal";
import {
  TEAL_50,
  TEAL_100,
  TEAL_600,
  TEAL_700,
  TEAL_800,
  TEAL_900,
  SLATE_100,
  SLATE_200,
  SLATE_400,
  SLATE_500,
  SLATE_600,
  SLATE_800,
  SLATE_900,
  EMERALD_100,
  FONT_SANS,
  FONT_MONO,
} from "@/shared/components/desktop/hubTheme";

// Desktop hub redesign palette. The rail is desktop-only (hidden < 1024px
// via `.desktop-rail`), so these hub teal/slate values never reach the
// mobile UI. They replace the former runtime BRAND tokens here on purpose:
// the hub look does follow the theme toggle via the hub-brand-* ramp.

// Desktop-only side rail. Always rendered by FlowLayout; hidden via CSS
// below 1024px (see src/responsive.css `.desktop-rail` default `display: none`).
// View-only: no clicks, no state, no fetches. Reads from stores and degrades
// gracefully when individual fields are empty.
//
// Per spec section 3, the rail surfaces three distinct OOUX objects as
// stacked cards: Quote summary, Stepper, and Need help. The Insured
// object gets its own card when authenticated.
//
// The rail also renders the ProgressBar and footer line at its top
// (desktop only) so the right column reads as one vertical stack per
// the design mock. The mobile-position copies in FlowLayout are hidden
// on desktop via src/responsive.css.
export default function QuoteSnapshotRail() {
  const step = useStore(submissionStore, (s) => s.step);
  const effDate = useStore(practiceStore, (s) => s.effectiveDate);
  const employerName = useStore(practiceStore, (s) => s.employerName);
  const applicantFirstName = useStore(physicianProfileStore, (s) => s.firstName);
  const applicantLastName = useStore(physicianProfileStore, (s) => s.lastName);
  const regFullName = [applicantFirstName, applicantLastName].filter(Boolean).join(" ");
  const insuredProfile = useStore(insuredProfileStore, (s) => s.insuredProfile);
  const isAuthenticated = Boolean(
    insuredProfile?.id || insuredProfile?.name || insuredProfile?.username,
  );
  const {
    snapshotState,
    snapshotDurationLabel,
    snapshotBasePremium,
    snapshotLimits,
    snapshotPolicyLine,
    snapshotExpMdY,
    snapshotRetroMdY,
    headerUserInitials,
  } = useQuoteSnapshot();

  // The PA portal's "Trade" row showed the speciality master's title, fetched
  // per tab. Here that's the employer name — known from step 2 (`/practice`)
  // onward, same timing the student portal's hospital name had. Empty string
  // collapses the row, exactly as before.
  const tradeLabel = (employerName || "").toString().trim();
  const stateLabel =
    snapshotState && snapshotState !== "Your state" ? String(snapshotState).trim() : "";
  // The PA rail's ZIP row becomes the rated speciality — the one figure that
  // actually explains this product's price (§2.3 of the plan).
  const zipLabel = (snapshotDurationLabel || "").toString().trim();
  const effLabel = (effDate || "").toString().trim();
  const expLabel = (snapshotExpMdY || "").toString().trim();
  const retroLabel = (snapshotRetroMdY || "").toString().trim();
  const limitsLabel = snapshotLimits && snapshotLimits !== "—" ? snapshotLimits : "";
  const policyLine = (snapshotPolicyLine || "").toString().trim();

  const premiumNum = Number(snapshotBasePremium);
  const hasPremium = Number.isFinite(premiumNum) && premiumNum > 0;

  // Top line — name from /insured/session. Falls back to a full name
  // (e.g. just after signup, before the session DTO has a name) and then
  // to the email so the card never collapses.
  const sessionName = (insuredProfile?.name || "").toString().trim();
  const sessionEmail = (insuredProfile?.username || "").toString().trim();
  const sessionFullName =
    insuredProfile?.firstname && insuredProfile?.lastname
      ? `${insuredProfile.firstname} ${insuredProfile.lastname}`.trim()
      : "";
  const insuredName = sessionName || (regFullName || "").trim() || sessionFullName || sessionEmail;
  const insuredEmail = sessionEmail;

  // Step 0 with effectively no quote data yet → show a friendly intro.
  const hasAnyQuoteData = Boolean(
    tradeLabel || stateLabel || zipLabel || effLabel || limitsLabel || hasPremium,
  );
  const showIntro = step === 0 && !hasAnyQuoteData;

  const showInsuredCard = isAuthenticated && (insuredName || headerUserInitials);

  return (
    <aside className="desktop-rail" aria-label="Quote snapshot">
      {/* Desktop-only progress bar. Mirrors the mobile rendering in
          FlowLayout (hidden via CSS on desktop) so the rail can present
          it at the top of the right column per the design mock. */}
      <div className="rail-progress">
        <ProgressBar />
      </div>
      <div style={wrap}>
        {/* Soft-quote badge header (hub design): product pill + step
            counter mirror. Read-only — counter follows the wizard step.
            There is no plan tier to toggle (unlike Q2BNfy's "Classic"),
            so this names the product with a shield glyph — same re-skin
            q2b-students did to its own copy of this header ("Students"). */}
        <div style={softQuoteHeader}>
          <span style={classicPill}>
            <ShieldIcon size={12} /> Internal Medicine
          </span>
          <div style={{ textAlign: "right" }}>
            <span style={softQuoteCounter}>
              Soft Quote · Step {step + 1} of {STEP_NAMES.length}
            </span>
            <div style={softQuoteStepName}>{STEP_NAMES[step] || ""}</div>
          </div>
        </div>

        {/* Card 1 — Quote object */}
        <section style={card}>
          <div style={cardTitle}>Your active quote</div>
          <div style={cardDivider} />
          {showIntro ? (
            <div style={introText}>We'll build your quote here as you go.</div>
          ) : (
            <>
              <SnapshotRow label="Employer" value={tradeLabel} />
              <SnapshotRow label="State" value={stateLabel} />
              <SnapshotRow label="Rated on" value={zipLabel} />
              <SnapshotRow label="Effective" value={effLabel} />
              <SnapshotRow label="Expires" value={expLabel} />
              <SnapshotRow label="Retro" value={retroLabel} />
              <SnapshotRow label="Limits" value={limitsLabel} />
              <SnapshotRow label="Policy" value={policyLine} />
              {hasPremium ? (
                <div style={{ marginTop: 14 }}>
                  <div style={premLabel}>Est. premium</div>
                  <div style={premValue}>
                    {formatUsd(premiumNum)}
                    <span style={premSuffix}> / yr</span>
                  </div>
                </div>
              ) : null}
            </>
          )}
        </section>

        {/* Card 2 — Stepper (read-only mirror of the top-bar "Step X of Y") */}
        <section style={card}>
          <div style={cardTitle}>Application Steps</div>
          <div style={cardDivider} />
          <ol style={stepList}>
            {STEP_NAMES.map((name, i) => {
              const status = i < step ? "done" : i === step ? "current" : "pending";
              return (
                <li
                  key={name}
                  style={stepItem}
                  aria-current={status === "current" ? "step" : undefined}
                >
                  <span style={stepBullet(status)} aria-hidden="true">
                    {status === "done" ? (
                      <CheckIcon size={12} />
                    ) : status === "current" ? (
                      <span style={currentDot} />
                    ) : (
                      <span style={pendingDot} />
                    )}
                  </span>
                  <span style={stepText(status)} title={name}>
                    {name}
                  </span>
                </li>
              );
            })}
          </ol>
          {/* Goal chip — the *reward* at the end of the wizard, not a
              real step. Visually distinct from the list items (icon +
              filled background) so the brain doesn't habituate to it as
              "another chore". Brightens as the user gets close (goal-
              gradient effect): muted at the start of the funnel, full
              brand color on the Review step, and a soft pulse on the
              Payment step. Rendered outside the <ol> so it doesn't
              inherit list semantics. Not driven by STEP_NAMES — that
              array controls the topbar progress and adding a 10th entry
              would inflate "Step X of N" everywhere. */}
          <div style={goalChip(step)} aria-label="You're covered (goal)">
            <span style={goalChipIcon(step)} aria-hidden="true">
              <ShieldIcon size={14} />
            </span>
            <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.2 }}>
              <span style={goalChipLabel(step)}>You're covered</span>
              <span style={goalChipSub(step)}>{goalSubLabel(step)}</span>
            </div>
          </div>
        </section>

        {/* Card 3 — Insured object (only when authenticated) */}
        {showInsuredCard ? (
          <section style={card}>
            <div style={cardTitle}>Signed in</div>
            <div style={cardDivider} />
            <div style={insuredRow}>
              <div style={avatar}>{headerUserInitials}</div>
              <div style={{ minWidth: 0 }}>
                <div style={insuredNameStyle}>{insuredName || "Signed in"}</div>
                {insuredEmail ? (
                  <div style={insuredSub} title={insuredEmail}>
                    {insuredEmail}
                  </div>
                ) : null}
              </div>
            </div>
          </section>
        ) : null}

        {/* Card 4 — Need help. Phone + email, per spec section 4.3.
            The support email is the canonical one used throughout
            src/layout/Modals.jsx (About modal contact block, Terms §3
            and §6 cancellation contact, Privacy §… contact). */}
        <section style={card}>
          <div style={cardTitle}>Need help?</div>
          <div style={cardDivider} />
          <div style={helpRow}>
            <span style={helpLabel}>Call</span>
            <a href="tel:+18889599456" style={helpValue}>
              (888) 959-9456
            </a>
          </div>
          <div style={helpRow}>
            <span style={helpLabel}>Email</span>
            <a
              href="mailto:support@selectfirstinsurance.com"
              style={helpValue}
              title="support@selectfirstinsurance.com"
            >
              support@selectfirstinsurance.com
            </a>
          </div>
        </section>
      </div>
    </aside>
  );
}

function SnapshotRow({ label, value }: { label: ReactNode; value: ReactNode }) {
  if (value == null || String(value).trim() === "") return null;
  return (
    <div style={rowStyle}>
      <span style={rowLabel}>{label}</span>
      <span style={rowValue}>{String(value)}</span>
    </div>
  );
}

// --- soft-quote header styles (hub design) ------------------------------
const softQuoteHeader: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  paddingBottom: 12,
  borderBottom: `1px solid ${SLATE_100}`,
};

const classicPill: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 4,
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: "0.1em",
  color: TEAL_800,
  textTransform: "uppercase",
  background: TEAL_50,
  padding: "3px 8px",
  borderRadius: 4,
  border: `1px solid ${TEAL_100}`,
};

const softQuoteCounter: CSSProperties = {
  fontFamily: FONT_MONO,
  fontSize: 11,
  color: SLATE_400,
  fontWeight: 600,
  textTransform: "uppercase",
  letterSpacing: "0.05em",
};

const softQuoteStepName: CSSProperties = {
  fontSize: 12,
  fontWeight: 700,
  color: TEAL_800,
  letterSpacing: "-0.01em",
  marginTop: 2,
};

// --- styles ---------------------------------------------------------------

const wrap: CSSProperties = {
  position: "sticky",
  top: 32,
  // Cap height so a tall rail (step list + insured card + help card) on
  // a short form column (e.g. step 0 with two fields) self-scrolls
  // instead of clipping at the viewport bottom. 64px = top offset (32)
  // + a symmetric breathing gap at the bottom.
  maxHeight: "calc(100vh - 64px)",
  overflowY: "auto",
  display: "flex",
  flexDirection: "column",
  gap: 16,
  fontFamily: FONT_SANS,
};

const card: CSSProperties = {
  background: "#fff",
  border: `1px solid ${SLATE_200}`,
  borderRadius: 16,
  padding: "20px 22px",
  boxShadow: "0 1px 2px rgba(15,23,42,0.04)",
};

const cardTitle: CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  color: SLATE_400,
  fontFamily: FONT_MONO,
};

const cardDivider: CSSProperties = {
  height: 1,
  background: SLATE_100,
  margin: "12px -22px 14px",
};

const introText: CSSProperties = {
  fontSize: 13,
  color: SLATE_500,
  lineHeight: 1.5,
};

const rowStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  fontSize: 12,
  padding: "5px 0",
  color: SLATE_800,
};

const rowLabel: CSSProperties = {
  color: SLATE_500,
  fontWeight: 500,
  flexShrink: 0,
};

const rowValue: CSSProperties = {
  color: SLATE_800,
  textAlign: "right",
  fontWeight: 700,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};

const premLabel: CSSProperties = {
  fontSize: 10,
  color: SLATE_400,
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  fontWeight: 700,
  fontFamily: FONT_MONO,
  marginBottom: 4,
};

const premValue: CSSProperties = {
  fontFamily: FONT_SANS,
  fontSize: 26,
  fontWeight: 900,
  color: SLATE_900,
};

const premSuffix: CSSProperties = {
  fontFamily: FONT_SANS,
  fontSize: 12,
  fontWeight: 600,
  color: SLATE_500,
  marginLeft: 3,
};

const stepList: CSSProperties = {
  listStyle: "none",
  margin: 0,
  padding: "0 0 0 4px",
  display: "flex",
  flexDirection: "column",
  gap: 12,
};

const stepItem: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 12,
  fontSize: 12,
  lineHeight: 1,
};

const stepBullet = (status: string): CSSProperties => ({
  width: 16,
  height: 16,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: "50%",
  background: status === "done" ? EMERALD_100 : "transparent",
  color: status === "done" ? "#047857" : status === "current" ? TEAL_800 : "#cbd5e1",
  flexShrink: 0,
});

const currentDot: CSSProperties = {
  width: 10,
  height: 10,
  borderRadius: "50%",
  background: TEAL_800,
  display: "inline-block",
};

const pendingDot: CSSProperties = {
  width: 10,
  height: 10,
  borderRadius: "50%",
  border: "1px solid #cbd5e1",
  background: SLATE_100,
  display: "inline-block",
  boxSizing: "border-box",
};

const stepText = (status: string): CSSProperties => ({
  color: status === "pending" ? SLATE_400 : status === "current" ? TEAL_900 : SLATE_500,
  fontWeight: status === "current" ? 700 : 400,
  textDecoration: status === "done" ? "line-through" : "none",
  textDecorationColor: status === "done" ? SLATE_200 : undefined,
  letterSpacing: "0.01em",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
});

const insuredRow: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 10,
};

const avatar: CSSProperties = {
  width: 32,
  height: 32,
  borderRadius: "50%",
  background: TEAL_50,
  color: TEAL_800,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: 12,
  fontWeight: 700,
  flexShrink: 0,
};

const insuredNameStyle: CSSProperties = {
  fontSize: 13,
  fontWeight: 700,
  color: SLATE_800,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};

const insuredSub: CSSProperties = {
  fontSize: 11,
  color: SLATE_400,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};

const helpRow: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 12,
  fontSize: 12,
  padding: "5px 0",
  fontWeight: 500,
  color: SLATE_600,
};

const helpLabel: CSSProperties = { color: SLATE_500, flexShrink: 0 };

const helpValue: CSSProperties = {
  color: TEAL_800,
  textDecoration: "none",
  fontWeight: 700,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
  minWidth: 0,
};

// --- Goal chip ----------------------------------------------------------
// Three intensities based on how close `step` is to the finish (9-step flow,
// last step = Binder & Invoice at index 8):
//   far       (step <= 5): muted; present but quiet
//   near      (step 6–7, Review / Payment): full brand color, no pulse
//   imminent  (step 8, Binder): full color + soft pulse
// The intensity function is shared by all chip styles so they shift in
// lockstep — change here, not in five places.
function chipIntensity(step: number) {
  if (step >= 8) return "imminent";
  if (step >= 6) return "near";
  return "far";
}

function goalSubLabel(step: number) {
  const remaining = Math.max(0, 8 - step);
  if (remaining === 0) return "Almost there";
  if (remaining === 1) return "1 step to go to lock binder";
  return `${remaining} steps to go to lock binder`;
}

const goalChip = (step: number): CSSProperties => {
  const intensity = chipIntensity(step);
  return {
    marginTop: 24,
    paddingTop: 16,
    borderTop: `1px solid ${SLATE_100}`,
    display: "flex",
    alignItems: "center",
    gap: 12,
    transition: "background 0.3s, border-color 0.3s",
    animation: intensity === "imminent" ? "q2bGoalPulse 1.8s ease-in-out infinite" : "none",
    // inner chip styling lives via the wrapper below — keep the top
    // divider look matching the hub's "You're covered" footer block.
    background: "transparent",
  };
};

const goalChipIcon = (step: number): CSSProperties => {
  const intensity = chipIntensity(step);
  return {
    width: 28,
    height: 28,
    borderRadius: 8,
    background: intensity === "far" ? "#e2e8f0" : TEAL_600,
    color: "#fff",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    boxShadow: "0 1px 2px rgba(15,23,42,0.08)",
    transition: "background 0.3s, color 0.3s",
  };
};

const goalChipLabel = (step: number): CSSProperties => {
  const intensity = chipIntensity(step);
  return {
    fontSize: 12,
    fontWeight: 700,
    color: intensity === "far" ? SLATE_500 : TEAL_900,
    transition: "color 0.3s",
  };
};

const goalChipSub = (step: number): CSSProperties => {
  const intensity = chipIntensity(step);
  return {
    fontSize: 11,
    color: intensity === "far" ? SLATE_400 : TEAL_700,
    fontWeight: 500,
    transition: "color 0.3s",
  };
};
