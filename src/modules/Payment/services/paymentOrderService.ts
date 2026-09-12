import { fetchInsuredOrderDetails } from "@/modules/Quote/api/quoteApi";
import { logApiError } from "@/shared/services/config";
import { queryClient } from "@/shared/query/queryClient";
import { queryKeys } from "@/shared/query/keys";
import paymentOrderStore from "@/modules/Payment/store/paymentOrderStore";
import submissionStore from "@/modules/Quote/store/submissionStore";
import quoteResultStore from "@/modules/Quote/store/quoteResultStore";
import { hydrateStoresFromOrder } from "@/modules/Quote/utils/hydrateFromOrder";

/**
 * Re-fetch `GET /insured/order` for the active submission and write the
 * result into `paymentOrderStore` (the reactive projection `usePolicyStatus`
 * / `useQuoteSnapshot` read).
 *
 * Backed by the shared react-query cache (`queryKeys.order.detail`):
 *
 * - concurrent callers with the same sid share one in-flight request —
 *   react-query's own dedup, replacing the old hand-rolled `inflightBySid`
 *   Map;
 * - the `OrderDetails` / `CompleteOrder` pages read the same key, so a
 *   Resume that lands on one of them serves from cache;
 * - transient (5xx / network) failures get the client's bounded
 *   retry-with-backoff for free.
 *
 * Also rehydrates program dates + the live quote from the order — Resume and
 * refresh land with an empty `quoteResultStore`, which left Payment's order
 * summary as every line "—".
 *
 * @param opts.ifMissing `true` → serve the cached order untouched when one is
 *   already cached for this sid (mount-time effects). Omit / `false` → force
 *   a fresh read (save + post-payment flows).
 */
export async function refreshPaymentOrder(
  submissionId: string | number,
  { ifMissing = false }: { ifMissing?: boolean } = {},
): Promise<any> {
  // D4 guard — reject non-positive / unparseable ids before they reach the
  // backend (a `submissionId=0` would 404 and surface a confusing error).
  const sidNum = Number(submissionId);
  if (!Number.isFinite(sidNum) || sidNum <= 0) return null;
  const key = String(submissionId);

  if (
    ifMissing &&
    paymentOrderStore.loadedSubmissionId === key &&
    paymentOrderStore.paymentOrderDetails
  ) {
    // Order is cached, but the memory-only quote may still be empty (e.g.
    // Resume already wrote the order, then Payment mounts with ifMissing).
    if (!quoteResultStore.quote) {
      hydrateStoresFromOrder(paymentOrderStore.paymentOrderDetails);
    }
    return paymentOrderStore.paymentOrderDetails;
  }

  paymentOrderStore.paymentOrderLoading = true;
  paymentOrderStore.paymentOrderError = null;
  try {
    const order = await queryClient.query({
      queryKey: queryKeys.order.detail(key),
      queryFn: () => fetchInsuredOrderDetails(submissionId),
      // `ifMissing` → accept any cached value; otherwise always re-read.
      staleTime: ifMissing ? Infinity : 0,
    });

    // D3 guard — if the user has navigated away (sid cleared or swapped for
    // a new submission) while this fetch was in flight, drop the result on
    // the floor instead of poisoning the store with stale details.
    const currentSid = submissionStore.flowSubmissionId;
    if (currentSid != null && String(currentSid) !== key) return order;

    paymentOrderStore.paymentOrderDetails = order;
    paymentOrderStore.loadedSubmissionId = key;
    hydrateStoresFromOrder(order);
    return order;
  } catch (e: any) {
    logApiError(e);
    paymentOrderStore.paymentOrderError = e?.message || "Could not load order details";
    return null;
  } finally {
    paymentOrderStore.paymentOrderLoading = false;
  }
}
