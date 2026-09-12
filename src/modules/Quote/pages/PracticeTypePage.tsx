import { useEffect } from "react";
import { useNavigate, useNavigationType } from "react-router-dom";
import { BRAND, BRAND_LIGHT } from "@/shared/constants";
import { STEP_PATHS } from "@/modules/Quote/constants";
import Alert from "@/shared/components/Alert";
import { formatDate } from "@/shared/utils/dateHelpers";
import { Field } from "@/shared/components/Field";
import { TextInput } from "@/shared/components/TextInput";
import { RadioCard } from "@/shared/components/RadioCard";
import { LegalLink } from "@/shared/components/LegalLink";
import { SectionTitle } from "@/shared/components/SectionTitle";
import { Spacer } from "@/shared/components/Spacer";
import { ShieldIcon } from "@/shared/components/Icon";
import { btnOutline, btnPrimary, dis } from "@/shared/utils/styles";
import { formatUsd } from "@/modules/Quote/utils/decimal";
import { DESIGNATIONS } from "@/modules/Quote/data/designations.js";
import { useIlfDlfFetcher } from "@/modules/Quote/utils/useIlfDlfFetcher";
import {
  invalidMessage,
  isValidMdyDate,
  isValidZip,
  VALIDATION_MSG,
} from "@/shared/utils/validators";

import { useStore } from "@/shared/store/useStore";
import practiceStore from "@/modules/Quote/store/practiceStore";
import ilfDlfStore from "@/modules/Quote/store/ilfDlfStore";
import insuredProfileStore from "@/shared/store/insuredProfileStore";
import physicianProfileStore from "@/modules/Quote/store/physicianProfileStore";
import authFormStore from "@/modules/Auth/store/authFormStore";
import submissionStore from "@/modules/Quote/store/submissionStore";
import { resetSubmissionForNewQuote } from "@/modules/Auth/services/authSessionService";

/**
 * Step 0 — practice, ZIP and effective date: the inputs that decide the
 * price. There is one practice type (Internal Medicine, SP_14 — see
 * `designations.js`), shown as a single pre-selected card; Nursing's
 * speciality chip grid is gone because the price is keyed on the
 * speciality-master code alone.
 *
 * NOTE: on the "/" route, `FlowLayout` renders `MedMalGuardLanding` INSTEAD
 * of this routed page — its hero calculator collects the same fields,
 * writing to the same `practiceStore`, so the two stay in lockstep. This page
 * still renders for any unmatched path (the `*` catch-all in
 * `AppRoutes.tsx`), so it's kept fully working rather than treated as dead
 * code.
 */
