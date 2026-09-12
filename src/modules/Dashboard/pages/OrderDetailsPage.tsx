import { useMemo, useState } from "react";
import { Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { BRAND, BRAND_LIGHT } from "@/shared/constants";
import { formatSubmissionListDate } from "@/shared/utils/format";
import { formatUsd } from "@/modules/Quote/utils/decimal";
import {
  canDownloadPolicyDocuments,
  policyDocumentsLockedReason,
} from "@/modules/Quote/utils/submission";
import { downloadCOI, downloadBinder, downloadPolicy } from "@/modules/Payment/utils/downloads";
import { fetchInsuredOrderDetails } from "@/modules/Quote/api/quoteApi";
import { queryKeys } from "@/shared/query/keys";
import { ArrowLeft, Spinner } from "@/shared/components/Icon";
import Alert from "@/shared/components/Alert";
import Loader from "@/shared/components/Loader";
import { btnPrimary } from "@/shared/utils/styles";
import { useStore } from "@/shared/store/useStore";
import insuredProfileStore from "@/shared/store/insuredProfileStore";
import sessionStore from "@/shared/store/sessionStore";
import dashboardStore from "@/modules/Dashboard/store/dashboardStore";
import { MedMalGuardHeader } from "@/modules/Quote/components/MedMalGuardLanding";

export default function OrderDetailsPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const submissionId = searchParams.get("submissionId");

  const insuredProfile = useStore(insuredProfileStore, (s) => s.insuredProfile);
  const isAuthenticated = Boolean(
    insuredProfile?.id || insuredProfile?.name || insuredProfile?.username,
  );
  const sessionReady = useStore(sessionStore, (s) => s.sessionReady);
  const policyDetailRow = useStore(dashboardStore, (s) => s.policyDetailRow);

  // Order details are server state, keyed by submission id — shared with the
  // payment flow's `/insured/order` read (same key, so the two dedupe).
  const orderQ = useQuery({
    queryKey: queryKeys.order.detail(submissionId ?? ""),
    queryFn: () => fetchInsuredOrderDetails(submissionId as string),
    enabled: !!submissionId,
  });
  // `any` by design — the order/policy row shape is looser than the DTO
  // (see CLAUDE.md "Loose domain objects … typed `any` by design").
  const orderDetails: any = orderQ.data ?? null;
  const orderDetailsLoading = orderQ.isPending && !!submissionId;
  const orderDetailsError = orderQ.isError
    ? (orderQ.error as Error)?.message || "Could not load policy details"
    : null;

  const [downloadingKey, setDownloadingKey] = useState<string | null>(null);
  // Download helpers report failure through this callback (kept local — it's
  // not the order-load error).
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const setOrderDetailsError = setDownloadError;
  const doDownload = async (key: string, fn: () => any) => {
    setDownloadingKey(key);
    try {
      await fn();
    } finally {
      setDownloadingKey(null);
    }
  };

  // Resolve "policy detail" — prefer the cached row, else synthesize the
  // minimum we need from the order-details response + URL. Note that
  // /insured/order is the SAME endpoint used by paymentOrderDetails, so
  // the response shape is shared.
  const pd = useMemo(() => {
    if (policyDetailRow && String(policyDetailRow.submissionid) === submissionId) {
      return policyDetailRow;
    }
    const od = orderDetails;
    if (!submissionId) return null;
    // Synthesize a row-like object from the order details response so the
    // existing badge / documents UI keeps working without an extra fetch.
    const status = String(od?.workflowstatus || "")
      .trim()
      .toLowerCase();
    return {
      submissionid: submissionId,
      ispolicyactive: od?.ispolicyactive === true || status === "bound" || status === "active",
      statusname: od?.statusname || od?.workflowstatus || "",
      policystatus: od?.policystatus || "",
      policynumber: od?.policynumber || od?.policyNumber || null,
      quotenumber: od?.quotenumber || od?.quoteNumber || null,
      effectivedate: od?.effectivedate || od?.effectiveDate || null,
      expireddate: od?.expireddate || od?.expirationDate || null,
      retrodate: od?.retrodate || od?.retroDate || od?.ratingResponse?.retroDate || null,
      practicezipcode: od?.practicezipcode || od?.zipcode || null,
      speciality: od?.speciality || od?.ratingResponse?.specialtyTitle || null,
      balance: od?.balance ?? od?.ratingResponse?.total ?? null,
      insuredName: [od?.insuredfirstname, od?.insuredlastname].filter(Boolean).join(" ") || null,
    };
  }, [policyDetailRow, orderDetails, submissionId]);
  const docsLockedReason = pd ? policyDocumentsLockedReason(pd) : null;

  if (sessionReady && !isAuthenticated) return <Navigate to="/signin" replace />;
  if (!submissionId) return <Navigate to="/dashboard" replace />;
  if (!pd) {
    // submissionId in URL but nothing else loaded yet — show a thin loading
    // shell while orderDetails / dashboardSubmissions resolve.
    return (
      <div className="policy-page">
        <div className="app-header">
          <MedMalGuardHeader />
        </div>
        <div
          className="policy-mobile-topbar"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "12px 18px 8px",
            borderBottom: "1px solid #f0f0f0",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button
              type="button"
              onClick={() => navigate("/dashboard")}
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
          </div>
        </div>
        <div
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
          }}
        >
          <Loader label="Loading…" />
        </div>
      </div>
    );
  }

  return (
    // Mobile shows the shared MedMalGuard header (logo + hamburger) plus a
    // slim back-arrow bar. Desktop (>=1024px, via .policy-page CSS in
    // responsive.css) escapes the card and lays the content out in a
    // centered two-column grid.
    <div className="policy-page">
      {/* MedMalGuard header at every viewport — collapses to logo +
          hamburger on phones, same as the landing page. */}
      <div className="app-header">
        <MedMalGuardHeader />
      </div>

      {/* Mobile-only back bar — hidden on desktop; the header above
          carries the Dashboard link instead. */}
      <div
        className="policy-mobile-topbar"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "12px 18px 8px",
          borderBottom: "1px solid #f0f0f0",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button
            type="button"
            onClick={() => navigate("/dashboard")}
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
        </div>
      </div>

      <div
        className="policy-body"
        style={{
          flex: 1,
          padding: "0 18px 18px",
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div className="policy-card">
          <h2
            className="ui-heading"
            style={{
              fontFamily: "var(--font-heading)",
              fontSize: 19,
              fontWeight: 600,
              color: "#1a1a1a",
              margin: "12px 0 4px",
            }}
          >
            Policy details
          </h2>

          {orderDetailsLoading && <Loader label="Loading details…" />}
          <Alert type="error" message={orderDetailsError || downloadError} />

          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 14 }}>
            <span
              style={{
                fontSize: 10,
                fontWeight: 500,
                color: pd.ispolicyactive ? BRAND : "#888",
                background: pd.ispolicyactive ? BRAND_LIGHT : "#eee",
                padding: "3px 8px",
                borderRadius: 10,
              }}
            >
              {pd.ispolicyactive ? "Active" : pd.statusname || pd.policystatus || "Status"}
            </span>
            <span style={{ fontSize: 11, color: "#595959" }}>
              {pd.policynumber ||
                pd.quotenumber ||
                (pd.submissionid != null ? `#${pd.submissionid}` : "—")}
            </span>
          </div>

          <div className="policy-grid">
            <div className="policy-col">
              <div
                style={{
                  background: "#f7f7f5",
                  borderRadius: 12,
                  padding: "12px 14px",
                  marginBottom: 12,
                }}
              >
                <div style={{ fontSize: 13, fontWeight: 500, color: "#333", marginBottom: 8 }}>
                  Coverage
                </div>
                {(() => {
                  const od =
                    orderDetails &&
                    String(orderDetails.submissionId ?? orderDetails.submissionid) ===
                      String(pd.submissionid)
                      ? orderDetails
                      : null;
                  const r = od?.ratingResponse;
                  const policyholder =
                    od?.companyname ||
                    [od?.insuredfirstname, od?.insuredlastname].filter(Boolean).join(" ") ||
                    pd.insuredName ||
                    "—";
                  const programLabel = r?.specialtyTitle || pd.speciality || "—";
                  const limitsLabel = r?.coverageLimitTitle || "—";
                  const eff = formatSubmissionListDate(r?.effectiveDate || pd.effectivedate);
                  const exp = formatSubmissionListDate(r?.expirationDate || pd.expireddate);
                  // Retroactive date — formatted when present, else "N/A". A retro
                  // date equal to the effective date means "no prior acts" (a new
                  // claims-made policy), so show "N/A" rather than echoing effective.
                  const rawRetro = r?.retroDate || pd.retrodate || pd.retroDate;
                  const retroFmt = rawRetro ? formatSubmissionListDate(rawRetro) : "";
                  const retro = retroFmt && retroFmt !== eff ? retroFmt : "N/A";
                  const location =
                    r?.practiceLocation || r?.practiceCity || pd.practicezipcode || "—";
                  const totalSrc =
                    r?.total != null
                      ? r.total
                      : pd.balance != null && pd.balance !== ""
                        ? pd.balance
                        : null;
                  const totalVal =
                    totalSrc != null && Number.isFinite(Number(totalSrc))
                      ? formatUsd(Number(totalSrc))
                      : "—";
                  return [
                    ["Policyholder", policyholder],
                    ["Program", programLabel],
                    ["Limits", limitsLabel],
                    ["Policy type", r?.currentprior || "Claims-made"],
                    ["Effective", eff],
                    ["Retroactive", retro],
                    ["Expiration", exp],
                    ...(location && location !== "—" ? [["Location", location]] : []),
                    ["Total", totalVal],
                  ];
                })().map(([l, v]) => (
                  <div
                    key={l}
                    style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}
                  >
                    <span style={{ fontSize: 12, color: "#595959" }}>{l}</span>
                    <span style={{ fontSize: 12, fontWeight: 500, color: "#444" }}>{v}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="policy-col">
              <div style={{ fontSize: 13, fontWeight: 500, color: "#333", marginBottom: 8 }}>
                Documents
              </div>
              {docsLockedReason && (
                <div style={{ fontSize: 11.5, color: "#595959", marginBottom: 8 }}>
                  {docsLockedReason}
                </div>
              )}
              {["Certificate of Insurance (COI)", "Binder", "Full policy document"].map((doc) => {
                const canDownload = canDownloadPolicyDocuments(pd);
                const docKey =
                  doc === "Certificate of Insurance (COI)"
                    ? "coi"
                    : doc === "Binder"
                      ? "binder"
                      : "policy";
                const isDownloading = downloadingKey === docKey;
                const canInteract = canDownload && !isDownloading;
                return (
                  <div
                    key={doc}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "11px 14px",
                      background: "#f7f7f5",
                      borderRadius: 10,
                      marginBottom: 6,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#999"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        style={{ width: 16, height: 16 }}
                      >
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <polyline points="14 2 14 8 20 8" />
                      </svg>
                      <span style={{ fontSize: 12.5, color: "#444" }}>{doc}</span>
                    </div>
                    {isDownloading ? (
                      <span
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 5,
                          color: BRAND,
                          fontSize: 11,
                        }}
                      >
                        <Spinner />
                        Downloading…
                      </span>
                    ) : (
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke={BRAND}
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        onClick={() => {
                          if (!canInteract || downloadingKey) return;
                          if (doc === "Certificate of Insurance (COI)")
                            doDownload(docKey, () =>
                              downloadCOI(pd.submissionid, setOrderDetailsError),
                            );
                          else if (doc === "Binder")
                            doDownload(docKey, () =>
                              downloadBinder(pd.submissionid, canDownload, setOrderDetailsError),
                            );
                          else
                            doDownload(docKey, () =>
                              downloadPolicy(pd.submissionid, canDownload, setOrderDetailsError),
                            );
                        }}
                        style={{
                          width: 16,
                          height: 16,
                          cursor: canInteract ? "pointer" : "default",
                          opacity: canInteract ? 1 : 0.35,
                        }}
                      >
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="7 10 12 15 17 10" />
                        <line x1="12" y1="15" x2="12" y2="3" />
                      </svg>
                    )}
                  </div>
                );
              })}

              <div style={{ fontSize: 13, fontWeight: 500, color: "#333", margin: "12px 0 8px" }}>
                Need help?
              </div>
              <div style={{ fontSize: 12, color: "#666", lineHeight: 1.7 }}>
                Contact SelectFirst Insurance Services
                <br />
                (888) 959-9456 · support@selectfirstinsurance.com
              </div>
            </div>
          </div>

          <div style={{ marginTop: 16 }}>
            <button
              type="button"
              onClick={() => navigate("/dashboard")}
              className="ui-btn-primary"
              style={{ ...btnPrimary, fontSize: 13, padding: "11px 0" }}
            >
              Back to dashboard
            </button>
          </div>
        </div>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
