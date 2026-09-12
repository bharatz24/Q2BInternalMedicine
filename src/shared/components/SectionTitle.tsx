import { memo } from "react";
import type { ReactNode } from "react";
import { RED } from "@/shared/constants";

interface SectionTitleProps {
  children: ReactNode;
  required?: boolean;
}

export const SectionTitle = memo(({ children, required }: SectionTitleProps) => (
  <div
    style={{
      fontSize: 11,
      fontWeight: 500,
      color: "#595959",
      textTransform: "uppercase",
      letterSpacing: "0.06em",
      marginBottom: 10,
      marginTop: 4,
      fontFamily: "var(--font-body)",
    }}
  >
    {children}
    {required && <span style={{ color: RED, marginLeft: 4 }}>*</span>}
  </div>
));
