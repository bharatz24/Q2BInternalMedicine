// MedMalGuard "Claude1" landing page (Concept 1 — Calculator-first).
import type { CSSProperties, ReactNode } from "react";
//
// Recreates the approved PA quote-to-bind landing design from the
// design_handoff bundle, built with this app's inline-style approach (no
// Tailwind) and the kit's tokens. It is a self-contained, responsive
// landing rendered ONLY on the "/" route (see FlowLayout): a new nav, a
// two-column hero whose right side is a live quote calculator, a trust
// band, how-it-works, a need-help card, and the new dark footer.
//
// Wiring: the calculator reuses the EXISTING soft-quote flow — it writes
// designation/ZIP/date into practiceStore and hands off via
// navigate(STEP_PATHS[step]), the same way PracticeTypePage does, so every
// CTA feeds the current quote→bind flow. No new routes are invented.
//
// The instant estimate is real, live data — `POST /auth/quotedata` against
// INS-SERVICE (`useIlfDlfFetcher`), the same contract Q2BNfy's landing
// calculator uses. There is no speciality picker: this portal has exactly one
// designation, Internal Medicine, which maps 1:1 to the real speciality-master
// code SP_14 (see `designations.js`) — all `/auth/quotedata` needs. It is
// auto-selected on mount.
//
// The estimate is NOT fetched as the user types — the user clicks "Get
// estimate" (mirrors Q2BNfy's landing). That first click also loads the
// state's coverage-limit options (`GET /auth/{zip}/coverage-limits`) and
// reveals a limit picker (pre-selected to the state default) plus a retro
// date field (pre-filled to the coverage start date). From then on any
// change — ZIP, start date, designation, limit, retro — re-prices via
// `/auth/quotedata` (debounced), which takes `coverageLimitId` / `retroDate`
// as optional inputs, and the "your price, all-in" breakdown (premium +
// carrier fees + taxes) updates in place.
//
// Colors come from the kit. Where the active theme is medmalguard ("Cl1")
// the runtime --brand* tokens already resolve to the kit blue, but this
// page hard-codes the kit palette so it renders faithfully under any theme
// (it is the approved, fixed design — not theme-driven chrome).

import { useNavigate } from "react-router-dom";
import { useStore } from "@/shared/store/useStore";
import practiceStore from "@/modules/Quote/store/practiceStore";
import physicianProfileStore from "@/modules/Quote/store/physicianProfileStore";
import authFormStore from "@/modules/Auth/store/authFormStore";
import submissionStore from "@/modules/Quote/store/submissionStore";
import insuredProfileStore from "@/shared/store/insuredProfileStore";
import modalStore from "@/shared/store/modalStore";
import { STEP_PATHS } from "@/modules/Quote/constants";
import {
  addCalendarYearsToMdY,
  fmtDate,
  formatDate,
  mdYToSortInt,
  toMdY,
} from "@/shared/utils/dateHelpers";
import { useState, useEffect, useRef } from "react";
import ilfDlfStore from "@/modules/Quote/store/ilfDlfStore";
import { useIlfDlfFetcher, useCoverageLimitsFetcher } from "@/modules/Quote/utils/useIlfDlfFetcher";
import { formatUsd } from "@/modules/Quote/utils/decimal";
import { DESIGNATIONS } from "@/modules/Quote/data/designations.js";
import quoteHeroImg from "@/Quote.webp";

const visuallyHidden: CSSProperties = {
  position: "absolute",
  width: 1,
  height: 1,
  padding: 0,
  margin: -1,
  overflow: "hidden",
  clip: "rect(0 0 0 0)",
  whiteSpace: "nowrap",
  border: 0,
};
import {
  invalidMessage,
  isValidMdyDate,
  isValidZip,
  VALIDATION_MSG,
} from "@/shared/utils/validators";
import {
  FieldControlProvider,
  useControlIds,
  useFieldControlProps,
} from "@/shared/components/Field";
import {
  Shield,
  Phone,
  Mail,
  ArrowRight,
  Calendar,
  ChevronDown,
  X,
} from "@/shared/components/desktop/HubIcons";
import { signOut, resetSubmissionForNewQuote } from "@/modules/Auth/services/authSessionService";

// ── Kit tokens (design_handoff/ui-kit/medmalguard-ui.css) ────────────────
const C = {
  accent: "#6286ed",
  accentStrong: "#2653d4",
  accentTint: "#eff3fd",
  ink: "#2a2c45",
  inkSoft: "#3a3b50",
  body: "#6e7080",
  muted: "#9598a8",
  bg: "#ffffff",
  bgSubtle: "#f8f9fc",
  bgApp: "#fafbfd",
  dark: "#2a2c45",
  onDarkMuted: "#aab0c8",
  border: "#e3e6f0",
  borderSoft: "#eef0f5",
  inputBorder: "#d7dbe8",
  success: "#1cc88a",
  successStrong: "#0f9d6e",
  successTint: "#e6f8f1",
  successBorder: "#c9efdf",
  successDeep: "#0a6b4a",
};
const FONT = "'Inter', ui-sans-serif, system-ui, -apple-system, sans-serif";
const FOCUS_RING = "0 0 0 0.1rem rgba(78,115,223,0.25)";

const PHONE = "(888) 966-3881";
const PHONE_HREF = "tel:+18889663881";
const SUPPORT_EMAIL = "support@medmalguard.com";

