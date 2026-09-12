import { useState, useEffect } from "react";
import { Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { safeInternalPath } from "@/shared/utils/safeRedirect";
import { BRAND, BRAND_LIGHT } from "@/shared/constants";
import { Field } from "@/shared/components/Field";
import { TextInput } from "@/shared/components/TextInput";
import { PasswordInput } from "@/shared/components/PasswordInput";
import { UserIcon } from "@/shared/components/Icon";
import { LegalLink } from "@/shared/components/LegalLink";
import Alert from "@/shared/components/Alert";
import { btnPrimary, dis } from "@/shared/utils/styles";
import { invalidMessage, isValidEmail, VALIDATION_MSG } from "@/shared/utils/validators";

import {
  fetchGoogleClientId,
  fetchInsuredSession,
  postSignIn,
  postSignInWithGoogle,
} from "@/modules/Auth/api/authApi";
import { loadGsiScript } from "@/modules/Auth/utils/google";
import { syncAccountShadow } from "@/local/authLocal";
import { isInsuredSessionPayload } from "@/modules/Quote/utils/submission";

import { MedMalGuardHeader } from "@/modules/Quote/components/MedMalGuardLanding";

import { useStore } from "@/shared/store/useStore";
import authFormStore from "@/modules/Auth/store/authFormStore";
import sessionStore from "@/shared/store/sessionStore";
import insuredProfileStore from "@/shared/store/insuredProfileStore";
import practiceStore from "@/modules/Quote/store/practiceStore";
import quoteResultStore from "@/modules/Quote/store/quoteResultStore";
import physicianProfileStore from "@/modules/Quote/store/physicianProfileStore";
import cvStore from "@/modules/Quote/store/cvStore";
import questionsStore from "@/modules/Quote/store/questionsStore";
import submissionStore from "@/modules/Quote/store/submissionStore";
import attestStore from "@/modules/Quote/store/attestStore";

export default function SignInPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [googleSignInLoading, setGoogleSignInLoading] = useState(false);

  // Where to land after a successful sign-in. The 401 interceptor
  // (`httpClient.redirectToSignIn`) appends `?returnTo=<encoded path>` when a
  // session-expiry bounce interrupts the user mid-flow. `safeInternalPath`
  // rejects anything that isn't a plain same-origin path (open-redirect
  // guard — see that helper); we fall back to the dashboard otherwise.
  const returnToParam = safeInternalPath(searchParams.get("returnTo"));
  const postSignInTarget =
    returnToParam && !returnToParam.startsWith("/signin") ? returnToParam : "/dashboard";

  // ── Store-backed reads ─────────────────────────────────────────────────
  const loginEmail = useStore(authFormStore, (s) => s.loginEmail);
  const loginPassword = useStore(authFormStore, (s) => s.loginPassword);
  const signInLoading = useStore(authFormStore, (s) => s.signInLoading);
  const signInError = useStore(authFormStore, (s) => s.signInError);
  const sessionReady = useStore(sessionStore, (s) => s.sessionReady);
  const insuredProfile = useStore(insuredProfileStore, (s) => s.insuredProfile);
  const isAuthenticated = Boolean(
    insuredProfile?.id || insuredProfile?.name || insuredProfile?.username,
  );

  const emailErr = invalidMessage(loginEmail, isValidEmail, VALIDATION_MSG.email);
  const canSubmit = isValidEmail(loginEmail) && loginPassword.length >= 6 && !signInLoading;

  // ── Auth handlers (call API, write to stores) ─────────────────────────
  const onAuthSuccess = async (signInPayload: any) => {
    authFormStore.signInError = null;
    if (isInsuredSessionPayload(signInPayload)) {
      insuredProfileStore.insuredProfile = signInPayload;
      // Local submission creation/rating still key off a local "current
      // account" — mirror the real identity into that shadow synchronously,
      // before anything downstream (e.g. resuming a quote) can run.
      syncAccountShadow(signInPayload);
    }
    try {
      const fresh = await fetchInsuredSession();
      if (isInsuredSessionPayload(fresh)) {
        insuredProfileStore.insuredProfile = fresh;
        syncAccountShadow(fresh);
        sessionStore.dashView = "dashboard";
        return;
      }
      if (isInsuredSessionPayload(signInPayload)) {
        sessionStore.dashView = "dashboard";
        return;
      }
      throw new Error("Sign-in succeeded but your session was not saved.");
    } catch (e: any) {
      authFormStore.signInError = e.message || "Sign-in succeeded but session was not saved.";
    }
  };

  const handlePasswordSignIn = async () => {
    if (!canSubmit) return;
    authFormStore.signInError = null;
    authFormStore.signInLoading = true;
    try {
      const payload = await postSignIn(loginEmail, loginPassword);
      await onAuthSuccess(payload);
    } catch (e: any) {
      authFormStore.signInError = e.message || "Sign-in failed";
    } finally {
      authFormStore.signInLoading = false;
    }
  };

  // Google sign-in (custom button): GSI's renderButton iframe hard-caps at 400px,
  // so we render our own full-width button and trigger the GSI prompt() flow on
  // click. Mirrors the pattern used in RegistrationPage. Real now that auth
  // calls the real ins backend — see authApi.js's postSignInWithGoogle.
  const handleGoogleSignIn = async () => {
    if (googleSignInLoading) return;
    authFormStore.signInError = null;
    setGoogleSignInLoading(true);
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

      const payload = await postSignInWithGoogle(credential);
      await onAuthSuccess(payload);
    } catch (e: any) {
      authFormStore.signInError = e.message || "Google sign-in failed";
    } finally {
      setGoogleSignInLoading(false);
    }
  };

  // Already signed in (or just signed in)? Skip the form — resume where the
  // user was headed, else the dashboard.
  useEffect(() => {
    if (sessionReady && isAuthenticated) {
      sessionStore.dashView = "dashboard";
      navigate(postSignInTarget, { replace: true });
    }
  }, [sessionReady, isAuthenticated, navigate, postSignInTarget]);

  if (sessionReady && isAuthenticated) return <Navigate to={postSignInTarget} replace />;

  // ── "Get a quote" link — clears any in-progress quote state ────────────
  const startFreshQuote = () => {
    practiceStore.clear();
    quoteResultStore.clear();
    physicianProfileStore.clear();
    cvStore.clear();
    questionsStore.clear();
    submissionStore.clear();
    attestStore.clear();
    navigate("/");
  };

  // ── Render ─────────────────────────────────────────────────────────────
  // MedMalGuard header at every viewport — collapses to logo + hamburger on
  // phones, same as the landing page and Q2BNfy's SignInPage. Desktop
  // (>=1024px, via .auth-page CSS in responsive.css) escapes the card and
  // centers the auth form column.
  return (
    <div className="auth-page">
      {/* MedMalGuard header at every viewport — collapses to logo +
          hamburger on phones, same as the landing page. */}
      <div className="app-header">
        <MedMalGuardHeader />
      </div>

      <div
        className="auth-body"
        style={{
          flex: 1,
          padding: "0 18px 18px",
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div className="auth-card">
          <div style={{ textAlign: "center", margin: "20px 0 4px" }}>
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
            Welcome back
          </h2>
          <p
            style={{
              fontSize: 13,
              color: "#595959",
              textAlign: "center",
              lineHeight: 1.5,
              margin: "0 0 20px",
            }}
          >
            Sign in to manage your policy or resume your application.
          </p>

          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={googleSignInLoading}
            style={{
              width: "100%",
              height: 40,
              padding: "0 12px",
              border: "1px solid #d0d0d0",
              borderRadius: 10,
              background: "#fff",
              cursor: googleSignInLoading ? "default" : "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              fontFamily: "var(--font-body)",
              fontSize: 13,
              fontWeight: 500,
              color: "#333",
              opacity: googleSignInLoading ? 0.7 : 1,
            }}
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
            {googleSignInLoading ? "Signing in…" : "Sign in with Google"}
          </button>

          <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "16px 0" }}>
            <div style={{ flex: 1, height: 1, background: "#e8e8e6" }} />
            <span style={{ fontSize: 12, color: "#595959" }}>or sign in with email</span>
            <div style={{ flex: 1, height: 1, background: "#e8e8e6" }} />
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (canSubmit) handlePasswordSignIn();
            }}
          >
            <Field label="Email address" required error={emailErr}>
              <TextInput
                value={loginEmail}
                onChange={(v) => {
                  authFormStore.loginEmail = v;
                }}
                placeholder="jane@example.com"
                type="email"
                pattern="[^\s@]+@[^\s@]+\.[^\s@]{2,}"
                title="Valid email address"
                autoComplete="username"
              />
            </Field>
            <Field label="Password" required>
              <PasswordInput
                value={loginPassword}
                onChange={(v) => {
                  authFormStore.loginPassword = v;
                }}
                placeholder="Enter your password"
                autoComplete="current-password"
              />
            </Field>

            <Alert type="error" message={signInError} />

            <button
              type="submit"
              disabled={!canSubmit}
              className="ui-btn-primary"
              style={dis(btnPrimary, canSubmit)}
            >
              {signInLoading ? "Signing in…" : "Sign in"}
            </button>
          </form>
          <div style={{ textAlign: "center", padding: "10px 0 0" }}>
            <span style={{ fontSize: 12, color: "#595959" }}>Don't have an account? </span>
            <LegalLink
              onClick={startFreshQuote}
              style={{ fontSize: 12, color: BRAND, fontWeight: 500 }}
            >
              Get a quote
            </LegalLink>
          </div>
        </div>
      </div>
    </div>
  );
}
