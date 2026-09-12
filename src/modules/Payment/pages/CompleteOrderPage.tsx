import { useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { BRAND_DARK, BRAND_LIGHT } from "@/shared/constants";
import { CheckIcon, Spinner } from "@/shared/components/Icon";
import { LegalLink } from "@/shared/components/LegalLink";
import Alert from "@/shared/components/Alert";
import Loader from "@/shared/components/Loader";
import { MedMalGuardHeader } from "@/modules/Quote/components/MedMalGuardLanding";
import ThemeToggle from "@/shared/components/ThemeToggle";
import { btnOutline, btnPrimary } from "@/shared/utils/styles";
import { fetchInsuredOrderDetails } from "@/modules/Quote/api/quoteApi";
import { queryKeys } from "@/shared/query/keys";
import { downloadCOI, downloadBinder } from "@/modules/Payment/utils/downloads";
import { readPolicyStatus, POLICY_STATUS } from "@/modules/Payment/utils/policyStatus";
import { formatUsd } from "@/modules/Quote/utils/decimal";

import { useStore } from "@/shared/store/useStore";
import insuredProfileStore from "@/shared/store/insuredProfileStore";
import submissionStore from "@/modules/Quote/store/submissionStore";
import sessionStore from "@/shared/store/sessionStore";
import modalStore from "@/shared/store/modalStore";
import paymentOrderStore from "@/modules/Payment/store/paymentOrderStore";
import bindStore from "@/modules/Payment/store/bindStore";

export default function CompleteOrderPage() {
  const navigate = useNavigate();
  const flowSubmissionId = useStore(submissionStore, (s) => s.flowSubmissionId);
  const insuredProfile = useStore(insuredProfileStore, (s) => s.insuredProfile);
  const isAuthenticated = Boolean(
    insuredProfile?.id || insuredProfile?.name || insuredProfile?.username,
  );
  const sessionReady = useStore(sessionStore, (s) => s.sessionReady);

  const [downloadingKey, setDownloadingKey] = useState<string | null>(null);
  const doDownload = async (key: string, fn: () => any) => {
    setDownloadingKey(key);
    try {
      await fn();
    } finally {
      setDownloadingKey(null);
    }
  };

  // The bound policy — server state, keyed by submission id (shared key with
  // OrderDetails + the payment flow, so a revisit inside 30s serves cache).
  const policyQ = useQuery({
    queryKey: queryKeys.order.detail(flowSubmissionId ?? ""),
    queryFn: () => fetchInsuredOrderDetails(flowSubmissionId as string | number),
    enabled: !!flowSubmissionId,
  });
  const policy: any = policyQ.data ?? null;
  const loading = policyQ.isPending && !!flowSubmissionId;
  const error = policyQ.isError
    ? (policyQ.error as Error)?.message || "Could not load policy details."
    : null;

  // This page only shows a bound policy — anything else means the user
  // landed here out of sequence; send them to the dashboard.
  useEffect(() => {
    if (policyQ.isSuccess && readPolicyStatus(policyQ.data) !== POLICY_STATUS.POLICY_ACTIVE) {
      navigate("/dashboard", { replace: true });
    }
  }, [policyQ.isSuccess, policyQ.data, navigate]);

  const resetCompletionAndPaymentOrderBootstrap = () => {
    bindStore.clear();
    paymentOrderStore.clear();
  };

  // Reload guards — this page is outside FlowLayout, so it carries its own.
  // A logged-out reload bounces to signin; a reload with no restored
  // `flowSubmissionId` (sessionStorage cleared, fresh tab) has no order to
  // show, so it goes to the dashboard rather than rendering an empty
  // "You're covered!" shell. Both wait for `sessionReady` so the session
  // restore in useAppBootstrap has a chance to rehydrate first.
  if (sessionReady && !isAuthenticated) return <Navigate to="/signin" replace />;
  if (sessionReady && !flowSubmissionId) return <Navigate to="/dashboard" replace />;

  const r = policy?.ratingResponse ?? null;
  const policyNumber =
    policy?.policynumber ||
    policy?.policyNumber ||
    policy?.quotenumber ||
    policy?.quoteNumber ||
    (flowSubmissionId ? `#${flowSubmissionId}` : "—");
  const email = policy?.contactResponse?.email || "—";
  const specialty = r?.specialtyTitle || policy?.speciality || policy?.specialty || "";
  const limits = r?.coverageLimitTitle || "";
  const practiceLocation = r?.practiceLocation || "";
  const summaryLine = [limits, specialty, practiceLocation].filter(Boolean).join(" · ") || "—";
  const premium = r?.total ?? policy?.balance ?? policy?.premium ?? policy?.annualpremium ?? null;
  const premiumLabel =
    premium != null && Number.isFinite(Number(premium)) ? formatUsd(Number(premium)) : null;

  return (
    <>
      {/* MedMalGuard header at every viewport — collapses to logo +
          hamburger on phones, same as the landing page. */}
      <div className="app-header">
        <MedMalGuardHeader />
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "flex-end",
          padding: "12px 18px 8px",
          borderBottom: "1px solid #f0f0f0",
        }}
      >
        <ThemeToggle />
      </div>

      <div
        style={{
          flex: 1,
          padding: "0 18px 18px",
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
        }}
      >
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: "50%",
            background: BRAND_LIGHT,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 20,
            animation: "popIn 0.5s cubic-bezier(0.175,0.885,0.32,1.275)",
          }}
        >
          <CheckIcon size={28} />
        </div>

        <h2
          className="ui-heading"
          style={{
            fontFamily: "var(--font-heading)",
            fontSize: 24,
            fontWeight: 600,
            color: BRAND_DARK,
            margin: "0 0 6px",
          }}
        >
          You're covered!
        </h2>

        <p
          style={{
            fontSize: 13,
            color: "#595959",
            lineHeight: 1.6,
            maxWidth: 280,
            margin: "0 0 20px",
          }}
        >
          <>
            Policy bound. Confirmation sent to <strong style={{ color: "#333" }}>{email}</strong>.
          </>
        </p>

        {loading && <Loader label="Loading policy details…" />}
        <Alert type="error" message={error} />

        <div
          style={{
            background: "#f7f7f5",
            borderRadius: 12,
            padding: "14px 18px",
            width: "100%",
            maxWidth: 280,
          }}
        >
          <div
            style={{
              fontSize: 11,
              color: "#595959",
              marginBottom: 4,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
            }}
          >
            <>Policy number · {policyNumber}</>
          </div>
          <div
            className="ui-heading"
            style={{
              fontFamily: "var(--font-heading)",
              fontSize: 26,
              fontWeight: 600,
              color: BRAND_DARK,
            }}
          >
            {premiumLabel != null ? (
              <>
                {premiumLabel}
                <span
                  style={{
                    fontSize: 12,
                    color: "#595959",
                    fontFamily: "var(--font-body)",
                    fontWeight: 400,
                  }}
                >
                  /yr
                </span>
              </>
            ) : (
              "—"
            )}
          </div>
          <div style={{ fontSize: 12, color: "#595959", marginTop: 4 }}>{summaryLine}</div>
        </div>

        <div style={{ display: "flex", gap: 8, marginTop: 16, width: "100%", maxWidth: 280 }}>
          <button
            onClick={() => {
              if (!downloadingKey) doDownload("coi", () => downloadCOI(flowSubmissionId!));
            }}
            style={{
              ...btnOutline,
              flex: 1,
              fontSize: 12,
              marginTop: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 4,
              opacity: downloadingKey === "coi" ? 0.7 : 1,
              pointerEvents: downloadingKey ? "none" : "auto",
            }}
          >
            {downloadingKey === "coi" ? (
              <>
                <Spinner />
                Downloading…
              </>
            ) : (
              "Download COI"
            )}
          </button>
          <button
            onClick={() => {
              if (!downloadingKey)
                doDownload("binder", () => downloadBinder(flowSubmissionId!, true, () => {}));
            }}
            style={{
              ...btnOutline,
              flex: 1,
              fontSize: 12,
              marginTop: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 4,
              opacity: downloadingKey === "binder" ? 0.7 : 1,
              pointerEvents: downloadingKey ? "none" : "auto",
            }}
          >
            {downloadingKey === "binder" ? (
              <>
                <Spinner />
                Downloading…
              </>
            ) : (
              "Binder"
            )}
          </button>
        </div>

        <button
          type="button"
          onClick={() => {
            resetCompletionAndPaymentOrderBootstrap();
            sessionStore.dashView = "dashboard";
            // `replace` so the browser Back button from the dashboard can't
            // return to this terminal "You're covered!" page — the order is
            // already bound, there's nothing to come back to here.
            navigate("/dashboard", { replace: true });
          }}
          className="ui-btn-primary"
          style={{ ...btnPrimary, marginTop: 16, width: "100%", maxWidth: 280, fontSize: 13 }}
        >
          Go to Dashboard
        </button>
      </div>

      <div
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

      <style>{`@keyframes popIn{0%{transform:scale(0)}100%{transform:scale(1)}}@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </>
  );
}
