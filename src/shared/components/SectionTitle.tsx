import { memo } from "react";
import type { ReactNode } from "react";
import { RequiredMark } from "@/shared/components/RequiredMark";

interface SectionTitleProps {
  children: ReactNode;
  required?: boolean;
  /**
   * Render as a question prompt rather than a section label.
   *
   * The default is a small uppercase, letter-spaced label — right for
   * "Employer" or "Order summary", wrong for a tree question, which is a full
   * sentence: `text-transform: uppercase` shouted every prompt on /practice,
   * /previous-insurance and /underwriting, and the extra letter-spacing made
   * a long one harder to read again. A prompt keeps the case the question tree
   * actually sends — sentence case — and matches the type UnderwritingPage
   * already uses for its yes/no rows, so the two renderers finally agree.
   */
  prompt?: boolean;
}

export const SectionTitle = memo(({ children, required, prompt }: SectionTitleProps) => (
  <div
    style={{
      fontSize: prompt ? 12 : 11,
      fontWeight: 500,
      color: prompt ? "#333" : "#595959",
      textTransform: prompt ? "none" : "uppercase",
      letterSpacing: prompt ? "normal" : "0.06em",
      lineHeight: prompt ? 1.45 : undefined,
      marginBottom: prompt ? 8 : 10,
      marginTop: 4,
      fontFamily: "var(--font-body)",
    }}
  >
    {children}
    {required && <RequiredMark />}
  </div>
));
