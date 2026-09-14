// Vercel Edge Function — the production `/api/*` proxy to INS-SERVICE.
//
// Ported from `netlify/edge-functions/api-proxy.js`; keep the two in sync (or
// delete the Netlify one if this repo only ever deploys to Vercel).
//
// Vercel only honours catch-all `[...path]` function filenames in Next.js
// projects — in this Vite project such a file never matches and every `/api/**`
// call 404s. So this is a single function and `vercel.json` rewrites
// `/api/:path*` onto it, passing the original path as `?__path=`.
//
// Why a proxy at all: it re-emits the upstream `Set-Cookie` as a host-only
// FIRST-PARTY cookie on this origin, so iOS Safari (ITP) doesn't drop the auth
// cookie as a cross-site cookie.
import { UPSTREAM_URL } from "../config/upstream.js";

export const config = { runtime: "edge" };

/** @returns {string[]} */
function getUpstreamSetCookies(headers) {
  if (typeof headers.getSetCookie === "function") {
    const list = headers.getSetCookie();
    if (list?.length) return list;
  }
  const raw = headers.get("set-cookie");
  return raw ? [raw] : [];
}

/**
 * Rewrite one upstream `Set-Cookie` into a host-only first-party cookie for
 * THIS origin. Netlify had a `context.cookies.set(...)` helper that took an
 * options object; Vercel's edge runtime is plain Web-standard `Response`, so
 * we re-serialize the header string ourselves instead.
 *
 * Dropped: `Domain` (makes it host-only), `Partitioned`, and the upstream's
 * own `Path`/`SameSite`/`Secure` — all re-added below. Everything else the
 * upstream sets (`HttpOnly`, `Max-Age`, `Expires`, …) is passed through
 * verbatim, so no date re-encoding can lose precision.
 *
 * @returns {string | null}
 */
function rewriteSetCookie(raw, isHttps) {
  const segments = raw
    .split(";")
    .map((s) => s.trim())
    .filter(Boolean);
  if (!segments.length) return null;

  const nameValue = segments[0];
  if (nameValue.indexOf("=") <= 0) return null;

  const out = [nameValue];
  for (let i = 1; i < segments.length; i++) {
    const seg = segments[i];
    const sep = seg.indexOf("=");
    const key = (sep === -1 ? seg : seg.slice(0, sep)).trim().toLowerCase();
    if (["domain", "path", "samesite", "secure", "partitioned"].includes(key)) continue;
    out.push(seg);
  }

  // Force SameSite=Lax: the cookie is now first-party (host-only on this
  // origin), so Lax is enough and it works around older iOS Safari quirks with
  // SameSite=None.
  out.push("Path=/", "SameSite=Lax");
  if (isHttps) out.push("Secure");

  return out.join("; ");
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

// The edge runtime transparently decompresses the upstream body, so the
// upstream's `Content-Encoding` / `Content-Length` / `Transfer-Encoding` no
// longer describe the bytes we hand back. Re-emitting them makes the browser
// try to gunzip plain JSON (or truncate it) — strip them and let the platform
// set its own.
const STRIPPED_RESPONSE_HEADERS = [
  "set-cookie",
  "content-encoding",
  "content-length",
  "transfer-encoding",
];

export default async function handler(request) {
  const url = new URL(request.url);
  const isHttps = url.protocol === "https:";

  try {
    // `vercel.json` rewrites `/api/:path*` → `/api/proxy?__path=:path*`, so the
    // original path arrives as a query param. Rebuild it and drop the param so
    // upstream sees exactly what the browser requested.
    const rewrittenPath = url.searchParams.get("__path");
    url.searchParams.delete("__path");
    const pathname =
      rewrittenPath != null ? `/api/${rewrittenPath.replace(/^\/+/, "")}` : url.pathname;
    const targetUrl = UPSTREAM_URL + pathname + url.search;

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

    const resHeaders = new Headers(upstream.headers);
    for (const name of STRIPPED_RESPONSE_HEADERS) resHeaders.delete(name);

    // Vercel's edge runtime keeps repeated `Set-Cookie` headers distinct on
    // append (unlike Netlify's, which needed `context.cookies.set`), so the
    // several auth cookies `ins` sets all survive.
    for (const raw of getUpstreamSetCookies(upstream.headers)) {
      const cookie = rewriteSetCookie(raw, isHttps);
      if (cookie) resHeaders.append("set-cookie", cookie);
    }

    return new Response(upstream.body, {
      status: upstream.status,
      statusText: upstream.statusText,
      headers: resHeaders,
    });
  } catch (err) {
    // Without this, a bad/unreachable UPSTREAM_URL (e.g. VITE_UPSTREAM_URL not
    // set on the Vercel project, so it falls back to a localhost default)
    // throws out of this function and the platform reports only an opaque
    // edge-function crash with no detail. Log the real cause and return a real
    // HTTP response instead.
    console.error(
      `api-proxy: upstream request failed for ${url.pathname} — ${err?.message || err}`,
    );
    return new Response(JSON.stringify({ error: "Upstream request failed" }), {
      status: 502,
      headers: { "content-type": "application/json" },
    });
  }
}
