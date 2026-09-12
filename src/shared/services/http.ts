/**
 * The one place this app performs HTTP.
 *
 * Two rules hold for every call and are enforced here rather than at each call
 * site, because each is easy to forget once and hard to notice afterwards:
 *
 * 1. **`credentials: "include"`.** The student session is two HttpOnly cookies.
 *    There is no token in any response body to read or store, so a request that
 *    omits the credentials flag is simply unauthenticated — and reads as a
 *    mysterious 401 rather than as a missing option.
 * 2. **Errors carry the status.** `logApiError` prints only status and message
 *    in production because this app's payloads carry PII; an error that lost
 *    its status leaves nothing useful to print.
 */
import { apiUrl, logApiError } from "@/shared/services/config";

/**
 * An HTTP failure, shaped so `logApiError` and the pages can both read it.
 */
export class ApiError extends Error {
  status: number;
  response: { status: number };

  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    // logApiError reads error.response.status - keep that shape so the one
    // logger works for both this and anything thrown by the local modules.
    this.response = { status };
  }
}

const DEFAULT_MESSAGES: Record<number, string> = {
  400: "That request could not be processed.",
  401: "Your session has expired. Please sign in again.",
  403: "You do not have access to this.",
  404: "Not found.",
  429: "Too many attempts. Please wait a moment and try again.",
  502: "A service this app depends on could not be reached.",
  503: "That service is temporarily unavailable. Please try again shortly.",
};

/**
 * Turns a non-2xx response into an {@link ApiError}, preferring the service's
 * own message. INS-SERVICE answers errors as `ApiError` JSON with a `message`;
 * anything else falls back to a status-appropriate sentence rather than
 * surfacing raw HTML or an empty string to the user.
 *
 */
async function toApiError(response: Response): Promise<ApiError> {
  let message = "";
  try {
    const body = await response.clone().json();
    message = body?.message || body?.error || "";
  } catch {
    /* Not JSON - fall through to the default message. */
  }
  return new ApiError(
    response.status,
    message || DEFAULT_MESSAGES[response.status] || "The request failed.",
  );
}

interface RequestOpts {
  signal?: AbortSignal;
}

/**
 * GET a JSON resource.
 *
 * @param path relative to the student API prefix
 */
export async function getJson(path: string, { signal }: RequestOpts = {}): Promise<any> {
  const response = await fetch(apiUrl(path), {
    method: "GET",
    credentials: "include",
    headers: { Accept: "application/json" },
    signal,
  });
  if (!response.ok) throw await toApiError(response);
  return response.json();
}

/**
 * POST a JSON body and read a JSON response.
 *
 * @param path relative to the student API prefix
 */
export async function postJson(
  path: string,
  body: unknown,
  { signal }: RequestOpts = {},
): Promise<any> {
  const response = await fetch(apiUrl(path), {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(body ?? {}),
    signal,
  });
  if (!response.ok) throw await toApiError(response);
  // 204 and an empty body are legitimate answers to a POST.
  const text = await response.text();
  return text ? JSON.parse(text) : null;
}

/**
 * Fetches a binary document and hands it to the browser as a download.
 *
 * <p>Done with an object URL rather than by navigating to the endpoint: a plain
 * link cannot be sent with credentials the way `fetch` can, and a navigation
 * that comes back 401 or 403 would replace the page the student is on with an
 * error body instead of showing them a message.
 *
 * <p>The object URL is always revoked, including when the click handler throws
 * — a leaked one pins the whole blob in memory for the life of the document.
 *
 * @param path relative to the student API prefix
 * @param filename the name to save as
 */
export async function downloadFile(path: string, filename: string): Promise<void> {
  const response = await fetch(apiUrl(path), {
    method: "GET",
    credentials: "include",
    headers: { Accept: "application/octet-stream" },
  });
  if (!response.ok) throw await toApiError(response);

  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);
  try {
    const link = document.createElement("a");
    link.href = objectUrl;
    link.download = filename;
    link.rel = "noopener";
    document.body.appendChild(link);
    link.click();
    link.remove();
  } finally {
    // Deferred: revoking synchronously can cancel the download the click just
    // started in some browsers.
    setTimeout(() => URL.revokeObjectURL(objectUrl), 0);
  }
}

export { logApiError };
