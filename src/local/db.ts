/**
 * The local "database" — a handful of JSON tables in `sessionStorage`.
 *
 * STORAGE BACKEND — sessionStorage, not localStorage
 * -------------------------------------------------
 * These tables can hold regulated applicant PII (the account shadow's name /
 * email / phone; a submission row's name / address / DOB on the now-dead
 * local create/patch paths). `sessionStorage` keeps that data off disk and
 * scoped to the tab — it is gone the moment the tab or browser closes, which
 * is the right lifetime for a kiosk / shared-device funnel and removes the
 * "no expiry" exposure flagged in REACT_FRONTEND_AUDIT.md area 4. It still
 * survives an in-tab reload, which is all the "page refresh survival" the
 * copied UI actually needs. (Theme preference stays in `localStorage` via
 * `src/theme.ts` — it is a UX setting, not PII, and should persist.)
 *
 * WHAT GOES IN HERE, AND WHAT NEVER DOES
 * --------------------------------------
 * With no server, applicant data only ever exists client-side. This store
 * holds the minimum a page refresh genuinely needs, and the following are
 * deliberately kept in memory only, never written to storage at all (the
 * SSN is still sent to `ins` at signup — it just never lands in storage
 * on this device):
 *
 *   - SSN, DEA number    (see `physicianProfileStore`)
 *   - licence/CV scans   (a base64 PDF would also blow the ~5 MB quota)
 *   - card details       (see `paymentLocal`)
 *   - passwords in clear (see `authLocal` — hashed, and even that is
 *                         demo-grade, not security)
 *
 * Every read is defensive: private-browsing modes throw on `sessionStorage`
 * access, and a half-written value from a previous version must degrade to
 * "no data" rather than crashing the app on boot.
 */

const PREFIX = "q2bnursing:";

// One indirection point for the storage backend. `sessionStorage` (see the
// file header) — resolved lazily and defensively so an environment without it
// (SSR, locked-down iframe) degrades to "no persistence" instead of throwing
// at module load.
const store = (): Storage | null => {
  try {
    return typeof sessionStorage !== "undefined" ? sessionStorage : null;
  } catch {
    return null;
  }
};

/** Table names. One `sessionStorage` key each. */
export const TABLES = Object.freeze({
  ACCOUNTS: "accounts",
  SUBMISSIONS: "submissions",
  PAYMENTS: "payments",
  SESSION: "session",
  COUNTERS: "counters",
});

const key = (table: string) => `${PREFIX}${table}`;

/**
 * Read a table. Returns `fallback` when storage is unavailable, the key is
 * missing, or the stored value no longer parses.
 */
export function readTable<T>(table: string, fallback: T): T {
  try {
    const raw = store()?.getItem(key(table)) ?? null;
    if (raw == null) return fallback;
    const parsed = JSON.parse(raw);
    return parsed == null ? fallback : parsed;
  } catch {
    return fallback;
  }
}

/**
 * Overwrite a table. Silently no-ops when storage is unavailable or full —
 * the app must stay usable in private mode, just without refresh survival.
 *
 * @returns whether the write actually landed
 */
export function writeTable(table: string, value: unknown): boolean {
  try {
    const s = store();
    if (!s) return false;
    s.setItem(key(table), JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

/** Read a table that holds an array of records. */
export function readCollection(table: string): any[] {
  const rows = readTable<any[]>(table, []);
  return Array.isArray(rows) ? rows : [];
}

/**
 * Insert a record and return it.
 */
export function insert<T extends object>(table: string, record: T): T {
  const rows = readCollection(table);
  rows.push(record);
  writeTable(table, rows);
  return record;
}

/**
 * Find the first record matching `predicate`, or null.
 */
export function findOne(table: string, predicate: (row: any) => boolean): any {
  return readCollection(table).find(predicate) || null;
}

/** Every record matching `predicate`. */
export function findAll(table: string, predicate?: (row: any) => boolean): any[] {
  const rows = readCollection(table);
  return predicate ? rows.filter(predicate) : rows;
}

/**
 * Shallow-merge `patch` into the first record matching `predicate`.
 *
 * @returns the updated record, or null when nothing matched
 */
export function update(
  table: string,
  predicate: (row: any) => boolean,
  patch: Record<string, any> | ((row: any) => Record<string, any>),
): any {
  const rows = readCollection(table);
  const index = rows.findIndex(predicate);
  if (index === -1) return null;
  const changes = typeof patch === "function" ? patch(rows[index]) : patch;
  const updated = { ...rows[index], ...changes };
  rows[index] = updated;
  writeTable(table, rows);
  return updated;
}

/** Remove every record matching `predicate`. Returns how many were removed. */
export function remove(table: string, predicate: (row: any) => boolean): number {
  const rows = readCollection(table);
  const kept = rows.filter((row) => !predicate(row));
  writeTable(table, kept);
  return rows.length - kept.length;
}

/**
 * Next value of a named counter. Backs every id generator in `ids.ts`.
 *
 * @returns 1 on first call
 */
export function nextCounter(name: string): number {
  const counters = readTable<Record<string, number>>(TABLES.COUNTERS, {});
  const next = Number(counters?.[name] || 0) + 1;
  writeTable(TABLES.COUNTERS, { ...counters, [name]: next });
  return next;
}

/** The single-row session marker, or null. */
export function readSession(): any {
  return readTable<any>(TABLES.SESSION, null);
}

/** Write (or clear, with null) the session marker. */
export function writeSession(value: unknown): void {
  if (value == null) {
    try {
      store()?.removeItem(key(TABLES.SESSION));
    } catch {
      /* unavailable */
    }
    return;
  }
  writeTable(TABLES.SESSION, value);
}
