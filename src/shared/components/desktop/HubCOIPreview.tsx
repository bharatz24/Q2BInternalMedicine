// Desktop-only live Certificate-of-Insurance previewer. Bound to quote data
// via useQuoteSnapshot()/stores: state, limits, policy type, effective/
// expiration dates, and the registered applicant name.
//
// Hidden below 1024px via `.hub-desktop` in src/responsive.css.

import { useId, useState } from "react";
import type { CSSProperties } from "react";
import {
  TEAL_50,
  TEAL_100,
  TEAL_700,
  TEAL_800,
  TEAL_900,
  SLATE_100,
  SLATE_200,
  SLATE_300,
  SLATE_400,
  SLATE_500,
  SLATE_700,
  SLATE_800,
  SLATE_900,
  FONT_SANS,
  FONT_MONO,
  MAX_W,
} from "./hubTheme";
import { FileText, Printer, Lock, BadgeCheck, User } from "./HubIcons";
import { useStore } from "@/shared/store/useStore";
import practiceStore from "@/modules/Quote/store/practiceStore";
import physicianProfileStore from "@/modules/Quote/store/physicianProfileStore";
import { useQuoteSnapshot } from "@/modules/Quote/utils/useQuoteSnapshot";
import { designationByCode } from "@/modules/Quote/data/designations.js";

const container: CSSProperties = {
  maxWidth: MAX_W,
  margin: "0 auto",
  padding: "0 24px",
  width: "100%",
  boxSizing: "border-box",
};

// This portal's limit labels are already formal ("$500,000 / $1,500,000" —
// see `ilfDlf.js`'s LIMIT_TIERS), so this just splits the label rather than
// guessing at monetary strings from a short code like "1M/3M".
function formalLimits(limitStr: unknown) {
  const [occ, agg] = String(limitStr || "")
    .split("/")
    .map((s) => s.trim());
  return { occ: occ || "$1,000,000", agg: agg || "$3,000,000" };
}

const inputBase: CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  background: "#fff",
  borderRadius: 8,
  border: `1px solid ${SLATE_300}`,
  padding: "8px 12px 8px 36px",
  fontSize: 12,
  color: SLATE_800,
  outline: "none",
  fontFamily: FONT_SANS,
};

