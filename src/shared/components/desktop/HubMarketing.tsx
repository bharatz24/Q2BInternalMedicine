// Desktop-only marketing sections for the quote hub: trust ribbon,
// benefits grid, comparison table, testimonials, group-practice CTA (with
// a working self-contained inquiry form), FAQ accordions, advising CTA,
// and the hub footer. Ported from the `New design desktop/` reference.
//
// Hidden below 1024px via `.hub-desktop` in src/responsive.css, and only
// mounted by FlowLayout on the landing (/) and soft-quote (/quote) routes.
// About/Privacy/Terms open the app's real modals via modalStore.

import { useId, useState } from "react";
import type { CSSProperties, FormEvent, ReactNode } from "react";
import { COMPARISON_GRID, TESTIMONIALS } from "./hubData";
import modalStore from "@/shared/store/modalStore";
import {
  TEAL_50,
  TEAL_100,
  TEAL_200,
  TEAL_300,
  TEAL_700,
  TEAL_800,
  TEAL_900,
  SLATE_50,
  SLATE_100,
  SLATE_200,
  SLATE_300,
  SLATE_400,
  SLATE_500,
  SLATE_700,
  SLATE_800,
  SLATE_900,
  EMERALD_100,
  AMBER_400,
  FONT_SANS,
  FONT_MONO,
  MAX_W,
} from "./hubTheme";
import {
  ShieldCheck,
  Star,
  Users,
  Lock,
  Check,
  X,
  ShieldAlert,
  CheckCircle,
  FilePieChart,
  Mail,
  Phone,
  Shield,
} from "./HubIcons";

const container: CSSProperties = {
  maxWidth: MAX_W,
  margin: "0 auto",
  padding: "0 24px",
  width: "100%",
  boxSizing: "border-box",
};

export default function HubMarketing() {
  return (
    <div className="hub-desktop hub-marketing" style={{ fontFamily: FONT_SANS }}>
      <TrustRibbon />
      <ComparisonTable />
      <Testimonials />
      <GroupPracticeCTA />
      <HubFooter />
    </div>
  );
}

function SectionHead({
  eyebrow,
  title,
  sub,
}: {
  eyebrow?: ReactNode;
  title?: ReactNode;
  sub?: ReactNode;
}) {
  return (
    <div style={{ textAlign: "center", maxWidth: 640, margin: "0 auto 48px" }}>
      {eyebrow ? (
        <span
          style={{
            fontSize: 10,
            textTransform: "uppercase",
            fontFamily: FONT_MONO,
            letterSpacing: "0.1em",
            fontWeight: 800,
            color: TEAL_800,
            background: TEAL_50,
            border: `1px solid ${TEAL_100}`,
            padding: "4px 10px",
            borderRadius: 4,
          }}
        >
          {eyebrow}
        </span>
      ) : null}
      <h2
        style={{
          fontSize: 30,
          fontWeight: 900,
          color: SLATE_900,
          letterSpacing: "-0.02em",
          marginTop: eyebrow ? 12 : 0,
        }}
      >
        {title}
      </h2>
      {sub ? (
        <p
          style={{
            marginTop: 10,
            fontSize: 12,
            color: SLATE_500,
            lineHeight: 1.6,
            maxWidth: 540,
            marginInline: "auto",
          }}
        >
          {sub}
        </p>
      ) : null}
    </div>
  );
}