export default function MedMalGuardLanding() {
  const navigate = useNavigate();

  const designation = useStore(practiceStore, (s) => s.designation);
  const zip = useStore(practiceStore, (s) => s.zip);
  const effectiveDate = useStore(practiceStore, (s) => s.effectiveDate);

  // One designation only (Internal Medicine) — select it automatically, and
  // again after "Get a quote" clears the form, so the calculator is always
  // priced against SP_14 without asking the applicant to pick anything.
  useEffect(() => {
    if (designation || DESIGNATIONS.length !== 1) return;
    practiceStore.designation = DESIGNATIONS[0].code;
    practiceStore.specialityCodes = [DESIGNATIONS[0].specialityCode];
  }, [designation]);

  // The REAL price — POST /auth/quotedata, what this card actually displays.
  const ilf = useStore(ilfDlfStore, (s) => s.current);
  const ilfDlfLoading = useStore(ilfDlfStore, (s) => s.ilfDlfLoading);
  const ilfDlfError = useStore(ilfDlfStore, (s) => s.ilfDlfError);
  // Coverage-limit options for the entered ZIP's state (GET
  // /auth/{zip}/coverage-limits) — the limit picker fills from this and
  // auto-selects the state default.
  const coverageLimits = useStore(ilfDlfStore, (s) => s.coverageLimits);
  const coverageLimitsLoading = useStore(ilfDlfStore, (s) => s.coverageLimitsLoading);
  const applicantEmail = useStore(physicianProfileStore, (s) => s.email);
  const insuredProfile = useStore(insuredProfileStore, (s) => s.insuredProfile);
  const isAuthenticated = Boolean(
    insuredProfile?.id || insuredProfile?.name || insuredProfile?.username,
  );

  const currentDesignation = DESIGNATIONS.find((d) => d.code === designation) || null;

  const fetchIlfDlf = useIlfDlfFetcher();
  const fetchCoverageLimits = useCoverageLimitsFetcher();
  const zipErr = invalidMessage(zip, isValidZip, VALIDATION_MSG.zip);
  const effErr = invalidMessage(effectiveDate, isValidMdyDate, VALIDATION_MSG.date);
  const fieldsValid = Boolean(currentDesignation && zip && !zipErr && effectiveDate && !effErr);

  // The estimate is NOT fetched as the user types — it fires only when the
  // user clicks "Get estimate" (mirrors Q2BNfy's landing calculator). Once
  // requested, any later change (ZIP, start date, designation, coverage
  // limit, retro date) re-prices automatically, debounced.
  const [estimateRequested, setEstimateRequested] = useState(false);

  // Retro date field — auto-fills to the effective date and stays in lockstep
  // with it until the user edits it themselves.
  const [retroDate, setRetroDate] = useState("");
  const [retroTouched, setRetroTouched] = useState(false);
  useEffect(() => {
    if (!retroTouched) setRetroDate(effectiveDate || "");
  }, [effectiveDate, retroTouched]);

  // Selected coverage-limit id — lives in `ilfDlfStore` (not page-local) so
  // `/quote`, the snapshot rail and review all show the limit the estimate
  // was priced at. Auto-set to the state default row once the options load,
  // kept if the user has already picked a still-valid one.
  const selectedLimitId = useStore(ilfDlfStore, (s) => s.selectedCoverageLimitId);
  const setSelectedLimitId = (v: any) => {
    ilfDlfStore.selectedCoverageLimitId = v;
  };
  const defaultLimit = coverageLimits.find((l) => l.isDefault) || coverageLimits[0] || null;
  const selectedLimit = coverageLimits.find((l) => l.id === selectedLimitId) || null;
  useEffect(() => {
    if (coverageLimits.length === 0) return;
    const cur = ilfDlfStore.selectedCoverageLimitId;
    if (cur != null && coverageLimits.some((l) => l.id === cur)) return;
    ilfDlfStore.selectedCoverageLimitId = defaultLimit ? defaultLimit.id : null;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- re-seed the default only when the option list itself changes; `defaultLimit` is derived from `coverageLimits` and adding it would just re-run this on every render.
  }, [coverageLimits]);

  // Only send coverageLimitId / retroDate to /auth/quotedata when they
  // differ from the defaults the backend would apply anyway — keeps the
  // "default" estimate on one cache key and avoids a redundant re-price the
  // moment the default limit auto-selects.
  const retroMdy = fmtDate(retroDate);
  const effMdy = fmtDate(effectiveDate);
  const pricingLimitId = selectedLimit && !selectedLimit.isDefault ? selectedLimit.id : null;
  const retroIsCustom = retroTouched && Boolean(retroMdy) && retroMdy !== effMdy;
  // Client-side guard for the same rule the backend enforces
  // ("Retro date must not be after the effective date") — shown inline and
  // used to block both the re-price and Continue.
  const retroAfterEff = Boolean(
    retroMdy && effMdy && mdYToSortInt(retroMdy) > mdYToSortInt(effMdy),
  );
  const retroError = retroAfterEff ? "Retro date must not be after the effective date." : "";

  // Mirror the retro date the estimate is priced at into the store so
  // `/quote` re-prices to match (the selected limit already lives there).
  useEffect(() => {
    ilfDlfStore.retroDate = retroIsCustom ? retroMdy : "";
  }, [retroIsCustom, retroMdy]);

  // Debounced re-price: only after the first "Get estimate" click.
  useEffect(() => {
    if (!estimateRequested || !fieldsValid || retroError) return undefined;
    const t = setTimeout(() => {
      fetchIlfDlf({
        zipcode: zip,
        specialityCode: currentDesignation!.specialityCode,
        effectiveDate,
        coverageLimitId: pricingLimitId || undefined,
        retroDate: retroIsCustom ? retroMdy : undefined,
      }).catch(() => {
        /* error already captured in ilfDlfStore */
      });
    }, 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- debounced re-price keyed only on the primitive form inputs; `fetchIlfDlf` (a hook-returned fetcher) and `currentDesignation` (an object rebuilt each render) are intentionally excluded — `currentDesignation?.code` stands in for identity.
  }, [
    estimateRequested,
    fieldsValid,
    retroError,
    zip,
    effectiveDate,
    currentDesignation?.code,
    pricingLimitId,
    retroIsCustom,
    retroMdy,
  ]);

  // Refresh the coverage-limit options whenever the ZIP changes (and once,
  // when the estimate is first requested) — limits are state-driven.
  useEffect(() => {
    if (!estimateRequested || !zip || zipErr) return;
    fetchCoverageLimits(zip).catch(() => {
      /* error already captured in ilfDlfStore */
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- refetch options only when the ZIP (or first estimate request) changes; `fetchCoverageLimits` is a stable hook-returned fetcher.
  }, [estimateRequested, zip, zipErr]);

  const handleGetEstimate = () => {
    if (!fieldsValid) return;
    // Flip the flag — the two effects above then run the quotedata fetch and
    // the coverage-limits fetch. Also kick the price fetch off now so it
    // doesn't wait a render.
    setEstimateRequested(true);
    fetchIlfDlf({
      zipcode: zip,
      specialityCode: currentDesignation!.specialityCode,
      effectiveDate,
    }).catch(() => {
      /* error already captured in ilfDlfStore */
    });
  };

  const onRetroChange = (v: any) => {
    setRetroTouched(true);
    setRetroDate(formatDate(v));
  };

  const hasEstimate = Boolean(ilf);
  const bothEntered = Boolean(designation && zip && effectiveDate);
  const showQuoteError = bothEntered && Boolean(ilfDlfError);

  const totalLabel = ilf ? formatUsd(ilf.total) : null;
  const limitsLabel = selectedLimit?.limit || ilf?.defaultIlfDlfName || "—";
  const policyType = "Claims made";

  // Fee / tax line items straight off the quotedata response (label/value
  // pairs, carrier- and state-driven) for the "your price, all-in" breakdown.
  const feeRows = hasEstimate && Array.isArray(ilf?.fees) ? ilf.fees : [];
  const taxRows = hasEstimate && Array.isArray(ilf?.taxes) ? ilf.taxes : [];
  const annualPremium =
    hasEstimate && Number.isFinite(Number(ilf?.premium)) ? Number(ilf!.premium) : null;

  // Continue to bind — only valid once the real estimate is ready, with no
  // outstanding pricing error (e.g. a bad retro date) and nothing still in
  // flight. (Nursing also required its local rating engine's quote here; that
  // engine has no Internal Medicine designation and was not carried over, so
  // keeping the gate would disable Continue forever.) Advances into the
  // existing soft-quote step of the wizard (no new routes).
  const canContinue = hasEstimate && !retroError && !ilfDlfError && !ilfDlfLoading;
  const handleContinue = () => {
    if (!canContinue) return;
    // Fresh funnel run — drop any submission id / order / question state left
    // over from a previously created or bound order so the authed /register
    // step opens a NEW submission instead of re-editing the old one. Keeps
    // the practice inputs / estimate the user is continuing from.
    resetSubmissionForNewQuote();
    submissionStore.step = 1;
    navigate(STEP_PATHS[1]);
  };

  const onSignIn = () => {
    if (isAuthenticated) {
      navigate("/dashboard");
      return;
    }
    if (applicantEmail.trim()) authFormStore.loginEmail = applicantEmail.trim();
    navigate("/signin");
  };

  // Header "Get a quote" on the landing: the calculator IS the hero, so reset
  // the fields so it starts blank, then smooth-scroll to it and focus the
  // first field.
  const onGetQuote = () => {
    practiceStore.clear();
    ilfDlfStore.clear();
    setEstimateRequested(false);
    setRetroTouched(false);
    setRetroDate("");
    setSelectedLimitId(null);
    const el = document.getElementById("quote");
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "start" });
    const firstInput = el.querySelector("input");
    if (firstInput) setTimeout(() => firstInput.focus({ preventScroll: true }), 400);
  };

  return (
    <div className="mmg-landing" style={{ fontFamily: FONT, color: C.body, background: C.bg }}>
      <NavBar onSignIn={onSignIn} onGetQuote={onGetQuote} isAuthenticated={isAuthenticated} />

      {/* ── Hero ───────────────────────────────────────────────────────── */}
      <div className="mmg-section mmg-hero">
        <div className="mmg-hero__left">
          {/* Hero banner — carries the headline and marketing copy as artwork;
              the h1 stays in the DOM, visually hidden, for screen readers. */}
          <h1 className="mmg-h1" style={visuallyHidden}>
            Internal Medicine Malpractice Insurance
          </h1>
          <img
            src={quoteHeroImg}
            alt="Internal Medicine Malpractice Insurance, coverage by Doctors Professional Liability, RRG. Coverage for internal medicine providers (MD, DO, PA, NP, CRNA, CNM and others), priced by where you practice and bound online in a single session. Certificate in minutes; License Defense Protection included; trusted by 10,000+ insured practitioners; Demotech Financial Stability Rating A (Exceptional)."
            width={1024}
            height={1330}
            fetchPriority="high"
            decoding="async"
            style={{
              display: "block",
              width: "100%",
              height: "auto",
              borderRadius: 16,
              boxShadow: "0 10px 30px rgba(15, 40, 80, .12)",
            }}
          />
        </div>

        {/* Quote calculator card. id="quote" is the scroll target for the
            header "Get a quote" CTA; scroll-margin-top clears the sticky nav. */}
        <div className="mmg-hero__right" id="quote" style={{ scrollMarginTop: 90 }}>
          <div style={calcCard}>
            <div style={calcHeader}>
              <div>
                <div
                  style={{ fontWeight: 800, fontSize: 16, color: C.ink, letterSpacing: "-.01em" }}
                >
                  Instant estimate
                </div>{" "}
              </div>
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  background: C.successTint,
                  color: C.successStrong,
                  fontWeight: 700,
                  fontSize: 11,
                  padding: "6px 11px",
                  borderRadius: 20,
                  flexShrink: 0,
                }}
              >
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: C.success }} />
                Live rate
              </span>
            </div>

            <div style={{ padding: "22px 22px 24px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <CalcField label="Practice ZIP code" required error={zipErr} compact>
                  <CalcInput
                    value={zip}
                    onChange={(v) => {
                      practiceStore.zip = v.replace(/\D/g, "").slice(0, 5);
                    }}
                    placeholder="e.g. 92653"
                    inputMode="numeric"
                    maxLength={5}
                  />
                </CalcField>
                <CalcField label="Effective date" required error={effErr} compact>
                  <CalcDateInput
                    value={effectiveDate}
                    onChange={(v) => {
                      practiceStore.effectiveDate = formatDate(v);
                    }}
                    placeholder="MM/DD/YYYY"
                  />
                </CalcField>
              </div>

              {/* Coverage limit + retro date — appear once an estimate has
                  been requested. The limit list comes from
                  GET /auth/{zip}/coverage-limits and pre-selects the state
                  default; the retro date pre-fills to the coverage start
                  date. Changing either re-prices the estimate below. */}
              {estimateRequested && (
                <>
                  <CalcField label="Limit of liability" compact>
                    {coverageLimitsLoading && coverageLimits.length === 0 ? (
                      <div style={{ fontSize: 12, color: C.muted, padding: "4px 0" }}>
                        Loading limits…
                      </div>
                    ) : coverageLimits.length > 0 ? (
                      <CalcSelect
                        value={selectedLimitId ?? ""}
                        onChange={(v) => setSelectedLimitId(Number(v))}
                      >
                        {coverageLimits.map((l) => (
                          <option key={l.id} value={l.id}>
                            {l.limit}
                          </option>
                        ))}
                      </CalcSelect>
                    ) : (
                      <div style={{ fontSize: 12, color: C.muted, padding: "4px 0" }}>
                        No selectable limits for this ZIP — the state default applies.
                      </div>
                    )}
                  </CalcField>

                  <CalcField label="Retroactive date" error={retroError} compact>
                    <CalcDateInput
                      value={retroDate}
                      onChange={onRetroChange}
                      max={
                        effMdy
                          ? `${effMdy.slice(6, 10)}-${effMdy.slice(0, 2)}-${effMdy.slice(3, 5)}`
                          : undefined
                      }
                      placeholder="MM/DD/YYYY"
                    />
                    <div style={{ fontSize: 11, color: C.muted, marginTop: 6 }}>
                      Defaults to your effective date. Cannot be after it.
                    </div>
                  </CalcField>
                </>
              )}

              {showQuoteError && (
                <div
                  style={{
                    background: "#fdf4f3",
                    border: "1px solid #f5dcd9",
                    color: "#c0564f",
                    borderRadius: 10,
                    padding: "10px 12px",
                    fontSize: 13,
                    fontWeight: 500,
                    marginBottom: 14,
                  }}
                >
                  {ilfDlfError?.message || "That can't be priced yet — fill in every field above."}
                </div>
              )}

              <div style={estimateBlock}>
                {estimateRequested && ilfDlfLoading ? (
                  <div
                    style={{ fontSize: 13, color: C.body, textAlign: "center", padding: "6px 0" }}
                  >
                    Calculating your estimate…
                  </div>
                ) : estimateRequested && hasEstimate ? (
                  <>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        justifyContent: "space-between",
                        gap: 12,
                      }}
                    >
                      <div>
                        <div
                          style={{
                            fontWeight: 700,
                            fontSize: 11,
                            textTransform: "uppercase",
                            letterSpacing: ".06em",
                            color: C.body,
                          }}
                        >
                          Annual premium
                        </div>
                        <div
                          style={{ display: "flex", alignItems: "baseline", gap: 6, marginTop: 6 }}
                        >
                          <span
                            style={{
                              fontWeight: 800,
                              fontSize: 36,
                              color: C.ink,
                              lineHeight: 1,
                              letterSpacing: "-.02em",
                            }}
                          >
                            {totalLabel}
                          </span>
                        </div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={metaChip}>
                          {ilf!.state}, {ilf!.st}
                        </div>
                        <div style={{ ...metaChip, marginTop: 6 }}>{limitsLabel}</div>
                      </div>
                    </div>
                    <div style={{ fontSize: 12, color: C.muted, marginTop: 10, lineHeight: 1.45 }}>
                      {ilf!.effectiveDate || effectiveDate} –{" "}
                      {addCalendarYearsToMdY(ilf!.effectiveDate || effectiveDate, 1) || "—"}
                      <span style={{ color: C.border }}> · </span>
                      {policyType}
                      <span style={{ color: C.border }}> · </span>
                      Retro {retroMdy || effMdy || "—"}
                    </div>

                    {/* Your price, all-in — premium + carrier fees + taxes,
                        straight off the quotedata response. Re-fetched
                        whenever a field above changes. */}
                    <div
                      style={{ borderTop: `1px solid ${C.border}`, marginTop: 14, paddingTop: 12 }}
                    >
                      <div
                        style={{
                          fontWeight: 700,
                          fontSize: 11,
                          textTransform: "uppercase",
                          letterSpacing: ".05em",
                          color: C.body,
                          marginBottom: 8,
                        }}
                      >
                        Your price, all-in
                      </div>
                      <EstimateRow label="Annual premium" value={annualPremium} />
                      {feeRows.map((f, i) => (
                        <EstimateRow
                          key={`fee-${i}`}
                          label={f?.label || "Fee"}
                          value={Number(f?.value) || 0}
                        />
                      ))}
                      {taxRows.length > 0 && (
                        <EstimateRow
                          label="Taxes"
                          value={taxRows.reduce((sum, t) => sum + (Number(t?.value) || 0), 0)}
                        />
                      )}
                      <div style={{ borderTop: `1px solid ${C.border}`, margin: "8px 0" }} />
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          padding: "4px 0",
                        }}
                      >
                        <span style={{ fontWeight: 800, fontSize: 14, color: C.ink }}>
                          Total due today
                        </span>
                        <span style={{ fontWeight: 800, fontSize: 14, color: C.ink }}>
                          {totalLabel}
                        </span>
                      </div>
                    </div>
                  </>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
                      <span
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: 10,
                          background: "#fff",
                          border: `1px solid #dce6f8`,
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                        }}
                      >
                        <Calendar size={18} color={C.accentStrong} />
                      </span>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 14, color: C.ink }}>
                          See your price in seconds
                        </div>
                        <div style={{ fontSize: 13, color: C.body, marginTop: 4, lineHeight: 1.5 }}>
                          Enter your practice ZIP and effective date and hit Get estimate — no SSN
                          or credit check.
                        </div>
                      </div>
                    </div>
                    {/* Only shown once designation + ZIP + start date are all
                        filled and valid. */}
                    {fieldsValid && (
                      <button
                        type="button"
                        onClick={handleGetEstimate}
                        style={{
                          alignSelf: "flex-start",
                          background: "#fff",
                          border: `1px solid ${C.accent}`,
                          color: C.accentStrong,
                          fontFamily: "inherit",
                          fontWeight: 700,
                          fontSize: 13,
                          padding: "10px 16px",
                          borderRadius: 8,
                          cursor: "pointer",
                        }}
                      >
                        Get estimate
                      </button>
                    )}
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={handleContinue}
                disabled={!canContinue}
                style={ctaBtn(canContinue)}
                onMouseEnter={(e) => {
                  if (canContinue) e.currentTarget.style.background = C.accentStrong;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = C.accent;
                }}
              >
                {retroError || ilfDlfError
                  ? "Fix the details above to continue"
                  : hasEstimate
                    ? "Continue with this estimate"
                    : "Fill in every field to continue"}
                <ArrowRight size={17} color="#fff" />
              </button>

              {!isAuthenticated && (
                <div
                  style={{
                    fontWeight: 500,
                    fontSize: 13,
                    color: C.muted,
                    textAlign: "center",
                    marginTop: 12,
                  }}
                >
                  Already have an account?{" "}
                  <button
                    type="button"
                    onClick={onSignIn}
                    style={{
                      background: "none",
                      border: 0,
                      padding: 0,
                      font: "inherit",
                      fontWeight: 600,
                      color: C.accentStrong,
                      textDecoration: "underline",
                      cursor: "pointer",
                    }}
                  >
                    Sign in
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Trust band ─────────────────────────────────────────────────── */}
      <div className="mmg-trust-band">
        <TrustCell
          eyebrow="Coverage provided by"
          value="DPL RRG"
          caption="Doctors Professional Liability, RRG"
        />
        <TrustCell eyebrow="Financial stability" value="Demotech" caption="Rated A (Exceptional)" />
        <TrustCell eyebrow="Reinsured by" value="Lloyd's" caption="of London" />
        <TrustCell eyebrow="Track record" value="10,000+" caption="Practitioners insured" />
      </div>

      {/* ── How it works ───────────────────────────────────────────────── */}
      <div className="mmg-section">
        <span
          style={{
            fontWeight: 700,
            fontSize: 10,
            textTransform: "uppercase",
            letterSpacing: ".07em",
            color: C.muted,
          }}
        >
          How it works
        </span>
        <h2
          style={{
            fontWeight: 800,
            fontSize: 30,
            letterSpacing: "-.01em",
            color: C.ink,
            margin: "10px 0 26px",
          }}
        >
          From price to certificate in three steps
        </h2>
        <div className="mmg-how-grid">
          <HowCard
            n="1"
            title="See your price"
            body="Enter your practice ZIP and effective date for a live, carrier-backed estimate — no SSN or credit check."
            accent
          />
          <HowCard
            n="2"
            title="Confirm & bind"
            body="Answer a short set of underwriting questions, choose your limit of liability, and bind your policy online in one session."
            accent
          />
          <HowCard
            n="3"
            title="Get your certificate"
            body="Your certificate of insurance is ready instantly on straightforward submissions."
          />
        </div>
      </div>

      {/* ── Need help? ─────────────────────────────────────────────────── */}
      {/* Last section before the retained marketing sections (COI previewer
          adds its own 48px top padding + hairline), so trim the bottom
          padding here to avoid a doubled vertical gap. */}
      <div className="mmg-section" style={{ paddingTop: 0, paddingBottom: 8 }}>
        <div style={needCard}>
          <span
            style={{
              fontWeight: 700,
              fontSize: 10,
              textTransform: "uppercase",
              letterSpacing: ".07em",
              color: C.muted,
            }}
          >
            Need help?
          </span>
          <div className="mmg-need-rows">
            <a href={PHONE_HREF} style={needRow}>
              <span style={needIconWrap}>
                <Phone size={18} color={C.accentStrong} />
              </span>
              <span>
                <span style={needRowLabel}>Call</span>
                <span style={needRowValue}>{PHONE}</span>
              </span>
            </a>
            <a href={`mailto:${SUPPORT_EMAIL}`} style={needRow}>
              <span style={needIconWrap}>
                <Mail size={18} color={C.accentStrong} />
              </span>
              <span>
                <span style={needRowLabel}>Email</span>
                <span style={needRowValue}>{SUPPORT_EMAIL}</span>
              </span>
            </a>
          </div>
        </div>
      </div>

      {/* The new dark footer is rendered separately at the very END of the
          landing route (see MedMalGuardFooter, mounted last by FlowLayout)
          so it sits below all the retained previous sections. */}
    </div>
  );
}

