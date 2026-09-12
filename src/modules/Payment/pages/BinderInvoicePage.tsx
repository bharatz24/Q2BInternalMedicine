import { useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { BRAND, BRAND_DARK, BRAND_LIGHT } from "@/shared/constants";
import { CheckIcon } from "@/shared/components/Icon";
import { LegalLink } from "@/shared/components/LegalLink";
import { MedMalGuardHeader } from "@/modules/Quote/components/MedMalGuardLanding";
import Alert from "@/shared/components/Alert";
import Loader from "@/shared/components/Loader";
import { btnOutline, btnPrimary, dis } from "@/shared/utils/styles";
import { formatSubmissionListDate } from "@/shared/utils/format";
import { formatUsd } from "@/modules/Quote/utils/decimal";
import { postGenerateBinderInvoice } from "@/modules/Payment/api/paymentApi";
import { fetchInsuredOrderDetails } from "@/modules/Quote/api/quoteApi";
import { readPolicyStatus, POLICY_STATUS } from "@/modules/Payment/utils/policyStatus";
import { queryClient } from "@/shared/query/queryClient";
import { queryKeys } from "@/shared/query/keys";
import QuoteSnapshotRail from "@/modules/Quote/components/QuoteSnapshotRail";

import { useStore } from "@/shared/store/useStore";
import insuredProfileStore from "@/shared/store/insuredProfileStore";
import sessionStore from "@/shared/store/sessionStore";
import modalStore from "@/shared/store/modalStore";
import submissionStore from "@/modules/Quote/store/submissionStore";

export default function BinderInvoicePage() {
  const navigate = useNavigate();

  const flowSubmissionId = useStore(submissionStore, (s) => s.flowSubmissionId);
  const insuredProfile = useStore(insuredProfileStore, (s) => s.insuredProfile);
  const isAuthenticated = Boolean(
    insuredProfile?.id || insuredProfile?.name || insuredProfile?.username,
  );
  const sessionReady = useStore(sessionStore, (s) => s.sessionReady);

  const [orderDetails, setOrderDetails] = useState<any>(null);
  const [orderLoading, setOrderLoading] = useState(false);
  const [orderError, setOrderError] = useState<string | null>(null);

  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [alreadyGenerated, setAlreadyGenerated] = useState(false);

  useEffect(() => {
    if (!flowSubmissionId) return undefined;
    let cancelled = false;
    setOrderLoading(true);
    setOrderError(null);
    fetchInsuredOrderDetails(flowSubmissionId)
      .then((data) => {
        if (cancelled) return;
        if (readPolicyStatus(data) !== POLICY_STATUS.PAID) {
          navigate("/dashboard");
          return;
        }
        setOrderDetails(data);
      })
      .catch((e: any) => {
        if (!cancelled) setOrderError(e?.message || "Could not load submission details.");
      })
      .finally(() => {
        if (!cancelled) setOrderLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [flowSubmissionId, navigate]);

  if (sessionReady && !isAuthenticated) return <Navigate to="/signin" replace />;

  const od = orderDetails;
  const r = od?.ratingResponse ?? null;

  const policyNum =
    od?.policynumber ||
    od?.policyNumber ||
    od?.quotenumber ||
    od?.quoteNumber ||
    (flowSubmissionId ? `#${flowSubmissionId}` : "—");
  const policyholder =
    od?.companyname ||
    [od?.insuredfirstname, od?.insuredlastname].filter(Boolean).join(" ") ||
    null;
  const email = od?.contactResponse?.email || null;
  const programLabel = r?.specialtyTitle || od?.speciality || null;
  const limits = r?.coverageLimitTitle || null;
  const policyType = r?.currentprior || null;
  const eff = formatSubmissionListDate(r?.effectiveDate || od?.effectivedate);
  const exp = formatSubmissionListDate(r?.expirationDate || od?.expireddate);
  const totalVal =
    r?.total != null && Number.isFinite(Number(r.total)) ? formatUsd(Number(r.total)) : null;

  // Generating the binder/invoice binds the policy — the backend flips
  // policyStatus PAID → POLICY_ACTIVE. But the order under
  // `queryKeys.order.detail` is still the PAID copy PaymentPage cached (30s
  // staleTime), and CompleteOrderPage's guard bounces to /dashboard when it
  // reads anything other than POLICY_ACTIVE. Prime the cache with a fresh
  // read before navigating so CompleteOrderPage sees the bound policy.
  const goToCompleteOrder = async () => {
    if (flowSubmissionId) {
      try {
        await queryClient.query({
          queryKey: queryKeys.order.detail(String(flowSubmissionId)),
          queryFn: () => fetchInsuredOrderDetails(flowSubmissionId),
          staleTime: 0,
        });
      } catch {
        /* CompleteOrderPage re-fetches + surfaces its own load error */
      }
    }
    navigate("/complete-order");
  };

  const handleGenerate = async () => {
    if (generating || !flowSubmissionId) return;
    setGenerateError(null);
    setGenerating(true);
    try {
      await postGenerateBinderInvoice(flowSubmissionId);
      sessionStore.bound = true;
      await goToCompleteOrder();
    } catch (e: any) {
      if (e?.response?.status === 409) {
        setAlreadyGenerated(true);
        sessionStore.bound = true;
        return;
      }
      const msg =
        e?.response?.data?.message ||
        e?.response?.data ||
        e?.message ||
        "Could not generate binder and invoice. Please try again.";
      setGenerateError(
        typeof msg === "string" ? msg : "Could not generate binder and invoice. Please try again.",
      );
    } finally {
      setGenerating(false);
    }
  };

  const summaryRows = [
    ["Submission", policyNum],
    policyholder && ["Policyholder", policyholder],
    email && ["Email", email],
    programLabel && ["Speciality", programLabel],
    limits && ["Limits", limits],
    policyType && ["Policy type", policyType],
    eff && eff !== "—" && ["Effective", eff],
    exp && exp !== "—" && ["Expiration", exp],
    totalVal && ["Total paid", totalVal],
  ].filter(Boolean);

  const renderContent = () => {
    if (!flowSubmissionId) {
      return (
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            textAlign: "center",
          }}
        >
          <p style={{ fontSize: 13, color: "#595959", marginBottom: 16 }}>
            No active submission found.
          </p>
          <button
            type="button"
            onClick={() => navigate("/dashboard")}
            className="ui-btn-primary"
            style={{ ...btnPrimary, maxWidth: 240, fontSize: 13 }}
          >
            Go to Dashboard
          </button>
        </div>
      );
    }

    if (orderLoading) {
      return (
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Loader label="Loading…" />
        </div>
      );
    }

    if (alreadyGenerated) {
      return (
        <div
          style={{
            flex: 1,
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
            }}
          >
            <CheckIcon size={28} />
          </div>
          <h2
            className="ui-heading"
            style={{
              fontFamily: "var(--font-heading)",
              fontSize: 22,
              fontWeight: 600,
              color: BRAND_DARK,
              margin: "0 0 8px",
            }}
          >
            Already generated
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
            Your binder and invoice have already been generated for this submission.
          </p>
          <button
            type="button"
            onClick={() => {
              void goToCompleteOrder();
            }}
            className="ui-btn-primary"
            style={{ ...btnPrimary, maxWidth: 280, fontSize: 13 }}
          >
            View policy confirmation
          </button>
        </div>
      );
    }

    return (
      <>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            textAlign: "center",
            paddingTop: 24,
            marginBottom: 16,
          }}
        >
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: "50%",
              background: BRAND_LIGHT,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 14,
            }}
          >
            <CheckIcon size={24} />
          </div>
          <h2
            className="ui-heading"
            style={{
              fontFamily: "var(--font-heading)",
              fontSize: 20,
              fontWeight: 600,
              color: BRAND_DARK,
              margin: "0 0 6px",
            }}
          >
            Payment successful
          </h2>
          <p style={{ fontSize: 13, color: "#595959", lineHeight: 1.6, maxWidth: 300, margin: 0 }}>
            Your payment has been processed. Generate your binder and invoice to finalize your
            policy.
          </p>
        </div>

        <Alert type="error" message={orderError} />

        <div
          style={{
            background: "#f7f7f5",
            borderRadius: 12,
            padding: "12px 14px",
            marginBottom: 16,
          }}
        >
          <div style={{ fontSize: 13, fontWeight: 500, color: "#333", marginBottom: 8 }}>
            Submission summary
          </div>
          {summaryRows.map(([l, v]) => (
            <div
              key={l}
              style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}
            >
              <span style={{ fontSize: 11.5, color: "#595959" }}>{l}</span>
              <span
                style={{
                  fontSize: 11.5,
                  fontWeight: 500,
                  color: "#444",
                  textAlign: "right",
                  maxWidth: "60%",
                }}
              >
                {v}
              </span>
            </div>
          ))}
        </div>

        <div
          style={{
            background: BRAND_LIGHT,
            borderRadius: 10,
            padding: "10px 14px",
            marginBottom: 16,
            display: "flex",
            alignItems: "flex-start",
            gap: 8,
          }}
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke={BRAND}
            strokeWidth="2"
            strokeLinecap="round"
            style={{ width: 15, height: 15, flexShrink: 0, marginTop: 1 }}
          >
            <circle cx="12" cy="12" r="10" />
            <path d="M12 16v-4" />
            <line x1="12" y1="8" x2="12.01" y2="8" />
          </svg>
          <span
            style={{
              fontSize: 11,
              color: BRAND_DARK,
              lineHeight: 1.5,
              fontFamily: "var(--font-body)",
            }}
          >
            Clicking Generate will bind your policy and create your binder and invoice documents.
          </span>
        </div>

        <Alert type="error" message={generateError} className="alert-center" />

        <button
          type="button"
          disabled={generating}
          className="ui-btn-primary"
          style={dis({ ...btnPrimary, fontSize: 15 }, !generating)}
          onClick={handleGenerate}
        >
          {generating ? "Generating…" : "Generate Binder & Invoice"}
        </button>

        <button
          type="button"
          style={dis({ ...btnOutline, marginTop: 10, fontSize: 13 }, !generating)}
          onClick={() => navigate("/dashboard")}
          disabled={generating}
        >
          Go to Dashboard
        </button>
      </>
    );
  };

  return (
    <>
      {/* MedMalGuard header at every viewport — collapses to logo +
          hamburger on phones, same as the landing page. */}
      <div className="app-header">
        <MedMalGuardHeader />
      </div>

      <div
        style={{
          flex: 1,
          padding: "0 18px 18px",
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {renderContent()}
      </div>

      <QuoteSnapshotRail />

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
    </>
  );
}
