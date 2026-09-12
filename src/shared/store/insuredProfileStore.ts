/**
 * Cross-module insured-profile store — holds the GET /insured/session
 * payload (insured id, email, abbreviation, …). Pages read this to
 * decide `isAuthenticated`; the auth + dashboard + profile + quote flows
 * all reach for the same source of truth.
 */

/**
 * The subset of the `/insured/session` (and sign-in) payload this app
 * actually reads. Every field is optional — the shape varies by source
 * (a full session DTO vs. the slimmer object `RegistrationPage` builds
 * right after signup).
 */
export interface InsuredProfile {
  id?: string | number;
  name?: string;
  username?: string;
  email?: string;
  firstname?: string;
  lastname?: string;
  abbreviation?: string;
  contactnumber?: string;
  phone?: string;
}

class InsuredProfileStore {
  #listeners = new Set<() => void>();
  #insuredProfile: InsuredProfile | null = null;

  get insuredProfile(): InsuredProfile | null {
    return this.#insuredProfile;
  }
  set insuredProfile(dto: InsuredProfile | null | undefined) {
    this.#insuredProfile = dto || null;
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
    this.#insuredProfile = null;
    this.#notify();
  }
}

const insuredProfileStore = new InsuredProfileStore();
export default insuredProfileStore;
