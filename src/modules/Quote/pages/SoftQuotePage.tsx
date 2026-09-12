import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { BRAND_DARK } from "@/shared/constants";
import { STEP_PATHS } from "@/modules/Quote/constants";
import { InfoBox } from "@/shared/components/InfoBox";
import Alert from "@/shared/components/Alert";
import { Spacer } from "@/shared/components/Spacer";
import { btnOutline, btnPrimary, dis } from "@/shared/utils/styles";
import { addCalendarYearsToMdY } from "@/shared/utils/dateHelpers";
import { formatUsd } from "@/modules/Quote/utils/decimal";
import { DESIGNATIONS } from "@/modules/Quote/data/designations.js";
import { useIlfDlfFetcher } from "@/modules/Quote/utils/useIlfDlfFetcher";

import { useStore } from "@/shared/store/useStore";
import practiceStore from "@/modules/Quote/store/practiceStore";
import ilfDlfStore from "@/modules/Quote/store/ilfDlfStore";
import specialityStore from "@/modules/Quote/store/specialityStore";
import submissionStore from "@/modules/Quote/store/submissionStore";

/**
 * Step 1 — the estimate. Shows the same real, carrier-backed `POST
 * /auth/quotedata` price the Home Page hero calculator fetches
 * (`ilfDlfStore`) — not the local `nursingRatingService` number the rest of
 * the wizard still prices off (see `ilfDlfStore` for why those stay
 * separate). Re-fetches here too, keyed by zip+speciality+date and cached,
 * so the page is correct on a direct link, a refresh, or arriving via
 * `PracticeTypePage`'s catch-all route rather than the Home Page hero.
 *
 * Matches the PA portal's soft quote: a single carrier-backed total, not an
 * itemized premium/tax/fee table — that table-of-line-items look is the
 * sibling student portal's pattern (its soft quote itemizes all five rate
 * components up front because nothing changes before bind). This product's
 * limit of liability is still chosen later (step 5), so the number here is
 * explicitly framed as an estimate, same as the PA portal frames it.
 */
