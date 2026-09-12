/**
 * Dashboard API surface. Talks to INS-SERVICE for real.
 *
 * NOTE: submission creation stays local (`ins` has no nursing product yet —
 * see `Quote/api/quoteApi`), so a submission just created through this
 * app's wizard will NOT appear in this real list until that changes. Use
 * `submissionStore.flowSubmissionId` (session-persisted) to navigate the
 * in-progress flow directly rather than relying on this list to surface it.
 */
import axios from "axios";
import { apiUrl, logApiError } from "@/shared/services/config";
import { OpenOrderDetailsDto, SubmissionDetails } from "@/shared/dtos";

/** Every submission belonging to the signed-in insured. */
export const fetchDashboardSubmissions = async (): Promise<SubmissionDetails[]> => {
  try {
    const response = await axios.get(apiUrl("/dashboard/submissions"), { withCredentials: true });
    const data = response.data;
    const rows: any[] = Array.isArray(data)
      ? data
      : Array.isArray(data?.data)
        ? data.data
        : Array.isArray(data?.rows)
          ? data.rows
          : Array.isArray(data?.submissions)
            ? data.submissions
            : [];
    return rows.map((r) => new SubmissionDetails(r));
  } catch (error) {
    logApiError(error);
    throw error;
  }
};

export const fetchInsuredOpenOrders = async (): Promise<OpenOrderDetailsDto[]> => {
  try {
    const response = await axios.get(apiUrl("/insured/orders/open"), { withCredentials: true });
    return Array.isArray(response.data)
      ? response.data.map((o: any) => new OpenOrderDetailsDto(o))
      : [];
  } catch (error) {
    // Matches the hosted behaviour: an empty list is a better answer here than
    // a thrown error, which would blank the dashboard.
    logApiError(error);
    return [];
  }
};
