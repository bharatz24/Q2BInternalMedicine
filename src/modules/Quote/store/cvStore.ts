/**
 * The documents the DPL application asks for ("Please submit the following
 * with the application: 1. Curriculum Vitae (C.V.) 2. Current Certificate of
 * Insurance (COI) 3. Current Loss Runs for all claims", plus Q29's complaint
 * and disposition documents) — one file per slot.
 *
 * ⚠ FILES ARE HELD IN MEMORY FOR THE SESSION ONLY. ⚠
 * Two reasons, both deliberate:
 *   1. A base64-encoded PDF would blow the ~5 MB `localStorage` quota on its
 *      own, taking the rest of the wizard's state down with it.
 *   2. It would park a PII document in the browser indefinitely, on a machine
 *      that may be shared.
 *
 * Nothing here is sent to `ins` — there is no weborder upload endpoint this
 * app calls. What reaches the carrier is the `Requirement Items` impacts on
 * the question tree (plan decision D6), which put these documents on the
 * submission's outstanding-items list for the underwriter. Only the metadata
 * (name, size, type) is exposed for display — the bytes stay in the private
 * map and are never written anywhere.
 */

export type DocSlot = "cv" | "coi" | "lossRuns" | "licensingDocs";

/** Accepted formats: PDF, Word, and scanned images. */
export const ACCEPTED_DOC_TYPES = Object.freeze([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "image/jpeg",
  "image/png",
]);

export const ACCEPTED_DOC_EXTENSIONS = ".pdf,.doc,.docx,.jpg,.jpeg,.png";

/** 8 MB — comfortably above any real document, low enough to catch a wrong file. */
export const MAX_DOC_BYTES = 8 * 1024 * 1024;

/**
 * Validate a File before accepting it.
 *
 * @returns an error message, or null when the file is fine
 */
export function validateDocFile(file: File | null | undefined): string | null {
  if (!file) return "Choose a file to attach.";
  const name = String(file.name || "").toLowerCase();
  const typeOk =
    ACCEPTED_DOC_TYPES.includes(file.type) ||
    // Some browsers report an empty type for .doc; fall back to the extension.
    /\.(pdf|docx?|jpe?g|png)$/.test(name);
  if (!typeOk) return "Attach a PDF, Word document, JPG or PNG.";
  if (file.size > MAX_DOC_BYTES) {
    return `That file is ${(file.size / 1048576).toFixed(1)} MB. The limit is ${MAX_DOC_BYTES / 1048576} MB.`;
  }
  if (file.size === 0) return "That file is empty.";
  return null;
}

/** Human-readable file size, e.g. "1.4 MB". */
export function formatFileSize(bytes: number | string): string {
  const n = Number(bytes);
  if (!Number.isFinite(n) || n <= 0) return "";
  if (n < 1024) return `${n} B`;
  if (n < 1048576) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / 1048576).toFixed(1)} MB`;
}

export interface DocMeta {
  name: string;
  size: number;
  sizeLabel: string;
  type: string;
}

class CvStore {
  #listeners = new Set<() => void>();

  /** the bytes — never persisted, never logged */
  #files = new Map<DocSlot, File>();
  #errors = new Map<DocSlot, string>();

  /** Display metadata only. The File itself is not exposed. */
  metaFor(slot: DocSlot): DocMeta | null {
    const file = this.#files.get(slot);
    if (!file) return null;
    return {
      name: file.name,
      size: file.size,
      sizeLabel: formatFileSize(file.size),
      type: file.type || "",
    };
  }

  hasFile(slot: DocSlot): boolean {
    return this.#files.has(slot);
  }

  errorFor(slot: DocSlot): string | null {
    return this.#errors.get(slot) ?? null;
  }

  /**
   * Attach a file to a slot after validating it.
   *
   * @returns whether the file was accepted
   */
  attach(slot: DocSlot, file: File): boolean {
    const error = validateDocFile(file);
    if (error) {
      this.#errors.set(slot, error);
      this.#notify();
      return false;
    }
    this.#files.set(slot, file);
    this.#errors.delete(slot);
    this.#notify();
    return true;
  }

  /** Drop a slot's attachment. */
  detach(slot: DocSlot) {
    this.#files.delete(slot);
    this.#errors.delete(slot);
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
    this.#files.clear();
    this.#errors.clear();
    this.#notify();
  }
}

const cvStore = new CvStore();
export default cvStore;
