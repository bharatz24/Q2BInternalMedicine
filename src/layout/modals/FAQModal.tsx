import { useState } from "react";
import { BRAND_DARK } from "@/shared/constants";
import { btnPrimary } from "@/shared/utils/styles";
import { useDialogA11y } from "@/shared/a11y/useDialogA11y";

// Frequently-asked questions shown from the MedMalGuard nav "FAQ" link.
// Rendered as a right slide-in drawer (panel anchored to the right edge,
// full-height, sliding in over a dimmed backdrop). Close affordances match
// the shared ModalShell conventions: backdrop click, Escape, the × in the
// header, and a Close button in the footer. The body is an accordion so the
// list stays scannable.
const FAQS = [
  {
    q: "Who is eligible for coverage?",
    a: "Coverage is designed for NP/APRNs, CRNAs, RNs and LPNs. Choose your designation and speciality on the home page for a live estimate based on where and how you practice.",
  },
  {
    q: "How fast can I get a certificate?",
    a: "On straightforward submissions you can bind online in a single session and your certificate of insurance is emailed to you instantly — no agent call required.",
  },
  {
    q: "What does the price include?",
    a: "The estimate shown is a real, carrier-backed price that already includes all applicable fees and taxes. There are no hidden charges added at bind.",
  },
  {
    q: "Is this claims-made coverage?",
    a: "Yes. The policy is claims-made professional liability coverage with defense costs outside the limits, and includes License Defense Protection.",
  },
  {
    q: "Who backs the coverage?",
    a: "Coverage is provided by Doctors Professional Liability Risk Retention Group (DPL RRG), rated A (Exceptional) by Demotech and reinsured by Lloyd's of London.",
  },
  {
    q: "Does my policy stay with me if I change jobs?",
    a: "Yes. The policy is portable — it stays with you, not your employer, so your coverage follows you as your practice changes.",
  },
  {
    q: "What is the structural difference between Claims-Made and Occurrence?",
    a: "A Claims-Made policy covers incidents occurred AND reported while the policy remains actively in force. It requires “Tail” coverage if cancelled. An Occurrence policy covers incidents that occur during the policy period, regardless of when the lawsuit is eventually filed, meaning no tail coverage is ever required to protect that specific calendar window.",
  },
  {
    q: "How does an authorized Risk Retention Group benefit my clinical pricing?",
    a: "Under the federal Liability Risk Retention Act (LRRA), a Risk Retention Group (RRG) is authorized to sell liability protection nationwide under the primary supervision of its chartering state. This cuts down complex state-by-state filing fees, enabling us to go direct-to-broker and pass down 35% in premium savings to our professional policyholders.",
  },
  {
    q: "Do you offer Retroactive Date Matching (Prior Acts) for changing insurers?",
    a: "Absolutely. If you are active under a previous Claims-Made policy and can provide proof of continuous coverage, we will align your “Retroactive Date” perfectly with your new SelectFirst policy. This preserves and protects your historical coverage window without requiring you to purchase expensive tail coverage from your previous carrier.",
  },
  {
    q: "What is Tail Coverage and is it automatically provided?",
    a: "Tail coverage (Extended Reporting Endorsement) protects you for past incidents after a claims-made policy is canceled. SelectFirst offers dynamic free tail coverage endorsements upon your retirement (under specified premium duration requirements) or in the event of disability or death, giving your career maximum structural security.",
  },
];

const C = {
  accent: "#6286ed",
  accentStrong: "#2653d4",
  ink: "#2a2c45",
  body: "#6e7080",
  border: "#e3e6f0",
};

interface FAQItemProps {
  q: string;
  a: string;
  open: boolean;
  onToggle: () => void;
}

