/**
 * Dashboard module service layer.
 */
import * as dashboardApi from "@/modules/Dashboard/api/dashboardApi";

const friendly = (error: any, fallback: string): string =>
  error?.response?.data?.message || error?.message || fallback;

export const loadDashboardSubmissions = async () => {
  try {
    return await dashboardApi.fetchDashboardSubmissions();
  } catch (error) {
    throw new Error(friendly(error, "Could not load your policies."));
  }
};

export const loadOpenOrders = async () => {
  // fetchInsuredOpenOrders already returns [] on 401/403/404 so it's safe
  // to call without wrapping in try/catch at the page layer.
  return dashboardApi.fetchInsuredOpenOrders();
};