export default function PracticeTypePage() {
  const navigate = useNavigate();
  const navType = useNavigationType();

  const designation = useStore(practiceStore, (s) => s.designation);
  const zip = useStore(practiceStore, (s) => s.zip);
  const effectiveDate = useStore(practiceStore, (s) => s.effectiveDate);
  // The REAL price — POST /auth/quotedata — same source MedMalGuardLanding
  // uses. The designation alone drives it (1:1 speciality-master mapping).
  const ilf = useStore(ilfDlfStore, (s) => s.current);
  const ilfDlfError = useStore(ilfDlfStore, (s) => s.ilfDlfError);
  const applicantEmail = useStore(physicianProfileStore, (s) => s.email);
  const insuredProfile = useStore(insuredProfileStore, (s) => s.insuredProfile);
  const isAuthenticated = Boolean(
    insuredProfile?.id || insuredProfile?.name || insuredProfile?.username,
  );

  // Clear fields on fresh entry; preserve them when navigating back.
  useEffect(() => {
    if (navType === "POP") return;
    practiceStore.clear();
    ilfDlfStore.clear();
    // Fresh funnel entry — also drop any submission id / order / question
    // state from a previously created or bound order, so an authed applicant
    // starting a new quote opens a NEW submission at /register rather than
    // re-editing the last one.
    resetSubmissionForNewQuote();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fresh-funnel-entry reset, must run exactly once on mount; the store helpers it calls are module singletons.
  }, []);

  // One designation only — (re-)select it whenever the store is empty.
  useEffect(() => {
    if (designation || DESIGNATIONS.length !== 1) return;
    practiceStore.designation = DESIGNATIONS[0].code;
    practiceStore.specialityCodes = [DESIGNATIONS[0].specialityCode];
  }, [designation]);

  const currentDesignation = DESIGNATIONS.find((d) => d.code === designation) || null;
  const fetchIlfDlf = useIlfDlfFetcher();
  const zipErr = invalidMessage(zip, isValidZip, VALIDATION_MSG.zip);
  const effErr = invalidMessage(effectiveDate, isValidMdyDate, VALIDATION_MSG.date);
  const fieldsValid = Boolean(currentDesignation && zip && !zipErr && effectiveDate && !effErr);

  // Debounced real-estimate fetch, same pattern as MedMalGuardLanding.
  useEffect(() => {
    if (!fieldsValid) return undefined;
    const t = setTimeout(() => {
      fetchIlfDlf({
        zipcode: zip,
        specialityCode: currentDesignation!.specialityCode,
        effectiveDate,
      }).catch(() => {
        /* error already captured in ilfDlfStore */
      });
    }, 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- debounced re-price keyed only on the primitive form inputs; `fetchIlfDlf` is a stable hook-returned fetcher, `currentDesignation` is rebuilt each render (`?.code` stands in for identity).
  }, [fieldsValid, zip, effectiveDate, currentDesignation?.code]);

  const onSelectDesignation = (code: string) => {
    const picked = DESIGNATIONS.find((d) => d.code === code);
    practiceStore.designation = code;
    practiceStore.specialityCodes = picked ? [picked.specialityCode] : [];
    ilfDlfStore.clear();
  };

  const canSubmit = Boolean(ilf);

  const goTo = (step: number) => {
    if (!canSubmit) return;
    submissionStore.step = step;
    navigate(STEP_PATHS[step]);
  };

  const onSignInLink = () => {
    if (applicantEmail.trim()) authFormStore.loginEmail = applicantEmail.trim();
    navigate("/signin");
  };

  const bothEntered = Boolean(designation && zip && effectiveDate);
  const showError = bothEntered && Boolean(ilfDlfError);

  return (
    <div style={{ position: "relative", flex: 1, display: "flex", flexDirection: "column" }}>
      <div style={{ textAlign: "center", margin: "10px 0 4px" }}>
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: "50%",
            background: BRAND_LIGHT,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <ShieldIcon size={22} />
        </div>
      </div>
      <h1
        className="ui-heading"
        style={{
          fontFamily: "var(--font-heading)",
          fontSize: 22,
          fontWeight: 600,
          color: "#1a1a1a",
          textAlign: "center",
          margin: "8px 0 4px",
        }}
      >
        Internal Medicine malpractice coverage
      </h1>
      <p
        style={{
          fontSize: 13,
          color: "#595959",
          textAlign: "center",
          lineHeight: 1.5,
          margin: "0 0 20px",
        }}
      >
        Where you practice and when coverage starts set the price.
      </p>

      <SectionTitle required>Your practice</SectionTitle>
      {DESIGNATIONS.map((d) => (
        <RadioCard
          key={d.code}
          selected={designation === d.code}
          onClick={() => onSelectDesignation(d.code)}
          title={d.label}
          subtitle={d.subtitle}
        />
      ))}

      <SectionTitle>Where and when</SectionTitle>
      <Field label="Practice ZIP code" required>
        <TextInput
          value={zip}
          onChange={(v) => {
            practiceStore.zip = v.replace(/\D/g, "").slice(0, 5);
          }}
          placeholder="e.g. 92653"
          inputMode="numeric"
          maxLength={5}
          autoComplete="off"
        />
      </Field>
      <Field label="Coverage start date" required>
        <TextInput
          value={effectiveDate}
          onChange={(v) => {
            practiceStore.effectiveDate = formatDate(v);
          }}
          placeholder="MM/DD/YYYY"
          inputMode="numeric"
          pattern="(0[1-9]|1[0-2])/(0[1-9]|[12]\d|3[01])/\d{4}"
          title="MM/DD/YYYY"
          autoComplete="off"
        />
      </Field>

      <div style={{ borderTop: "1px solid #f0f0f0", margin: "0 0 16px" }} />

      {ilf ? (
        <div
          style={{
            background: "#f7f7f5",
            borderRadius: 12,
            padding: "12px 14px",
            marginBottom: 14,
          }}
        >
          <div style={{ fontSize: 13, fontWeight: 500, color: "#333", marginBottom: 4 }}>
            {ilf.state}, {ilf.st}
          </div>
          <div
            className="ui-heading"
            style={{
              fontFamily: "var(--font-heading)",
              fontSize: 22,
              fontWeight: 600,
              color: "#1a1a1a",
            }}
          >
            {formatUsd(ilf.total)} / yr estimated
          </div>
        </div>
      ) : (
        <div style={{ opacity: 1, pointerEvents: "none" }}>
          <SectionTitle>Premium</SectionTitle>
          {[60, 80, 45].map((w, i) => (
            <div
              key={i}
              style={{
                background: "#eee",
                borderRadius: 6,
                height: 13,
                marginBottom: 7,
                width: `${w}%`,
              }}
            />
          ))}
        </div>
      )}

      <Spacer />

      {showError && (
        <div>
          <Alert type="error" className="alert-center">
            {ilfDlfError?.message}
          </Alert>
        </div>
      )}

      <button
        type="button"
        disabled={!canSubmit}
        className="ui-btn-primary"
        style={dis(btnPrimary, canSubmit)}
        onClick={() => goTo(1)}
      >
        Get my estimate
      </button>

      <button
        type="button"
        disabled={!canSubmit}
        style={dis(btnOutline, canSubmit)}
        onClick={() => goTo(2)}
      >
        Start the full application
      </button>

      {!isAuthenticated && (
        <div style={{ textAlign: "center", padding: "8px 0 0" }}>
          <span style={{ fontSize: 12, color: "#595959" }}>Already have an account? </span>
          <LegalLink onClick={onSignInLink} style={{ fontSize: 12, color: BRAND, fontWeight: 500 }}>
            Sign in
          </LegalLink>
        </div>
      )}

      <div style={{ textAlign: "center", padding: "8px 0 2px" }}>
        <span style={{ fontSize: 10, color: "#595959" }}>
          Coverage provided by Doctors Professional Liability RRG · Demotech A-rated
        </span>
      </div>
    </div>
  );
}
