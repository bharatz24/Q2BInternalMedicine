/**
 * Same-origin redirect-target validation.
 *
 * `returnTo` is built from `window.location` by the 401 interceptor
 * (`httpClient.redirectToSignIn`) and read back by `SignInPage` to send the
 * user back to where a session-expiry bounce interrupted them. Any value that
 * reaches `navigate()` / `<Link to>` and is even partly attacker-influenceable
 * is an open-redirect sink - and `react-router` 6.x has a known open-redirect
 * via backslashes in the navigation target (GHSA-wrjc-x8rr-h8h6). Routing
 * `returnTo` through this guard neutralises that path until the v7 upgrade
 * lands (REACT_FRONTEND_AUDIT.md area 4).
 *
 * `safeInternalPath` returns a value ONLY for a plain, same-origin, absolute
 * path ("/dashboard", "/quote?step=2#top"). Everything else returns null and
 * the caller must fall back to its own default route:
 *   - absolute URLs            "https://evil.com/x"
 *   - protocol-relative URLs   "//evil.com"
 *   - backslash tricks         "/\evil.com", "\\evil.com"
 *   - control chars / CRLF     header/response-splitting attempts
 *   - non-string input, over-long input
 */
const MAX_LEN = 512;

// Any C0 control char (U+0000-U+001F) or DEL (U+007F) - CR/LF response
// splitting, embedded-tab tricks. Built from a string so no literal control
// byte lives in this source file.
// Matching control chars is the entire purpose here: CR/LF/tab in a redirect
// target is a response-splitting attempt and must be rejected.
// eslint-disable-next-line no-control-regex
const CONTROL_CHARS = new RegExp("[\\u0000-\\u001F\\u007F]");

export function safeInternalPath(raw: unknown): string | null {
  if (typeof raw !== "string") return null;

  let value = raw.trim();
  if (!value || value.length > MAX_LEN) return null;

  // Callers store the value url-encoded (encodeURIComponent). Decode once; a
  // malformed escape sequence is rejected outright.
  try {
    value = decodeURIComponent(value);
  } catch {
    return null;
  }

  // Browsers (and some routers) treat "\" as "/", which is exactly how
  // "/\evil.com" turns into a protocol-relative URL. Reject any backslash.
  if (value.includes("\\")) return null;

  // Must be a rooted path, never a full or scheme-relative URL.
  if (!value.startsWith("/") || value.startsWith("//")) return null;

  if (CONTROL_CHARS.test(value)) return null;

  // Final gate: resolve against a throwaway origin and confirm nothing in the
  // string introduced an authority component. Re-serialise from the parsed
  // pieces so the caller navigates a value the router reads identically.
  try {
    const u = new URL(value, "http://localhost");
    if (u.origin !== "http://localhost") return null;
    return `${u.pathname}${u.search}${u.hash}`;
  } catch {
    return null;
  }
}
