import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

import { setAuthNavigator } from "@/shared/services/httpClient";

/**
 * Register the SPA navigator with httpClient's 401 interceptor so a
 * stale-session redirect goes through React Router instead of a hard
 * `location.replace` that would cancel every other in-flight request.
 *
 * Was effect 0 of the old monolithic `useAppBootstrap`.
 */
export function useAuthNavigatorSync(): void {
  const navigate = useNavigate();

  useEffect(() => {
    setAuthNavigator(navigate);
    return () => setAuthNavigator(null);
  }, [navigate]);
}
