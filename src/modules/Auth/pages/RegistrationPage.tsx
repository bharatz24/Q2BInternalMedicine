import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { BRAND, BRAND_DARK, BRAND_LIGHT } from "@/shared/constants";
import { STEP_PATHS } from "@/modules/Quote/constants";
import { toError } from "@/shared/utils/misc";
import { formatDate } from "@/shared/utils/dateHelpers";
import {
  formatPhone,
  formatSsn,
  invalidMessage,
  isValidEmail,
  isValidMdyDate,
  isValidPassword,
  isValidPhone,
  isValidSsn,
  PASSWORD_RULE,
  VALIDATION_MSG,
} from "@/shared/utils/validators";

import {
  buildSubmissionRequest,
  googleDataFromResponse,
  submissionIdFromOpenOrderDto,
  submissionIdFromSignupResponse,
} from "@/modules/Quote/utils/submission";

import {
  fetchGoogleClientId,
  postInsuredSignup,
  postSignInWithGoogleData,
} from "@/modules/Auth/api/authApi";
import { loadGsiScript } from "@/modules/Auth/utils/google";
import { syncAccountShadow } from "@/local/authLocal";
import { createSubmission } from "@/modules/Quote/services/quoteService";
import { refreshPaymentOrder } from "@/modules/Payment/services/paymentOrderService";
import { formatUsd } from "@/modules/Quote/utils/decimal";
import { ilfDlfHasRequiredDefaults } from "@/modules/Quote/utils/ilfHelpers";
import {
  findSubmissionGroup,
  isQuestionVisible,
  requiredQuestionsAnswered,
} from "@/modules/Quote/api/questionsApi";

import { Field } from "@/shared/components/Field";
import { TextInput } from "@/shared/components/TextInput";
import { PasswordInput } from "@/shared/components/PasswordInput";
import { LegalLink } from "@/shared/components/LegalLink";
import { SectionTitle } from "@/shared/components/SectionTitle";
import { InfoBox } from "@/shared/components/InfoBox";
import { AddressFields, isAddressComplete } from "@/modules/Quote/components/AddressFields";
import { Spacer } from "@/shared/components/Spacer";
import { SaveIcon, UserIcon } from "@/shared/components/Icon";
import Alert from "@/shared/components/Alert";
import Loader from "@/shared/components/Loader";
import { btnPrimary, dis } from "@/shared/utils/styles";

import { useStore } from "@/shared/store/useStore";
import authFormStore from "@/modules/Auth/store/authFormStore";
import practiceStore from "@/modules/Quote/store/practiceStore";
import ilfDlfStore from "@/modules/Quote/store/ilfDlfStore";
import physicianProfileStore from "@/modules/Quote/store/physicianProfileStore";
import questionsStore from "@/modules/Quote/store/questionsStore";
import submissionStore from "@/modules/Quote/store/submissionStore";
import insuredProfileStore from "@/shared/store/insuredProfileStore";
import modalStore from "@/shared/store/modalStore";

// The master-tree group `/practice` answers — it rides the submission-create
// call as `questionSaveRequest` (see `buildSubmissionRequest`).
const PRACTICE_GROUP_RE = /license.*scope.*practice/i;

/**
 * Step 3 — the DPL Applicant Information fields that `ins`'s signup DTO
 * carries (Q1 name + DOB, Q2 SSN + email, Q3 medical license, Q4 primary
 * practice address, Q5 primary contact number — also the office phone) plus
 * account creation. Medical degree and Q6 are questions in the "License, Scope
 * & Practice" group on `/practice`; gender and office fax are not collected.
 *
 * DOB is required (DPL Q1); SSN stays optional (plan decision D8). Both ride
 * the `POST /auth/signup` body (`InsuredRequest.dob` / `.ssn`) and `ins`
 * stores them on the insured record; the SSN is never written to browser
 * storage — see `physicianProfileStore`'s header.
 */