function TrustRibbon() {
  const tile = (icon: ReactNode, a: ReactNode, b: ReactNode) => (
    <div style={{ display: "flex", alignItems: "center", gap: 12, justifyContent: "center" }}>
      <div
        style={{
          display: "flex",
          height: 40,
          width: 40,
          flexShrink: 0,
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 8,
          background: TEAL_50,
          color: TEAL_800,
        }}
      >
        {icon}
      </div>
      <div>
        {a}
        {b}
      </div>
    </div>
  );
  return (
    <div
      className="hub-section"
      style={{
        background: SLATE_50,
        borderTop: `1px solid ${SLATE_200}`,
        borderBottom: `1px solid ${SLATE_200}`,
        padding: "24px 0",
      }}
    >
      <div
        style={{
          ...container,
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 32,
          alignItems: "center",
        }}
      >
        {tile(
          <Star size={20} color={TEAL_800} fill={TEAL_800} />,
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <span style={{ fontWeight: 700, color: SLATE_800, fontSize: 14 }}>4.9 / 5.0</span>
            <span style={{ fontSize: 12, color: SLATE_500, fontWeight: 500 }}>(Trustpilot)</span>
          </div>,
          <p style={{ fontSize: 12, color: SLATE_500, margin: 0 }}>
            Rated Excellent by Clinicians
          </p>,
        )}
        {tile(
          <ShieldCheck size={20} color={TEAL_700} />,
          <p style={{ fontSize: 12, fontWeight: 700, color: SLATE_800, margin: 0 }}>
            A-Rated Security
          </p>,
          <p style={{ fontSize: 11, color: SLATE_500, margin: 0, lineHeight: 1.3 }}>
            Fully reinsured by Swiss Re &amp; Lloyd’s
          </p>,
        )}
        {tile(
          <Users size={20} color={TEAL_700} />,
          <p style={{ fontSize: 12, fontWeight: 700, color: SLATE_800, margin: 0 }}>
            12,000+ Practitioners
          </p>,
          <p style={{ fontSize: 11, color: SLATE_500, margin: 0, lineHeight: 1.3 }}>
            Covered nationwide in 50 states
          </p>,
        )}
        {tile(
          <Lock size={20} color={TEAL_700} />,
          <p style={{ fontSize: 12, fontWeight: 700, color: SLATE_800, margin: 0 }}>
            HIPAA &amp; SSL Secured
          </p>,
          <p style={{ fontSize: 11, color: SLATE_500, margin: 0, lineHeight: 1.3 }}>
            256-bit medical data encryption
          </p>,
        )}
      </div>
    </div>
  );
}

