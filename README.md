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

## Wizard

`/` → `/quote` → `/practice` → `/register` → `/previous-insurance` → `/underwriting` →
`/reviewDocusign` → `/payment` → `/binder-invoice`.
