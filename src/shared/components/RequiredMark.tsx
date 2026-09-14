import { RED } from "@/shared/constants";

/**
 * The red `*` that marks a required question or field, rendered at the end of
 * its label.
 *
 * Single-sourced because three places used to hand-roll it — `Field`,
 * `SectionTitle` (every tree question) and `UnderwritingPage`'s yes/no row —
 * and they had drifted on the one thing that matters: a bare `*` is read out
 * by a screen reader as "star", or skipped entirely, so for tree questions the
 * requirement was visual-only.
 *
 * `announce` is off for callers that already convey the requirement through
 * ARIA on the control itself (`Field` publishes `aria-required`), so those
 * labels don't say "required" twice.
 */
export const RequiredMark = ({ announce = true }: { announce?: boolean }) => (
  <span style={{ color: RED, marginLeft: 4 }}>
    <span aria-hidden="true">*</span>
    {announce && <span className="sr-only">(required)</span>}
  </span>
);
