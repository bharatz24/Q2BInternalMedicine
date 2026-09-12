import { useEffect } from "react";
import { useLocation } from "react-router-dom";

import { pathToStepIndex } from "@/modules/Quote/constants";
import submissionStore from "@/modules/Quote/store/submissionStore";

/**
 * Path → step sync. Keeps `submissionStore.step` aligned with the URL when
 * the user navigates via Back/Forward.
 *
 * Was effect 6 of the old monolithic `useAppBootstrap`.
 */
export function usePathStepSync(): void {
  const { pathname } = useLocation();

  useEffect(() => {
    const i = pathToStepIndex(pathname);
    if (submissionStore.step !== i) submissionStore.step = i;
  }, [pathname]);
}
