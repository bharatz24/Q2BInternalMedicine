import { useEffect, useId, useRef } from "react";

/**
 * Accessibility plumbing shared by every modal / dialog in the app
 * (see REACT_FRONTEND_AUDIT.md §5 "Modals are inaccessible"):
 *
 *  - moves focus into the dialog on open,
 *  - traps Tab / Shift+Tab inside it while open,
 *  - closes on Escape,
 *  - locks body scroll while open,
 *  - restores focus to the element that had it before the dialog opened.
 *
 * The consumer spreads `dialogProps` onto its dialog container element and
 * uses `titleId` on the element that names the dialog:
 *
 *   const { dialogProps, titleId } = useDialogA11y(onClose);
 *   <div {...dialogProps} aria-labelledby={titleId}>
 *     <h2 id={titleId}>…</h2>
 */
export function useDialogA11y(onClose: () => void) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const titleId = useId();

  useEffect(() => {
    const container = containerRef.current;
    const previouslyFocused = document.activeElement as HTMLElement | null;

    const selector =
      "a[href], button:not([disabled]), input:not([disabled]), select:not([disabled])," +
      ' textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

    const focusables = () =>
      Array.from(container?.querySelectorAll<HTMLElement>(selector) ?? []).filter(
        (el) => el.offsetParent !== null || el === document.activeElement,
      );

    // Move focus into the dialog.
    const initial = focusables()[0] ?? container;
    initial?.focus();

    // Body scroll lock.
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
        return;
      }
      if (e.key !== "Tab" || !container) return;
      const items = focusables();
      if (items.length === 0) {
        e.preventDefault();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement as HTMLElement | null;
      if (e.shiftKey && (active === first || !container.contains(active))) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown, true);
    return () => {
      document.removeEventListener("keydown", onKeyDown, true);
      document.body.style.overflow = prevOverflow;
      // Return focus to the trigger, if it is still in the document.
      if (previouslyFocused && document.contains(previouslyFocused)) {
        previouslyFocused.focus();
      }
    };
  }, [onClose]);

  return {
    titleId,
    dialogProps: {
      ref: containerRef,
      role: "dialog" as const,
      "aria-modal": true,
      tabIndex: -1,
    },
  };
}
