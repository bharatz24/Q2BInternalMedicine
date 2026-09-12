/**
 * The applicant's identity — §I of the paper application form, collected on
 * step 3 (`/register`), plus the account password (§3.1 of the plan).
 *
 * ⚠ THE SSN IS NEVER WRITTEN TO BROWSER STORAGE. ⚠
 * The SSN (and DOB) are optional fields sent once, over the wire, in the
 * `POST /auth/signup` body — `ins` stores them on the insured record
 * (`InsuredRequest.ssn` → `insured.taxid`, `InsuredRequest.dob` →
 * `insured.dob`). On the client the SSN stays a plain private field with no
 * `localStorage` mirror: it is never included in anything this store hands to
 * `submissionLocal`, and is never logged. A refresh before signup completes
 * loses it and the form asks for it again — that is intended, since it must
 * not sit in storage on what may be a shared machine.
 *
 * Everything else here is ordinary application data and is saved onto the
 * submission so the wizard survives a reload.
 */

export interface Address {
  address1: string;
  address2: string;
  city: string;
  state: string;
  zip: string;
}

/** The identity half of a submission payload — never carries the SSN. */
export interface SubmissionNurse {
  firstName: string;
  middleName: string;
  lastName: string;
  dateOfBirth: string;
  licenseNumber: string;
  homeAddress: Address;
  homePhone: string;
  cellPhone: string;
  email: string;
  bestContact: string;
}

const emptyAddress = (): Address => ({ address1: "", address2: "", city: "", state: "", zip: "" });

export const BEST_CONTACT_METHODS = Object.freeze(["Home", "Office", "Cell"] as const);

type Nullable = string | null | undefined;

class PhysicianProfileStore {
  #listeners = new Set<() => void>();

  #firstName = "";
  #middleName = "";
  #lastName = "";
  #dateOfBirth = "";
  #ssn = ""; // memory only — see the header
  #licenseNumber = ""; // DPL Q3 "Medical License" → InsuredRequest.licenseNumber
  #homeAddress: Address = emptyAddress();
  #homePhone = "";
  #cellPhone = "";
  #email = "";
  #bestContact = ""; // "Home" | "Office" | "Cell"

  get firstName(): string {
    return this.#firstName;
  }
  set firstName(v: Nullable) {
    this.#firstName = v ?? "";
    this.#notify();
  }

  get middleName(): string {
    return this.#middleName;
  }
  set middleName(v: Nullable) {
    this.#middleName = v ?? "";
    this.#notify();
  }

  get lastName(): string {
    return this.#lastName;
  }
  set lastName(v: Nullable) {
    this.#lastName = v ?? "";
    this.#notify();
  }

  get dateOfBirth(): string {
    return this.#dateOfBirth;
  }
  set dateOfBirth(v: Nullable) {
    this.#dateOfBirth = v ?? "";
    this.#notify();
  }

  get ssn(): string {
    return this.#ssn;
  }
  set ssn(v: Nullable) {
    this.#ssn = v ?? "";
    this.#notify();
  }

  get licenseNumber(): string {
    return this.#licenseNumber;
  }
  set licenseNumber(v: Nullable) {
    this.#licenseNumber = v ?? "";
    this.#notify();
  }

  get homeAddress(): Address {
    return this.#homeAddress;
  }
  set homeAddress(v: Partial<Address> | null | undefined) {
    this.#homeAddress = { ...emptyAddress(), ...(v || {}) };
    this.#notify();
  }
  setAddressField(field: keyof Address, value: Nullable) {
    this.#homeAddress = { ...this.#homeAddress, [field]: value ?? "" };
    this.#notify();
  }

  get homePhone(): string {
    return this.#homePhone;
  }
  set homePhone(v: Nullable) {
    this.#homePhone = v ?? "";
    this.#notify();
  }

  get cellPhone(): string {
    return this.#cellPhone;
  }
  set cellPhone(v: Nullable) {
    this.#cellPhone = v ?? "";
    this.#notify();
  }

  get email(): string {
    return this.#email;
  }
  set email(v: Nullable) {
    this.#email = v ?? "";
    this.#notify();
  }

  get bestContact(): string {
    return this.#bestContact;
  }
  set bestContact(v: Nullable) {
    this.#bestContact = v ?? "";
    this.#notify();
  }

  /**
   * The identity half of a submission payload.
   *
   * The SSN is deliberately absent: this object is what gets written to
   * `localStorage` via `submissionLocal`, and the SSN must never go there.
   */
  toSubmissionNurse(): SubmissionNurse {
    return {
      firstName: this.#firstName,
      middleName: this.#middleName,
      lastName: this.#lastName,
      dateOfBirth: this.#dateOfBirth,
      licenseNumber: this.#licenseNumber,
      homeAddress: { ...this.#homeAddress },
      homePhone: this.#homePhone,
      cellPhone: this.#cellPhone,
      email: this.#email,
      bestContact: this.#bestContact,
    };
  }

  /** Rehydrate from a stored submission. Never restores an SSN — none is kept. */
  hydrateFromSubmission(nurse: Partial<SubmissionNurse> | null | undefined) {
    if (!nurse) return;
    this.#firstName = nurse.firstName || "";
    this.#middleName = nurse.middleName || "";
    this.#lastName = nurse.lastName || "";
    this.#dateOfBirth = nurse.dateOfBirth || "";
    this.#licenseNumber = nurse.licenseNumber || "";
    this.#homeAddress = { ...emptyAddress(), ...(nurse.homeAddress || {}) };
    this.#homePhone = nurse.homePhone || "";
    this.#cellPhone = nurse.cellPhone || "";
    this.#email = nurse.email || "";
    this.#bestContact = nurse.bestContact || "";
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
    this.#firstName = "";
    this.#middleName = "";
    this.#lastName = "";
    this.#dateOfBirth = "";
    this.#ssn = "";
    this.#licenseNumber = "";
    this.#homeAddress = emptyAddress();
    this.#homePhone = "";
    this.#cellPhone = "";
    this.#email = "";
    this.#bestContact = "";
    this.#notify();
  }
}

const physicianProfileStore = new PhysicianProfileStore();
export default physicianProfileStore;
