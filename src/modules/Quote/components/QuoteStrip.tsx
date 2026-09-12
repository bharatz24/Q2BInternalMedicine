import type { ReactNode } from "react";
import { BRAND_DARK } from "@/shared/constants";
import { formatUsd } from "@/modules/Quote/utils/decimal";

interface QuoteStripProps {
  total?: number | string;
  limits?: ReactNode;
  claims?: ReactNode;
  amountPending?: boolean;
  amountLabel?: ReactNode;
  amountSuffix?: ReactNode;
}

/**
 * The persistent price strip at the top of each wizard step.
 *
 * Same component as the PA portal's, with one change: the amount no longer
 * carries a hard-coded "/yr" suffix. A student policy is priced for the length
 * of the program, not per year, so the suffix is a caller-supplied label —
 * pages pass the program duration ("· 12 weeks") where the PA portal passed
 * nothing and got "/yr".
 */
export const QuoteStrip = ({
  total,
  limits,
  claims = "Claims made",
  amountPending = false,
  amountLabel = "Your quote",
  amountSuffix = "",
}: QuoteStripProps) => (
  <div
    style={{
      background: "#f7f7f5",
      borderRadius: 10,
      padding: "10px 14px",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 10,
    }}
  >
    <div>
      <div style={{ fontSize: 10, color: "#595959" }}>{amountLabel}</div>
      <div
        className="ui-heading"
        style={{
          fontFamily: "var(--font-heading)",
          fontSize: 20,
          fontWeight: 600,
          color: BRAND_DARK,
          minHeight: 27,
          display: "flex",
          alignItems: "center",
        }}
      >
        {amountPending ? (
          <span
            style={{
              fontSize: 16,
              fontWeight: 500,
              color: "#595959",
              fontFamily: "var(--font-body)",
            }}
          >
            Loading…
          </span>
        ) : (
          <>
            {formatUsd(Number.isFinite(Number(total)) ? Number(total) : 0)}
            {amountSuffix && (
              <span
                style={{
                  fontSize: 11,
                  color: "#595959",
                  fontFamily: "var(--font-body)",
                  fontWeight: 400,
                  marginLeft: 4,
                }}
              >
                {amountSuffix}
              </span>
            )}
          </>
        )}
      </div>
    </div>
    <div
      style={{
        fontSize: 11,
        color: "#595959",
        textAlign: "right",
        lineHeight: 1.5,
        fontFamily: "var(--font-body)",
      }}
    >
      {limits}
      <br />
      {claims}
    </div>
  </div>
);
