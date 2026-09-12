import type { ReactNode } from "react";

import Loader from "@/shared/components/Loader";
import Alert from "@/shared/components/Alert";
import { btnOutline } from "@/shared/utils/styles";

/**
 * One place to render the four states of an async read — pending, error,
 * empty, and loaded — so pages stop each inventing their own (the prior
 * audit, area 2: "empty renders as `—`, as nothing, or as a spinner that
 * can stick").
 *
 * Pairs with a react-query result:
 *
 *   const q = useQuery({ ... });
 *   <AsyncBoundary
 *     status={q.status}
 *     isFetching={q.isFetching}
 *     error={q.error}
 *     isEmpty={(q.data?.length ?? 0) === 0}
 *     onRetry={q.refetch}
 *     loadingLabel="Loading policies…"
 *     empty={<Alert type="info" message="No policies on file yet." />}
 *   >
 *     {rows.map(...)}
 *   </AsyncBoundary>
 *
 * `status` is react-query's `"pending" | "error" | "success"`. On `success`
 * we show `empty` when `isEmpty`, otherwise `children`. A background refetch
 * (`isFetching` while already `success`) keeps the current content and shows
 * an unobtrusive inline spinner instead of blanking the page.
 */
export interface AsyncBoundaryProps {
  status: "pending" | "error" | "success";
  isFetching?: boolean;
  error?: unknown;
  isEmpty?: boolean;
  onRetry?: () => void;
  loadingLabel?: string;
  /** What to render on a successful-but-empty response. */
  empty?: ReactNode;
  /** Override the default error banner. */
  errorFallback?: ReactNode;
  children: ReactNode;
}

function errorMessage(error: unknown): string {
  if (error && typeof error === "object" && "message" in error) {
    const m = (error as { message?: unknown }).message;
    if (typeof m === "string" && m) return m;
  }
  return "Something went wrong loading this. Please try again.";
}

export default function AsyncBoundary({
  status,
  isFetching = false,
  error,
  isEmpty = false,
  onRetry,
  loadingLabel = "Loading…",
  empty = null,
  errorFallback,
  children,
}: AsyncBoundaryProps) {
  if (status === "pending") {
    return <Loader label={loadingLabel} />;
  }

  if (status === "error") {
    if (errorFallback !== undefined) return <>{errorFallback}</>;
    return (
      <div className="async-boundary-error">
        <Alert type="error" message={errorMessage(error)} />
        {onRetry && (
          <button
            type="button"
            onClick={() => onRetry()}
            style={{ ...btnOutline, marginTop: 8, fontSize: 12 }}
          >
            Try again
          </button>
        )}
      </div>
    );
  }

  return (
    <>
      {isEmpty ? empty : children}
      {isFetching && <Loader inline label="Refreshing…" />}
    </>
  );
}
