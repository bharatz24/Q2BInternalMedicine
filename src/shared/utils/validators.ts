export const isValidZip = (z: unknown): boolean => /^\d{5}$/.test(String(z || ""));
export const isValidState = (s: unknown): boolean => /^[A-Za-z]{2}$/.test(String(s || "").trim());

export const isValidPhone = (p: unknown): boolean => {
  const digits = String(p || "").replace(/\D/g, "");
  return digits.length >= 10 && digits.length <= 15;
};

/** Format as (555) 123-4567 while typing (US-style; extra digits kept after). */
export const formatPhone = (raw: unknown): string => {
  const d = String(raw || "")
    .replace(/\D/g, "")
    .slice(0, 15);
  if (d.length === 0) return "";
  if (d.length <= 3) return `(${d}`;
  if (d.length <= 6) return `(${d.slice(0, 3)}) ${d.slice(3)}`;
  if (d.length <= 10) return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6, 10)} x${d.slice(10)}`;
};

/** Mask an SSN as the user types: 123-45-6789. */
export const formatSsn = (raw: unknown): string => {
  const d = String(raw || "")
    .replace(/\D/g, "")
    .slice(0, 9);
  if (d.length <= 3) return d;
  if (d.length <= 5) return `${d.slice(0, 3)}-${d.slice(3)}`;
  return `${d.slice(0, 3)}-${d.slice(3, 5)}-${d.slice(5)}`;
};

export const isValidSsn = (v: unknown): boolean => /^\d{3}-\d{2}-\d{4}$/.test(String(v || ""));

// Pragmatic email check: one @, a non-empty local part, and a dotted domain
// with a 2+ char TLD. Deliberately not RFC-5322-exhaustive — the backend is
// the source of truth; this just rejects obvious garbage at the gate so a
// stray "@" no longer counts as a valid address.
export const isValidEmail = (e: unknown): boolean =>
  /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(e || "").trim());

// Spec-mirrored validators (weborder.json `components.schemas`). Keep the
// regexes byte-identical so a failed client check matches the server-side
// 400 reason verbatim. If the spec changes, update here too.
//
// Source patterns:
//   password      InsuredRequest.password / InsuredLoginRequest.password
//   npi           InsuredRequest.npiNumber  → `^$|^\d{10}$`
//   licenseNumber InsuredRequest.licenseNumber → `^$|^[A-Za-z0-9]+$`, maxLen 40
//   mdy date      InsuredOrderRequest.effectiveDate → MM/DD/YYYY
export const PASSWORD_RULE =
  "Password must be at least 6 characters and include an uppercase letter, lowercase letter, digit, and special character (@$!%*?&).";

export const isValidPassword = (p: unknown): boolean =>
  /^(?=.*[0-9])(?=.*[a-z])(?=.*[A-Z])(?=.*[@$!%*?&])(?=\S+$).{6,128}$/.test(String(p || ""));

// Empty allowed (spec uses `^$|...`) so the field stays optional.
export const isValidNpi = (n: unknown): boolean => {
  const s = String(n || "");
  return s === "" || /^\d{10}$/.test(s);
};

export const isValidLicenseNumber = (l: unknown): boolean => {
  const s = String(l || "");
  return s === "" || /^[A-Za-z0-9]{1,40}$/.test(s);
};

// MM/DD/YYYY pattern. Calendar correctness (Feb 30, etc.) is the backend's
// job — this guards the shape so the request doesn't 400 on regex alone.
export const isValidMdyDate = (d: unknown): boolean =>
  /^(0[1-9]|1[0-2])\/(0[1-9]|[12]\d|3[01])\/\d{4}$/.test(String(d || ""));

/** Inline validation copy — show once the user has typed something invalid. */
export const VALIDATION_MSG = Object.freeze({
  required: "This field is required.",
  firstName: "Enter your first name.",
  lastName: "Enter your last name.",
  email: "Enter a valid email address (e.g. you@school.edu).",
  phone: "Enter a valid phone number with at least 10 digits.",
  ssn: "Enter a valid SSN as 123-45-6789.",
  date: "Enter a date as MM/DD/YYYY.",
  zip: "Enter a 5-digit ZIP code.",
  state: "Enter a 2-letter state code (e.g. CA).",
  street: "Enter a street address.",
  city: "Enter a city.",
  password: PASSWORD_RULE,
  passwordRequired: "Enter your password.",
});

/**
 * Return an error message when `value` is non-empty but fails `isValid`.
 * Empty values stay silent — required asterisk + Continue gate cover those.
 */
export function invalidMessage(
  value: unknown,
  isValid: (s: string) => boolean,
  message: string,
): string | null {
  const s = String(value ?? "").trim();
  if (!s) return null;
  return isValid(s) ? null : message;
}