function ComparisonTable() {
  const th = { padding: "16px 24px", borderBottom: `1px solid ${SLATE_200}` };
  const td = { padding: "18px 24px", verticalAlign: "top" };
  return (
    <section
      className="hub-section"
      style={{ background: SLATE_50, padding: "48px 0", borderTop: `1px solid ${SLATE_200}` }}
    >
      <div style={container}>
        <SectionHead
          eyebrow="Underwriting Assessment"
          title="Policy Structural Comparisons"
          sub="See how the direct SelectFirst Risk Retention model compares to typical third-party brokers and standard employer-sponsored insurance pools."
        />
        <div
          style={{
            borderRadius: 16,
            border: `1px solid ${SLATE_200}`,
            boxShadow: "0 1px 2px rgba(15,23,42,0.04)",
            background: "#fff",
            overflow: "hidden",
          }}
        >
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
            <thead>
              <tr
                style={{
                  background: SLATE_900,
                  color: "#fff",
                  fontSize: 12,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  fontFamily: FONT_MONO,
                }}
              >
                <th style={{ ...th, width: "22%" }}>Key Parameter</th>
                <th style={{ ...th, background: TEAL_900, width: "30%" }}>SelectFirst Direct</th>
                <th style={{ ...th, width: "24%" }}>Standard Brokers</th>
                <th style={{ ...th, width: "24%" }}>Employer Group Ins</th>
              </tr>
            </thead>
            <tbody style={{ fontSize: 12, color: SLATE_700, lineHeight: 1.6 }}>
              {COMPARISON_GRID.map((row, i) => (
                <tr key={i} style={{ borderTop: i ? `1px solid ${SLATE_100}` : "none" }}>
                  <td
                    style={{
                      ...td,
                      fontWeight: 700,
                      color: SLATE_800,
                      borderRight: `1px solid ${SLATE_100}`,
                    }}
                  >
                    {row.feature}
                  </td>
                  <td
                    style={{
                      ...td,
                      fontWeight: 600,
                      color: TEAL_900,
                      background: "rgba(240,253,250,0.3)",
                      borderRight: `1px solid ${SLATE_200}`,
                    }}
                  >
                    <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                      <Check size={18} color={TEAL_700} />
                      <span>{row.selectFirst}</span>
                    </div>
                  </td>
                  <td style={{ ...td, color: SLATE_500, borderRight: `1px solid ${SLATE_100}` }}>
                    <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                      <X size={18} color={SLATE_400} />
                      <span>{row.traditionalBrokers}</span>
                    </div>
                  </td>
                  <td style={{ ...td, color: SLATE_400 }}>
                    <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                      <ShieldAlert size={18} color="rgba(245,158,11,0.8)" />
                      <span>{row.employerGroup}</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p
          style={{
            fontSize: 10,
            color: SLATE_400,
            textAlign: "center",
            fontWeight: 500,
            marginTop: 16,
            fontFamily: FONT_MONO,
            lineHeight: 1.6,
          }}
        >
          * Information compiled based on standard national averages for clinical Allied Health
          practitioners using claims-made terms in CA, TX, and FL. Individual employer limits may
          fluctuate by health network bylaws.
        </p>
      </div>
    </section>
  );
}

function Testimonials() {
  return (
    <section
      className="hub-section"
      style={{ background: SLATE_50, padding: "48px 0", borderTop: `1px solid ${SLATE_200}` }}
    >
      <div style={container}>
        <SectionHead
          title="Endorsed by Clinical Practitioners Nationwide"
          sub="Real feedback from active mid-level healthcare practitioners protecting their credentials with MedMalGuard."
        />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24 }}>
          {TESTIMONIALS.map((t) => (
            <div
              key={t.id}
              style={{
                background: "#fff",
                borderRadius: 16,
                border: `1px solid ${SLATE_200}`,
                padding: 24,
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                boxShadow: "0 1px 2px rgba(15,23,42,0.04)",
              }}
            >
              <div>
                <div style={{ display: "flex", gap: 4, marginBottom: 16 }}>
                  {Array.from({ length: t.stars }).map((_, i) => (
                    <Star key={i} size={16} color={AMBER_400} fill={AMBER_400} />
                  ))}
                </div>
                <p
                  style={{
                    fontSize: 12,
                    color: SLATE_700,
                    lineHeight: 1.7,
                    fontStyle: "italic",
                    marginBottom: 24,
                  }}
                >
                  "{t.text}"
                </p>
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  borderTop: `1px solid ${SLATE_100}`,
                  paddingTop: 16,
                }}
              >
                <img
                  src={t.avatar}
                  alt={t.name}
                  width={40}
                  height={40}
                  loading="lazy"
                  decoding="async"
                  referrerPolicy="no-referrer"
                  style={{
                    height: 40,
                    width: 40,
                    borderRadius: "50%",
                    objectFit: "cover",
                    border: `1px solid ${SLATE_100}`,
                  }}
                />
                <div>
                  <h4
                    style={{
                      fontWeight: 700,
                      color: SLATE_800,
                      fontSize: 12,
                      lineHeight: 1,
                      margin: 0,
                    }}
                  >
                    {t.name}
                  </h4>
                  <p
                    style={{
                      fontSize: 10,
                      color: SLATE_500,
                      fontWeight: 500,
                      margin: "4px 0 0",
                      lineHeight: 1,
                    }}
                  >
                    {t.role}
                  </p>
                  <p
                    style={{
                      fontSize: 9,
                      color: SLATE_400,
                      fontFamily: FONT_MONO,
                      margin: "4px 0 0",
                      lineHeight: 1,
                    }}
                  >
                    {t.location}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function GroupPracticeCTA() {
  const [name, setName] = useState("");
  const [clinic, setClinic] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [providers, setProviders] = useState("2-5 Insureds");
  const [submitted, setSubmitted] = useState(false);
  const uid = useId();
  const fid = (k: string) => `${uid}-${k}`;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!name || !clinic || !email || !phone) return;
    setSubmitted(true);
  };

  const inp: CSSProperties = {
    width: "100%",
    boxSizing: "border-box",
    borderRadius: 8,
    border: `1px solid ${SLATE_300}`,
    background: "#fff",
    padding: "8px 12px",
    fontSize: 12,
    color: SLATE_800,
    fontFamily: FONT_SANS,
  };
  const lbl = {
    display: "block",
    fontSize: 11,
    fontWeight: 700,
    color: SLATE_500,
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    marginBottom: 4,
  };

  return (
    <section
      className="hub-section"
      style={{ background: "#fff", padding: "48px 0", borderTop: `1px solid ${SLATE_200}` }}
    >
      <div style={container}>
        <div
          style={{
            position: "relative",
            overflow: "hidden",
            borderRadius: 24,
            background: TEAL_900,
            padding: "40px 48px",
            boxShadow: "0 20px 40px rgba(0,0,0,0.12)",
            display: "flex",
            gap: 32,
            alignItems: "center",
            border: `1px solid ${TEAL_800}`,
          }}
        >
          <div style={{ width: "50%", color: "#fff" }}>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                borderRadius: 999,
                background: "rgba(17,94,89,0.6)",
                border: "1px solid rgba(15,118,110,0.6)",
                padding: "4px 12px",
                fontSize: 12,
                fontWeight: 600,
                color: TEAL_300,
              }}
            >
              <Users size={16} color={TEAL_300} /> <span>Multi-Provider Group Coverage</span>
            </div>
            <h2
              style={{
                fontSize: 30,
                fontWeight: 900,
                letterSpacing: "-0.02em",
                lineHeight: 1.15,
                marginTop: 16,
              }}
            >
              Manage Your Allied Health Group Practice Under One Unified Shield
            </h2>
            <p
              style={{
                fontSize: 12,
                color: "rgba(204,251,241,0.9)",
                lineHeight: 1.6,
                marginTop: 16,
              }}
            >
              Does your practice include several providers? SelectFirst can coordinate group-level
              limits and consolidated billing for your group.
            </p>
            <ul
              style={{
                listStyle: "none",
                padding: 0,
                margin: "16px 0 0",
                display: "flex",
                flexDirection: "column",
                gap: 10,
              }}
            >
              {[
                "Single consolidated invoice & automatic clinical license audits",
                "Custom underwriting limits adjusted to hospital bylaws",
                "Seamless practitioner add/remove endorsements inside 24 hours",
              ].map((li) => (
                <li
                  key={li}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    fontSize: 12,
                    color: TEAL_200,
                  }}
                >
                  <CheckCircle size={16} color={TEAL_300} /> <span>{li}</span>
                </li>
              ))}
            </ul>
          </div>

          <div
            style={{
              width: "50%",
              background: "#fff",
              borderRadius: 16,
              padding: 24,
              boxShadow: "0 10px 24px rgba(0,0,0,0.12)",
              border: `1px solid ${SLATE_100}`,
            }}
          >
            {!submitted ? (
              <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div>
                  <h3 style={{ fontWeight: 700, color: SLATE_800, fontSize: 14, margin: 0 }}>
                    Request Custom Group Appraisal
                  </h3>
                  <p style={{ fontSize: 11, color: SLATE_500, margin: "6px 0 0" }}>
                    Submit basic practice parameters to schedule a tailored consultative evaluation
                    from our senior medical malpractice underwriters.
                  </p>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                  <div>
                    <label htmlFor={fid("name")} style={lbl}>
                      Inquirer Name
                    </label>
                    <input
                      id={fid("name")}
                      style={inp}
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Elena Rostova"
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor={fid("clinic")} style={lbl}>
                      Clinic / Entity Brand
                    </label>
                    <input
                      id={fid("clinic")}
                      style={inp}
                      value={clinic}
                      onChange={(e) => setClinic(e.target.value)}
                      placeholder="e.g. CareFirst Urgent Clinics"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor={fid("providers")} style={lbl}>
                    Number of Providers
                  </label>
                  <select
                    id={fid("providers")}
                    style={inp}
                    value={providers}
                    onChange={(e) => setProviders(e.target.value)}
                  >
                    <option value="2-5 Insureds">2-5 active providers</option>
                    <option value="6-10 Insureds">6-10 active providers</option>
                    <option value="11-40 Insureds">11-40 active providers</option>
                    <option value="40+ Insureds">40+ active providers</option>
                  </select>
                </div>
                {/* Contact fields — full-width rows so the email address and
                    phone number have room to type, replacing the cramped
                    Email/Call delivery chips. */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                  <div>
                    <label htmlFor={fid("email")} style={lbl}>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                        <Mail size={12} color={SLATE_400} /> Email
                      </span>
                    </label>
                    <input
                      id={fid("email")}
                      type="email"
                      style={inp}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="e.g. e.rostova@carefirst.com"
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor={fid("phone")} style={lbl}>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                        <Phone size={12} color={SLATE_400} /> Phone
                      </span>
                    </label>
                    <input
                      id={fid("phone")}
                      type="tel"
                      style={inp}
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="e.g. (888) 959-9456"
                      required
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                    padding: "12px 16px",
                    borderRadius: 12,
                    background: TEAL_800,
                    color: "#fff",
                    fontWeight: 700,
                    fontSize: 12,
                    letterSpacing: "0.02em",
                    border: "none",
                    cursor: "pointer",
                    boxShadow: "0 1px 2px rgba(0,0,0,0.08)",
                  }}
                >
                  <FilePieChart size={16} color="#fff" />{" "}
                  <span>Request Corporate Group Appraisal</span>
                </button>
              </form>
            ) : (
              <div style={{ padding: "24px 0", textAlign: "center" }}>
                <div
                  style={{
                    margin: "0 auto",
                    display: "flex",
                    height: 56,
                    width: 56,
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: "50%",
                    background: EMERALD_100,
                    color: "#047857",
                  }}
                >
                  <CheckCircle size={32} color="#047857" />
                </div>
                <h4 style={{ fontWeight: 700, color: SLATE_800, fontSize: 16, marginTop: 16 }}>
                  Appraisal Request Committed!
                </h4>
                <p
                  style={{
                    fontSize: 12,
                    color: SLATE_500,
                    marginTop: 8,
                    lineHeight: 1.6,
                    maxWidth: 360,
                    marginInline: "auto",
                  }}
                >
                  Hi <strong style={{ color: SLATE_900 }}>{name}</strong>, we have received your
                  practice specifications for <strong style={{ color: SLATE_900 }}>{clinic}</strong>
                  . Our senior allied health underwriting analyst is building your customized group
                  matrix and will contact you within 1 business hour.
                </p>
                <button
                  onClick={() => {
                    setName("");
                    setClinic("");
                    setEmail("");
                    setPhone("");
                    setSubmitted(false);
                  }}
                  style={{
                    marginTop: 16,
                    padding: "8px 16px",
                    background: SLATE_100,
                    color: SLATE_700,
                    borderRadius: 8,
                    fontSize: 12,
                    fontWeight: 600,
                    border: "none",
                    cursor: "pointer",
                  }}
                >
                  Schedule Another Proposal
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

// Exported so FlowLayout can also mount this dark footer on the wizard
// routes (steps 2–10), not just inside the landing/soft-quote marketing.
export function HubFooter() {
  const year = new Date().getFullYear();
  const link = {
    cursor: "pointer",
    color: SLATE_500,
    background: "none",
    border: "none",
    padding: 0,
    font: "inherit",
    textDecoration: "underline",
  };
  return (
    <footer
      className="hub-section"
      style={{
        background: SLATE_900,
        color: SLATE_400,
        padding: "48px 0",
        borderTop: "1px solid #1e293b",
        fontSize: 12,
      }}
    >
      <div style={container}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "5fr 3fr 4fr",
            gap: 32,
            paddingBottom: 32,
            borderBottom: "1px solid #1e293b",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#fff" }}>
              <Shield size={20} color={TEAL_300} />
              <span
                style={{ fontWeight: 700, letterSpacing: "-0.01em", color: "#fff", fontSize: 14 }}
              >
                SelectFirst Specialty Insurances
              </span>
            </div>
            <p style={{ fontSize: 11, lineHeight: 1.6, color: SLATE_400, margin: 0 }}>
              SelectFirst Specialty is a direct-to-practitioner medical liability insurance program.
              Malpractice lines are chartered, fully licensed, and underwritten by MedMalGuard
              Liability Risk Retention Group, reinsured on top-tier global syndications with AM Best
              A rating structures.
            </p>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                fontSize: 10,
                color: SLATE_500,
                fontFamily: FONT_MONO,
              }}
            >
              <Lock size={14} color={SLATE_500} />{" "}
              <span>SSL 256-Bit Encrypted Secure Payment Systems</span>
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <h4
              style={{
                color: "#fff",
                fontWeight: 700,
                letterSpacing: "0.05em",
                fontFamily: FONT_MONO,
                textTransform: "uppercase",
                fontSize: 10,
                margin: 0,
              }}
            >
              Applicant Classes
            </h4>
            <ul
              style={{
                listStyle: "none",
                padding: 0,
                margin: 0,
                display: "flex",
                flexDirection: "column",
                gap: 8,
                fontSize: 11,
              }}
            >
              <li>NP / APRN</li>
              <li>CRNA</li>
              <li>RN &amp; LPN</li>
            </ul>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <h4
              style={{
                color: "#fff",
                fontWeight: 700,
                letterSpacing: "0.05em",
                fontFamily: FONT_MONO,
                textTransform: "uppercase",
                fontSize: 10,
                margin: 0,
              }}
            >
              Support Hotlines
            </h4>
            <p style={{ fontSize: 11, lineHeight: 1.6, margin: 0 }}>
              Have questions about claims history, retroactive coverage dates, or clinical policy
              limits? Call or contact our dedicated underwriting advisor:
            </p>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 4,
                fontSize: 11,
                fontFamily: FONT_MONO,
              }}
            >
              <p style={{ fontWeight: 600, color: TEAL_300, margin: 0 }}>
                Claims Hotline: (888) 966-3881
              </p>
              <p style={{ fontWeight: 600, color: TEAL_300, margin: 0 }}>
                Sales &amp; Binders: (888) 959-9456
              </p>
              <p style={{ color: SLATE_500, margin: 0 }}>Hours: Mon - Fri, 8:00 AM - 6:00 PM EST</p>
            </div>
          </div>
        </div>
        <div
          style={{
            paddingTop: 32,
            fontSize: 10,
            color: SLATE_500,
            lineHeight: 1.6,
            display: "flex",
            flexDirection: "column",
            gap: 12,
          }}
        >
          <p style={{ margin: 0 }}>
            <strong>Note:</strong> Policies issued under federal charter guidelines for authorized
            Risk Retention Groups are governed by the federal Liability Risk Retention Act (LRRA) of
            1986. Reinsurance structures are maintained with Lloyds of London syndicats. In
            accordance with federal charters, state insolvency insurance guaranty funds do not apply
            to RRG policies.
          </p>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              justifyContent: "space-between",
              paddingTop: 16,
              borderTop: "1px solid #1e293b",
              gap: 16,
              fontSize: 11,
            }}
          >
            <p style={{ color: SLATE_500, margin: 0 }}>
              © {year} SelectFirst Insurance Services. All rights reserved.
            </p>
            <div style={{ display: "flex", gap: 16, color: SLATE_500 }}>
              <button
                type="button"
                style={link}
                onClick={() => {
                  modalStore.showAbout = true;
                }}
              >
                About Us
              </button>
              <span>·</span>
              <button
                type="button"
                style={link}
                onClick={() => {
                  modalStore.showPrivacy = true;
                }}
              >
                Privacy Policy
              </button>
              <span>·</span>
              <button
                type="button"
                style={link}
                onClick={() => {
                  modalStore.showTerms = true;
                }}
              >
                Terms of Operations
              </button>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}

