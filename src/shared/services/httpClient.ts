import axios, { type AxiosError, type AxiosRequestConfig, type AxiosResponse } from "axios";
import { apiUrl } from "./config";
import { clearAuthHint } from "@/modules/Auth/api/authApi";

/** A minimal SPA navigate function — structurally satisfied by react-router's `NavigateFunction`. */
type AuthNavigator = (to: string, opts?: { replace?: boolean }) => void;

/** axios request config with the one-shot retry marker the interceptor sets. */
type RetriableConfig = AxiosRequestConfig & { _retried?: boolean };

const REFRESH_URL = apiUrl("/auth/refresh/token");

// Endpoints that must NOT trigger the refresh-on-401 flow:
//  - sign-in / google sign-in: a 401 here is bad credentials, not stale token
//  - refresh/token itself: avoids an infinite refresh loop
//  - logout: best-effort, no point refreshing on the way out
// NOTE: /insured/session is intentionally NOT bypassed. A 401 there means
// the access cookie expired — let the interceptor refresh the token and
// retry the session call transparently.
const AUTH_BYPASS = [
  "/auth/sign-in",
  "/auth/sign-in-with-google",
  "/auth/sign-in-with-googledata",
  "/auth/refresh/token",
  "/auth/refresh/logout",
].map(apiUrl);

// Extract the request path so bypass matching is exact, not substring-based.
// (A plain `url.includes("/sign-in")` would also match `/foo/sign-in-history`.)
const getPathname = (url?: string): string => {
  if (!url) return "";
  try {
    const base = typeof window !== "undefined" ? window.location.origin : "http://x";
    return new URL(url, base).pathname;
  } catch {
    const q = url.indexOf("?");
    return q === -1 ? url : url.slice(0, q);
  }
};

const isAuthBypass = (url?: string): boolean => {
  const path = getPathname(url);
  if (!path) return false;
  return AUTH_BYPASS.some((p) => path === p || path.endsWith(p));
};

let refreshPromise: Promise<AxiosResponse> | null = null;

// Hard cap on the refresh call so a hung request doesn't block every queued
// retry indefinitely.
const REFRESH_TIMEOUT_MS = 15000;

const refreshAccessToken = () => {
  if (refreshPromise) return refreshPromise;
  refreshPromise = axios
    .post(REFRESH_URL, null, {
      withCredentials: true,
      timeout: REFRESH_TIMEOUT_MS,
    })
    .finally(() => {
      refreshPromise = null;
    });
  return refreshPromise;
};

// Keys we must preserve across an auth wipe (theme is a UX preference, not
// auth state). `q2b_theme` is the only thing this app keeps in localStorage
// now — the local "database" (account/submission shadows, counters) lives in
// sessionStorage (see src/local/db.ts) and is wiped wholesale by the
// sessionStorage.clear() below. Anything else that appears in localStorage is
// treated as session-scoped and cleared.
const PRESERVED_LOCAL_KEYS = new Set(["q2b_theme"]);

const clearAuthStorage = () => {
  try {
    sessionStorage.clear();
  } catch {
    /* storage may be unavailable */
  }
  try {
    const keys = [];
    for (let i = 0; i < localStorage.length; i += 1) {
      const k = localStorage.key(i);
      if (k && !PRESERVED_LOCAL_KEYS.has(k)) keys.push(k);
    }
    keys.forEach((k) => localStorage.removeItem(k));
  } catch {
    /* storage may be unavailable */
  }
};

// SPA navigator, wired up from a component inside <BrowserRouter> via
// `setAuthNavigator`. When present, the 401→sign-in redirect goes through
// React Router instead of `window.location.replace`. That matters: a hard
// `location.replace` tears down the current document immediately and cancels
// every other in-flight request (they show as "(canceled)" in DevTools). An
// SPA navigate keeps the document alive so sibling requests finish.
let authNavigator: AuthNavigator | null = null;
// A redirect target that arrived before the navigator was registered (a 401
// during the very first render, before AppShell's effect wires up the
// navigator). We stash it here instead of hard-navigating so we never tear
// down the document — the pending target is flushed the instant a navigator
// registers.
let pendingRedirect: string | null = null;

export const setAuthNavigator = (nav: AuthNavigator | null): void => {
  authNavigator = nav;
  if (nav && pendingRedirect) {
    const target = pendingRedirect;
    pendingRedirect = null;
    nav(target, { replace: true });
  }
};

const redirectToSignIn = () => {
  clearAuthStorage();
  clearAuthHint();
  if (typeof window === "undefined") return;
  if (window.location.pathname === "/signin") return;
  // Preserve where the user was so SignInPage can resume them after re-auth.
  // Built only from the live `window.location` (same-origin by construction)
  // and url-encoded here; SignInPage still re-validates it through
  // `safeInternalPath` before navigating (open-redirect guard).
  const current = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  const returnTo = encodeURIComponent(current);
  const target = `/signin?returnTo=${returnTo}`;
  if (authNavigator) {
    // SPA navigation — no document teardown, so in-flight sibling requests
    // aren't canceled.
    authNavigator(target, { replace: true });
    return;
  }
  // Navigator not registered yet (interceptor fired before the app mounted).
  // Defer rather than `window.location.replace`, which would tear down the
  // document and cancel every in-flight sibling request ("(canceled)"). The
  // navigator registers on mount — moments later — and flushes this via
  // setAuthNavigator. The failing request still rejects to its caller either
  // way, so no auth-failure signal is lost.
  pendingRedirect = target;
};

// Pulls a user-displayable message out of an axios error response. Looks at
// the common shapes returned by the weborder API (`apierror.message`,
// top-level `message`, top-level `error`) before falling back to the
// axios-supplied message.
const extractApiErrorMessage = (error: AxiosError): string | null => {
  const data = error?.response?.data as
    { apierror?: { message?: string }; message?: string; error?: unknown } | undefined;
  return (
    data?.apierror?.message ||
    data?.message ||
    (typeof data?.error === "string" ? data.error : null) ||
    error?.message ||
    null
  );
};

let installed = false;

// Global request timeout for every axios call that doesn't set its own.
// 30s is generous for production payment + DocuSign flows but still catches
// hung connections — without this, a stalled backend leaves users staring
// at a loading spinner forever.
const DEFAULT_TIMEOUT_MS = 90000;

export function installAuthInterceptor(): void {
  if (installed) return;
  installed = true;

  axios.defaults.timeout = DEFAULT_TIMEOUT_MS;

  axios.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
      const original = error?.config as RetriableConfig | undefined;
      const status = error?.response?.status;

      // For 4xx responses (other than the 401 refresh flow handled below),
      // enrich the error so callers reading `e.message` see the API's own
      // message instead of the generic axios "Request failed with status…".
      if (status && status >= 400 && status < 500 && status !== 401) {
        const apiMessage = extractApiErrorMessage(error);
        if (apiMessage) error.message = apiMessage;
      }

      if (status !== 401 || !original || original._retried || isAuthBypass(original.url)) {
        return Promise.reject(error);
      }

      original._retried = true;
      try {
        await refreshAccessToken();
      } catch (refreshErr) {
        redirectToSignIn();
        return Promise.reject(refreshErr);
      }

      // Cookie-based auth: the new access token is set as an HttpOnly cookie
      // by the refresh endpoint, so we just retry the original request as-is.
      return axios(original);
    },
  );
}
