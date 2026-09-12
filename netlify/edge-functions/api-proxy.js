import { UPSTREAM_URL } from "../../config/upstream.js";

/** @returns {string[]} */
function getUpstreamSetCookies(headers) {
  if (typeof headers.getSetCookie === "function") {
    const list = headers.getSetCookie();
    if (list?.length) return list;
  }
  const raw = headers.get("set-cookie");
  return raw ? [raw] : [];
}

/** @returns {import("@netlify/edge-functions").CookieOptions | null} */
function parseSetCookieHeader(raw, isHttps) {
  const segments = raw
    .split(";")
    .map((s) => s.trim())
    .filter(Boolean);
  if (!segments.length) return null;

  const nv = segments[0];
  const eq = nv.indexOf("=");
  if (eq <= 0) return null;

  const options = {
    name: nv.slice(0, eq),
    value: nv.slice(eq + 1),
    path: "/",
    sameSite: "lax",
  };

  for (let i = 1; i < segments.length; i++) {
    const seg = segments[i];
    const sep = seg.indexOf("=");
    const key = (sep === -1 ? seg : seg.slice(0, sep)).trim().toLowerCase();
    const val = sep === -1 ? "" : seg.slice(sep + 1).trim();

    if (key === "httponly") options.httpOnly = true;
    else if (key === "secure") options.secure = true;
    else if (key === "max-age") {
      const n = Number.parseInt(val, 10);
      if (!Number.isNaN(n)) options.maxAge = n;
    } else if (key === "expires") {
      const exp = Date.parse(val);
      if (!Number.isNaN(exp)) options.expires = exp;
    }
    // Drop Domain/Path/Partitioned/SameSite — host-only first-party cookie on Netlify with forced SameSite=Lax.
  }

  // Force SameSite=Lax: cookie is now first-party (host-only on Netlify origin),
  // so Lax is enough and works around older iOS Safari quirks with SameSite=None.
  options.sameSite = "lax";

  if (isHttps) options.secure = true;
  else delete options.secure;

  return options;
}

// Only these inbound request headers are forwarded upstream. Everything else
// the browser (or an intermediary) sends — `x-forwarded-*`, `forwarded`,
// `via`, `origin`/`referer`, CDN debug headers, arbitrary `x-*` — is dropped
// so a caller can't smuggle a header that upstream trust logic might read.
// `cookie` carries the session; `authorization` is here for completeness
// (the app is cookie-auth today). `x-xsrf-token` is included so that if `ins`
// ever turns on double-submit CSRF, axios's auto-sent header still reaches it.
// `content-length` is set by fetch() from the body we pass, so it's
// deliberately not forwarded verbatim.
const FORWARDED_REQUEST_HEADERS = [
  "accept",
  "accept-language",
  "authorization",
  "content-type",
  "cookie",
  "user-agent",
  "x-xsrf-token",
];

export default async (request, context) => {
  const url = new URL(request.url);
  const isHttps = url.protocol === "https:";

  try {
    const targetUrl = UPSTREAM_URL + url.pathname + url.search;

    const headers = new Headers();
    for (const name of FORWARDED_REQUEST_HEADERS) {
      const value = request.headers.get(name);
      if (value) headers.set(name, value);
    }
    headers.set("host", new URL(UPSTREAM_URL).host);

    // Tell `ins` which origin the browser actually loaded this app from. It
    // needs this to build the DocuSign embedded-signing return URL so that,
    // after the signer clicks FINISH, DocuSign redirects the iframe back to
    // THIS site (where the return page relays completion) instead of the API
    // host — which our CSP `frame-src` blocks, leaving a "content is blocked"
    // screen (see `ReviewDocusignPage`).
    //
    // We set these from our own request URL, never from the inbound headers a
    // caller could spoof. `Origin` is deliberately NOT forwarded: `ins`'s
    // resolveFrontendOrigin() checks `Origin` first, but Spring's CORS filter
    // would then reject these server-to-server calls unless this site is in
    // `cors.allowed-origins`. `X-Forwarded-Host` is the next fallback it
    // checks and the CORS filter ignores it. `ins` has no global
    // forward-headers strategy, so only the DocuSign path reads this.
    headers.set("x-forwarded-host", url.host);
    headers.set("x-forwarded-proto", url.protocol.replace(/:$/, ""));

    const init = {
      method: request.method,
      headers,
      redirect: "manual",
    };

    if (!["GET", "HEAD"].includes(request.method)) {
      init.body = await request.arrayBuffer();
    }

    const upstream = await fetch(targetUrl, init);

    // Netlify edge: use context.cookies.set — Headers.append("set-cookie") is unreliable
    // (especially for multiple auth cookies on Safari).
    for (const raw of getUpstreamSetCookies(upstream.headers)) {
      const parsed = parseSetCookieHeader(raw, isHttps);
      if (parsed) context.cookies.set(parsed);
    }

    const resHeaders = new Headers(upstream.headers);
    resHeaders.delete("set-cookie");

    return new Response(upstream.body, {
      status: upstream.status,
      statusText: upstream.statusText,
      headers: resHeaders,
    });
  } catch (err) {
    // Without this, a bad/unreachable UPSTREAM_URL (e.g. VITE_UPSTREAM_URL not
    // scoped for Edge functions, so it falls back to a localhost default) throws
    // out of this function and Netlify reports only the opaque "Uncaught
    // exception during edge function invocation" with no detail. Log the real
    // cause and return a real HTTP response instead of crashing.
    console.error(
      `api-proxy: upstream request failed for ${url.pathname} — ${err?.message || err}`,
    );
    return new Response(JSON.stringify({ error: "Upstream request failed" }), {
      status: 502,
      headers: { "content-type": "application/json" },
    });
  }
};

export const config = { path: "/api/*" };
