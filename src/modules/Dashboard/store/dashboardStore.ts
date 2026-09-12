/**
 * Dashboard module store — UI selection only. The submissions list itself is
 * server state and lives in the react-query cache
 * (`queryKeys.dashboard.submissions`), not here. `policyDetailRow` is the row
 * the user clicked through to view on /order-details — a cross-route UI
 * hand-off, so it stays in a store.
 */
class DashboardStore {
  #listeners = new Set<() => void>();

  #policyDetailRow: any = null;

  get policyDetailRow(): any {
    return this.#policyDetailRow;
  }
  set policyDetailRow(v: any) {
    this.#policyDetailRow = v;
    this.#notify();
  }

  subscribe(listener: () => void): () => void {
    this.#listeners.add(listener);
    return () => this.#listeners.delete(listener);
  }

  #notify() {
    this.#listeners.forEach((l) => l());
  }

  clear() {
    this.#policyDetailRow = null;
    this.#notify();
  }
}

const dashboardStore = new DashboardStore();
export default dashboardStore;
