/**
 * Suspense fallback for the code-split route pages (AppRoutes.tsx). Kept
 * deliberately minimal — a centered spinner inside the app's card frame —
 * so the swap from one lazy page to the next doesn't flash a full-bleed
 * loader. Mirrors the wizard session-boot loader in FlowLayout.tsx.
 */
export default function RouteFallback() {
  return (
    <div
      className="loader"
      role="status"
      aria-live="polite"
      style={{ justifyContent: "center", minHeight: 320, padding: 24 }}
    >
      <div className="wizard-boot-spinner" aria-hidden="true" />
      <span className="loader-label">Loading…</span>
    </div>
  );
}