// New design footer (dark). Exported on its own so FlowLayout can mount it
// as the very last element on the landing route, beneath the previous
// header/sections that are retained below the new landing.
export function MedMalGuardFooter() {
  return null;
}

// "Affordable Coverage / Certificate in Minutes" map section, recreated
// from the live coverxpro SingleSpeciality landing page (LandingModule):
// two stacked headings split by a centered hairline, the US services map,
// an "Available in 21 States" bar, and the full grid of state codes in
// alternating tints. Mounted by FlowLayout AFTER the dark footer, per the
// requested placement (last section on the landing route).
//
// State codes + their alternating tint class are reproduced verbatim from
// the source (which itself contains the data quirks "GI" and "IS").
// The 20 states where coverage is actively written, in alphabetical order.
// Only these are shown in the grid (states we don't write in are omitted).
const MAP_STATES = [
  "AZ",
  "CA",
  "CO",
  "CT",
  "DE",
  "FL",
  "GA",
  "HI",
  "IL",
  "MD",
  "MI",
  "NC",
  "NJ",
  "NY",
  "OH",
  "PA",
  "SC",
  "TN",
  "TX",
  "WA",
];

export function MedMalGuardMap() {
  return (
    <section className="mmg-map" style={{ fontFamily: FONT, background: "#fff" }}>
      {/* Heading block: "Affordable Coverage" / divider / "Certificate in Minutes" */}
      <div
        className="mmg-map__banner"
        style={{
          background: "#e3f5ff",
          padding: "32px 24px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 16,
        }}
      >
        <h2
          style={{
            margin: 0,
            fontWeight: 800,
            fontSize: 30,
            letterSpacing: "-.01em",
            color: C.ink,
            textAlign: "center",
          }}
        >
          Affordable Coverage
        </h2>
        <div style={{ width: "min(360px, 60%)", borderBottom: `5px solid ${C.ink}` }} />
        <h2
          style={{
            margin: 0,
            fontWeight: 800,
            fontSize: 30,
            letterSpacing: "-.01em",
            color: C.ink,
            textAlign: "center",
          }}
        >
          Certificate in Minutes
        </h2>
      </div>

      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "32px 40px" }}>
        {/* US services map */}
        <div style={{ textAlign: "center" }}>
          <img
            src="/us-services-map.webp"
            alt="States where coverage is available"
            width={601}
            height={402}
            loading="lazy"
            decoding="async"
            style={{
              maxWidth: "100%",
              height: "auto",
              border: `1px solid ${C.border}`,
              borderRadius: 12,
              padding: 8,
              background: "#fff",
            }}
          />
        </div>

        {/* Available-in bar */}
        <div
          style={{
            background: C.accentStrong,
            color: "#fff",
            borderRadius: 12,
            textAlign: "center",
            padding: "14px 16px",
            margin: "24px 0 20px",
          }}
        >
          <span style={{ fontWeight: 700, fontSize: 18 }}>Available in 20 States</span>
        </div>

        {/* State grid — the 20 states we actively write in, alphabetical. */}
        <div className="mmg-map__grid">
          {MAP_STATES.map((code) => (
            <div
              key={code}
              className="mmg-map__cell"
              style={{ background: "#f2f4f8", color: "#1a1a1a", fontWeight: 700 }}
            >
              {code}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Sub-components ───────────────────────────────────────────────────────

function NavBar({
  onSignIn,
  onGetQuote,
  isAuthenticated,
}: {
  onSignIn: () => void;
  onGetQuote: () => void;
  isAuthenticated?: boolean;
}) {
  const navigate = useNavigate();
  // Scroll-triggered header definition: the nav sits flush (no border/shadow)
  // at the very top, and once the page scrolls it gains a hairline + soft drop
  // shadow so the eye registers where the nav ends and content begins. Sticky
  // so it stays visible while scrolling (the pattern only reads when pinned).
  const [scrolled, setScrolled] = useState(false);
  // Mobile slide-out menu + logged-in avatar dropdown.
  const [menuOpen, setMenuOpen] = useState(false);
  const [acctOpen, setAcctOpen] = useState(false);
  const acctRef = useRef<HTMLDivElement>(null);
  const insuredProfile = useStore(insuredProfileStore, (s) => s.insuredProfile);
  // Same derivation the wizard header avatar uses (derivedValues).
  const initials = (insuredProfile?.abbreviation || insuredProfile?.username || "JD")
    .toString()
    .slice(0, 2)
    .toUpperCase();
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4);
    onScroll(); // initialize for non-zero initial scroll positions
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Avatar dropdown dismissal: outside click or Escape.
  useEffect(() => {
    if (!acctOpen) return;
    const onDown = (e: MouseEvent) => {
      if (acctRef.current && !acctRef.current.contains(e.target as Node)) setAcctOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setAcctOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [acctOpen]);

  // Page scroll locks while the mobile menu sheet is open.
  useEffect(() => {
    if (!menuOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [menuOpen]);

  const closeAll = () => {
    setMenuOpen(false);
    setAcctOpen(false);
  };
  const go = (fn: () => void) => {
    closeAll();
    fn();
  };
  const handleSignOut = async () => {
    closeAll();
    await signOut();
    navigate("/");
  };

  const navLinkBtn: CSSProperties = {
    background: "none",
    border: 0,
    padding: 0,
    fontFamily: "inherit",
    fontWeight: 600,
    fontSize: 13,
    color: C.body,
    textDecoration: "none",
    cursor: "pointer",
  };
  const avatarCircle: CSSProperties = {
    width: 40,
    height: 40,
    borderRadius: "50%",
    background: "#dbe5fa",
    color: C.accent,
    fontWeight: 800,
    fontSize: 15,
    letterSpacing: ".02em",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
  };
  const dropItem: CSSProperties = {
    display: "block",
    width: "100%",
    textAlign: "left",
    background: "none",
    border: 0,
    padding: "10px 16px",
    fontFamily: "inherit",
    fontWeight: 600,
    fontSize: 13,
    color: C.inkSoft,
    cursor: "pointer",
  };
  const sheetRow: CSSProperties = {
    display: "flex",
    alignItems: "center",
    width: "100%",
    textAlign: "left",
    background: "none",
    border: 0,
    borderTop: `1px solid ${C.borderSoft}`,
    padding: "20px 24px",
    fontFamily: "inherit",
    fontWeight: 700,
    fontSize: 19,
    color: C.ink,
    cursor: "pointer",
    textDecoration: "none",
  };

  // Menu-sheet rows (mobile). Logged in mirrors the approved mock: Dashboard,
  // Profile Settings, About Us, FAQ, … ; logged out leads with Home + Sign In.
  const sheetItems = [
    ...(isAuthenticated
      ? [
          { label: "Dashboard", onClick: () => navigate("/dashboard") },
          { label: "Profile Settings", onClick: () => navigate("/profile") },
        ]
      : [{ label: "Home", onClick: () => navigate("/") }]),
    {
      label: "About Us",
      onClick: () => {
        modalStore.showAbout = true;
      },
    },
    {
      label: "FAQ",
      onClick: () => {
        modalStore.showFAQ = true;
      },
    },
    { label: "Articles", onClick: () => navigate("/articles") },
    ...(isAuthenticated
      ? [{ label: "Sign out", onClick: handleSignOut, raw: true }]
      : [{ label: "Sign In", onClick: onSignIn }]),
  ];

  return (
    <nav style={{ ...nav, ...(scrolled ? navScrolled : null) }}>
      <div className="mmg-nav__inner" style={navInner}>
        {/* Brand lockup: shield + wordmark with the "by Select First
            Insurance" attribution line beneath (per the approved mock). */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span
            style={{
              display: "inline-flex",
              width: 34,
              height: 34,
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 8,
              background: C.accent,
              flexShrink: 0,
            }}
          >
            <Shield size={20} color="#fff" />
          </span>
          <span style={{ display: "flex", flexDirection: "column" }}>
            <span
              style={{
                fontWeight: 800,
                fontSize: 19,
                color: C.ink,
                letterSpacing: "-.01em",
                lineHeight: 1.15,
              }}
            >
              MedMal<span style={{ color: C.accent }}>Guard</span>
            </span>
            <span style={{ fontWeight: 500, fontSize: 12, color: C.body, lineHeight: 1.25 }}>
              by Select First Insurance
            </span>
          </span>
        </div>

        <div className="mmg-nav__right" style={{ display: "flex", alignItems: "center", gap: 26 }}>
          <button
            type="button"
            onClick={() => go(() => navigate("/"))}
            style={navLinkBtn}
            className="mmg-nav__link"
          >
            Home
          </button>
          <button
            type="button"
            onClick={() => {
              modalStore.showAbout = true;
            }}
            style={navLinkBtn}
            className="mmg-nav__link"
          >
            About Us
          </button>
          <button
            type="button"
            onClick={() => {
              modalStore.showFAQ = true;
            }}
            style={navLinkBtn}
            className="mmg-nav__link"
          >
            FAQ
          </button>
          <button
            type="button"
            onClick={() => navigate("/articles")}
            style={navLinkBtn}
            className="mmg-nav__link"
          >
            Articles
          </button>
          <a
            href={PHONE_HREF}
            className="mmg-nav__phone"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              fontWeight: 700,
              fontSize: 13,
              color: C.ink,
              textDecoration: "none",
            }}
          >
            <Phone size={14} color={C.ink} />
            {PHONE}
          </a>
          {/* Right cluster. Logged out: Sign In (ghost) + Get a quote (solid).
              Logged in: Get a quote + the avatar/initials dropdown. */}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {!isAuthenticated && (
              <button
                type="button"
                onClick={onSignIn}
                style={ghostBtn}
                className="mmg-nav__ghost"
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = C.accentTint;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "transparent";
                }}
              >
                Sign In
              </button>
            )}
            <button
              type="button"
              onClick={onGetQuote}
              style={solidNavBtn}
              className="mmg-nav__cta"
              onMouseEnter={(e) => {
                e.currentTarget.style.background = C.accentStrong;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = C.accent;
              }}
            >
              Get a quote
            </button>
            {isAuthenticated && (
              <div ref={acctRef} style={{ position: "relative" }}>
                <button
                  type="button"
                  onClick={() => setAcctOpen((o) => !o)}
                  aria-label="Account menu"
                  aria-expanded={acctOpen}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    background: "none",
                    border: 0,
                    padding: 0,
                    cursor: "pointer",
                  }}
                >
                  <span style={avatarCircle}>{initials}</span>
                  <ChevronDown
                    size={16}
                    color={C.ink}
                    style={{
                      transform: acctOpen ? "rotate(180deg)" : "none",
                      transition: "transform .15s ease",
                    }}
                  />
                </button>
                {acctOpen && (
                  <div
                    style={{
                      position: "absolute",
                      top: "calc(100% + 10px)",
                      right: 0,
                      minWidth: 190,
                      background: "#fff",
                      border: `1px solid ${C.border}`,
                      borderRadius: 12,
                      boxShadow: "0 12px 30px rgba(42,44,69,.14)",
                      padding: "6px 0",
                      zIndex: 80,
                    }}
                  >
                    <button
                      type="button"
                      style={dropItem}
                      onClick={() => go(() => navigate("/dashboard"))}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = C.bgSubtle;
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = "transparent";
                      }}
                    >
                      Dashboard
                    </button>
                    <button
                      type="button"
                      style={dropItem}
                      onClick={() => go(() => navigate("/profile"))}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = C.bgSubtle;
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = "transparent";
                      }}
                    >
                      Profile Settings
                    </button>
                    <div style={{ borderTop: `1px solid ${C.borderSoft}`, margin: "6px 0" }} />
                    <button
                      type="button"
                      style={dropItem}
                      onClick={handleSignOut}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = C.bgSubtle;
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = "transparent";
                      }}
                    >
                      Sign out
                    </button>
                  </div>
                )}
              </div>
            )}
            {/* Hamburger — hidden on desktop, shown < 720px via responsive.css. */}
            <button
              type="button"
              className="mmg-nav__burger"
              onClick={() => setMenuOpen(true)}
              aria-label="Open menu"
              style={{
                display: "none",
                flexDirection: "column",
                gap: 4,
                background: "none",
                border: 0,
                padding: 6,
                cursor: "pointer",
              }}
            >
              <span
                style={{
                  display: "block",
                  width: 20,
                  height: 2,
                  borderRadius: 2,
                  background: C.ink,
                }}
              />
              <span
                style={{
                  display: "block",
                  width: 20,
                  height: 2,
                  borderRadius: 2,
                  background: C.ink,
                }}
              />
              <span
                style={{
                  display: "block",
                  width: 20,
                  height: 2,
                  borderRadius: 2,
                  background: C.ink,
                }}
              />
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu sheet — floating rounded panel over a dark scrim, per
          the approved mock: wordmark + close, then big tappable rows. */}
      {menuOpen && (
        <div style={{ position: "fixed", inset: 0, zIndex: 1200, fontFamily: FONT }}>
          <button
            type="button"
            aria-label="Close menu"
            onClick={closeAll}
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              border: 0,
              padding: 0,
              background: "rgba(42,44,69,0.5)",
              cursor: "pointer",
            }}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Site menu"
            style={{
              position: "absolute",
              top: 12,
              left: 12,
              width: "min(360px, 85vw)",
              maxHeight: "calc(100vh - 24px)",
              overflowY: "auto",
              background: "#fff",
              borderRadius: 14,
              boxShadow: "0 18px 50px rgba(42,44,69,.28)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "20px 24px",
              }}
            >
              <button
                type="button"
                onClick={() => go(() => navigate("/"))}
                style={{
                  background: "none",
                  border: 0,
                  padding: 0,
                  cursor: "pointer",
                  fontFamily: "inherit",
                  fontWeight: 800,
                  fontSize: 21,
                  color: C.ink,
                  letterSpacing: "-.01em",
                }}
              >
                MedMal<span style={{ color: C.accent }}>Guard</span>
              </button>
              <button
                type="button"
                onClick={closeAll}
                aria-label="Close menu"
                style={{
                  background: "none",
                  border: 0,
                  padding: 4,
                  cursor: "pointer",
                  display: "inline-flex",
                }}
              >
                <X size={22} color={C.inkSoft} />
              </button>
            </div>
            {sheetItems.map((item) => (
              <button
                key={item.label}
                type="button"
                style={sheetRow}
                onClick={item.raw ? item.onClick : () => go(item.onClick)}
              >
                {item.label}
              </button>
            ))}
            <a
              href={PHONE_HREF}
              style={{ ...sheetRow, gap: 10, color: C.accentStrong, fontSize: 16 }}
            >
              <Phone size={16} color={C.accentStrong} />
              {PHONE}
            </a>
            {!isAuthenticated && (
              <div style={{ padding: "8px 24px 22px" }}>
                <button
                  type="button"
                  onClick={() => go(onGetQuote)}
                  style={{ ...solidNavBtn, width: "100%", padding: "12px 18px", fontSize: 15 }}
                >
                  Get a quote
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}

// Standalone MedMalGuard header for the wizard routes (steps 2–10). Renders
// the same NavBar the landing page uses, with its own sign-in/dashboard
// wiring so FlowLayout can mount it without threading props. Replaces the
// teal HubHeader on those routes. Always in the React tree; FlowLayout
// decides where it shows (it's not gated to desktop, matching the landing
// nav which is responsive).
export function MedMalGuardHeader() {
  const navigate = useNavigate();
  const insuredProfile = useStore(insuredProfileStore, (s) => s.insuredProfile);
  const isAuthenticated = Boolean(
    insuredProfile?.id || insuredProfile?.name || insuredProfile?.username,
  );
  const onSignIn = () => {
    if (isAuthenticated) {
      navigate("/dashboard");
      return;
    }
    navigate("/signin");
  };
  // Off the landing, the calculator lives on "/", so "Get a quote" routes
  // there (the landing's own handler scrolls to the calculator in place).
  // Reset the form fields first so the calculator mounts blank.
  const onGetQuote = () => {
    practiceStore.clear();
    navigate("/");
  };
  return <NavBar onSignIn={onSignIn} onGetQuote={onGetQuote} isAuthenticated={isAuthenticated} />;
}

function TrustCell({
  eyebrow,
  value,
  caption,
}: {
  eyebrow?: ReactNode;
  value?: ReactNode;
  caption?: ReactNode;
}) {
  return (
    <div>
      <div
        style={{
          fontWeight: 700,
          fontSize: 10,
          textTransform: "uppercase",
          letterSpacing: ".06em",
          color: C.muted,
          marginBottom: 9,
        }}
      >
        {eyebrow}
      </div>
      <div style={{ fontWeight: 800, fontSize: 26, lineHeight: 1, color: C.ink, marginBottom: 6 }}>
        {value}
      </div>
      <div style={{ fontWeight: 500, fontSize: 13, lineHeight: 1.4, color: C.body }}>{caption}</div>
    </div>
  );
}

function HowCard({
  n,
  title,
  body,
  accent,
}: {
  n?: ReactNode;
  title?: ReactNode;
  body?: ReactNode;
  accent?: boolean;
}) {
  const chipBg = accent ? C.accentTint : C.successTint;
  const chipFg = accent ? C.accentStrong : C.successStrong;
  return (
    <div
      style={{ border: `1px solid ${C.border}`, borderRadius: 14, padding: 26, background: C.bg }}
    >
      <div
        style={{
          width: 40,
          height: 40,
          borderRadius: 10,
          background: chipBg,
          color: chipFg,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontWeight: 800,
          fontSize: 18,
          marginBottom: 16,
        }}
      >
        {n}
      </div>
      <div style={{ fontWeight: 700, fontSize: 17, color: C.ink, marginBottom: 8 }}>{title}</div>
      <div style={{ fontSize: 14, lineHeight: 1.6, color: C.body }}>{body}</div>
    </div>
  );
}

// One line of the "your price, all-in" breakdown: label left, dollar amount
// right. Amounts render through formatUsd so they group and round the same
// way the headline total does.
function EstimateRow({ label, value }: { label?: ReactNode; value?: any }) {
  const n = Number(value);
  const money = Number.isFinite(n) ? formatUsd(n) : "—";
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 8,
        padding: "5px 0",
      }}
    >
      <span style={{ fontSize: 13, color: C.inkSoft }}>{label}</span>
      <span style={{ fontSize: 13, color: C.inkSoft, whiteSpace: "nowrap" }}>{money}</span>
    </div>
  );
}

