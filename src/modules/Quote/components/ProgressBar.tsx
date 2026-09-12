import { useLocation } from "react-router-dom";
import { BRAND, BRAND_DARK, BRAND_LIGHT } from "@/shared/constants";
import { STEP_NAMES, TOTAL_STEPS, pathToStepIndex } from "@/modules/Quote/constants";

interface ProgressBarProps {
  step?: number | null;
  total?: number;
}

export const ProgressBar = ({ step: stepProp, total = TOTAL_STEPS }: ProgressBarProps) => {
  const location = useLocation();
  const step = stepProp != null ? stepProp : pathToStepIndex(location.pathname);

  return (
    <div style={{ padding: "8px 0 4px" }}>
      <div style={{ display: "flex", gap: 3 }}>
        {Array.from({ length: total }).map((_, i) => {
          const isActive = i === step;
          const isFilled = i <= step;
          return (
            <div
              key={i}
              style={{
                flex: 1,
                height: 3,
                borderRadius: 2,
                background: isFilled ? BRAND : "#e8e8e6",
                transition: "background 0.3s",
                position: "relative",
                overflow: "hidden",
              }}
            >
              {isActive && (
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    backgroundImage: `linear-gradient(90deg, ${BRAND} 0%, ${BRAND_LIGHT} 50%, ${BRAND} 100%)`,
                    backgroundSize: "200% 100%",
                    animation: "q2bShimmer 1.6s linear infinite",
                  }}
                />
              )}
            </div>
          );
        })}
      </div>
      {STEP_NAMES[step] && (
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginTop: 6,
          }}
        >
          <span
            style={{
              color: BRAND_DARK,
              fontWeight: 500,
              fontSize: 11,
              fontFamily: "var(--font-body)",
            }}
          >
            {STEP_NAMES[step]}
          </span>
          <span
            style={{
              color: "#595959",
              fontWeight: 400,
              fontSize: 11,
              fontFamily: "var(--font-body)",
            }}
          >
            {step + 1} / {total}
          </span>
        </div>
      )}
    </div>
  );
};
