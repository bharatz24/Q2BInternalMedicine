import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { BRAND, BRAND_DARK } from "@/shared/constants";
import {
  createDocuSignSigningSessionUrl,
  putUnderwriterReviewStatus,
} from "@/modules/Payment/api/paymentApi";
import { refreshPaymentOrder } from "@/modules/Payment/services/paymentOrderService";
import Alert from "@/shared/components/Alert";
import { Icon } from "@/shared/components/Icon";
import { btnPrimary, dis } from "@/shared/utils/styles";
import { useStore } from "@/shared/store/useStore";
import submissionStore from "@/modules/Quote/store/submissionStore";
import paymentOrderStore from "@/modules/Payment/store/paymentOrderStore";

// Zoom stored as integer tenths (10 = 100%) to avoid floating-point step drift.
const DS_BASE_H = 800;
const DS_ZOOM_MIN = 5; // 50%
const DS_ZOOM_MAX = 15; // 150%
const DS_ZOOM_DEFAULT = 10; // 100%

const SPINNER_KEYFRAMES_ID = "docusign-spinner-keyframes";
const SPINNER_KEYFRAMES_CSS =
  "@keyframes docusignSpinnerRotate { to { transform: rotate(360deg); } }";

function CircularWaitingSpinner({ size = 28 }) {
  useEffect(() => {
    if (typeof document === "undefined") return;
    if (document.getElementById(SPINNER_KEYFRAMES_ID)) return;
    const styleElement = document.createElement("style");
    styleElement.id = SPINNER_KEYFRAMES_ID;
    styleElement.textContent = SPINNER_KEYFRAMES_CSS;
    document.head.appendChild(styleElement);
  }, []);

  const borderThickness = Math.max(2, Math.round(size / 12));
  return (
    <div
      role="status"
      aria-label="Loading"
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        border: `${borderThickness}px solid rgba(0, 0, 0, 0.08)`,
        borderTopColor: BRAND,
        animation: "docusignSpinnerRotate 0.9s linear infinite",
        marginTop: 12,
      }}
    />
  );
}

const DOCUSIGN_COMPLETED_MESSAGE = "quote2bind:docusign-completed";
const DOCUSIGN_COMPLETED_PARAM = "q2bDocusignComplete";

const normalize = (value: unknown) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[_\s]+/g, "-");

const DOCUSIGN_COMPLETE_EVENTS = new Set([
  "signing-complete",
  "recipient-completed",
  "completed",
  "complete",
]);
const DOCUSIGN_CANCEL_EVENTS = new Set([
  "cancel",
  "decline",
  "session-end",
  "session-timeout",
  "ttl-expired",
]);

/**
 * Backoff ladder for the post-signing verification probe (see
 * `verifySignedWithBackend`). The first probe fires immediately; DocuSign
 * occasionally still reports the envelope as `sent` for a second or two after
 * the signer clicks FINISH, so spaced retries follow. If none of them confirm,
 * the next frame navigation starts a fresh ladder, and a page reload resolves
 * it too — the session-creation call answers `signedCompleted` on mount.
 */
const VERIFY_RETRY_DELAYS_MS = [0, 3000, 8000, 15000];

// DocuSign's viewer can navigate several times inside one ceremony, and each
// probe costs the backend a DocuSign round trip, so the probe is throttled and
// capped per mount.
const VERIFY_THROTTLE_MS = 5000;
const VERIFY_MAX_RUNS = 6;

const SUCCESS_GREEN = "#1a7f4b";
const SUCCESS_GREEN_BG = "#e6f4ec";

const isDocuSignCompletedUrl = (url: URL) => {
  const event = normalize(url.searchParams.get("event"));
  const status = normalize(url.searchParams.get("status"));
  const completed = normalize(url.searchParams.get(DOCUSIGN_COMPLETED_PARAM));
  return (
    completed === "true" ||
    completed === "1" ||
    DOCUSIGN_COMPLETE_EVENTS.has(event) ||
    DOCUSIGN_COMPLETE_EVENTS.has(status)
  );
};

const isDocuSignCancelledUrl = (url: URL) => {
  const event = normalize(url.searchParams.get("event"));
  const status = normalize(url.searchParams.get("status"));
  return DOCUSIGN_CANCEL_EVENTS.has(event) || DOCUSIGN_CANCEL_EVENTS.has(status);
};