function CalcField({
  label,
  required,
  error,
  children,
  compact,
  trailing,
}: {
  label?: ReactNode;
  required?: boolean;
  error?: ReactNode;
  children?: ReactNode;
  compact?: boolean;
  trailing?: ReactNode;
}) {
  const { controlId, errorId, describedBy } = useControlIds({ error: Boolean(error) });
  return (
    <div style={{ marginBottom: compact ? 14 : 16 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
          marginBottom: 8,
        }}
      >
        <label
          htmlFor={controlId}
          style={{
            display: "block",
            fontWeight: 600,
            fontSize: 12,
            textTransform: "uppercase",
            letterSpacing: ".05em",
            color: C.body,
          }}
        >
          {label}
          {required && (
            <span style={{ color: "#b00020", marginLeft: 4 }} aria-hidden="true">
              *
            </span>
          )}
        </label>
        {trailing}
      </div>
      <FieldControlProvider
        value={{ controlId, describedBy, invalid: Boolean(error), required: Boolean(required) }}
      >
        {children}
      </FieldControlProvider>
      {error && (
        <div
          id={errorId}
          role="alert"
          style={{ fontSize: 12, color: "#b00020", marginTop: 6, lineHeight: 1.4 }}
        >
          {error}
        </div>
      )}
    </div>
  );
}