export default function HubCOIPreview() {
  const applicantNameId = useId();
  const { snapshotState, snapshotLimits, snapshotPolicyType, snapshotExpMdY } = useQuoteSnapshot();
  const effDate = useStore(practiceStore, (s) => s.effectiveDate);
  const designation = useStore(practiceStore, (s) => s.designation);
  const profileFirst = useStore(physicianProfileStore, (s) => s.firstName);
  const profileLast = useStore(physicianProfileStore, (s) => s.lastName);
  const regFullName = [profileFirst, profileLast].filter(Boolean).join(" ");

  const defaultName = (regFullName || "").trim() || "Jordan Ellis";
  const [applicantName, setApplicantName] = useState(defaultName);

  const designationLabel = designationByCode(designation)?.subtitle || "Internal Medicine Provider";
  const stateLabel =
    snapshotState && snapshotState !== "Your state" ? String(snapshotState).trim() : "—";
  const limits = formalLimits(snapshotLimits);
  const policyType = snapshotPolicyType || "Claims-made";
  const eff = (effDate || "").toString().trim() || "—";
  const exp = (snapshotExpMdY || "").toString().trim() || "—";

  const handlePrint = () => {
    setTimeout(() => window.print(), 150);
  };

  return (
    <section
      className="hub-desktop hub-section"
      style={{
        background: "#fff",
        padding: "48px 0",
        borderTop: `1px solid ${SLATE_200}`,
        fontFamily: FONT_SANS,
      }}
      id="coi-generator-section"
    >
      <div style={container}>
        {/* Marketing header */}
        <div
          className="hub-print-hidden"
          style={{ textAlign: "center", maxWidth: 640, margin: "0 auto 48px" }}
        >
          <span
            style={{
              fontSize: 10,
              textTransform: "uppercase",
              fontFamily: FONT_MONO,
              letterSpacing: "0.1em",
              fontWeight: 700,
              color: TEAL_800,
              background: TEAL_50,
              border: `1px solid ${TEAL_100}`,
              padding: "4px 10px",
              borderRadius: 4,
            }}
          >
            Interactive Portal Demo
          </span>
          <h2
            style={{
              fontSize: 30,
              fontWeight: 900,
              color: SLATE_900,
              letterSpacing: "-0.02em",
              marginTop: 12,
            }}
          >
            Live Certificate (COI) Previewer
          </h2>
          <p
            style={{
              marginTop: 8,
              fontSize: 12,
              color: SLATE_500,
              lineHeight: 1.6,
              maxWidth: 520,
              marginInline: "auto",
            }}
          >
            Your selections in the quote panel flow into this standard-conforming Certificate of
            Malpractice Liability in real time.
          </p>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0,4fr) minmax(0,8fr)",
            gap: 32,
            alignItems: "start",
          }}
        >
          {/* Input form — name only (the application collects no NPI) */}
          <div
            className="hub-print-hidden"
            style={{
              borderRadius: 16,
              border: `1px solid ${SLATE_200}`,
              background: "rgba(248,250,252,0.4)",
              padding: 20,
            }}
          >
            <h3
              style={{
                fontSize: 12,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                fontWeight: 700,
                color: SLATE_500,
                fontFamily: FONT_MONO,
                marginBottom: 16,
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <FileText size={16} color={TEAL_800} /> <span>COI Input Fields</span>
            </h3>

            <label htmlFor={applicantNameId} style={fieldLabel}>
              Applicant name
            </label>
            <div style={{ position: "relative", marginBottom: 16 }}>
              <span style={inputIcon}>
                <User size={16} color={SLATE_400} />
              </span>
              <input
                id={applicantNameId}
                value={applicantName}
                onChange={(e) => setApplicantName(e.target.value)}
                style={inputBase}
                placeholder="e.g. Jordan Ellis"
              />
            </div>

            <div
              style={{
                borderRadius: 12,
                border: `1px solid ${TEAL_100}`,
                background: "rgba(240,253,250,0.4)",
                padding: 16,
                marginTop: 16,
              }}
            >
              <p
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: TEAL_900,
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  margin: 0,
                }}
              >
                <BadgeCheck size={16} color={TEAL_700} /> Secure Binding Guarantee
              </p>
              <p
                style={{ fontSize: 10, color: "rgba(17,94,89,0.8)", lineHeight: 1.6, marginTop: 6 }}
              >
                Upon premium receipt, clinical insurance policy contracts are committed instantly. A
                formal ACORD 25 certificate matching this structure will be emailed to you
                immediately.
              </p>
            </div>

            <button
              type="button"
              onClick={handlePrint}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                padding: "12px 16px",
                borderRadius: 12,
                border: `2px solid ${SLATE_200}`,
                background: "#fff",
                color: SLATE_700,
                fontWeight: 600,
                fontSize: 12,
                letterSpacing: "0.02em",
                cursor: "pointer",
                marginTop: 16,
                fontFamily: FONT_SANS,
              }}
            >
              <Printer size={16} color={SLATE_500} /> <span>Print Virtual Certificate</span>
            </button>
          </div>

          {/* ACORD 25 certificate */}
          <div
            style={{
              borderRadius: 16,
              border: `1px solid ${SLATE_300}`,
              background: "rgba(248,250,252,0.3)",
              padding: 24,
              boxShadow: "0 1px 2px rgba(15,23,42,0.04)",
            }}
          >
            <div
              style={{
                background: "#fff",
                border: `4px solid ${SLATE_800}`,
                padding: 28,
                fontFamily: FONT_SANS,
                fontSize: 10,
                lineHeight: 1.6,
                color: SLATE_800,
                position: "relative",
                overflow: "hidden",
                boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
              }}
            >
              {/* Header */}
              <div
                style={{
                  borderBottom: `2px solid ${SLATE_800}`,
                  paddingBottom: 12,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 12,
                  flexWrap: "wrap",
                }}
              >
                <div>
                  <h4
                    style={{
                      fontSize: 14,
                      fontWeight: 900,
                      letterSpacing: "-0.01em",
                      color: SLATE_900,
                      textTransform: "uppercase",
                      margin: 0,
                    }}
                  >
                    SelectFirst Specialty Underwriters Ltd.
                  </h4>
                  <p style={{ fontSize: 9, color: SLATE_500, fontWeight: 500, margin: "2px 0 0" }}>
                    Federal Risk Retention Syndicate Charter #RRG-5028
                  </p>
                </div>
                <div
                  style={{
                    background: SLATE_900,
                    color: "#fff",
                    padding: "4px 12px",
                    fontFamily: FONT_MONO,
                    textTransform: "uppercase",
                    fontWeight: 900,
                    fontSize: 9,
                    letterSpacing: "0.1em",
                  }}
                >
                  Certificate of Insurance
                </div>
              </div>

              {/* Registry */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr 1fr",
                  borderBottom: `2px solid ${SLATE_800}`,
                  fontSize: 9,
                }}
              >
                <div style={{ padding: "10px 16px 10px 0", borderRight: `1px solid ${SLATE_200}` }}>
                  <span style={acordLabel}>PRODUCER</span>
                  <p style={{ fontWeight: 600, color: SLATE_700, margin: "2px 0 0" }}>
                    SelectFirst Insurance Services Inc.
                  </p>
                  <p style={{ margin: 0 }}>Advising Department: (888) 966-3881</p>
                  <p style={{ margin: 0 }}>support@selectfirstinsurance.com</p>
                </div>
                <div style={{ padding: "10px 16px", borderRight: `1px solid ${SLATE_200}` }}>
                  <span style={acordLabel}>INSURED</span>
                  <p style={{ fontWeight: 700, color: TEAL_900, margin: "2px 0 0" }}>
                    {applicantName || "Jordan Ellis"}
                  </p>
                  <p style={{ margin: 0 }}>{designationLabel}</p>
                  <p style={{ margin: 0 }}>Principal Operations: {stateLabel} State Jurisdiction</p>
                </div>
                <div style={{ padding: "10px 0 10px 16px" }}>
                  <span style={acordLabel}>INSURER DIRECTORY</span>
                  <p style={{ fontWeight: 600, color: SLATE_700, margin: "2px 0 0" }}>
                    Insurer A: Doctors Professional Liability RRG
                  </p>
                  <p style={{ margin: 0 }}>A.M Best Rating: A (Excellent) Rated</p>
                  <p style={{ margin: 0 }}>Risk Class Code: Internal Medicine</p>
                </div>
              </div>

              {/* Declarations */}
              <div style={{ marginTop: 16 }}>
                <div
                  style={{
                    background: SLATE_100,
                    border: `1px solid ${SLATE_200}`,
                    padding: "4px 10px",
                    fontSize: 8,
                    fontWeight: 900,
                    textTransform: "uppercase",
                    letterSpacing: "0.1em",
                    color: SLATE_700,
                    marginBottom: 8,
                    fontFamily: FONT_MONO,
                  }}
                >
                  Coverages Issued
                </div>
                <table
                  style={{
                    width: "100%",
                    textAlign: "left",
                    borderCollapse: "collapse",
                    fontSize: 9,
                  }}
                >
                  <thead>
                    <tr
                      style={{
                        borderBottom: `1px solid ${SLATE_300}`,
                        fontWeight: 700,
                        textTransform: "uppercase",
                        color: SLATE_500,
                        fontSize: 8,
                      }}
                    >
                      <th style={{ paddingBottom: 4 }}>Insr Ltr</th>
                      <th style={{ paddingBottom: 4 }}>Type of Insurance / Coverage</th>
                      <th style={{ paddingBottom: 4 }}>Policy Number</th>
                      <th style={{ paddingBottom: 4 }}>Effective</th>
                      <th style={{ paddingBottom: 4 }}>Expiration</th>
                      <th style={{ paddingBottom: 4, textAlign: "right" }}>Limits of Protection</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr style={{ verticalAlign: "top" }}>
                      <td style={{ padding: "10px 0", fontWeight: 700, color: SLATE_800 }}>A</td>
                      <td style={{ padding: "10px 16px 10px 0" }}>
                        <p style={{ fontWeight: 700, color: SLATE_800, margin: 0 }}>
                          Professional Malpractice Indemnity
                        </p>
                        <p style={{ fontSize: 8, color: SLATE_400, margin: "2px 0 0" }}>
                          Execution Structure:{" "}
                          <strong style={{ color: TEAL_800 }}>{policyType}</strong>
                        </p>
                      </td>
                      <td
                        style={{
                          padding: "10px 0",
                          fontFamily: FONT_MONO,
                          color: SLATE_700,
                          fontWeight: 700,
                        }}
                      >
                        SF-26-NUR-{eff.replace(/\D/g, "").slice(0, 8) || "00000000"}
                      </td>
                      <td style={{ padding: "10px 0" }}>{eff}</td>
                      <td style={{ padding: "10px 0" }}>{exp}</td>
                      <td
                        style={{
                          padding: "10px 0",
                          textAlign: "right",
                          fontFamily: FONT_MONO,
                          fontWeight: 900,
                          color: TEAL_900,
                        }}
                      >
                        <p style={{ margin: 0 }}>Occur: {limits.occ}</p>
                        <p style={{ margin: 0 }}>Aggreg: {limits.agg}</p>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Remarks */}
              <div style={{ marginTop: 16, borderTop: `1px solid ${SLATE_300}`, paddingTop: 12 }}>
                <span style={acordLabel}>SPECIAL INCLUSIONS &amp; Portable Remarks</span>
                <p style={{ fontSize: 9, lineHeight: 1.6, color: SLATE_500, marginTop: 4 }}>
                  Coverage is active for the named provider for the policy period shown above under
                  Doctors Professional Liability RRG, portable across practice settings within the{" "}
                  {stateLabel} state jurisdiction. Policy retains Retroactive Date alignment
                  preserving prior-acts continuous history.
                </p>
              </div>

              {/* Signatures */}
              <div
                style={{
                  marginTop: 16,
                  borderTop: `2px solid ${SLATE_800}`,
                  paddingTop: 14,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 16,
                  flexWrap: "wrap",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    fontSize: 9,
                    color: SLATE_400,
                    fontWeight: 500,
                  }}
                >
                  <Lock size={14} color={SLATE_400} />
                  <span>Verified Security Code: SF-NUR-SEC-2026</span>
                </div>
                <div
                  style={{
                    textAlign: "right",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "flex-end",
                  }}
                >
                  <span style={acordLabel}>AUTHORIZED UNDERWRITING SIGNATURE</span>
                  <p
                    style={{
                      fontFamily: "Georgia, serif",
                      fontStyle: "italic",
                      fontWeight: 600,
                      color: TEAL_800,
                      fontSize: 12,
                      letterSpacing: "0.02em",
                      margin: "2px 0 0",
                    }}
                  >
                    SelectFirst Specialty Underwriters
                  </p>
                  <p style={{ fontSize: 8, color: SLATE_400, fontWeight: 500, margin: "2px 0 0" }}>
                    Date Authorized: {eff}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

const fieldLabel: CSSProperties = {
  display: "block",
  fontSize: 11,
  fontWeight: 700,
  color: SLATE_500,
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  marginBottom: 6,
};
const inputIcon: CSSProperties = { position: "absolute", left: 12, top: 9 };
const acordLabel: CSSProperties = {
  fontWeight: 700,
  textTransform: "uppercase",
  color: SLATE_400,
  display: "block",
  letterSpacing: "0.1em",
  fontSize: 8,
};
