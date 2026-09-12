import { BRAND, BRAND_DARK, BRAND_LIGHT } from "@/shared/constants";
import ModalShell from "./ModalShell";

export default function AboutModal({ onClose }: { onClose: () => void }) {
  return (
    <ModalShell title="About us" onClose={onClose}>
      <div style={{ textAlign: "center", marginBottom: 16 }}>
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: "50%",
            background: BRAND_LIGHT,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 8,
          }}
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke={BRAND}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ width: 24, height: 24 }}
          >
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
        </div>
        <div
          className="ui-heading"
          style={{
            fontFamily: "var(--font-heading)",
            fontSize: 18,
            fontWeight: 600,
            color: BRAND_DARK,
            marginBottom: 4,
          }}
        >
          SelectFirst Insurance Services
        </div>
        <div style={{ fontSize: 13, color: "#595959" }}>Protecting those who care for others.</div>
      </div>

      <div style={{ fontSize: 12.5, color: "#555", lineHeight: 1.7, marginBottom: 16 }}>
        SelectFirst Insurance Services is a licensed insurance agency specializing in professional
        liability coverage for internal medicine providers — MD, DO, PA, NP, CRNA, CNM and others.
        We serve as the exclusive agency and program manager for Doctors Professional Liability Risk
        Retention Group (DPL RRG), a federally chartered Risk Retention Group licensed to do
        business in all 50 states and the District of Columbia.
      </div>

      <div
        style={{ background: "#f7f7f5", borderRadius: 10, padding: "12px 14px", marginBottom: 16 }}
      >
        <div style={{ fontSize: 13, fontWeight: 500, color: "#333", marginBottom: 4 }}>
          About DPL RRG
        </div>
        <div style={{ fontSize: 12, color: "#666", lineHeight: 1.6 }}>
          DPL RRG is a Risk Retention Group chartered under the federal Liability Risk Retention Act
          of 1986. As a member-owned liability insurance company, DPL RRG is purpose-built for
          medical professionals — with claims-made professional liability coverage and competitive
          rates by medical specialty.
        </div>
      </div>

      <div style={{ fontSize: 13, fontWeight: 500, color: "#333", marginBottom: 10 }}>
        How it works
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
        {[
          {
            num: "1",
            title: "Enter your practice details",
            desc: "Get an instant estimated quote based on where you practice and when coverage starts.",
          },
          {
            num: "2",
            title: "Complete your application",
            desc: "A streamlined online version of the DPL application, saved as you go.",
          },
          {
            num: "3",
            title: "Bind & get your certificate",
            desc: "Clean risks bind instantly. Certificate of insurance available for immediate download.",
          },
        ].map((step) => (
          <div key={step.num} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
            <div
              style={{
                width: 26,
                height: 26,
                borderRadius: "50%",
                background: BRAND,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 12,
                fontWeight: 500,
                color: "#fff",
                flexShrink: 0,
              }}
            >
              {step.num}
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 500, color: "#333" }}>{step.title}</div>
              <div style={{ fontSize: 11.5, color: "#595959", lineHeight: 1.5 }}>{step.desc}</div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ fontSize: 13, fontWeight: 500, color: "#333", marginBottom: 10 }}>
        Why providers choose us
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 16 }}>
        {[
          { label: "All 50 states", sub: "Licensed nationwide" },
          { label: "Claims-made", sub: "Defense outside limits" },
          { label: "Instant bind", sub: "Clean risks bind same-day" },
          { label: "Portable", sub: "Stays with you, not your employer" },
        ].map((fact) => (
          <div
            key={fact.label}
            style={{ background: BRAND_LIGHT, borderRadius: 8, padding: "10px 12px" }}
          >
            <div style={{ fontSize: 12.5, fontWeight: 500, color: BRAND_DARK }}>{fact.label}</div>
            <div style={{ fontSize: 10.5, color: BRAND, marginTop: 2 }}>{fact.sub}</div>
          </div>
        ))}
      </div>

      <div style={{ fontSize: 13, fontWeight: 500, color: "#333", marginBottom: 8 }}>
        Contact us
      </div>
      <div style={{ fontSize: 12, color: "#555", lineHeight: 1.7 }}>
        <div>SelectFirst Insurance Services</div>
        <div>Phone: (888) 959-9456</div>
        <div>Email: support@selectfirstinsurance.com</div>
      </div>
    </ModalShell>
  );
}