interface CalcInputProps {
  value?: string | number;
  onChange: (value: string) => void;
  placeholder?: string;
  inputMode?: any;
  maxLength?: number;
  onKeyDown?: (e: any) => void;
  onBlur?: (e: any) => void;
  min?: string;
  max?: string;
}

function CalcInput({
  value,
  onChange,
  placeholder,
  inputMode,
  maxLength,
  onKeyDown,
  onBlur,
}: CalcInputProps) {
  const fieldProps = useFieldControlProps();
  return (
    <input
      {...fieldProps}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={onKeyDown}
      placeholder={placeholder}
      inputMode={inputMode}
      maxLength={maxLength}
      autoComplete="off"
      style={{
        width: "100%",
        boxSizing: "border-box",
        border: `1px solid ${C.inputBorder}`,
        borderRadius: 10,
        padding: "13px 15px",
        fontFamily: "inherit",
        fontWeight: 600,
        fontSize: 16,
        color: C.ink,
        background: "#fff",
        transition: "background .15s ease-in-out, box-shadow .15s ease-in-out",
      }}
      onFocus={(e) => {
        e.target.style.boxShadow = FOCUS_RING;
        e.target.style.background = C.accentTint;
      }}
      onBlur={(e) => {
        e.target.style.boxShadow = "none";
        e.target.style.background = "#fff";
        if (onBlur) onBlur(e);
      }}
    />
  );
}

