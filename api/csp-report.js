// CSP violation report sink. Ported from `netlify/edge-functions/csp-report.js`.
//
// Wired from `vercel.json`'s Content-Security-Policy (`report-uri` +
// `report-to`) and the `Reporting-Endpoints` header, both of which point at
// `/_csp-report`; the rewrite in `vercel.json` maps that path onto this
// function. There is no first-party error tracker yet (REACT_FRONTEND_AUDIT.md
// areas 4 + 6), so this just logs each report to the function log — enough to
// see violations in the Vercel dashboard / `vercel logs` instead of losing
// them. When Sentry (or report-uri.com, or similar) is wired in, forward the
// body there and keep the 204.
//
// Accepts both wire formats, both `application/csp-report` (legacy
// `report-uri`, body `{ "csp-report": {...} }`) and `application/reports+json`
// (Reporting API `report-to`, body `[{ "type": "csp-violation", "body": {...} }]`).
export const config = { runtime: "edge" };

export default async function handler(request) {
  if (request.method !== "POST") {
    return new Response(null, { status: 405 });
  }

  try {
    const raw = await request.text();
    // Cap the log line — a report can carry a long script sample / source file.
    console.warn(`[csp-report] ${raw.slice(0, 4000)}`);
  } catch (err) {
    console.error(`[csp-report] could not read report body — ${err?.message || err}`);
  }

  // 204: the browser fires these best-effort and must not retry or surface an
  // error to the user.
  return new Response(null, { status: 204 });
}
