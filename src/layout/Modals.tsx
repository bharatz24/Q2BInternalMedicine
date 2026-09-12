import { lazy, Suspense } from "react";
import { useStore } from "@/shared/store/useStore";
import modalStore from "@/shared/store/modalStore";

// Legal / informational modals — heavy static copy that only mounts when the
// user opens one. Code-split so their text doesn't ride in the initial
// bundle; the `showX &&` guard already means nothing loads until first open.
const PrivacyModal = lazy(() => import("./modals/PrivacyModal"));
const TermsModal = lazy(() => import("./modals/TermsModal"));
const AboutModal = lazy(() => import("./modals/AboutModal"));
const FAQModal = lazy(() => import("./modals/FAQModal"));

/**
 * Modal orchestrator — reads the three open/close flags from `modalStore`
 * and mounts the matching modal. Each modal owns its own copy/layout in
 * ./modals/<Name>Modal.jsx; the shared overlay/header/footer chrome lives
 * in ./modals/ModalShell.jsx.
 */
export default function Modals() {
  const showPrivacy = useStore(modalStore, (s) => s.showPrivacy);
  const showTerms = useStore(modalStore, (s) => s.showTerms);
  const showAbout = useStore(modalStore, (s) => s.showAbout);
  const showFAQ = useStore(modalStore, (s) => s.showFAQ);

  return (
    <Suspense fallback={null}>
      {showPrivacy && (
        <PrivacyModal
          onClose={() => {
            modalStore.showPrivacy = false;
          }}
        />
      )}
      {showTerms && (
        <TermsModal
          onClose={() => {
            modalStore.showTerms = false;
          }}
        />
      )}
      {showAbout && (
        <AboutModal
          onClose={() => {
            modalStore.showAbout = false;
          }}
        />
      )}
      {showFAQ && (
        <FAQModal
          onClose={() => {
            modalStore.showFAQ = false;
          }}
        />
      )}
    </Suspense>
  );
}