// Native <select> styled like CalcInput, with a chevron drawn over the right
// edge (pointer-events: none so clicks still open the native list).
function CalcSelect({
  value,
  onChange,
  children,
}: {
  value: string | number;
  onChange: (value: string) => void;
  children: ReactNode;
}) {
  const fieldProps = useFieldControlProps();
  return (
    <div style={{ position: "relative" }}>
      <select
        {...fieldProps}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          width: "100%",
          boxSizing: "border-box",
          appearance: "none",
          WebkitAppearance: "none",
          border: `1px solid ${C.inputBorder}`,
          borderRadius: 10,
          padding: "13px 42px 13px 15px",
          fontFamily: "inherit",
          fontWeight: 600,
          fontSize: 16,
          color: C.ink,
          background: "#fff",
          cursor: "pointer",
          transition: "background .15s ease-in-out, box-shadow .15s ease-in-out",
        }}
        onFocus={(e) => {
          e.target.style.boxShadow = FOCUS_RING;
          e.target.style.background = C.accentTint;
        }}
        onBlur={(e) => {
          e.target.style.boxShadow = "none";
          e.target.style.background = "#fff";
        }}
      >
        {children}
      </select>
      <ChevronDown
        size={16}
        color={C.body}
        style={{
          position: "absolute",
          right: 15,
          top: "50%",
          transform: "translateY(-50%)",
          pointerEvents: "none",
        }}
      />
    </div>
  );
}