// Compact footer for the wizard routes (steps 2–10): only the regulatory
// "Note:" line + copyright + legal links from HubFooter, on the same dark
// bar — without the upper Clinician Classes / Support Hotlines columns.
export function HubFooterNote() {
  const year = new Date().getFullYear();
  const link = {
    cursor: "pointer",
    color: SLATE_500,
    background: "none",
    border: "none",
    padding: 0,
    font: "inherit",
    textDecoration: "underline",
  };
  return (
    <footer
      className="hub-section"
      style={{
        background: SLATE_900,
        color: SLATE_400,
        padding: "40px 0",
        borderTop: "1px solid #1e293b",
        fontSize: 12,
        fontFamily: FONT_SANS,
      }}
    >
      <div
        style={{
          ...container,
          fontSize: 10,
          color: SLATE_500,
          lineHeight: 1.6,
          display: "flex",
          flexDirection: "column",
          gap: 12,
        }}
      >
        <p style={{ margin: 0 }}>
          <strong>Note:</strong> Policies issued under federal charter guidelines for authorized
          Risk Retention Groups are governed by the federal Liability Risk Retention Act (LRRA) of
          1986. Reinsurance structures are maintained with Lloyds of London syndicats. In accordance
          with federal charters, state insolvency insurance guaranty funds do not apply to RRG
          policies.
        </p>
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "space-between",
            paddingTop: 16,
            borderTop: "1px solid #1e293b",
            gap: 16,
            fontSize: 11,
          }}
        >
          <p style={{ color: SLATE_500, margin: 0 }}>
            © {year} SelectFirst Insurance Services. All rights reserved.
          </p>
          <div style={{ display: "flex", gap: 16, color: SLATE_500 }}>
            <button
              type="button"
              style={link}
              onClick={() => {
                modalStore.showAbout = true;
              }}
            >
              About Us
            </button>
            <span>·</span>
            <button
              type="button"
              style={link}
              onClick={() => {
                modalStore.showPrivacy = true;
              }}
            >
              Privacy Policy
            </button>
            <span>·</span>
            <button
              type="button"
              style={link}
              onClick={() => {
                modalStore.showTerms = true;
              }}
            >
              Terms of Operations
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
}
