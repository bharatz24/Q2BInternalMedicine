import { useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { BLUE, BLUE_BG, BRAND, BRAND_LIGHT, ORANGE, ORANGE_BG } from "@/shared/constants";
import { STEP_PATHS, TOTAL_STEPS } from "@/modules/Quote/constants";
import { BINDER_NEEDED_STATUSES, PAYMENT_NEEDED_STATUSES } from "@/modules/Payment/constants";
import { daysUntilDate, formatSubmissionListDate } from "@/shared/utils/format";
import {
  canDownloadPolicyDocuments,
  policyDocumentsLockedReason,
  mapSubmissionToPolicyCard,
  parsePositiveSubmissionId,
} from "@/modules/Quote/utils/submission";
import { downloadCOI, downloadBinder } from "@/modules/Payment/utils/downloads";
import { loadDashboardSubmissions } from "@/modules/Dashboard/services/dashboardService";
import { queryKeys } from "@/shared/query/keys";
import { Spinner } from "@/shared/components/Icon";
import { LegalLink } from "@/shared/components/LegalLink";
import Alert from "@/shared/components/Alert";
import Loader from "@/shared/components/Loader";
import AsyncBoundary from "@/shared/components/AsyncBoundary";
import { Spacer } from "@/shared/components/Spacer";
import { btnOutline, btnPrimary, dis } from "@/shared/utils/styles";
import { useStore } from "@/shared/store/useStore";
import dashboardStore from "@/modules/Dashboard/store/dashboardStore";
import sessionStore from "@/shared/store/sessionStore";
import insuredProfileStore from "@/shared/store/insuredProfileStore";
import submissionStore from "@/modules/Quote/store/submissionStore";
import questionsStore from "@/modules/Quote/store/questionsStore";
import paymentOrderStore from "@/modules/Payment/store/paymentOrderStore";
import bindStore from "@/modules/Payment/store/bindStore";
import {
  signOut,
  resetQuoteFlow,
  dropSubmissionScopedQueries,
} from "@/modules/Auth/services/authSessionService";
import { refreshPaymentOrder } from "@/modules/Payment/services/paymentOrderService";
import { readPolicyStatus, POLICY_STATUS } from "@/modules/Payment/utils/policyStatus";
import modalStore from "@/shared/store/modalStore";
import { MedMalGuardHeader } from "@/modules/Quote/components/MedMalGuardLanding";

const setShowAbout = (v: boolean) => {
  modalStore.showAbout = v;
};
const setShowPrivacy = (v: boolean) => {
  modalStore.showPrivacy = v;
};
const setShowTerms = (v: boolean) => {
  modalStore.showTerms = v;
};

const abandonedStep = 4;

export default function DashboardPage() {
  const navigate = useNavigate();
  const [downloadingKey, setDownloadingKey] = useState<string | null>(null);
  const [resumingSid, setResumingSid] = useState<any>(null);
  const [resumeError, setResumeError] = useState<string | null>(null);
  const doDownload = async (key: string, fn: () => any) => {
    setDownloadingKey(key);
    try {
      await fn();
    } finally {
      setDownloadingKey(null);
    }
  };
  const dashView = useStore(sessionStore, (s) => s.dashView);
  const sessionReady = useStore(sessionStore, (s) => s.sessionReady);
  const bound = useStore(sessionStore, (s) => s.bound);
  const insuredProfile = useStore(insuredProfileStore, (s) => s.insuredProfile);
  const isAuthenticated = Boolean(
    insuredProfile?.id || insuredProfile?.name || insuredProfile?.username,
  );
  // The submissions list is server state — react-query owns the fetch,
  // dedup, 30s staleness (a Back into /dashboard doesn't refetch) and
  // transient-failure retry. Gated on auth so a pre-session render doesn't
  // fire a guaranteed 401.
  const submissionsQ = useQuery({
    queryKey: queryKeys.dashboard.submissions(),
    queryFn: () => loadDashboardSubmissions(),
    enabled: isAuthenticated,
  });
  const dashboardSubmissions: any[] = submissionsQ.data ?? [];
  // The document-download helpers report their own failures through a
  // callback; keep that in local state (it's not a list-load failure, so it
  // renders outside the list's <AsyncBoundary>).
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const setDashboardSubmissionsError = setDownloadError;

  const setDashView = (v: "dashboard" | null) => {
    sessionStore.dashView = v;
  };
  const setPolicyDetailRow = (v: any) => {
    dashboardStore.policyDetailRow = v;
  };
  const resetCompletionAndPaymentOrderBootstrap = () => {
    bindStore.clear();
    paymentOrderStore.clear();
  };
  const goTo = (n: number) => {
    submissionStore.step = n;
    navigate(STEP_PATHS[n]);
  };
  const goToFromDashboard = (n: number) => {
    sessionStore.dashView = null;
    submissionStore.step = n;
    navigate(STEP_PATHS[n]);
  };
  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  // Resume an open order: fetch /insured/order first so paymentOrderStore
  // is populated by the time we navigate into the flow, then route based
  // on the order's current status.
  // Prefer the refreshed order's policyStatus (authoritative) over the list
  // label: locally "Signed" → payment, "Pay"/PAID → binder & invoice.
  const handleResumeOrder = async (sid: any, status?: any) => {
    if (!sid || resumingSid) return;
    setResumeError(null);
    setResumingSid(sid);
    try {
      submissionStore.flowSubmissionId = sid;
      resetCompletionAndPaymentOrderBootstrap();
      // Drop any cached question tree + answer maps from an earlier submission
      // (or an earlier pass through this one). The client never refetches the
      // tree after a /questions/save, so a kept cache would hydrate
      // /previous-insurance and /underwriting from stale, answer-less options.
      // Cleared here, the bootstrap refetches a fresh answer-bearing tree for
      // the resumed submission.
      questionsStore.resetSubmissionQuestionState();
      // ...and the matching react-query caches (order + question tree), so the
      // resumed submission re-reads fresh state instead of a stale hit.
      dropSubmissionScopedQueries();
      const order = await refreshPaymentOrder(sid);
      if (!order) {
        setResumeError("Could not load order details. Please try again.");
        return;
      }
      sessionStore.dashView = null;
      const policyStatus = readPolicyStatus(order);
      const listStatus = String(status || "")
        .trim()
        .toLowerCase();
      const workflowStatus = String(order?.workflowstatus || order?.workflowStatus || "")
        .trim()
        .toLowerCase();

      if (
        policyStatus === POLICY_STATUS.SIGNED ||
        PAYMENT_NEEDED_STATUSES.has(listStatus) ||
        PAYMENT_NEEDED_STATUSES.has(workflowStatus)
      ) {
        goToFromDashboard(7);
        return;
      }
      if (
        policyStatus === POLICY_STATUS.PAID ||
        BINDER_NEEDED_STATUSES.has(listStatus) ||
        BINDER_NEEDED_STATUSES.has(workflowStatus)
      ) {
        navigate("/binder-invoice");
        return;
      }
      if (listStatus === "pending review" || workflowStatus === "pending review") {
        navigate("/underwriter-review");
        return;
      }
      goToFromDashboard(abandonedStep);
    } catch (err: any) {
      setResumeError(err?.message || "Could not load order details.");
    } finally {
      setResumingSid(null);
    }
  };

  // All hooks must run on every render — keep this above any conditional
  // returns so React's hook ordering stays stable across renders.
  //
  // Auto-set dashView when the user lands on /dashboard without one set
  // (e.g. FlowLayout's guard redirected an authenticated user with missing
  // quote state). The non-authenticated case falls through to the
  // Navigate("/") below so they don't get stuck on a blank page.
  useEffect(() => {
    if (dashView === null && isAuthenticated) sessionStore.dashView = "dashboard";
  }, [dashView, isAuthenticated]);

  if (!sessionReady && !bound) {
    return (
      <div className="dash-page">
        <div className="app-header">
          <MedMalGuardHeader />
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

  if (dashView === null) {
    if (isAuthenticated) return null; // effect above is about to set dashView
    return <Navigate to="/signin" replace />;
  }

  const welcomeFirstName = (() => {
    const u = insuredProfile?.name || insuredProfile?.username;
    if (!u) return "there";
    if (String(u).includes("@")) return String(u).split("@")[0];
    return String(u).split(/\s+/)[0] || "there";
  })();

  const dashboardSubmissionStatus = (s: any) =>
    (
      s?.statusname ||
      s?.policystatus ||
      s?.filterstatus ||
      s?.workFlowStatus ||
      s?.workflowstatus ||
      ""
    )
      .toString()
      .trim()
      .toLowerCase();
  const isResumeDashboardSubmission = (s: any) => {
    if (!s) return false;
    const status = dashboardSubmissionStatus(s);
    if (
      PAYMENT_NEEDED_STATUSES.has(status) ||
      BINDER_NEEDED_STATUSES.has(status) ||
      status === "order" ||
      status === "pending review"
    ) {
      return true;
    }
    const policy = String(s?.policystatus || "")
      .trim()
      .toUpperCase();
    if (policy === POLICY_STATUS.SIGNED || policy === POLICY_STATUS.PAID) return true;
    if (s?.isopenorder === true) return !s.ispolicyactive;
    return false;
  };
  const hasAbandonedQuote = dashboardSubmissions.some(isResumeDashboardSubmission);

  const renewalPick = dashboardSubmissions
    .filter((s) => s.ispolicyactive && s.expireddate)
    .map((s) => ({ s, daysUntil: daysUntilDate(s.expireddate) }))
    .filter((x) => x.daysUntil != null && x.daysUntil <= 0)
    .map((x) => ({ s: x.s, daysSince: Math.abs(x.daysUntil ?? 0) }))
    .sort((a, b) => a.daysSince - b.daysSince)[0];

  const hasPoliciesToShow = dashboardSubmissions.length > 0;

  return (
    // Mobile shows the shared MedMalGuard header (logo + hamburger) + card.
    // Desktop (>=1024px, via .dash-page CSS in responsive.css) escapes the
    // card, shows the MedMalGuard header (same as the pricing/sign-in pages),
    // and lays the content out in a centered column on the app canvas.
    <div className="dash-page">
      {/* MedMalGuard header at every viewport — collapses to logo +
          hamburger on phones, same as the landing page. */}
      <div className="app-header">
        <MedMalGuardHeader />
      </div>

      <div
        className="dash-body"
        style={{
          flex: 1,
          padding: "0 18px 18px",
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div className="dash-card">
          {dashView === "dashboard" && (
            <>
              <h2
                className="ui-heading"
                style={{
                  fontFamily: "var(--font-heading)",
                  fontSize: 20,
                  fontWeight: 600,
                  color: "#1a1a1a",
                  margin: "12px 0 4px",
                }}
              >
                Welcome back, {welcomeFirstName}
              </h2>
              <p style={{ fontSize: 13, color: "#595959", marginBottom: 16 }}>
                Here's your account overview.
              </p>

              {hasAbandonedQuote && (
                <div
                  style={{
                    background: ORANGE_BG,
                    borderRadius: 12,
                    padding: "14px 16px",
                    marginBottom: 12,
                    border: `1px solid ${ORANGE}22`,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke={ORANGE}
                      strokeWidth="2"
                      strokeLinecap="round"
                      style={{ width: 16, height: 16, flexShrink: 0 }}
                    >
                      <circle cx="12" cy="12" r="10" />
                      <path d="M12 6v6l4 2" />
                    </svg>
                    <span style={{ fontSize: 13, fontWeight: 500, color: ORANGE }}>
                      Incomplete application
                    </span>
                  </div>
                  {(() => {
                    const openOrders = dashboardSubmissions.filter(isResumeDashboardSubmission);
                    const count = openOrders.length;
                    if (count === 0) return null;
                    return (
                      <>
                        <div
                          style={{
                            fontSize: 12,
                            color: "#8B4513",
                            lineHeight: 1.6,
                            marginBottom: 10,
                          }}
                        >
                          You have {count} incomplete application{count === 1 ? "" : "s"}. Select
                          one to resume.
                        </div>

                        <div
                          style={{
                            background: "#fff",
                            borderRadius: 8,
                            padding: "8px 12px",
                            marginBottom: 10,
                          }}
                        >
                          <div style={{ display: "flex", gap: 3, marginBottom: 6 }}>
                            {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
                              <div
                                key={i}
                                style={{
                                  flex: 1,
                                  height: 3,
                                  borderRadius: 2,
                                  background: i < abandonedStep ? BRAND : "#e0e0de",
                                }}
                              />
                            ))}
                          </div>
                          <div style={{ fontSize: 11, color: "#595959" }}>
                            Resume will continue at your saved step or payment.
                          </div>
                        </div>

                        {openOrders.map((s) => {
                          const sid = parsePositiveSubmissionId(s?.submissionid);
                          const label =
                            s?.quotenumber || s?.policynumber || (sid != null ? `#${sid}` : "—");
                          const status = (
                            s?.statusname ||
                            s?.policystatus ||
                            s?.filterstatus ||
                            s?.workFlowStatus ||
                            s?.workflowstatus ||
                            ""
                          )
                            .toString()
                            .trim()
                            .toLowerCase();
                          const isLoading = resumingSid === sid;
                          const isDisabled = resumingSid != null && !isLoading;
                          return (
                            <button
                              key={sid ?? label}
                              type="button"
                              disabled={isDisabled || isLoading}
                              onClick={() => handleResumeOrder(sid, status)}
                              style={{
                                ...btnPrimary,
                                background: ORANGE,
                                fontSize: 13,
                                padding: "11px 0",
                                boxShadow: "0 2px 8px rgba(216,90,48,0.2)",
                                marginTop: 8,
                                opacity: isDisabled ? 0.55 : 1,
                                cursor: isDisabled || isLoading ? "default" : "pointer",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                gap: 6,
                              }}
                            >
                              {isLoading ? (
                                <>
                                  <Spinner />
                                  Loading order…
                                </>
                              ) : (
                                `Resume ${label}`
                              )}
                            </button>
                          );
                        })}
                        {resumeError && (
                          <div style={{ marginTop: 8 }}>
                            <Alert type="error" message={resumeError} />
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>
              )}

              {renewalPick && (
                <div
                  style={{
                    background: BLUE_BG,
                    borderRadius: 12,
                    padding: "14px 16px",
                    marginBottom: 12,
                    border: `1px solid ${BLUE}22`,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke={BLUE}
                      strokeWidth="2"
                      strokeLinecap="round"
                      style={{ width: 16, height: 16, flexShrink: 0 }}
                    >
                      <circle cx="12" cy="12" r="10" />
                      <path d="M12 6v6l4 2" />
                    </svg>
                    <span style={{ fontSize: 13, fontWeight: 500, color: BLUE }}>
                      Renewal reminder
                    </span>
                  </div>
                  <div style={{ fontSize: 12, color: "#555", lineHeight: 1.6, marginBottom: 10 }}>
                    Your policy{" "}
                    <strong style={{ color: "#333" }}>
                      {renewalPick.s.policynumber ||
                        renewalPick.s.quotenumber ||
                        `#${renewalPick.s.submissionid}`}
                    </strong>{" "}
                    expired on{" "}
                    <strong style={{ color: "#333" }}>
                      {formatSubmissionListDate(renewalPick.s.expireddate)}
                    </strong>{" "}
                    —{" "}
                    {renewalPick.daysSince === 0
                      ? "today"
                      : renewalPick.daysSince === 1
                        ? "1 day ago"
                        : `${renewalPick.daysSince} days ago`}
                    . Renew now to avoid a gap in coverage.
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      resetQuoteFlow();
                      setDashView(null);
                      goTo(0);
                    }}
                    style={{
                      ...btnPrimary,
                      background: BLUE,
                      fontSize: 13,
                      padding: "11px 0",
                      boxShadow: "0 2px 8px rgba(24,95,165,0.2)",
                    }}
                  >
                    Renew now
                  </button>
                </div>
              )}

              {downloadError && <Alert type="error" message={downloadError} />}
              <AsyncBoundary
                status={submissionsQ.status}
                isFetching={submissionsQ.isFetching && !submissionsQ.isPending}
                error={submissionsQ.error}
                isEmpty={!hasPoliciesToShow}
                onRetry={() => submissionsQ.refetch()}
                loadingLabel="Loading policies…"
                empty={<Alert type="info" message="No policies or submissions on file yet." />}
              >
                <>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 500,
                      color: "#333",
                      marginBottom: 8,
                      marginTop: 4,
                    }}
                  >
                    My policies
                  </div>
                  {dashboardSubmissions.map((s) => {
                    const pol = mapSubmissionToPolicyCard(s);
                    const canDownload = canDownloadPolicyDocuments(s);
                    const docsLockedReason = policyDocumentsLockedReason(s);
                    return (
                      <div
                        key={s.submissionid ?? pol.num}
                        style={{
                          background: "#f7f7f5",
                          borderRadius: 12,
                          padding: "14px 16px",
                          marginBottom: 10,
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            marginBottom: 8,
                          }}
                        >
                          <span style={{ fontSize: 12, fontWeight: 500, color: "#444" }}>
                            {pol.num}
                          </span>
                          <span
                            style={{
                              fontSize: 10,
                              fontWeight: 500,
                              padding: "3px 8px",
                              borderRadius: 10,
                              color: pol.isActive ? BRAND : "#888",
                              background: pol.isActive ? BRAND_LIGHT : "#eee",
                            }}
                          >
                            {pol.statusLabel}
                          </span>
                        </div>
                        {[
                          ["Speciality", pol.speciality],
                          ["Policy period", `${pol.eff} – ${pol.exp}`],
                          ["Total", pol.total],
                          ...(pol.zipState && pol.zipState !== "—"
                            ? [["Location", pol.zipState]]
                            : []),
                        ].map(([l, v]) => (
                          <div
                            key={l}
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              marginBottom: 3,
                            }}
                          >
                            <span style={{ fontSize: 11.5, color: "#595959" }}>{l}</span>
                            <span style={{ fontSize: 11.5, fontWeight: 500, color: "#444" }}>
                              {v}
                            </span>
                          </div>
                        ))}
                        <div
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: 8,
                            marginTop: 10,
                          }}
                        >
                          <div style={{ display: "flex", gap: 8 }}>
                            <button
                              type="button"
                              onClick={() => {
                                setPolicyDetailRow(s);
                                navigate(
                                  `/order-details?submissionId=${encodeURIComponent(String(s.submissionid))}`,
                                );
                              }}
                              style={{
                                ...btnOutline,
                                flex: 1,
                                fontSize: 11,
                                padding: "8px 0",
                                marginTop: 0,
                              }}
                            >
                              View details
                            </button>
                            <button
                              type="button"
                              disabled={!canDownload || downloadingKey === `coi-${s.submissionid}`}
                              style={dis(
                                {
                                  ...btnOutline,
                                  flex: 1,
                                  fontSize: 11,
                                  padding: "8px 0",
                                  marginTop: 0,
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  gap: 4,
                                },
                                canDownload && downloadingKey !== `coi-${s.submissionid}`,
                              )}
                              onClick={() => {
                                if (canDownload && !downloadingKey)
                                  doDownload(`coi-${s.submissionid}`, () =>
                                    downloadCOI(s.submissionid, setDashboardSubmissionsError),
                                  );
                              }}
                            >
                              {downloadingKey === `coi-${s.submissionid}` ? (
                                <>
                                  <Spinner />
                                  Downloading…
                                </>
                              ) : (
                                "Download COI"
                              )}
                            </button>
                            <button
                              type="button"
                              disabled={
                                !canDownload || downloadingKey === `binder-${s.submissionid}`
                              }
                              style={dis(
                                {
                                  ...btnOutline,
                                  flex: 1,
                                  fontSize: 11,
                                  padding: "8px 0",
                                  marginTop: 0,
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  gap: 4,
                                },
                                canDownload && downloadingKey !== `binder-${s.submissionid}`,
                              )}
                              onClick={() => {
                                if (canDownload && !downloadingKey)
                                  doDownload(`binder-${s.submissionid}`, () =>
                                    downloadBinder(
                                      s.submissionid,
                                      canDownload,
                                      setDashboardSubmissionsError,
                                    ),
                                  );
                              }}
                            >
                              {downloadingKey === `binder-${s.submissionid}` ? (
                                <>
                                  <Spinner />
                                  Downloading…
                                </>
                              ) : (
                                "Binder"
                              )}
                            </button>
                          </div>
                          {docsLockedReason && (
                            <div style={{ fontSize: 11, color: "#595959" }}>{docsLockedReason}</div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </>
              </AsyncBoundary>

              <div
                style={{
                  fontSize: 13,
                  fontWeight: 500,
                  color: "#333",
                  marginBottom: 8,
                  marginTop: 4,
                }}
              >
                Quick actions
              </div>
              {(
                [
                  {
                    label: "Start a new quote",
                    sub: "Get coverage for a new policy period",
                    action: () => {
                      resetQuoteFlow();
                      goToFromDashboard(0);
                    },
                  },
                  {
                    label: "View my profile",
                    sub: "License, scope, and practice details",
                    action: () => navigate("/profile"),
                  },
                ] as Array<{ label: string; sub: string; action?: () => void }>
              ).map((item) => (
                <button
                  type="button"
                  key={item.label}
                  onClick={item.action}
                  disabled={!item.action}
                  style={{
                    width: "100%",
                    textAlign: "left",
                    font: "inherit",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "12px 14px",
                    background: "#f7f7f5",
                    borderRadius: 10,
                    marginBottom: 8,
                    border: "none",
                    cursor: item.action ? "pointer" : "default",
                    transition: "background 0.15s",
                  }}
                >
                  <span>
                    <span
                      style={{ display: "block", fontSize: 13, fontWeight: 500, color: "#333" }}
                    >
                      {item.label}
                    </span>
                    <span
                      style={{ display: "block", fontSize: 11, color: "#595959", marginTop: 2 }}
                    >
                      {item.sub}
                    </span>
                  </span>
                  {item.action && (
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#767676"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      style={{ width: 16, height: 16, flexShrink: 0 }}
                      aria-hidden="true"
                    >
                      <path d="M9 18l6-6-6-6" />
                    </svg>
                  )}
                </button>
              ))}

              <Spacer />
              <button
                type="button"
                onClick={handleSignOut}
                style={{ ...btnOutline, fontSize: 12, marginTop: 0 }}
              >
                Sign out
              </button>
            </>
          )}
        </div>
      </div>

      <div
        className="dash-footer"
        style={{
          padding: "6px 16px",
          borderTop: "1px solid #f0f0f0",
          textAlign: "center",
          fontSize: 10,
          color: "#595959",
        }}
      >
        SelectFirst Insurance Services · (888) 959-9456 ·{" "}
        <LegalLink onClick={() => setShowAbout(true)}>About</LegalLink> ·{" "}
        <LegalLink onClick={() => setShowPrivacy(true)}>Privacy</LegalLink> ·{" "}
        <LegalLink onClick={() => setShowTerms(true)}>Terms</LegalLink>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