// Effective-date input: a manual-entry MM/DD/YYYY text field with a calendar
// affordance on the right. Typing works exactly as before. The native date
// picker opens when the calendar area is tapped/clicked.
//
// Mobile-safe: rather than call showPicker() on a hidden input (unsupported
// on iOS Safari, flaky on Android), a REAL transparent <input type="date"> is
// overlaid on the calendar-icon zone. Tapping the icon is tapping the date
// input itself, so the OS-native picker opens reliably everywhere. The glyph
// is drawn behind the transparent overlay; on desktop we also call
// showPicker() on click as a nicety.
function CalcDateInput({
  value,
  onChange,
  placeholder,
  onKeyDown,
  onBlur,
  min,
  max,
}: CalcInputProps) {
  const dateRef = useRef<HTMLInputElement>(null);
  const fieldProps = useFieldControlProps();
  const ICON_ZONE = 44;
  // Convert the current MM/DD/YYYY text to the ISO (yyyy-mm-dd) the native
  // date input needs, so the picker opens on the already-entered date.
  const iso = (() => {
    const m = fmtDate(value); // "" unless 8 digits present
    if (!m) return "";
    const [mm, dd, yyyy] = m.split("/");
    return `${yyyy}-${mm}-${dd}`;
  })();
  return (
    <div style={{ position: "relative" }}>
      <input
        {...fieldProps}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        inputMode="numeric"
        autoComplete="off"
        style={{
          width: "100%",
          boxSizing: "border-box",
          border: `1px solid ${C.inputBorder}`,
          borderRadius: 10,
          padding: "13px 44px 13px 15px",
          fontFamily: "inherit",
          fontWeight: 600,
          fontSize: 16,
          color: C.ink,
          background: "#fff",
          transition: "background .15s ease-in-out, box-shadow .15s ease-in-out",
        }}
        onFocus={(e) => {
          e.target.style.boxShadow = FOCUS_RING;
          e.target.style.background = C.accentTint;
        }}
        onBlur={(e) => {
          e.target.style.boxShadow = "none";
          e.target.style.background = "#fff";
          if (onBlur) onBlur(e);
        }}
      />
      {/* Calendar glyph — visual only, behind the transparent date overlay. */}
      <span
        aria-hidden="true"
        style={{
          position: "absolute",
          top: "50%",
          right: 13,
          transform: "translateY(-50%)",
          display: "inline-flex",
          pointerEvents: "none",
        }}
      >
        <Calendar size={18} color={C.accentStrong} />
      </span>
      {/* Real native date input, transparent, overlaying only the icon zone.
          Tapping/clicking it opens the OS-native picker directly. */}
      <input
        ref={dateRef}
        type="date"
        value={iso}
        min={min}
        max={max}
        aria-label="Open date picker"
        onChange={(e) => onChange(toMdY(e.target.value))}
        onClick={() => {
          const el = dateRef.current;
          if (el && typeof el.showPicker === "function") {
            try {
              el.showPicker();
            } catch {
              /* opened via native tap */
            }
          }
        }}
        style={{
          position: "absolute",
          top: 0,
          right: 0,
          height: "100%",
          width: ICON_ZONE,
          margin: 0,
          padding: 0,
          border: 0,
          background: "transparent",
          color: "transparent",
          opacity: 0,
          cursor: "pointer",
          WebkitAppearance: "none",
          appearance: "none",
        }}
      />
    </div>
  );
}