export default function SoftQuotePage() {
  const navigate = useNavigate();
  const fetchIlfDlf = useIlfDlfFetcher();

  const designation = useStore(practiceStore, (s) => s.designation);
  const zip = useStore(practiceStore, (s) => s.zip);
  const effectiveDate = useStore(practiceStore, (s) => s.effectiveDate);
  const currentDesignation = DESIGNATIONS.find((d) => d.code === designation) || null;
  const specialityRecord = useStore(specialityStore, () =>
    currentDesignation ? specialityStore.getSpeciality(currentDesignation.specialityCode) : null,
  );

  const ilf = useStore(ilfDlfStore, (s) => s.current);
  const ilfDlfLoading = useStore(ilfDlfStore, (s) => s.ilfDlfLoading);
  const ilfDlfError = useStore(ilfDlfStore, (s) => s.ilfDlfError);
  // The limit + retro the Home Page calculator priced at — re-price to match
  // here so this page's number and its limit label agree.
  const pricingLimitId = useStore(ilfDlfStore, (s) => s.pricingCoverageLimitId);
  const retroDate = useStore(ilfDlfStore, (s) => s.retroDate);

  useEffect(() => {
    if (!currentDesignation || !zip || !effectiveDate) return;
    fetchIlfDlf({
      zipcode: zip,
      specialityCode: currentDesignation.specialityCode,
      effectiveDate,
      coverageLimitId: pricingLimitId || undefined,
      retroDate: retroDate || undefined,
    }).catch(() => {
      /* error already captured in ilfDlfStore */
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- re-price keyed only on the primitive quote inputs; `fetchIlfDlf` is a stable hook-returned fetcher and `currentDesignation` is rebuilt each render (`?.code` stands in for identity).
  }, [currentDesignation?.code, zip, effectiveDate, pricingLimitId, retroDate]);

  const goTo = (step: number) => {
    submissionStore.step = step;
    navigate(STEP_PATHS[step]);
  };

  const totalLabel = ilf ? formatUsd(ilf.total) : "—";
  // Limit the user picked on the Home Page calculator, else the state
  // default reported by the /auth/quotedata response.
  const selectedLimit = useStore(ilfDlfStore, (s) => s.selectedCoverageLimit);
  const limits = selectedLimit?.limit || ilf?.defaultIlfDlfName || "—";
  const policyType = "Claims made";
  const policyLine = `${policyType} · $0.00 deductible`;
  const effDate = ilf?.effectiveDate || effectiveDate;
  const expDate = effDate ? addCalendarYearsToMdY(effDate, 1) : "";
  const periodLabel = effDate && expDate ? `${effDate} – ${expDate}` : "";

  return (
    <>
      <div style={{ textAlign: "center", padding: "12px 0 4px" }}>
        <div style={{ fontSize: 12, color: "#595959", marginBottom: 2 }}>
          Estimated annual premium
        </div>
        {ilfDlfLoading ? (
          <div style={{ fontSize: 14, color: "#595959", padding: "12px 0" }}>
            Calculating your estimate…
          </div>
        ) : (
          <div
            className="ui-heading"
            style={{
              fontFamily: "var(--font-heading)",
              fontSize: 38,
              fontWeight: 600,
              color: BRAND_DARK,
            }}
          >
            {totalLabel}
          </div>
        )}
        <div style={{ fontSize: 12, color: "#595959" }}>
          starting from · {limits} · {policyType.toLowerCase()}
        </div>
        {specialityRecord?.title && (
          <div style={{ fontSize: 11, color: "#595959", marginTop: 2 }}>
            Speciality on file: {specialityRecord.title}
          </div>
        )}
      </div>

      {ilfDlfError && <Alert type="error" message={ilfDlfError.message} />}

      <InfoBox color="blue">
        This is an estimate based on your practice type and location. Complete the full application
        for your exact quote with all fees included.
      </InfoBox>

      <div
        style={{ background: "#f7f7f5", borderRadius: 12, padding: "12px 14px", marginBottom: 14 }}
      >
        <div style={{ fontSize: 13, fontWeight: 500, color: "#333", marginBottom: 4 }}>
          Coverage snapshot
        </div>
        <div style={{ fontSize: 13, color: "#555", lineHeight: 1.7 }}>
          <strong style={{ color: "#333" }}>{limits}</strong>
          <br />
          {periodLabel}
          <br />
          {policyLine}
        </div>
      </div>

      <div
        style={{ background: "#f7f7f5", borderRadius: 12, padding: "12px 14px", marginBottom: 8 }}
      >
        <div style={{ fontSize: 13, fontWeight: 500, color: "#333", marginBottom: 4 }}>
          Risk Retention Group notice
        </div>
        <div style={{ fontSize: 11, color: "#595959", lineHeight: 1.6 }}>
          This policy is issued by your risk retention group. Your risk retention group may not be
          subject to all of the insurance laws and regulations of your State. State insurance
          insolvency guaranty funds are not available for your risk retention group.
        </div>
      </div>

      <InfoBox>
        Coverage is portable — stays with you across jobs, moves, and all 50 states.
      </InfoBox>

      <Spacer />
      {/* Block Continue while pricing errored or is still loading — same rule
          the Home Page calculator applies. */}
      <button
        type="button"
        className="ui-btn-primary"
        style={dis(btnPrimary, !ilfDlfError && !ilfDlfLoading && Boolean(ilf))}
        disabled={Boolean(ilfDlfError) || ilfDlfLoading || !ilf}
        onClick={() => goTo(2)}
      >
        Continue to full application
      </button>
      <button type="button" style={btnOutline} onClick={() => goTo(0)}>
        Edit estimate
      </button>
    </>
  );
}
