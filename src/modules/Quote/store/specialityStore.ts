import type { SpecialityMasterResponse } from "@/shared/dtos";

/**
 * Speciality master cache — the `GET /auth/speciality/{code}` responses for
 * this portal's four designation-mapped codes (SP_398–SP_401, see
 * `Quote/data/nursingDesignations.js`). Unlike Nfy (one default speciality per
 * session), this portal needs all four at once, so the cache is keyed by
 * code rather than holding a single slot.
 */
class SpecialityStore {
  #listeners = new Set<() => void>();
  #byCode = new Map<string, SpecialityMasterResponse>();

  getSpeciality(code: string): SpecialityMasterResponse | null {
    return this.#byCode.get(code) ?? null;
  }

  setSpeciality(code: string, data: SpecialityMasterResponse) {
    this.#byCode.set(code, data);
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
    this.#byCode.clear();
    this.#notify();
  }
}

const specialityStore = new SpecialityStore();
export default specialityStore;