// ── Inline style objects ─────────────────────────────────────────────────

// Header sits flush at the top (no border/shadow); on scroll it gains a
// hairline + soft drop shadow (see navScrolled) so the nav/content boundary
// reads clearly. Sticky + transition give the smooth modern feel.
const nav: CSSProperties = {
  background: C.bg,
  position: "sticky",
  top: 0,
  zIndex: 50,
  borderBottom: "1px solid transparent",
  boxShadow: "0 0 0 rgba(42,43,69,0)",
  transition: "box-shadow .2s ease, border-color .2s ease",
};
const navScrolled: CSSProperties = {
  borderBottom: "1px solid #E5E7EB",
  boxShadow: "0 4px 16px rgba(42,43,69,.06)",
};
const navInner: CSSProperties = {
  maxWidth: 1200,
  margin: "0 auto",
  padding: "18px 40px",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
};
const ghostBtn: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  border: `1px solid #cdd9f8`,
  color: C.accent,
  background: "transparent",
  fontWeight: 700,
  fontSize: 13,
  padding: "9px 16px",
  borderRadius: 8,
  cursor: "pointer",
  fontFamily: "inherit",
  transition: "background .15s ease-in-out",
};
// Solid primary header CTA — same footprint as ghostBtn (1px transparent
// border keeps both buttons the same height) so the pair aligns cleanly.
const solidNavBtn: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  border: "1px solid transparent",
  color: "#fff",
  background: C.accent,
  fontWeight: 700,
  fontSize: 13,
  padding: "9px 16px",
  borderRadius: 8,
  cursor: "pointer",
  fontFamily: "inherit",
  transition: "background .15s ease-in-out",
};

const calcCard: CSSProperties = {
  background: "#fff",
  border: `1px solid ${C.border}`,
  borderRadius: 16,
  boxShadow: "0 12px 40px rgba(42,43,69,.10)",
  overflow: "hidden",
  position: "relative",
};
const calcHeader: CSSProperties = {
  background: "linear-gradient(180deg, #f7f9fe 0%, #f3f6fc 100%)",
  borderBottom: `1px solid ${C.borderSoft}`,
  padding: "16px 22px",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
};
const estimateBlock: CSSProperties = {
  background: "linear-gradient(180deg, #f4f7fe 0%, #eef3fc 100%)",
  border: `1px solid #dce6f8`,
  borderRadius: 12,
  padding: "16px 18px",
  marginBottom: 16,
};
const metaChip: CSSProperties = {
  display: "inline-block",
  background: "#fff",
  border: `1px solid #dce6f8`,
  color: C.accentStrong,
  fontWeight: 700,
  fontSize: 11,
  padding: "4px 8px",
  borderRadius: 8,
};
const ctaBtn = (ok: boolean): CSSProperties => ({
  width: "100%",
  background: C.accent,
  color: "#fff",
  fontWeight: 700,
  fontSize: 15,
  fontFamily: "inherit",
  padding: "15px 16px",
  borderRadius: 10,
  border: 0,
  cursor: ok ? "pointer" : "not-allowed",
  opacity: ok ? 1 : 0.5,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
  transition: "background .15s ease-in-out",
});

const needCard: CSSProperties = {
  border: `1px solid ${C.border}`,
  borderRadius: 16,
  padding: "28px 32px",
};
const needRow: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 14,
  textDecoration: "none",
  padding: "14px 0",
};
const needIconWrap: CSSProperties = {
  display: "inline-flex",
  width: 40,
  height: 40,
  alignItems: "center",
  justifyContent: "center",
  borderRadius: 10,
  background: C.accentTint,
  flexShrink: 0,
};
const needRowLabel: CSSProperties = {
  display: "block",
  fontWeight: 700,
  fontSize: 10,
  textTransform: "uppercase",
  letterSpacing: ".06em",
  color: C.muted,
  marginBottom: 3,
};
const needRowValue: CSSProperties = {
  display: "block",
  fontWeight: 700,
  fontSize: 16,
  color: C.accentStrong,
};
