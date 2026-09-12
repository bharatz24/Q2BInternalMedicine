/**
 * Section header used inside long modal bodies (Privacy / Terms).
 * Renders the title in a heavier weight, then the body children below it.
 */
import type { ReactNode } from "react";

export default function Section({ title, children }: { title: ReactNode; children: ReactNode }) {
  return (
    <>
      <div style={{ fontSize: 13, fontWeight: 500, color: "#333", marginBottom: 6 }}>{title}</div>
      {children}
    </>
  );
}