/**
 * Step 7 — review and sign.
 *
 * A straight architectural port of `Q2BNfy`'s `ReviewDocusignPage.jsx`: this
 * page is ONLY the signing ceremony (embedded iframe, zoom controls,
 * return-URL + postMessage completion detection, the
 * `putUnderwriterReviewStatus` follow-on). It deliberately carries no quote
 * summary / itemized breakdown / applicant / coverage / fraud-warning blocks
 * — those were removed to match `Q2BNfy`.
 */
export default function ReviewDocusignPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const flowSubmissionId = useStore(submissionStore, (s) => s.flowSubmissionId);
  const paymentOrderDetails = useStore(paymentOrderStore, (s) => s.paymentOrderDetails);
  const launchStartedRef = useRef(false);
  const iframeRef = useRef(null);
  const [signingUrl, setSigningUrl] = useState<string | null>(null);
  const [completed, setCompleted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [zoomTenths, setZoomTenths] = useState(DS_ZOOM_DEFAULT);
  const zoom = zoomTenths / 10;
  const [reviewing, setReviewing] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);
  // Post-signing verification (see `verifySignedWithBackend`).
  const frameLoadsRef = useRef(0);
  const verifyRunningRef = useRef(false);
  const verifyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const verifyRunsRef = useRef(0);
  const lastVerifyAtRef = useRef(0);
  const unmountedRef = useRef(false);

  // `unmountedRef` is reset on mount, not just set on unmount: StrictMode's
  // dev-only mount/unmount/remount reuses the same refs, and a sticky `true`
  // would silently disable verification for the whole session.
  useEffect(() => {
    unmountedRef.current = false;
    return () => {
      unmountedRef.current = true;
      if (verifyTimerRef.current) clearTimeout(verifyTimerRef.current);
    };
  }, []);

  const adjustZoom = useCallback((dir: number) => {
    setZoomTenths((t) => Math.min(DS_ZOOM_MAX, Math.max(DS_ZOOM_MIN, t + dir)));
  }, []);
  const resetZoom = useCallback(() => setZoomTenths(10), []);
  const returnUrl = `${location.pathname}${location.search}${location.hash}`;

  const showCompleted = useCallback(() => {
    setCompleted(true);
    setSigningUrl(null);
    setLoading(false);
    setError(null);
    if (verifyTimerRef.current) {
      clearTimeout(verifyTimerRef.current);
      verifyTimerRef.current = null;
    }
    verifyRunningRef.current = false;
  }, []);

  /**
   * Ask the backend whether the envelope is signed, independently of the
   * DocuSign return URL.
   *
   * The return URL cannot be relied on: `ins` builds it from the origin it
   * sees on the API request, and our Netlify edge proxy deliberately strips
   * `Origin` / `Referer` / `X-Forwarded-*` before forwarding, so the redirect
   * after FINISH lands on the *API* host rather than this one. That host is
   * not in our `frame-src` allowlist, so the iframe is left showing the
   * browser's blocked-page placeholder and neither the return-URL params nor
   * the same-origin postMessage relay ever reach this page.
   *
   * Re-POSTing the signing session is the read we have: it evicts the cached
   * DocuSign status, re-checks the envelope, flips the workflow to "pay" and
   * answers `signedCompleted`. Any `signingUrl` it hands back is discarded —
   * swapping it into the iframe would restart a ceremony the signer may still
   * be in the middle of.
   */
  const verifySignedWithBackend = useCallback(async () => {
    if (!flowSubmissionId) return false;
    try {
      const data = await createDocuSignSigningSessionUrl(flowSubmissionId, location.pathname);
      if (!data?.signedCompleted) return false;
    } catch {
      // Transient failure — the retry ladder covers it.
      return false;
    }
    if (unmountedRef.current) return true;
    // Sync the order so `workflowstatus` / the quote projection match reality;
    // the success screen must not wait on it.
    void refreshPaymentOrder(flowSubmissionId);
    showCompleted();
    return true;
  }, [flowSubmissionId, location.pathname, showCompleted]);

  /** Run `verifySignedWithBackend` over `VERIFY_RETRY_DELAYS_MS`, once at a time. */
  const runVerifyLadder = useCallback(() => {
    if (verifyRunningRef.current || unmountedRef.current) return;
    if (verifyRunsRef.current >= VERIFY_MAX_RUNS) return;
    if (Date.now() - lastVerifyAtRef.current < VERIFY_THROTTLE_MS) return;
    verifyRunsRef.current += 1;
    lastVerifyAtRef.current = Date.now();
    verifyRunningRef.current = true;

    let attempt = 0;
    const tick = async () => {
      lastVerifyAtRef.current = Date.now();
      const signed = await verifySignedWithBackend();
      if (signed || unmountedRef.current) {
        verifyRunningRef.current = false;
        return;
      }
      attempt += 1;
      if (attempt >= VERIFY_RETRY_DELAYS_MS.length) {
        verifyRunningRef.current = false;
        return;
      }
      verifyTimerRef.current = setTimeout(() => {
        void tick();
      }, VERIFY_RETRY_DELAYS_MS[attempt]);
    };
    void tick();
  }, [verifySignedWithBackend]);

  // If the order is already in "pay" status the document was previously signed.
  useEffect(() => {
    if (completed) return;
    const status = (paymentOrderDetails?.workflowstatus || "").toString().trim().toLowerCase();
    if (status === "pay") showCompleted();
  }, [paymentOrderDetails, completed, showCompleted]);

  const handleContinueToPayment = useCallback(() => {
    if (!flowSubmissionId) return;
    setReviewing(true);
    setReviewError(null);
    putUnderwriterReviewStatus(flowSubmissionId)
      .then((underwriterReviewRequired) => {
        if (underwriterReviewRequired) {
          navigate("/underwriter-review", { replace: true });
        } else {
          submissionStore.step = 7;
          navigate("/payment", { replace: true });
        }
      })
      .catch((err) => {
        setReviewing(false);
        setReviewError(err?.message || "Unable to continue. Please try again.");
      });
  }, [flowSubmissionId, navigate]);

  // URL-based completion/cancellation detection (DocuSign return URL with params).
  // The URL params alone aren't trusted — anyone could navigate to
  // `/reviewDocusign?event=signing-complete` and skip the signing step.
  // Before showing the completed UI we refresh the order and confirm the
  // backend agrees (workflowstatus → "pay"). If the backend says otherwise,
  // we ignore the URL claim and let the normal signing flow proceed.
  useEffect(() => {
    const currentUrl = new URL(`${window.location.origin}${returnUrl}`);
    if (isDocuSignCompletedUrl(currentUrl)) {
      if (window.parent && window.parent !== window) {
        window.parent.postMessage(
          {
            type: DOCUSIGN_COMPLETED_MESSAGE,
            search: currentUrl.search,
            hash: currentUrl.hash,
          },
          window.location.origin,
        );
      }
      let cancelledLocal = false;
      (async () => {
        if (!flowSubmissionId) {
          showCompleted();
          return;
        }
        const fresh = await refreshPaymentOrder(flowSubmissionId);
        if (cancelledLocal) return;
        const status = (fresh?.workflowstatus || "").toString().trim().toLowerCase();
        // Only trust completion if the server confirms post-signing state.
        if (status === "pay") showCompleted();
      })();
      return () => {
        cancelledLocal = true;
      };
    }
    if (isDocuSignCancelledUrl(currentUrl)) {
      navigate("/dashboard", { replace: true });
    }
    return undefined;
  }, [returnUrl, showCompleted, navigate, flowSubmissionId]);

  // postMessage handler for same-origin relay and native DocuSign events
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (!event.data) return;

      // Internal relay from the iframe (same origin)
      if (
        event.origin === window.location.origin &&
        event.data?.type === DOCUSIGN_COMPLETED_MESSAGE
      ) {
        showCompleted();
        return;
      }

      // Native DocuSign postMessage events
      try {
        const data = typeof event.data === "string" ? JSON.parse(event.data) : event.data;
        const dsEvent = normalize(data?.event);
        if (DOCUSIGN_COMPLETE_EVENTS.has(dsEvent)) {
          showCompleted();
        } else if (DOCUSIGN_CANCEL_EVENTS.has(dsEvent)) {
          launchStartedRef.current = false;
          navigate("/dashboard", { replace: true });
        }
      } catch {
        // ignore non-JSON messages
      }
    };
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [navigate, showCompleted]);

  // Create DocuSign signing session
  useEffect(() => {
    let cancelled = false;
    if (completed)
      return () => {
        cancelled = true;
      };
    const currentUrl = new URL(`${window.location.origin}${returnUrl}`);
    if (isDocuSignCompletedUrl(currentUrl))
      return () => {
        cancelled = true;
      };
    if (launchStartedRef.current)
      return () => {
        cancelled = true;
      };
    if (!flowSubmissionId) {
      navigate("/dashboard", { replace: true });
      return () => {
        cancelled = true;
      };
    }

    launchStartedRef.current = true;
    setLoading(true);
    setError(null);
    const docuSignReturnUrl = location.pathname;
    createDocuSignSigningSessionUrl(flowSubmissionId, docuSignReturnUrl)
      .then((data) => {
        if (cancelled) return;
        if (data.signedCompleted) {
          setCompleted(true);
        }
        if (data.signingUrl) setSigningUrl(data.signingUrl);
      })
      .catch((err) => {
        if (!cancelled) {
          launchStartedRef.current = false;
          setError(err?.message || "Could not start document signing.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [flowSubmissionId, returnUrl, completed, location.pathname, showCompleted, navigate]);

  const handleDocuSignFrameLoad = useCallback(
    (event: any) => {
      const iframe = event.currentTarget;
      frameLoadsRef.current += 1;
      // Load #1 is the DocuSign ceremony itself. Every later load means the
      // frame navigated — the FINISH redirect to the return URL, a blocked /
      // errored page, or a step inside DocuSign. Only the backend can tell
      // those apart, so ask it.
      const navigatedAwayFromCeremony = frameLoadsRef.current > 1;

      // Inject image-rendering CSS into the inner document.
      // Succeeds only when same-origin (e.g. return-URL phase); silently no-ops cross-origin.
      // Zoom is driven by the iframe's actual rendered width — no CSS zoom or transform needed.
      try {
        const doc = iframe.contentWindow?.document;
        if (doc?.head && !doc.getElementById("q2b-img-crisp")) {
          const style = doc.createElement("style");
          style.id = "q2b-img-crisp";
          style.textContent = "img { image-rendering: crisp-edges; max-width: 100%; }";
          doc.head.appendChild(style);
        }
      } catch {
        /* cross-origin — iframe width drives zoom, no injection needed */
      }

      try {
        const frameLocation = iframe.contentWindow?.location;
        const frameUrl = frameLocation ? new URL(frameLocation.href) : null;
        if (frameUrl && frameUrl.origin === window.location.origin) {
          if (isDocuSignCompletedUrl(frameUrl)) {
            showCompleted();
            return;
          }
          if (isDocuSignCancelledUrl(frameUrl)) {
            launchStartedRef.current = false;
            navigate("/dashboard", { replace: true });
            return;
          }
        }
      } catch {
        // Cross-origin while the signer is on DocuSign, or a blocked/errored
        // frame we are not allowed to read — fall through to the backend probe.
      }

      if (navigatedAwayFromCeremony) runVerifyLadder();
    },
    [showCompleted, navigate, runVerifyLadder],
  );

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
      {signingUrl ? (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              padding: "4px 8px",
              borderBottom: "1px solid #e8e8e8",
              background: "#fafafa",
            }}
          >
            <button
              type="button"
              onClick={() => adjustZoom(-1)}
              disabled={zoomTenths <= DS_ZOOM_MIN}
              title="Zoom out"
              style={{
                fontSize: 16,
                lineHeight: 1,
                padding: "2px 8px",
                cursor: zoomTenths <= DS_ZOOM_MIN ? "default" : "pointer",
                border: "1px solid #d0d0d0",
                borderRadius: 4,
                background: "#fff",
                opacity: zoomTenths <= DS_ZOOM_MIN ? 0.4 : 1,
              }}
            >
              −
            </button>
            <span style={{ fontSize: 12, minWidth: 38, textAlign: "center", color: "#444" }}>
              {zoomTenths * 10}%
            </span>
            <button
              type="button"
              onClick={() => adjustZoom(1)}
              disabled={zoomTenths >= DS_ZOOM_MAX}
              title="Zoom in"
              style={{
                fontSize: 16,
                lineHeight: 1,
                padding: "2px 8px",
                cursor: zoomTenths >= DS_ZOOM_MAX ? "default" : "pointer",
                border: "1px solid #d0d0d0",
                borderRadius: 4,
                background: "#fff",
                opacity: zoomTenths >= DS_ZOOM_MAX ? 0.4 : 1,
              }}
            >
              +
            </button>
            <button
              type="button"
              onClick={resetZoom}
              title="Reset zoom"
              style={{
                fontSize: 14,
                lineHeight: 1,
                padding: "2px 8px",
                cursor: "pointer",
                border: "1px solid #d0d0d0",
                borderRadius: 4,
                background: "#fff",
              }}
            >
              ↺
            </button>
          </div>
          <div style={{ flex: 1, overflow: "hidden" }}>
            {/*
              Zoom is implemented by changing the iframe's actual rendered width.
              DocuSign's viewer fires a resize event and reflows the PDF natively at
              the new viewport size — text and fields scale correctly with no CSS tricks.
              zoom > 1 → iframe wider than container → horizontal scroll bar appears.
              zoom < 1 → iframe narrower than container → DocuSign renders smaller pages.
            */}
            <div
              style={{
                height: DS_BASE_H,
                overflowX: zoom > 1 ? "auto" : "hidden",
                overflowY: "clip",
                background: "#f0f0f0",
              }}
            >
              <iframe
                ref={iframeRef}
                title="DocuSign signing"
                src={signingUrl}
                onLoad={handleDocuSignFrameLoad}
                frameBorder="0"
                allow="camera; microphone"
                // Strip Referer so the one-time DocuSign signing-session URL
                // doesn't leak into third-party navigation logs if the
                // signer clicks an external link inside the DocuSign UI.
                referrerPolicy="no-referrer"
                // Sandbox at the minimum permissions DocuSign needs to
                // function (script, form posts, popups for help links,
                // same-origin to read its own cookies). This narrows the
                // blast radius if the iframe content is ever tampered
                // with at the network layer.
                sandbox="allow-scripts allow-forms allow-same-origin allow-popups allow-popups-to-escape-sandbox"
                style={{
                  display: "block",
                  border: 0,
                  width: `${zoom * 100}%`,
                  height: `${DS_BASE_H}px`,
                }}
              />
            </div>
          </div>
        </div>
      ) : (
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            textAlign: "center",
            padding: "32px 12px",
          }}
        >
          {completed && !reviewing && (
            <div
              aria-hidden="true"
              style={{
                width: 52,
                height: 52,
                borderRadius: "50%",
                background: SUCCESS_GREEN_BG,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 14,
              }}
            >
              <Icon
                size={26}
                stroke={SUCCESS_GREEN}
                sw={2.5}
                d={<polyline points="20 6 9 17 4 12" />}
              />
            </div>
          )}
          <h2
            className="ui-heading"
            style={{
              fontFamily: "var(--font-heading)",
              fontSize: 22,
              fontWeight: 600,
              color: completed && !reviewing ? SUCCESS_GREEN : BRAND_DARK,
              margin: "0 0 8px",
            }}
          >
            {completed && !reviewing ? "Document signed" : "Review and sign"}
          </h2>
          {completed && !reviewing && (
            <p
              role="status"
              style={{ fontSize: 13, color: BRAND_DARK, lineHeight: 1.6, margin: 0 }}
            >
              Your document was signed successfully. Click Continue to go to payment.
            </p>
          )}
          {completed && reviewing && (
            <>
              <p style={{ fontSize: 13, color: "#595959", lineHeight: 1.6, margin: 0 }}>
                Checking your application status…
              </p>
              <CircularWaitingSpinner />
            </>
          )}
          {loading && (
            <>
              <p style={{ fontSize: 13, color: "#595959", lineHeight: 1.6, margin: 0 }}>
                Opening your DocuSign signing session...
              </p>
              <CircularWaitingSpinner />
            </>
          )}
          <Alert type="error" message={error} />
          <Alert type="error" message={reviewError} />
        </div>
      )}

      <div style={{ padding: "12px 18px 18px", borderTop: "1px solid #f0f0f0" }}>
        <button
          type="button"
          onClick={handleContinueToPayment}
          disabled={!completed || reviewing}
          className="ui-btn-primary"
          style={dis(
            { ...btnPrimary, width: "100%", fontSize: 13, marginTop: 0 },
            completed && !reviewing,
          )}
        >
          {reviewing ? "Checking…" : "Continue"}
        </button>
      </div>
    </div>
  );
}