export default function RegistrationPage() {
  const navigate = useNavigate();

  // Guards the ONE submission-create against firing twice. `handleCreateAccount`
  // sets `insuredProfile` (which flips `isAuthenticated` → the "already signed
  // in" effect below wakes up) mid-flight, before it has a `flowSubmissionId`
  // to show for its own create. Without this ref the effect would fire a
  // second `POST /insured/submission` for the same insured. Set synchronously
  // at the top of the handler so the effect always sees it.
  const submissionCreateStartedRef = useRef(false);

  useEffect(() => {
    authFormStore.clearSignup();
    // DPL Q4 primary practice address — start from the ZIP the applicant was
    // priced on.
    if (!physicianProfileStore.homeAddress.zip && practiceStore.zip) {
      physicianProfileStore.setAddressField("zip", practiceStore.zip);
    }
  }, []);

  // Plan F4 — the "License, Scope & Practice" answers must ride the
  // submission-create call. `ins` only accepts a later group's save once every
  // lower-ordered group is complete, and no page can answer this group after
  // the submission exists — so never create a submission without it (e.g. a
  // direct visit to /register that skipped /practice).
  const practiceGroupReady = (): boolean => {
    const group = findSubmissionGroup(questionsStore.questionGroups, PRACTICE_GROUP_RE);
    if (!group) return false;
    const name = String(group.groupName || "")
      .trim()
      .toLowerCase();
    const visited = (questionsStore.visitedQuestionGroups || []).some(
      (n: any) =>
        String(n || "")
          .trim()
          .toLowerCase() === name,
    );
    if (!visited) return false;
    const hidden = questionsStore.masterHiddenQuestionIds;
    return requiredQuestionsAnswered(group.questions, questionsStore.questionAnswers, {
      isVisible: (q: any) => isQuestionVisible(q, hidden),
    });
  };
  const sendBackToPractice = () => {
    submissionStore.step = 2;
    navigate(STEP_PATHS[2], { replace: true });
  };

  // ── Store-backed reads ─────────────────────────────────────────────────
  const firstName = useStore(physicianProfileStore, (s) => s.firstName);
  const lastName = useStore(physicianProfileStore, (s) => s.lastName);
  const dateOfBirth = useStore(physicianProfileStore, (s) => s.dateOfBirth);
  const ssn = useStore(physicianProfileStore, (s) => s.ssn);
  const licenseNumber = useStore(physicianProfileStore, (s) => s.licenseNumber);
  const homeAddress = useStore(physicianProfileStore, (s) => s.homeAddress);
  const homePhone = useStore(physicianProfileStore, (s) => s.homePhone);
  const cellPhone = useStore(physicianProfileStore, (s) => s.cellPhone);
  const email = useStore(physicianProfileStore, (s) => s.email);

  const regPassword = useStore(authFormStore, (s) => s.regPassword);
  const signupError = useStore(authFormStore, (s) => s.signupError);
  const signupLoading = useStore(authFormStore, (s) => s.signupLoading);
  const googleSignupLoading = useStore(authFormStore, (s) => s.googleSignupLoading);
  const googleSignupError = useStore(authFormStore, (s) => s.googleSignupError);
  const needsSignupCompletion = useStore(authFormStore, (s) => s.needsSignupCompletion);

  const zip = useStore(practiceStore, (s) => s.zip);
  const effectiveDate = useStore(practiceStore, (s) => s.effectiveDate);
  const ilf = useStore(ilfDlfStore, (s) => s.current);
  // Limit + retro the applicant picked on the Home Page "Instant estimate"
  // card — carried into the submission-create so the order is opened against
  // the coverage they actually saw priced.
  const selectedCoverageLimitId = useStore(ilfDlfStore, (s) => s.selectedCoverageLimitId);
  const selectedRetroDate = useStore(ilfDlfStore, (s) => s.retroDate);
  // The coverage-limit row the applicant picked on the Home Page card — used
  // for the snapshot's limit label so it matches the price `ilf.total` was
  // re-quoted at on `/quote` (same fallback as SoftQuotePage / the landing).
  const selectedCoverageLimit = useStore(ilfDlfStore, (s) => s.selectedCoverageLimit);

  const insuredProfile = useStore(insuredProfileStore, (s) => s.insuredProfile);
  const isAuthenticated = Boolean(
    insuredProfile?.id || insuredProfile?.name || insuredProfile?.username,
  );

  const questionGroupsWithIds = useStore(questionsStore, (s) => s.questionGroups);
  const questionAnswers = useStore(questionsStore, (s) => s.questionAnswers);
  const impactAnswers = useStore(questionsStore, (s) => s.impactAnswers);
  const masterHiddenQuestionIds = useStore(questionsStore, (s) => s.masterHiddenQuestionIds);
  const visitedQuestionGroups = useStore(questionsStore, (s) => s.visitedQuestionGroups);

  // Real request, built from the real ILF/DLF response — see
  // `submission.js`'s header comment for why: `ins` validates
  // speciality/zipcode/coverageilfdlfid server-side against its own data.
  // `questionSaveRequest` carries the "License, Scope & Practice" master-tree
  // answers collected on `/practice`, scoped to only the groups the applicant
  // actually visited.
  const buildRequest = () =>
    buildSubmissionRequest({
      zip,
      effectiveDate,
      ilfDlfResponse: ilf,
      coverageLimitId: selectedCoverageLimitId,
      retroDate: selectedRetroDate,
      visitedQuestionGroups,
      questionGroupsWithIds,
      questionAnswers,
      impactAnswers,
      hiddenQuestionIds: masterHiddenQuestionIds,
    });

  // Already signed in (returning applicant starting a new quote): skip the
  // password form, open a submission for this quote, then continue.
  useEffect(() => {
    if (!isAuthenticated || needsSignupCompletion) return undefined;
    // `handleCreateAccount` already owns the create for this session — don't
    // race a second `POST /insured/submission` from here.
    if (submissionCreateStartedRef.current) return undefined;

    let cancelled = false;
    (async () => {
      authFormStore.signupError = null;
      authFormStore.signupLoading = true;
      try {
        let sid: string | number | null = submissionStore.flowSubmissionId;
        if (!sid) {
          if (!ilfDlfHasRequiredDefaults(ilfDlfStore.current)) {
            navigate(STEP_PATHS[0], { replace: true });
            return;
          }
          if (!practiceGroupReady()) {
            sendBackToPractice();
            return;
          }
          submissionCreateStartedRef.current = true;
          const submission = await createSubmission(buildRequest());
          if (cancelled) return;
          sid = submissionStore.flowSubmissionId || submissionIdFromOpenOrderDto(submission);
          if (sid) submissionStore.flowSubmissionId = sid;
        }
        if (!sid) throw new Error("Could not open your application. Please try again.");
        await refreshPaymentOrder(sid);
        if (cancelled) return;
        submissionStore.step = 4;
        navigate(STEP_PATHS[4], { replace: true });
      } catch (e) {
        if (cancelled) return;
        authFormStore.signupError = toError(e).message.replace(/^Error:\s*/i, "");
      } finally {
        if (!cancelled) authFormStore.signupLoading = false;
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- the deferred-signup effect runs on the auth-state transition only; the form-field values it reads inside are deliberately not deps (including them would re-fire the signup POST on every keystroke).
  }, [isAuthenticated, needsSignupCompletion, navigate]);

  const dobErr = invalidMessage(dateOfBirth, isValidMdyDate, VALIDATION_MSG.date);
  const ssnErr = invalidMessage(ssn, isValidSsn, VALIDATION_MSG.ssn);
  const cellErr = invalidMessage(cellPhone, isValidPhone, VALIDATION_MSG.phone);
  const emailErr = invalidMessage(email, isValidEmail, VALIDATION_MSG.email);
  const passwordErr = invalidMessage(regPassword, isValidPassword, VALIDATION_MSG.password);

  const snapshotTotal = ilf ? formatUsd(ilf.total) : "—";
  const snapshotLimits = selectedCoverageLimit?.limit || ilf?.defaultIlfDlfName || "—";
  const snapshotPolicyLine = "Claims made · $0.00 deductible";

  // DOB (DPL Q1) and the medical license number (DPL Q3) are required. SSN
  // stays optional, but if the applicant types one it must be well-formed
  // before we send it (`ins` rejects a malformed dob / a future date).
  const canAdvance = () =>
    firstName.trim().length > 1 &&
    lastName.trim().length > 1 &&
    isValidMdyDate(dateOfBirth) &&
    licenseNumber.trim().length > 0 &&
    (!ssn || isValidSsn(ssn)) &&
    isAddressComplete(homeAddress) &&
    isValidPhone(cellPhone) &&
    isValidEmail(email) &&
    isValidPassword(regPassword);

  // ── Google sign-up: prefill name/email from the Google profile only. ──
  // We do NOT attempt sign-in here — clicking the button on /register is a
  // pure prefill action so the user can finish creating the account. Mirrors
  // Q2BNfy's RegistrationPage; real now that auth calls the real ins backend.
  const handleGoogleSignup = async () => {
    if (googleSignupLoading) return;
    authFormStore.googleSignupError = null;
    authFormStore.googleSignupLoading = true;
    try {
      const cfg = await fetchGoogleClientId();
      const clientId = cfg?.clientId;
      if (!clientId) throw new Error("Google sign-in is not configured.");
      await loadGsiScript();
      if (!window.google?.accounts?.id) {
        throw new Error("Google was blocked by your browser. Disable ad-blockers and try again.");
      }

      const credential = await new Promise<string>((resolve, reject) => {
        let done = false;
        const timer = setTimeout(() => {
          if (done) return;
          done = true;
          reject(new Error("Google sign-in timed out"));
        }, 45_000);
        try {
          window.google.accounts.id.initialize({
            client_id: clientId,
            callback: (resp: any) => {
              const cred = resp?.credential;
              if (done || !cred) return;
              done = true;
              clearTimeout(timer);
              resolve(cred);
            },
          });
          window.google.accounts.id.prompt(() => {});
        } catch (e) {
          if (!done) {
            done = true;
            clearTimeout(timer);
            reject(e);
          }
        }
      });

      const profile = await postSignInWithGoogleData(credential);
      const gd = googleDataFromResponse(profile);
      if (gd.firstname) physicianProfileStore.firstName = gd.firstname;
      if (gd.lastname) physicianProfileStore.lastName = gd.lastname;
      if (gd.email) physicianProfileStore.email = gd.email;
      authFormStore.needsSignupCompletion = true;
    } catch (e) {
      authFormStore.googleSignupError = toError(e).message;
    } finally {
      authFormStore.googleSignupLoading = false;
    }
  };

  const handleCreateAccount = async () => {
    if (signupLoading || !canAdvance()) return;
    if (!submissionStore.flowSubmissionId && !practiceGroupReady()) {
      sendBackToPractice();
      return;
    }

    // Claim ownership of the submission-create BEFORE anything flips
    // `isAuthenticated` (setting `insuredProfile` below), so the "already
    // signed in" effect bails instead of firing its own create.
    submissionCreateStartedRef.current = true;
    authFormStore.signupError = null;
    authFormStore.signupLoading = true;
    try {
      if (!ilfDlfHasRequiredDefaults(ilf)) {
        throw new Error(
          "Set your practice type, ZIP and coverage start date before creating an account.",
        );
      }

      const resp = await postInsuredSignup({
        isEntity: false,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        zipCode: homeAddress.zip,
        address1: homeAddress.address1,
        address2: homeAddress.address2 || "",
        city: homeAddress.city,
        state: homeAddress.state,
        email: email.trim(),
        // Send digits only — the field displays a formatted "(555) 123-4567"
        // pattern (formatPhone) for readability, but ins's real request
        // expects a plain digit string, same as Q2BNfy's RegistrationPage
        // (which never applies display punctuation to begin with).
        contactNumber: (cellPhone || homePhone).replace(/\D/g, ""),
        password: regPassword,
        title: "Primary location",
        // DOB + SSN are optional on `ins`'s signup contract (`InsuredRequest.dob`
        // / `.ssn`, person insured only). Omit when blank; send DOB as
        // MM/DD/YYYY (the JsonFormat pattern ins expects) and SSN as digits.
        ...(isValidMdyDate(dateOfBirth) ? { dob: dateOfBirth } : {}),
        ...(ssn.replace(/\D/g, "").length === 9 ? { ssn: ssn.replace(/\D/g, "") } : {}),
        // DPL Q3 "Medical License" (`InsuredRequest.licenseNumber`).
        licenseNumber: licenseNumber.trim(),
        // Account creation must not implicitly open a submission — that's
        // handled separately by createSubmission() below, which now calls
        // the real POST /insured/submission (see quoteApi.js).
        submissionRequest: null,
      });

      // The real signup response carries only `id`/`abbreviation` — the page
      // has the fuller identity (name, email) the form just collected, so
      // build the profile here. Do this BEFORE createSubmission(): local
      // submission creation reads the current account synchronously via
      // authLocal's shadow, which syncAccountShadow needs this to populate.
      if (!insuredProfileStore.insuredProfile) {
        insuredProfileStore.insuredProfile = {
          id: resp?.id,
          email,
          username: email,
          firstname: firstName,
          lastname: lastName,
          abbreviation: resp?.abbreviation,
        };
      }
      syncAccountShadow(insuredProfileStore.insuredProfile);

      // Idempotency — if a submission was already opened for this quote (a
      // retry after signup succeeded but the create failed, say), reuse it
      // rather than opening a second one.
      let sid: string | number | null = submissionStore.flowSubmissionId;
      if (!sid) {
        const submission = await createSubmission(buildRequest());
        sid = submissionIdFromOpenOrderDto(submission) || submissionIdFromSignupResponse(resp);
        if (sid) submissionStore.flowSubmissionId = sid;
      }

      questionsStore.visitedQuestionGroups = [];
      authFormStore.signupDone = true;
      authFormStore.needsSignupCompletion = false;
      submissionStore.step = 4;
      navigate(STEP_PATHS[4]);
    } catch (e) {
      authFormStore.signupError = toError(e).message.replace(/^Error:\s*/i, "");
    } finally {
      authFormStore.signupLoading = false;
    }
  };

  if (isAuthenticated && !needsSignupCompletion) {
    return (
      <>
        <Loader label={signupLoading ? "Opening your application…" : "Continuing…"} />
        <Alert type="error" message={signupError} className="alert-center" />
      </>
    );
  }

  return (
    <>
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
          <UserIcon />
        </div>
      </div>
      <h2
        className="ui-heading"
        style={{
          fontFamily: "var(--font-heading)",
          fontSize: 20,
          fontWeight: 600,
          color: "#1a1a1a",
          textAlign: "center",
          margin: "8px 0 4px",
        }}
      >
        Create your account
      </h2>
      <p
        style={{
          fontSize: 13,
          color: "#595959",
          textAlign: "center",
          lineHeight: 1.5,
          margin: "0 0 18px",
        }}
      >
        Your progress is saved automatically. You can return anytime to finish.
      </p>

      {!needsSignupCompletion && (
        <>
          <div style={{ display: "flex", gap: 8, marginBottom: 0 }}>
            <button
              onClick={handleGoogleSignup}
              disabled={googleSignupLoading}
              style={{
                flex: 1,
                padding: "12px 0",
                border: "1px solid #d0d0d0",
                borderRadius: 10,
                background: "#fff",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                fontFamily: "var(--font-body)",
                fontSize: 13,
                fontWeight: 500,
                color: "#333",
                transition: "background 0.15s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "#f9f9f7")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "#fff")}
            >
              <svg width="16" height="16" viewBox="0 0 24 24">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A11.96 11.96 0 0 0 0 12c0 1.94.46 3.77 1.28 5.4l3.56-2.77.01-.54z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 4.75c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 1.09 14.97 0 12 0 7.7 0 3.99 2.47 2.18 6.07l3.66 2.84c.87-2.6 3.3-4.16 6.16-4.16z"
                  fill="#EA4335"
                />
              </svg>
              {googleSignupLoading ? "Signing in…" : "Continue with Google"}
            </button>
          </div>
          <Alert type="error" message={googleSignupError} className="alert-center" />

          <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "16px 0" }}>
            <div style={{ flex: 1, height: 1, background: "#e8e8e6" }} />
            <span style={{ fontSize: 12, color: "#595959", fontFamily: "var(--font-body)" }}>
              or sign up with email
            </span>
            <div style={{ flex: 1, height: 1, background: "#e8e8e6" }} />
          </div>
        </>
      )}

      <SectionTitle>About you</SectionTitle>
      <div style={{ display: "flex", gap: 10 }}>
        <Field label="First name" required style={{ flex: 1 }}>
          <TextInput
            value={firstName}
            onChange={(v) => {
              physicianProfileStore.firstName = v;
            }}
            placeholder="Jane"
            autoComplete="given-name"
          />
        </Field>
        <Field label="Last name" required style={{ flex: 1 }}>
          <TextInput
            value={lastName}
            onChange={(v) => {
              physicianProfileStore.lastName = v;
            }}
            placeholder="Doe"
            autoComplete="family-name"
          />
        </Field>
      </div>

      <Field label="Date of birth" required error={dobErr}>
        <TextInput
          value={dateOfBirth}
          onChange={(v) => {
            physicianProfileStore.dateOfBirth = formatDate(v);
          }}
          placeholder="MM/DD/YYYY"
          inputMode="numeric"
          pattern="(0[1-9]|1[0-2])/(0[1-9]|[12]\d|3[01])/\d{4}"
          title="MM/DD/YYYY"
          autoComplete="bday"
        />
      </Field>

      <Field label="Social Security number" error={ssnErr}>
        <PasswordInput
          value={ssn}
          onChange={(v) => {
            physicianProfileStore.ssn = formatSsn(v);
          }}
          placeholder="123-45-6789"
          inputMode="numeric"
          maxLength={11}
          autoComplete="off"
        />
      </Field>
      <InfoBox color="blue">
        Your SSN is sent over a secure connection and stored only on your policy record with the
        carrier. It is never written to this device&apos;s storage, so if you refresh before
        finishing you&apos;ll be asked for it again.
      </InfoBox>

      <Field label="Medical license number" required>
        <TextInput
          value={licenseNumber}
          onChange={(v) => {
            // `ins` accepts an alphanumeric license number, max 40 characters.
            physicianProfileStore.licenseNumber = v.replace(/[^A-Za-z0-9]/g, "").slice(0, 40);
          }}
          placeholder="e.g. A123456"
          autoComplete="off"
          maxLength={40}
        />
      </Field>

      <AddressFields
        label="Primary practice address"
        value={homeAddress}
        onChange={(field, v) => physicianProfileStore.setAddressField(field as any, v)}
        autoCompleteSection="home"
      />

      <Field label="Primary contact number" required error={cellErr}>
        <TextInput
          value={cellPhone}
          onChange={(v) => {
            physicianProfileStore.cellPhone = formatPhone(v);
          }}
          placeholder="(555) 123-4567"
          type="tel"
          inputMode="tel"
          pattern="[\d\s()\-x+]{10,}"
          title="Phone number with at least 10 digits"
          autoComplete="tel"
        />
      </Field>

      <Field label="Email address" required hint="Used as your account username" error={emailErr}>
        <TextInput
          value={email}
          onChange={(v) => {
            physicianProfileStore.email = v;
          }}
          placeholder="you@example.com"
          type="email"
          pattern="[^\s@]+@[^\s@]+\.[^\s@]{2,}"
          title="Valid email address"
          autoComplete="email"
        />
      </Field>

      <Field label="Create password" required hint={PASSWORD_RULE} error={passwordErr}>
        <PasswordInput
          value={regPassword}
          onChange={(v) => {
            authFormStore.regPassword = v;
          }}
          placeholder="Create a strong password"
          autoComplete="new-password"
          maxLength={128}
        />
      </Field>

      <div
        style={{
          background: "#f7f7f5",
          borderRadius: 10,
          padding: "12px 14px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginTop: 4,
        }}
      >
        <div>
          <div style={{ fontSize: 10, color: "#595959" }}>Your estimated quote</div>
          <div
            className="ui-heading"
            style={{
              fontFamily: "var(--font-heading)",
              fontSize: 20,
              fontWeight: 600,
              color: BRAND_DARK,
              minHeight: 27,
              display: "flex",
              alignItems: "center",
            }}
          >
            {snapshotTotal}
            <span
              style={{
                fontSize: 11,
                color: "#595959",
                fontFamily: "var(--font-body)",
                fontWeight: 400,
                marginLeft: 4,
              }}
            >
              / yr
            </span>
          </div>
        </div>
        <div style={{ fontSize: 11, color: "#595959", textAlign: "right", lineHeight: 1.5 }}>
          {snapshotLimits}
          <br />
          {snapshotPolicyLine}
        </div>
      </div>

      <div
        style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 10, marginBottom: 4 }}
      >
        <SaveIcon />
        <span style={{ fontSize: 11, color: BRAND_DARK }}>
          Your application auto-saves as you go
        </span>
      </div>

      <p
        style={{
          fontSize: 11,
          color: "#595959",
          textAlign: "center",
          lineHeight: 1.5,
          margin: "6px 0 0",
        }}
      >
        By creating an account, you agree to DPL RRG's{" "}
        <LegalLink
          onClick={() => {
            modalStore.showTerms = true;
          }}
          style={{ color: BRAND }}
        >
          terms of service
        </LegalLink>{" "}
        and{" "}
        <LegalLink
          onClick={() => {
            modalStore.showPrivacy = true;
          }}
          style={{ color: BRAND }}
        >
          privacy policy
        </LegalLink>
        .
      </p>

      <Spacer />
      <Alert type="error" message={signupError} className="alert-center" />

      <button
        type="button"
        disabled={!(canAdvance() && !signupLoading)}
        className="ui-btn-primary"
        style={dis(btnPrimary, canAdvance() && !signupLoading)}
        onClick={handleCreateAccount}
      >
        {signupLoading ? "Creating account…" : "Create account & start application"}
      </button>
    </>
  );
}
