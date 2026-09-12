/**
 * Auth API surface. Talks to INS-SERVICE for real.
 *
 * `syncAccountShadow` is deliberately NOT called from here — call it
 * synchronously at the point `insuredProfileStore.insuredProfile` is set
 * (see `SignInPage.jsx`, `RegistrationPage.jsx`, `useAppBootstrap.ts`),
 * since those call sites have the fullest identity info available (e.g.
 * signup's response alone lacks name/email; the page that submitted the
 * form has it) and local submission creation can run synchronously right
 * after.
 */
import axios from "axios";
import { apiUrl, logApiError } from "@/shared/services/config";
import { getJson } from "@/shared/services/http";
import { clearAccountShadow } from "@/local/authLocal";
import {
  GoogleDataResponse,
  GoogleTokenRequest,
  GoogleTokenResponse,
  InsuredAuthSessionResponse,
  InsuredAuthToken,
  InsuredLoginRequest,
} from "@/shared/dtos";

/**
 * Non-HttpOnly "auth hint" cookie. The access token itself is HttpOnly so JS
 * can't see it — this hint just tells the JS side whether to bother calling
 * `/insured/session` on boot. Setting it does NOT grant auth (the HttpOnly
 * token still does); clearing it does NOT sign the user out (the backend
 * cookie remains until logout).
 */
const AUTH_HINT = "q2b_auth";

export const setAuthHint = (): void => {
  try {
    document.cookie = `${AUTH_HINT}=1; path=/; SameSite=Lax`;
  } catch {
    /* */
  }
};

export const clearAuthHint = (): void => {
  try {
    document.cookie = `${AUTH_HINT}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
  } catch {
    /* */
  }
};

export const hasAuthHint = (): boolean => {
  try {
    return document.cookie.split(";").some((c) => c.trim().startsWith(`${AUTH_HINT}=`));
  } catch {
    return false;
  }
};

/** POST /auth/sign-in — password sign-in. */
export const postSignIn = async (
  username: string,
  password: string,
): Promise<InsuredAuthSessionResponse> => {
  try {
    const response = await axios.post(
      apiUrl("/auth/sign-in"),
      new InsuredLoginRequest({ username: username.trim(), password }),
      { withCredentials: true },
    );
    setAuthHint();
    return new InsuredAuthSessionResponse(response.data);
  } catch (error) {
    logApiError(error);
    throw error;
  }
};

/**
 * POST /auth/sign-in-with-google — exchange a Google ID token for a session.
 * @param idToken the credential from Google Identity Services
 */
export const postSignInWithGoogle = async (
  idToken: string,
): Promise<InsuredAuthSessionResponse> => {
  try {
    const response = await axios.post(
      apiUrl("/auth/sign-in-with-google"),
      new GoogleTokenRequest({ googletoken: idToken }),
      { withCredentials: true },
    );
    setAuthHint();
    return new InsuredAuthSessionResponse(response.data);
  } catch (error) {
    logApiError(error);
    throw error;
  }
};

/**
 * POST /auth/sign-in-with-googledata — the name and email on a Google
 * identity, for prefilling Register. Mints no session and touches no
 * account.
 * @param idToken the credential from Google Identity Services
 */
export const postSignInWithGoogleData = async (idToken: string): Promise<GoogleDataResponse> => {
  try {
    const response = await axios.post(
      apiUrl("/auth/sign-in-with-googledata"),
      new GoogleTokenRequest({ googletoken: idToken }),
      { withCredentials: true },
    );
    return new GoogleDataResponse(response.data);
  } catch (error) {
    logApiError(error);
    throw error;
  }
};

/** Alias matching the name the sign-in page reads for. */
export const fetchGoogleProfile = postSignInWithGoogleData;

/** Alias matching the name the sign-in page reads for. */
export const signInWithGoogle = postSignInWithGoogle;

/**
 * POST /auth/signup — register a new insured. Does not open a submission
 * (submission creation stays local — see `quoteApi`).
 */
export const postInsuredSignup = async (payload: unknown): Promise<InsuredAuthToken> => {
  try {
    const response = await axios.post(apiUrl("/auth/signup"), payload, { withCredentials: true });
    setAuthHint();
    return new InsuredAuthToken(response.data);
  } catch (error) {
    logApiError(error);
    throw error;
  }
};

export const postLogout = async (): Promise<boolean> => {
  try {
    await axios.post(apiUrl("/auth/refresh/logout"), null, { withCredentials: true });
    clearAuthHint();
    clearAccountShadow();
    return true;
  } catch (error) {
    clearAuthHint();
    clearAccountShadow();
    logApiError(error);
    return false;
  }
};

/** GET /insured/session — restore session from cookies. */
export const fetchInsuredSession = async ({
  signal,
}: { signal?: AbortSignal } = {}): Promise<InsuredAuthSessionResponse | null> => {
  try {
    const response = await axios.get(apiUrl("/insured/session"), { withCredentials: true, signal });
    return response.data ? new InsuredAuthSessionResponse(response.data) : null;
  } catch (error: any) {
    // Aborted by the caller (unmount / dependency change) — propagate so the
    // caller's AbortError/CanceledError handling can distinguish it from a
    // real "not signed in" result rather than silently seeing `null`.
    if (axios.isCancel?.(error) || error?.name === "CanceledError" || error?.name === "AbortError")
      throw error;
    // 401/403/404 here just means "not signed in" — expected on first load.
    const status = error?.response?.status;
    if (status === 401 || status === 403 || status === 404) return null;
    logApiError(error);
    return null;
  }
};

/**
 * The Google OAuth client id, which the Google Identity Services script needs
 * before it can render a button. Returns an empty `clientId` rather than
 * throwing when the service has Google sign-in unconfigured — a caller that
 * only checks `clientId` then degrades to "Google sign-in unavailable"
 * instead of showing an error on a page where nothing is wrong yet.
 */
export const fetchGoogleClientId = async (): Promise<GoogleTokenResponse> => {
  try {
    return new GoogleTokenResponse(await getJson("/auth/google-client-id"));
  } catch (error) {
    logApiError(error);
    return new GoogleTokenResponse({ clientId: "" });
  }
};
