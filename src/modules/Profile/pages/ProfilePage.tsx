import { Navigate, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { formatLocationOneLine, formatSubmissionListDate } from "@/shared/utils/format";
import { primaryLocationFromList } from "@/modules/Quote/utils/submission";
import {
  fetchInsuredContacts,
  fetchInsuredDetails,
  fetchInsuredLocations,
} from "@/modules/Profile/api/profileApi";
import { queryKeys } from "@/shared/query/keys";
import { ArrowLeft } from "@/shared/components/Icon";
import { LegalLink } from "@/shared/components/LegalLink";
import { btnOutline } from "@/shared/utils/styles";
import { useStore } from "@/shared/store/useStore";
import insuredProfileStore from "@/shared/store/insuredProfileStore";
import sessionStore from "@/shared/store/sessionStore";
import modalStore from "@/shared/store/modalStore";
import { MedMalGuardHeader } from "@/modules/Quote/components/MedMalGuardLanding";

/** Mask an SSN to its last 4 digits (`•••-••-1234`); "-" when absent. */
function maskSsn(raw: unknown) {
  const digits = String(raw ?? "").replace(/\D/g, "");
  if (digits.length < 4) return "-";
  return `•••-••-${digits.slice(-4)}`;
}

export default function ProfilePage() {
  const navigate = useNavigate();
  const insuredProfile = useStore(insuredProfileStore, (s) => s.insuredProfile);
  const isAuthenticated = Boolean(
    insuredProfile?.id || insuredProfile?.name || insuredProfile?.username,
  );
  const sessionReady = useStore(sessionStore, (s) => s.sessionReady);

  // Page-owned reads — details / contacts / locations are only displayed
  // here. react-query owns the fetch, dedup, staleness and retry; on error
  // `data` is undefined and the fields below fall back to "-" (matching the
  // old `.catch(() => setX(null))` behaviour). Gated on auth so a
  // pre-session render doesn't fire three guaranteed 401s.
  const detailsQ = useQuery({
    queryKey: queryKeys.profile.details(),
    queryFn: () => fetchInsuredDetails(),
    enabled: isAuthenticated,
  });
  const contactsQ = useQuery({
    queryKey: queryKeys.profile.contacts(),
    queryFn: () => fetchInsuredContacts(),
    enabled: isAuthenticated,
  });
  const locationsQ = useQuery({
    queryKey: queryKeys.profile.locations(),
    queryFn: () => fetchInsuredLocations(),
    enabled: isAuthenticated,
  });

  // `any` by design — these row shapes are looser than the DTOs
  // (see CLAUDE.md "Loose domain objects … typed `any` by design").
  const insuredDetails: any = detailsQ.data ?? null;
  const insuredDetailsLoading = detailsQ.isPending;
  const insuredContacts: any[] = contactsQ.data ?? [];
  const insuredContactsLoading = contactsQ.isPending;
  const insuredLocations: any[] = locationsQ.data ?? [];
  const insuredLocationsLoading = locationsQ.isPending;

  const primaryContact =
    insuredContacts.find((c: any) => c?.isprimary) || insuredContacts[0] || null;

  if (sessionReady && !isAuthenticated) return <Navigate to="/signin" replace />;

  return (
    // Mobile shows the shared MedMalGuard header (logo + hamburger) plus a
    // slim back-arrow bar. Desktop (>=1024px, via .profile-page CSS in
    // responsive.css) escapes the card and lays the info cards out in a
    // centered two-column grid.
    <div className="profile-page">
      {/* MedMalGuard header at every viewport — collapses to logo +
          hamburger on phones, same as the landing page. */}
      <div className="app-header">
        <MedMalGuardHeader />
      </div>

      {/* Mobile-only back bar — hidden on desktop; the header above
          carries the Dashboard link instead. */}
      <div
        className="profile-mobile-topbar"
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
        className="profile-body"
        style={{
          flex: 1,
          padding: "0 18px 18px",
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div className="profile-card">
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
            My profile
          </h2>
          <p style={{ fontSize: 12, color: "#595959", marginBottom: 14 }}>
            Your information as it appears on your application.
          </p>

          <div className="profile-grid">
            <div
              style={{
                background: "#f7f7f5",
                borderRadius: 12,
                padding: "12px 14px",
                marginBottom: 12,
              }}
            >
              <div style={{ fontSize: 13, fontWeight: 500, color: "#333", marginBottom: 8 }}>
                Personal information
              </div>
              {[
                [
                  "Name",
                  insuredContactsLoading && insuredDetailsLoading
                    ? "-"
                    : insuredDetails?.companyname ||
                      [primaryContact?.firstname, primaryContact?.lastname]
                        .filter(Boolean)
                        .join(" ") ||
                      [insuredDetails?.firstname, insuredDetails?.lastname]
                        .filter(Boolean)
                        .join(" ") ||
                      "-",
                ],
                [
                  "Email",
                  insuredContactsLoading
                    ? "-"
                    : primaryContact?.email ||
                      insuredDetails?.email ||
                      insuredProfile?.username ||
                      insuredProfile?.name ||
                      "-",
                ],
                [
                  "Phone",
                  insuredContactsLoading
                    ? "-"
                    : primaryContact?.contactnumber || insuredDetails?.contactnumber || "-",
                ],
                [
                  "Date of birth",
                  insuredDetailsLoading
                    ? "-"
                    : insuredDetails?.dob
                      ? formatSubmissionListDate(insuredDetails.dob)
                      : "-",
                ],
                ["SSN", insuredDetailsLoading ? "-" : maskSsn(insuredDetails?.ssn)],
              ].map(([l, v]) => (
                <div
                  key={l}
                  style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}
                >
                  <span style={{ fontSize: 12, color: "#595959" }}>{l}</span>
                  <span style={{ fontSize: 12, fontWeight: 500, color: "#444" }}>{v}</span>
                </div>
              ))}
            </div>

            <div
              style={{
                background: "#f7f7f5",
                borderRadius: 12,
                padding: "12px 14px",
                marginBottom: 12,
              }}
            >
              <div style={{ fontSize: 13, fontWeight: 500, color: "#333", marginBottom: 8 }}>
                Practice &amp; credentials
              </div>
              {[
                ["Designation", insuredDetailsLoading ? "-" : insuredDetails?.designation || "-"],
                ["Rated on", insuredDetailsLoading ? "-" : insuredDetails?.speciality || "-"],
                ["Employer", insuredDetailsLoading ? "-" : insuredDetails?.employerName || "-"],
                [
                  "License number",
                  insuredDetailsLoading ? "-" : insuredDetails?.licenseNumber || "-",
                ],
                [
                  "Home address",
                  insuredLocationsLoading
                    ? "-"
                    : formatLocationOneLine(primaryLocationFromList(insuredLocations)),
                ],
              ].map(([l, v]) => (
                <div
                  key={l}
                  style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}
                >
                  <span style={{ fontSize: 12, color: "#595959" }}>{l}</span>
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 500,
                      color: "#444",
                      textAlign: "right",
                      maxWidth: "55%",
                    }}
                  >
                    {v}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <button type="button" style={{ ...btnOutline, fontSize: 12, marginTop: 0 }}>
            Edit profile
          </button>
        </div>
      </div>

      <div
        className="profile-footer"
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
    </div>
  );
}
