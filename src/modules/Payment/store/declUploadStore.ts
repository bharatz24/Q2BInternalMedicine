/**
 * Declaration upload state — used on the license-scope page when the
 * user uploads a prior-policy declaration PDF.
 */
class DeclUploadStore {
  #listeners = new Set<() => void>();

  #declUploading = false;
  #declUploadDone = false;
  #declUploadError: string | null = null;
  #declFileName = "";

  get declUploading(): boolean {
    return this.#declUploading;
  }
  set declUploading(v: boolean) {
    this.#declUploading = !!v;
    this.#notify();
  }

  get declUploadDone(): boolean {
    return this.#declUploadDone;
  }
  set declUploadDone(v: boolean) {
    this.#declUploadDone = !!v;
    this.#notify();
  }

  get declUploadError(): string | null {
    return this.#declUploadError;
  }
  set declUploadError(v: string | null) {
    this.#declUploadError = v;
    this.#notify();
  }

  get declFileName(): string {
    return this.#declFileName;
  }
  set declFileName(v: string) {
    this.#declFileName = v;
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
    this.#declUploading = false;
    this.#declUploadDone = false;
    this.#declUploadError = null;
    this.#declFileName = "";
    this.#notify();
  }
}

const declUploadStore = new DeclUploadStore();
export default declUploadStore;
