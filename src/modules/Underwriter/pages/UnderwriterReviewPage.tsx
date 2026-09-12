import { useNavigate } from "react-router-dom";
import { BRAND_DARK, BRAND_LIGHT } from "@/shared/constants";
import { Icon } from "@/shared/components/Icon";
import { LegalLink } from "@/shared/components/LegalLink";
import { MedMalGuardHeader } from "@/modules/Quote/components/MedMalGuardLanding";
import { btnOutline, btnPrimary } from "@/shared/utils/styles";
import sessionStore from "@/shared/store/sessionStore";
import modalStore from "@/shared/store/modalStore";
import paymentOrderStore from "@/modules/Payment/store/paymentOrderStore";
import bindStore from "@/modules/Payment/store/bindStore";

const CLOCK_ICON_PATH =
  "M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z M12 6v6l4 2";

export default function UnderwriterReviewPage() {
  const navigate = useNavigate();
  const resetCompletionAndPaymentOrderBootstrap = () => {
    bindStore.clear();
    paymentOrderStore.clear();
  };
  const setDashView = (v: "dashboard" | null) => {
    sessionStore.dashView = v;
  };
  const setShowAbout = (v: boolean) => {
    modalStore.showAbout = v;
  };
  const setShowPrivacy = (v: boolean) => {
    modalStore.showPrivacy = v;
  };
  const setShowTerms = (v: boolean) => {
    modalStore.showTerms = v;
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
          <Icon d={CLOCK_ICON_PATH} size={28} />
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
          Under review
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
          Your application has been submitted for underwriter review. A DPL underwriter will contact
          you within <strong style={{ color: "#333" }}>1 business day</strong>.
        </p>

        <div
          style={{
            background: "#f7f7f5",
            borderRadius: 12,
            padding: "14px 18px",
            width: "100%",
            maxWidth: 280,
            marginBottom: 16,
          }}
        >
          <div
            style={{
              fontSize: 11,
              color: "#595959",
              marginBottom: 6,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
            }}
          >
            What happens next
          </div>
          <div style={{ fontSize: 13, color: "#555", lineHeight: 1.7, textAlign: "left" }}>
            <div>1. Your application is reviewed by our underwriting team.</div>
            <div>2. You'll be contacted with a decision or questions.</div>
            <div>3. Once approved, you'll complete payment to bind coverage.</div>
          </div>
        </div>

        <div
          style={{ display: "flex", gap: 8, width: "100%", maxWidth: 280, flexDirection: "column" }}
        >
          <button
            type="button"
            onClick={() => {
              resetCompletionAndPaymentOrderBootstrap();
              setDashView("dashboard");
              navigate("/dashboard");
            }}
            className="ui-btn-primary"
            style={{ ...btnPrimary, fontSize: 13 }}
          >
            Go to Dashboard
          </button>
          <a
            href="tel:8889599456"
            style={{
              ...btnOutline,
              textDecoration: "none",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            Call (888) 959-9456
          </a>
        </div>
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
        <LegalLink onClick={() => setShowAbout(true)}>About</LegalLink> ·{" "}
        <LegalLink onClick={() => setShowPrivacy(true)}>Privacy</LegalLink> ·{" "}
        <LegalLink onClick={() => setShowTerms(true)}>Terms</LegalLink>
      </div>

      <style>{`@keyframes popIn{0%{transform:scale(0)}100%{transform:scale(1)}}`}</style>
    </>
  );
}