function FAQItem({ q, a, open, onToggle }: FAQItemProps) {
  return (
    <div style={{ borderBottom: `1px solid ${C.border}` }}>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        style={{
          width: "100%",
          background: "none",
          border: 0,
          padding: "14px 0",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          cursor: "pointer",
          textAlign: "left",
          font: "inherit",
        }}
      >
        <span style={{ fontWeight: 700, fontSize: 14, color: C.ink, lineHeight: 1.4 }}>{q}</span>
        <span
          style={{
            flexShrink: 0,
            fontSize: 18,
            fontWeight: 700,
            color: C.accentStrong,
            lineHeight: 1,
            transform: open ? "rotate(45deg)" : "none",
            transition: "transform .15s ease-in-out",
          }}
        >
          +
        </span>
      </button>
      {open && (
        <div style={{ fontSize: 13, color: C.body, lineHeight: 1.65, padding: "0 0 16px" }}>
          {a}
        </div>
      )}
    </div>
  );
}

export default function FAQModal({ onClose }: { onClose: () => void }) {
  const [openIdx, setOpenIdx] = useState(0);
  // Escape-to-close, focus trap, focus restore, body scroll-lock.
  const { dialogProps, titleId } = useDialogA11y(onClose);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        display: "flex",
        justifyContent: "flex-end",
        zIndex: 100,
      }}
    >
      {/* Backdrop: dim layer; clicking it (outside the panel) closes the
          drawer. A real <button> so it is keyboard/AT-inert rather than a div
          with a click handler; Escape-to-close is wired by useDialogA11y. */}
      <button
        type="button"
        aria-label="Close dialog"
        tabIndex={-1}
        onClick={onClose}
        style={{
          position: "absolute",
          inset: 0,
          background: "rgba(0,0,0,0.4)",
          border: "none",
          cursor: "default",
          padding: 0,
        }}
      />
      {/* Panel: right-anchored, full-height, slides in from the right. */}
      <div
        {...dialogProps}
        aria-labelledby={titleId}
        style={{
          position: "relative",
          background: "#fff",
          height: "100%",
          width: "100%",
          maxWidth: 440,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          boxShadow: "-12px 0 40px rgba(42,43,69,.18)",
          animation: "faq-drawer-in .26s cubic-bezier(.22,.61,.36,1)",
        }}
      >
        <style>{`@keyframes faq-drawer-in { from { transform: translateX(100%); } to { transform: translateX(0); } }`}</style>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "16px 20px",
            borderBottom: "1px solid #f0f0f0",
            flexShrink: 0,
          }}
        >
          <span
            id={titleId}
            className="ui-heading"
            style={{
              fontFamily: "var(--font-heading)",
              fontSize: 16,
              fontWeight: 600,
              color: BRAND_DARK,
            }}
          >
            Frequently asked questions
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              fontSize: 20,
              color: "#595959",
              padding: 0,
              lineHeight: 1,
            }}
          >
            ×
          </button>
        </div>

        <div
          style={{
            overflowY: "auto",
            flex: 1,
            padding: "8px 20px 16px",
            fontFamily: "'Inter', ui-sans-serif, system-ui, sans-serif",
          }}
        >
          {FAQS.map((item, i) => (
            <FAQItem
              key={item.q}
              q={item.q}
              a={item.a}
              open={openIdx === i}
              onToggle={() => setOpenIdx(openIdx === i ? -1 : i)}
            />
          ))}
          <div style={{ fontSize: 13, color: C.body, lineHeight: 1.65, paddingTop: 16 }}>
            Still have questions? Call{" "}
            <a
              href="tel:+18889663881"
              style={{ color: C.accentStrong, fontWeight: 700, textDecoration: "none" }}
            >
              (888) 966-3881
            </a>{" "}
            or email{" "}
            <a
              href="mailto:support@medmalguard.com"
              style={{ color: C.accentStrong, fontWeight: 700, textDecoration: "none" }}
            >
              support@medmalguard.com
            </a>
            .
          </div>
        </div>

        <div style={{ padding: "10px 20px", borderTop: "1px solid #f0f0f0", flexShrink: 0 }}>
          <button
            type="button"
            onClick={onClose}
            className="ui-btn-primary"
            style={{ ...btnPrimary, fontSize: 13, padding: "11px 0" }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
