/**
 * Local account shadow — what backs the parts of `src/local/*.js` that stay
 * local even though auth itself is now real (see `modules/Auth/api/authApi`).
 *
 * Auth is fully wired to INS-SERVICE — there is no local sign-in/sign-up
 * anymore. But submission creation, the question tree and rating math stay
 * local (`ins` has no nursing product/rate data yet), and that local code
 * (`submissionLocal.ts`, `documentLocal.js`) was written against a
 * `currentAccount()` / `TABLES.ACCOUNTS` concept keyed by a locally-issued
 * account id.
 *
 * Rather than rewrite every local read of "the current account" throughout
 * that code, this keeps the seam alive: every time the real identity becomes
 * known (sign-in, sign-up, session restore), `syncAccountShadow` mirrors it
 * into a `sessionStorage` row (see `src/local/db.ts` — the shadow holds
 * name / email / phone, so it is kept off disk and dies with the tab) keyed
 * by the REAL `ins` insured id, and opens the local session pointer.
 * `currentAccount()` then resolves to that row, same as before —
 * `submissionLocal.ts` needed no changes.
 *
 * Call `syncAccountShadow` synchronously, directly, at the same point
 * `insuredProfileStore.insuredProfile` is set — do not rely on a React
 * effect to do it, since local submission creation can run synchronously
 * right after (e.g. `RegistrationPage`'s create-account-then-create-
 * submission sequence).
 */

import { TABLES, findOne, insert, readSession, update, writeSession } from "@/local/db";

const normaliseEmail = (email: unknown): string =>
  String(email || "")
    .trim()
    .toLowerCase();

interface AuthProfile {
  id?: number | string;
  email?: string;
  username?: string;
  firstname?: string;
  firstName?: string;
  lastname?: string;
  lastName?: string;
  contactnumber?: string;
  contactNumber?: string;
  phone?: string;
}

/**
 * Mirror the real authenticated insured into a local shadow row and open the
 * local session pointer.
 *
 * @returns the shadow account row, or null when `profile` has no id
 */
export function syncAccountShadow(profile: AuthProfile | null | undefined): any {
  if (!profile) return null;
  const id = Number(profile.id);
  if (!Number.isFinite(id) || id <= 0) return null;

  const fields = {
    email: normaliseEmail(profile.email || profile.username),
    firstname: profile.firstname || profile.firstName || "",
    lastname: profile.lastname || profile.lastName || "",
    phone: profile.contactnumber || profile.contactNumber || profile.phone || "",
  };
  const existing = findOne(TABLES.ACCOUNTS, (a) => a.id === id);
  const account = existing
    ? update(TABLES.ACCOUNTS, (a) => a.id === id, fields)
    : insert(TABLES.ACCOUNTS, { id, ...fields, createdAt: new Date().toISOString() });

  startSession(id);
  return account;
}

/** Close the local session pointer (on real sign-out). The shadow row survives. */
export function clearAccountShadow(): void {
  writeSession(null);
}

/** Open a session for an account id. */
export function startSession(accountId: number | string): void {
  writeSession({ accountId, startedAt: new Date().toISOString() });
}

/** Attach the active submission to the signed-in account. */
export function linkSubmissionToCurrentAccount(
  submissionId: number | string,
  extra: Record<string, any> = {},
): any {
  const session = readSession();
  if (!session?.accountId) return null;
  return update(TABLES.ACCOUNTS, (a) => a.id === session.accountId, {
    submissionId,
    ...extra,
  });
}

/** The signed-in account record (the local shadow), or null. */
export function currentAccount(): any {
  const session = readSession();
  if (!session?.accountId) return null;
  return findOne(TABLES.ACCOUNTS, (a) => a.id === session.accountId);
}
