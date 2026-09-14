# Q2BInternalMedicine

Internal Medicine malpractice quote-to-bind portal for DPL RRG (MD, DO, PA, NP, CRNA,
CNM and other providers), built from
`Q2BNursing`. It talks to the real `ins` INS-SERVICE for pricing, submissions, the
question tree, DocuSign and payment. See `CLAUDE.md` for how it differs from Nursing and
`../internal_medicine_q2b.plan.md` for the full plan.

## Run

```bash
npm install
npm run dev        # http://localhost:4500
```

`vite.config.js` proxies `/api/*` to `VITE_UPSTREAM_URL` (default
`http://localhost:8089`). The wizard only gets past the landing estimate once `ins` has
SP_14 rates and the SP_14 question tree (plan B1–B4).

## Scripts

| Script                 | What                                        |
| ---------------------- | ------------------------------------------- |
| `npm run dev`          | Dev server on port 4500                     |
| `npm run build`        | Production build into `dist/`               |
| `npm run preview`      | Serve `dist/` on port 4500                  |
| `npm test`             | Vitest                                      |
| `npm run typecheck`    | `tsc --noEmit`                              |
| `npm run lint`         | ESLint, zero warnings                       |
| `npm run format:check` | Prettier check                              |
| `npm run lint:arch`    | Circular-import check + knip dead-code scan |

## Deploy (Vercel)

`vercel.json` is the deploy config. Vercel serves `dist/` as static files and runs two
**edge functions** from `api/`:

| Route          | File                | What                                                                                                                        |
| -------------- | ------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `/api/*`       | `api/proxy.js`      | Proxies to `ins`, re-emitting its `Set-Cookie` as a host-only first-party cookie so iOS Safari (ITP) keeps the auth session |
| `/_csp-report` | `api/csp-report.js` | CSP violation sink — logs to the function log                                                                               |

Everything else falls through the SPA rewrite to `index.html`, so a reload on
`/practice` or `/underwriting` still works. Security headers (CSP, HSTS,
Permissions-Policy) and the immutable `/assets/*` cache live in `vercel.json`'s
`headers`.

Project settings that matter:

- **Node.js Version: 22.x.** `package.json` `engines` pins `>=22.12 <23` (vite 7 /
  vitest 3); 24.x fails the build.
- **Cold Start Prevention: off.** Both functions are edge, not serverless — nothing to
  keep warm.
- **`VITE_UPSTREAM_URL`** must be set per environment (Production / Preview) to the
  `ins` base URL. Edge functions can't read `.env.local`, so without it
  `config/upstream.js` falls back to `http://localhost:8089` and every `/api/*` call
  returns 502.

`netlify.toml` + `netlify/edge-functions/` are kept for the Netlify path (and carry the
long-form rationale for each CSP directive). They are excluded from the Vercel upload by
`.vercelignore`. **The CSP and the proxy logic are now duplicated — change one, change
the other.**

## Wizard

`/` → `/quote` → `/practice` → `/register` → `/previous-insurance` → `/underwriting` →
`/reviewDocusign` → `/payment` → `/binder-invoice`.
