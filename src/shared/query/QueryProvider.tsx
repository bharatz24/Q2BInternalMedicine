import type { ReactNode } from "react";
import { QueryClientProvider } from "@tanstack/react-query";

import { queryClient } from "./queryClient";

/**
 * Wraps the app in the shared QueryClient. Mount this once, above the router
 * (server-state queries don't depend on the route, and the bootstrap hooks
 * run inside the router).
 *
 * No `@tanstack/react-query-devtools` — its container rendered in normal flow
 * at 100vh height and left a viewport-sized blank strip under every page.
 * Inspect the cache from the console via `window.__qc` if needed (wired in
 * `queryClient.ts`, dev only).
 */
export function QueryProvider({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
