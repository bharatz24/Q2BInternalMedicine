import { useEffect } from "react";

import { useStore } from "@/shared/store/useStore";
import insuredProfileStore from "@/shared/store/insuredProfileStore";
import { setObservabilityUser } from "@/shared/observability/reporter";

/**
 * Keep the crash reporter's user context in sync with the authenticated
 * identity, so a report says *which* applicant hit it (id only — never name /
 * email / PII). Clears on sign-out. No-op without `VITE_SENTRY_DSN`.
 */
export function useObservabilityUser(): void {
  const insuredId = useStore(insuredProfileStore, (s) => s.insuredProfile?.id ?? null);

  useEffect(() => {
    setObservabilityUser(insuredId != null ? { id: insuredId } : null);
  }, [insuredId]);
}
