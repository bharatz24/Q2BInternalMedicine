# Q2BNursing — architecture notes

A single landing spot for the cross-cutting decisions and the
deliberately-retained-but-inactive code. Replaces the `docs/adr/0001–0004`
files that were deleted in `bf9ec0a`; the audit
(`../REACT_FRONTEND_AUDIT.md`) tracks the remaining work.

---

## Key decisions (former ADRs 0002–0004)

### TypeScript migration — complete + `strict` (was ADR 0002)

`tsconfig.json` has `strict: true`, `allowJs: true`, `checkJs: false`. The
whole `src/` tree is `.ts` / `.tsx` **except**:

- `src/modules/Quote/data/*.js` — the placeholder rate tables (see below)
- `src/modules/Quote/services/nursingRatingService.js` — the local rating
  engine (see below)

Both are left `.js` on purpose; `checkJs` is `false` so they compile
unchecked. Don't flip `checkJs` without excluding them first.

`npm run typecheck` (`tsc --noEmit`) is a merge-gate step and must stay
green. Intra-repo imports are extensionless (bar the two `.js` islands,
which keep their extension). Loose domain objects (order / policy /
question / submission rows) are typed `any` by design, matching
`src/local/db.ts`'s predicate contract.

### Identity-store consolidation (was ADR 0003)

There is **one** identity store: `src/modules/Quote/store/nurseProfileStore.ts`.
It is filled by the registration form and re-filled by `hydrateFromOrder`
after a reload, so it is also the single source for the review / payment
contact summary.

- `personalStore` was deleted.
- `loginStore` + `signupStore` were merged into
  `src/modules/Auth/store/authFormStore.ts` (form-field state only — the
  real identity lives in `nurseProfileStore` / `insuredProfileStore`).

### Inline-style / theme-coupling migration (was ADR 0004)

The `[style*="…"] !important` attribute-substring override anti-pattern was
removed. Theme-varying colour and font are CSS custom properties in
`src/responsive.css` (`:root` = classic; `[data-theme="…"]` for the other
themes); components read them inline as `var(--brand)` /
`var(--font-body)` / `var(--font-heading)`. Shared classes live in
`src/styles/ui.css` (`.ui-*`, `.wizard-*`).

**Never add a `[style*="…"]` selector.** A theme variant is
`[data-theme="x"] .my-class { … }`. Per-instance `fontSize` / `margin` /
`padding` / layout are still inline `style={{}}` (so the CSP keeps
`style-src 'unsafe-inline'` — audit backlog item 30).

---

## App bootstrap (audit finding 1.1)

`src/shared/store/useAppBootstrap.ts` used to be one ~266-line hook holding
nine cross-cutting effects. It is now a thin composer over nine named hooks
in `src/shared/store/bootstrap/`, one concern each:

| Hook                               | Concern                                                                                                              |
| ---------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `useAuthNavigatorSync`             | SPA navigator ↔ httpClient 401 redirect                                                                              |
| `useSpecialityResolve`             | on-demand `GET /auth/speciality/{code}` for the selected designation                                                 |
| `useSessionRestore`                | session restore on first boot (runs once; reads `navigate`/`pathname` through refs, so no `exhaustive-deps` disable) |
| `useLocalQuoteRecompute`           | keep the local quote in sync with practice inputs                                                                    |
| `useAnswerResetOnQuoteLanding`     | wipe transient answers when landing on `/quote`                                                                      |
| `useSubmissionQuestionsFetch`      | submission-scoped question-tree fetch                                                                                |
| `useAnswerResetOnSubmissionChange` | reset answers when the submission id changes                                                                         |
| `usePathStepSync`                  | URL → `submissionStore.step`                                                                                         |
| `useOrderRehydrate`                | refresh-survival order rehydrate                                                                                     |

---

## Server state — react-query (audit area 2)

Server reads (`GET`s, plus the `POST /auth/quotedata` price read) are owned
by **`@tanstack/react-query` v5**, not by per-module `loading` / `error`
store fields and hand-rolled `cacheKey` / `inflightBySid` maps.

- **Client + provider.** `src/shared/query/queryClient.ts` exports the single
  `QueryClient` (module singleton, so non-component code — the bootstrap
  hooks, the resume-order handler — can reach the same cache via
  `queryClient.query`). `src/shared/query/QueryProvider.tsx` wraps the
  app above the router. **No `@tanstack/react-query-devtools`** — its
  container rendered in normal flow at `100vh` and left a viewport-tall
  blank strip under every page. `queryClient.ts` exposes `window.__qc` in
  dev for console cache inspection instead.
- **Defaults** (tuned for a linear funnel, not a dashboard): `staleTime 30s`,
  `gcTime 5m`, `refetchOnWindowFocus: false` (a user tabbing to their bank
  and back must not re-fire `/insured/order` mid-payment),
  `refetchOnReconnect: true`, up to 2 retries for 5xx/network with
  exponential backoff + jitter, **never** retry a 4xx, mutations not retried.
- **Keys.** `src/shared/query/keys.ts` — one factory, `[domain, resource,
...params]`. `queryKeys.order.detail(sid)` is shared by OrderDetails,
  CompleteOrder and the payment flow's `refreshPaymentOrder`, so they dedupe.
- **`AsyncBoundary`** (`src/shared/components/AsyncBoundary.tsx`) renders the
  four states of a read — pending / error (with retry) / empty / loaded —
  from a query result, so pages stop each inventing their own empty state.

### Migrated

Every server **read** now goes through react-query. The pattern for the ones
whose store also holds non-server state (`ilfDlfStore`, `questionsStore`,
`specialityStore`, `paymentOrderStore`): react-query owns the fetch / dedup /
retry / cache; the store keeps only what react-query does not manage — the
current value as a **synchronous projection** for non-hook readers
(`useWizardGuards`, `submission.ts`, `derivedValues`) plus any pure UI state —
and the fetch wrapper pushes each result onto it.

| Area                                                             | What changed                                                                                                                                                                                                                                                                                    |
| ---------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Profile (`ProfilePage`)                                          | 3 `useEffect`+`useState` fetches → 3 `useQuery`. `profileStore` **deleted**.                                                                                                                                                                                                                    |
| Dashboard (`DashboardPage`)                                      | submissions list → `useQuery` + `<AsyncBoundary>`. `dashboardStore` trimmed to `policyDetailRow`.                                                                                                                                                                                               |
| Order details (`OrderDetailsPage`, `CompleteOrderPage`)          | `/insured/order` → `useQuery` on the shared `order.detail` key.                                                                                                                                                                                                                                 |
| `refreshPaymentOrder`                                            | delegates to `queryClient.query` on that key — `inflightBySid` **removed**; retry/backoff + cross-page dedup. `paymentOrderStore` = reactive projection.                                                                                                                                        |
| Stripe key (`PaymentPage`)                                       | `useQuery` (`payment.publishableKey`, `staleTime: Infinity`) + a per-key `loadStripe` memo. `stripeStore` **deleted**.                                                                                                                                                                          |
| Speciality master (`specialityApi.fetchSpecialityByCode`)        | `queryClient.query` (`speciality.byCode`, 1 h). Per-tab `byCode` Promise map **removed**; `specialityStore` kept as the sync projection.                                                                                                                                                        |
| Submission question tree (`useSubmissionQuestionsFetch`)         | **one** `useQuery` (`questions.submission`, `staleTime: Infinity`) for the whole app — the `PaymentPage` mount-effect copy and `ensureUnderwritingQuestions` are **deleted**; `UnderwritingPage` reads the store the bootstrap hook seeds. Reset / resume call `dropSubmissionScopedQueries()`. |
| Master question tree (`questionsApi.fetchQuestionsBySpeciality`) | `queryClient.query` (`questions.bySpeciality`, 1 h). `questionsCacheBySpec` + `inflightBySpec` maps **removed**.                                                                                                                                                                                |
| Live pricing (`useIlfDlfFetcher` / `useCoverageLimitsFetcher`)   | `queryClient.query` (`rating.quoteData` / `rating.coverageLimits`, 5 min, `retry: false` — quote-data errors are deterministic). `ilfDlfStore`'s `#byKey` + `cacheKey()` **removed**; `setCurrent()` pushes the price, `#selectedCoverageLimitId` / `#retroDate` (UI selection) stay.           |
| Sign-out                                                         | `queryClient.clear()`.                                                                                                                                                                                                                                                                          |

`questionsStore` and `ilfDlfStore` still exist and still carry their
non-server state — answer maps + Hide/Show visibility sets; the limit/retro
selection. Only the fetch/cache/loading/error machinery moved out.

### Deliberately still hand-rolled

- **`quoteApi.postInsuredSubmission`** keeps its `inflightSubmissionByKey`
  Map — it dedupes a **mutation** (submission create), a tested race fix
  (`quoteApi.dedupe.test.js`), not a server-state read. react-query does not
  dedupe mutations.

### Not exercised end-to-end

The pricing + question-tree paths feed `useWizardGuards`, and the wizard
**cannot be walked** while `ins` is unseeded (see the repo `CLAUDE.md`). The
migration preserves the existing store projections and reset choreography
exactly; `tsc` / the 92 unit tests / `madge` / `vite build` are green, but
a manual wizard pass against a seeded `ins` is still the real proof.

---

## Performance — code splitting, fonts, caching (audit area 3)

**Code splitting.** Before, `vite build` emitted **one** ~573 KB / 170 KB-gzip
JS file — every route, the Stripe bindings and all four legal modals loaded on
the marketing landing. Now:

- **Every routed page is `React.lazy`** in `routes/AppRoutes.tsx`, behind one
  `<Suspense fallback={<RouteFallback />}>`. `RouteFallback` is a small
  centered spinner (`src/routes/RouteFallback.tsx`).
- **`FlowLayout` lazy-loads its two shells** — `LandingView` (route `/`) and
  `WizardChrome` (every other funnel route) — so a landing visitor never
  downloads the progress bar / snapshot rail / back-nav machinery.
- **`layout/Modals.tsx` lazy-loads all four legal modals** (Privacy / Terms /
  About / FAQ); the `showX &&` guard already meant nothing rendered until first
  open, now nothing _downloads_ either.
- **`build.rollupOptions.output.manualChunks`** (`vite.config.js`) peels the
  rarely-changing vendor code into cacheable chunks: `vendor-react`
  (react/react-dom/react-router[-dom]), `vendor-query` (`@tanstack/react-query`),
  `vendor-stripe` (`@stripe/*`). These survive app deploys in the browser cache.

Result: ~25 chunks; the `/` critical path is `vendor-react` + `index` (app
core) + `vendor-query` + `LandingView` + `MedMalGuardLanding` + the desktop
hub previews. Each subsequent route adds 1–5 KB gzip. `vendor-stripe` /
`PaymentPage` / `DashboardPage` / the modals are off the landing path.
(Not yet lean enough for the audit's aspirational < 60 KB-gzip initial target —
the remaining weight is `vendor-react` and the shared `index` core; the
desktop-only hub marketing components are the next lazy candidate.)

**Fonts.** All Google Fonts (`DM Sans`, `Fraunces`, `Inter`, `JetBrains Mono`,
`Roboto`) now load from **one `<link>` in `index.html <head>`** with
`preconnect` to `fonts.googleapis.com` + `fonts.gstatic.com`. Previously two
`<link>`s were injected from inside `<Shell>` (React 18 does not hoist them →
late discovery, FOUT/CLS) and `Roboto` came via a render-blocking `@import` in
`responsive.css`. Kept `display=swap` (not `optional`) — a text-heavy funnel
should not risk invisible headings on a slow first load; the preconnects
collapse most of the swap window.

**Asset caching.** `netlify.toml` adds `Cache-Control: public,
max-age=31536000, immutable` for `/assets/*` (safe — Vite content-hashes every
filename). `index.html` stays on Netlify's short-lived default so deploys are
picked up immediately.

**Images.** `us-services-map` converted PNG → WebP (50 KB → 23 KB);
`demotech-fsr-a` kept as PNG (already 7 KB, WebP was larger). All `<img>` tags
that were missing them got intrinsic `width`/`height` (no layout shift) +
`loading="lazy"` + `decoding="async"`.

**Memoisation.** `React.memo` on the leaf presentational components that render
inside keystroke/price-tick re-renders — the whole `Icon` library, `Spacer`,
`SectionTitle`, `InfoBox`, `Alert`, `Loader`. `useStore`'s
`useSyncExternalStore` selector already gives per-field re-render bail-out, so
this is the remaining layer. `useQuoteSnapshot`'s `computeDerivedValues` is
memoised (audit area 2).

---

## Security hardening (audit area 4)

- **No production source maps.** `vite.config.js` `build.sourcemap: false`.
  Prod builds were shipping `dist/assets/*.js.map` (2.2 MB, referenced by
  `//# sourceMappingURL`), which reconstruct the full commented source. There
  is no error tracker to consume them yet — when Sentry lands (action-plan
  item #1), flip to `'hidden'` and add a build step that uploads the maps to
  Sentry then strips them from `dist/` before publish.
- **Response headers** (`netlify.toml`): added
  `Strict-Transport-Security` (`max-age=63072000; includeSubDomains; preload`)
  and a deny-by-default `Permissions-Policy` (only `fullscreen=(self)` and
  `payment=(self "https://js.stripe.com")` enabled).
- **CSP violation reporting.** CSP now carries `report-uri /_csp-report` +
  `report-to csp-endpoint` (paired with a `Reporting-Endpoints` header). The
  reports POST to a same-origin edge function
  (`netlify/edge-functions/csp-report.js`) that logs each one to the Netlify
  function log — a lightweight sink until a real collector (Sentry etc.) is
  wired in.
- **`style-src 'unsafe-inline'`** — the one inline `<style>` block in
  `index.html` was removed (its `@keyframes` moved to `responsive.css`).
  `'unsafe-inline'` still stands because ~745 React inline `style={{}}`
  attributes across ~47 components set per-instance sizing/spacing, and
  nonces/hashes do not apply to style _attributes_. Migrating those to
  utility classes is an open backlog item — large, and not verifiable
  without an E2E-runnable app.
- **`returnTo` open-redirect guard.** The 401 interceptor
  (`httpClient.redirectToSignIn`) builds `?returnTo=<encoded path>` from the
  live `window.location`; `SignInPage` now reads it back and resumes the user
  there after re-auth — but only through `safeInternalPath`
  (`src/shared/utils/safeRedirect.ts`), which accepts **only** a plain
  same-origin absolute path and rejects absolute/protocol-relative URLs,
  backslash tricks, and control characters. Covered by `safeRedirect.test.js`.
- **Local store moved to `sessionStorage`.** `src/local/db.ts` (the account /
  submission shadows, counters) now uses `sessionStorage`, not
  `localStorage` — regulated PII (name, email, phone; DOB/address on the
  now-dead local submission-create path) no longer persists to disk and is
  gone when the tab closes. Theme preference stays in `localStorage`
  (`src/theme.ts`) — a UX setting, not PII.
- **Global error handlers PII-safe.** `main.tsx`'s `unhandledrejection` /
  `error` listeners route through `logApiError`, which in production logs
  status + message only and never the raw error object (an axios rejection
  carries the full request payload — name, DOB, SSN, card billing — in
  `.config.data`).
- **Edge proxy header allowlist.** `netlify/edge-functions/api-proxy.js`
  forwards only an explicit set of inbound request headers upstream
  (`accept`, `accept-language`, `authorization`, `content-type`, `cookie`,
  `user-agent`) instead of passing everything through — no `x-forwarded-*` /
  `forwarded` / `via` / arbitrary `x-*` smuggling surface.
- **Dependency advisories cleared** (`npm audit` → 0). `react-router-dom`
  6→**7.18.3** (GHSA-wrjc-x8rr-h8h6 open-redirect + GHSA-337j-9hxr-rhxg);
  `vite` 5→**7.3.6** + `@vitejs/plugin-react` 4→**5.2.0** (esbuild
  GHSA-67mh-4wv8-2f99); `vitest` 2→**3.2.7** (UI RCE). `vite` 7 / `vitest` 3
  need Node `^20.19 || >=22.12`, so the build is now pinned to **Node 22**
  (`.nvmrc`, `package.json` `engines`, `netlify.toml` `[build.environment]
NODE_VERSION`). App is `<BrowserRouter>` + `<Routes>` declarative mode — no
  data-router APIs — so the RR7 bump was import-compatible; gate (`tsc`,
  `vitest` 100, `madge`, `vite build`) green after it.

---

## Accessibility (audit area 5)

All seven §5 findings addressed. Gate (`tsc`, `vitest` 100, `madge`,
`vite build`) green.

- **Form labels are associated app-wide.** `Field` (`src/shared/components/
Field.tsx`) mints a `useId()` control id, renders `<label htmlFor>`, and
  publishes `{ controlId, describedBy, invalid, required }` through
  `FieldControlContext`. `TextInput` / `PasswordInput` / the new `TextArea`
  call `useFieldControlProps()` and spread `id` + `aria-describedby`
  (hint+error) + `aria-invalid` + `aria-required`; hint/error nodes carry the
  referenced ids and the error node is `role="alert"`. Controls used **outside**
  a `Field` take an explicit `id` / `aria-label` prop instead
  (`QuestionRenderer`'s free-text input passes `aria-label={questionText}`).
  The landing calculator has its own label+control pair — `CalcField` reuses
  the same context via `FieldControlProvider` + `useControlIds`, and
  `CalcInput` / `CalcDateInput` consume it. The desktop hub forms
  (`HubMarketing`, `HubCOIPreview`) wire `htmlFor`/`id` directly.
- **Focus visibility restored.** `inputBase` (and `CalcInput` /
  `HubMarketing`'s input style) no longer set `outline: none`; a global
  `:focus-visible { outline: 2px solid var(--brand); outline-offset: 2px }`
  rule lives in `src/styles/ui.css` with `:focus:not(:focus-visible)` kept
  clean for mouse users. "Disabled" buttons now carry the real `disabled`
  attribute (was `dis()` = opacity + `pointerEvents: none` only, which left
  them keyboard-focusable) — ~14 call sites plus `RadioCard` / `Toggle`.
- **Modals are accessible.** `src/shared/a11y/useDialogA11y.ts` gives every
  dialog `role="dialog"` + `aria-modal`, an initial-focus move, a Tab focus
  trap, Escape-to-close, `document.body` scroll-lock, and focus restoration
  to the trigger on close. `ModalShell` and the bespoke `FAQModal` both use
  it; `aria-labelledby` points at the title, and the `×` button has
  `aria-label="Close"`. The landing mobile menu got `role="dialog"` +
  `aria-label`; its backdrop is a real `<button aria-label="Close menu">`.
- **No pseudo-interactive elements.** `src/shared/components/LegalLink.tsx`
  is a link-styled `<button type="button">`; it replaced every
  `<span onClick>` Terms/Privacy/About/"Get a quote"/"Sign in" control across
  the 8 pages that had them. `ChipGrid` / `Toggle` / `RadioCard` and the
  dashboard "Quick actions" tiles are now `<button>` with
  `aria-pressed` / `role="switch"` + `aria-checked`; landing chip groups are
  wrapped in `role="group"` with `aria-pressed` on each chip.
- **Route-change focus + announcement.** `Shell` moves focus to the main
  region and pushes `"<page> — page loaded"` into a visually-hidden
  `aria-live="polite"` region on every `location.pathname` change
  (`src/shared/a11y/routeLabel.ts` maps paths → readable names, reusing
  `STEP_NAMES` for wizard steps).
- **Skip link + landmark.** `Shell` renders a `.skip-link` (`src/styles/
ui.css`) as the first tab stop targeting `#main-content`; the Shell card
  element carries `id="main-content"` + `role="main"` + `tabIndex={-1}`.
  It's `role="main"` on the existing `<div>` rather than a `<main>` wrapper
  so the many `#root > div > div > …` structural selectors in
  `responsive.css` keep matching.
- **Contrast.** The ad-hoc grey text ramp (`#777`/`#888`/`#999`/`#aaa`/
  `#bbb`/`#ccc` as `color:`, ~90 sites) was darkened to `#595959` (≈7:1 on
  white); error text `#a44` → `#b00020`; the desktop footer's `#9598a8` →
  `#5b5e6b`. Placeholder-only greys were left at `#767676` (the 4.5:1 floor).

---

## Error handling & observability (audit area 6)

Gate (`tsc`, `vitest` 100, `madge`, `vite build`) green. **No linked platform
service touched.**

- **Provider-agnostic crash reporting.** `src/shared/observability/` is the
  single sink every crash path funnels through:
  - `reporter.ts` — `reportError(error, context)`, `initObservability()`,
    `setObservabilityUser()`, `reportBreadcrumb()`. Always logs to the console
    (in production: **status + message only** — payloads carry name / DOB /
    SSN / address / card billing and, with no first-party server, live only in
    the browser). Forwards to Sentry **only** when `VITE_SENTRY_DSN` is set at
    build time.
  - `sentry.ts` — the `@sentry/react` adapter, imported **dynamically** by
    `reporter.ts`. With no DSN the whole module tree-shakes out (the
    `import("./sentry")` becomes unreachable) — verified: a DSN-less build
    emits **no `sentry-*.js` chunk**. With a DSN it's an ~30 KB-gzip chunk
    loaded on first report, off every critical path. `beforeSend` strips the
    request body / headers / cookies and the URL query string off captured
    errors; `sendDefaultPii: false`; tracing + replay off; a `PII_KEYS` regex
    scrubs `extra` / breadcrumb `data`.
- **Wiring points.** `main.tsx` global `unhandledrejection` / `error` handlers
  → `reportError` (replaced the direct `logApiError` calls); `logApiError`
  itself (`shared/services/config.ts`) is now a thin wrapper over `reportError`
  tagged `{ source: "api", level: "warning", handled: true }`, so every
  existing `.catch(logApiError)` in the API/store layer already reaches the
  tracker; `ErrorBoundary.componentDidCatch` → `reportError`;
  `useObservabilityUser` (bootstrap hook #10) syncs the Sentry user to the
  authenticated insured **id only**; `Shell` drops a `navigation` breadcrumb
  (pathname only) on each route change.
- **Route-level error boundaries.** `ErrorBoundary`
  (`src/shared/components/ErrorBoundary.tsx`) took a `level` prop:
  - `level="root"` — the existing whole-app boundary in `App.tsx` (outside the
    router), last resort for crashes in the providers / `Shell` / `Modals`.
    Fallback: "Something went wrong" + **Reload page**.
  - `level="route"` — `src/routes/RouteErrorBoundary.tsx` wraps `<Routes>`
    inside the router and keys its reset on `pathname`, so a render crash in
    one page shows a **page-scoped** fallback ("This page didn't load" +
    **Try again** / **Reload page** / **Back to dashboard**) and navigating
    away clears it automatically. One bad page no longer blanks the dashboard
    _and_ the wizard together.
  - **Raw `error.message` is never shown to users** now (it was rendered
    verbatim in an `<Alert>`). Dev builds add a `<details>` stack dump;
    production shows only the friendly copy. Styles: `.error-boundary-*` in
    `src/styles/ui.css`.
- **Transient-failure retry** is owned by react-query's client defaults
  (`shared/query/queryClient.ts`: up to 2 retries, exp-backoff + jitter, 5xx /
  network only, never 4xx / 401) — covers every migrated `GET` including the
  imperative `queryClient.query(...)` calls in `paymentOrderService` /
  bootstrap. The few remaining direct-axios reads are boot-only
  (`/auth/google-client-id`, `/insured/session` — the latter's 401 is the
  interceptor's refresh path).
- **DocuSign completion is confirmed server-side.** `ReviewDocusignPage`
  already re-reads `GET /insured/order` and requires `workflowstatus === "pay"`
  before showing the signed state — a spoofed `?event=signing-complete`
  deep-link is ignored (audit 6.5 was closed in an earlier pass; noted here
  for completeness).
- **Source maps.** `vite.config.js` `build.sourcemap` is `false` by default
  and `'hidden'` when `VITE_SENTRY_DSN` is set (emits `.map` files with no
  `//# sourceMappingURL` comment). The deploy step must then upload
  `dist/assets/*.map` to Sentry (`sentry-cli sourcemaps`) and delete them from
  `dist/` before publish. `netlify.toml` CSP `connect-src` allows
  `*.ingest.sentry.io` / `*.ingest.us.sentry.io`.

**To go live with Sentry:** set `VITE_SENTRY_DSN` (+ optionally
`VITE_SENTRY_ENVIRONMENT`, `VITE_APP_RELEASE`) in the Netlify build env and add
the source-map upload/delete to the deploy step. No code change.

---

## Build & deployment (audit area 8)

### CI merge gate (8.1)

`.github/workflows/ci.yml` — runs on every PR to `main` and on push to `main`.
Netlify builds straight from the branch with no pre-merge check, so before this
a broken build / type error / red test / new import cycle could reach
production unblocked.

| Step             | Command                                                   | Blocking               |
| ---------------- | --------------------------------------------------------- | ---------------------- |
| Install          | `npm ci` (lockfile-exact)                                 | ✅                     |
| Lint             | `npm run lint` (ESLint, `--max-warnings=0`)               | ✅                     |
| Format           | `npm run format:check` (Prettier)                         | ✅                     |
| Typecheck        | `npm run typecheck`                                       | ✅                     |
| Unit tests       | `npm test`                                                | ✅                     |
| Production build | `npm run build`                                           | ✅                     |
| Circular deps    | `npm run lint:cycles` (madge — deterministic)             | ✅                     |
| Dead code        | `npm run lint:dead` (knip, `KNIP_DISABLE_RAW_TRANSFER=1`) | ℹ️ `continue-on-error` |

`lint:dead` is informational only — knip currently reports ~70
sanctioned-cleanup findings (`quoteService.ts`, unused `ratingApi` /
`questionsApi` wrappers — see "Retained-but-inactive code"); make it blocking
once that backlog is burned down. ESLint + Prettier config and rationale:
"Code quality & tooling" below.

Node version comes from `.nvmrc` (`node-version-file`), the single source of
truth shared with `package.json` `engines` and `netlify.toml`. A newer push
cancels the in-flight run (`concurrency` + `cancel-in-progress`).

**Operational step (not in the repo):** mark the `verify` job a **required
status check** on `main` in GitHub branch protection.

### Node version pin (8.3)

Pinned in three places that must stay in sync: `.nvmrc` (`22`),
`package.json` `engines` (`>=22.12 <23` — `vite` 7 / `vitest` 3 floor), and
`netlify.toml` `[build.environment] NODE_VERSION`. CI reads `.nvmrc`.

### `debugger` drop gate (8.5)

`vite.config.js` `esbuild.drop` is gated on Vite's own `command === "build"`,
not `process.env.NODE_ENV === "production"` — a plain `vite build` does not
guarantee that env var is exported, so the old check could let `debugger`
statements survive in a prod bundle. `console.*` is deliberately **kept** (every
call is an intentional diagnostic; PII-safe formatting lives in `logApiError`).

### Already covered elsewhere

- **Source maps (8.2)** — `sourcemap: false` default / `'hidden'` with a DSN;
  see "Error handling & observability" above.
- **Asset cache headers (8.4)** — `netlify.toml` `/assets/*` →
  `max-age=31536000, immutable`; see "Performance" above.
- **Edge-proxy header allowlist (8.6)** — `api-proxy.js`
  `FORWARDED_REQUEST_HEADERS`; see "Security hardening" above.
- **CSP `report-to` / `report-uri` (8.7)** — `/_csp-report` edge function; see
  "Security hardening" above.

### Deploy previews & rollback (README "Deploy")

Netlify keeps every prior deploy; rollback is _Deploys → last-good →
Publish deploy_ (instant — no rebuild, because `/assets/*` is immutable and
still cached while `index.html` is short-TTL). PR deploy previews should get
their own `VITE_UPSTREAM_URL` deploy-context value pointing at a non-prod `ins`.

---

## Code quality & tooling (audit area 10)

Was: no linter or formatter anywhere, yet 17 hand-written
`// eslint-disable-next-line` comments assuming a config that didn't exist;
`.madgerc` scoped to `js/jsx` only after the TS migration (fixed in area 1);
`useStore` selectors one object-return away from an infinite render loop; the
ADR log deleted with no replacement; catch-all commit scopes.

### ESLint (§10.1)

`eslint.config.js` — flat config, ESLint 9. Deliberately **not** the
type-checked `typescript-eslint` configs: those need a per-file type build
(slow in CI) and would surface hundreds of `any` findings that are
[by design](#server-state--react-query-audit-area-2). What's on:

| Source                                    | Rules                                                                                                                                                      |
| ----------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `@eslint/js` recommended                  | core correctness                                                                                                                                           |
| `typescript-eslint` recommended (untyped) | TS correctness, `no-unused-vars` (`^_` escape)                                                                                                             |
| `eslint-plugin-react-hooks` recommended   | `rules-of-hooks` (error), `exhaustive-deps` (warn) — the point of wiring it: the ~7 remaining hand-disables are now visible and each carries a `-- reason` |
| `eslint-plugin-jsx-a11y` recommended      | would have caught most of area 5; `label-has-associated-control` extended with the Stripe `Card*Element` control components                                |
| `eslint-plugin-import-x`                  | `no-duplicates`, `no-useless-path-segments` only — cycle detection stays with `madge`                                                                      |
| `eslint-config-prettier` (last)           | turns off every stylistic rule so ESLint and Prettier never disagree                                                                                       |

- **`npm run lint` runs `--max-warnings=0`** — a warning fails CI. The tree is
  at zero.
- **`no-explicit-any` is `off`**, with a comment saying why: `ins` owns the
  order / policy / question / submission row shapes and doesn't publish them,
  so they're `any` to match `src/local/db.ts`'s predicate contract. `strict`
  `tsc` still guards everything that _is_ typed. ~475 sites; a `warn` here
  would bury every other finding.
- **`reportUnusedDisableDirectives: "error"`** — a stale `eslint-disable` left
  after a refactor fails the build. Directives fixed during this pass: 4 unused
  `no-console` in `reporter.ts` (config allows `console.warn`/`error`), 4 stale
  `exhaustive-deps`, 1 `no-unused-vars` in `ilfDlf.js`.
- Per-area overrides: the two `.js` islands
  (`modules/Quote/data/**`, `nursingRatingService.js`) skip the unused-vars
  rules; tests get Node globals + `no-console` off; the Netlify edge runtime
  (`config/upstream.js`, `netlify/edge-functions/**`) gets `Deno`/`Netlify`
  globals.
- Real bugs the first run found and fixed: ~10 genuinely-unused
  imports/consts (`RED`, `BRAND_DARK`, `ICONS`, `footer`, `setStep`, …), a
  missing `navigate` dep in `ReviewDocusignPage`, and 3 files with
  non-interactive `<div onClick>` overlays (`ModalShell`, `FAQModal` backdrops
  → real `<button>`; `PaymentCardField` labels → nested).

### Prettier (§10.1)

`.prettierrc.json` (`printWidth: 100`, double quotes, trailing commas).
`npm run format` writes, `npm run format:check` is the gate.
`src/modules/Quote/data/**` is `.prettierignore`d — the rate tables are
hand-aligned in columns and Prettier would destroy that. Adopting it was one
tree-wide reformat commit (≈130 files); its SHA is in `.git-blame-ignore-revs`
(`git config blame.ignoreRevsFile .git-blame-ignore-revs` once per clone).
`.gitattributes` pins `eol=lf` so Prettier and Windows `core.autocrlf` don't
fight. `.editorconfig` mirrors the two-space / LF / final-newline rules for
editors.

### `useStore` selector safety (§10.4)

`src/shared/store/useStore.ts` now memoizes the selected value behind a
`useRef` (the same trick as React's own `useSyncExternalStoreWithSelector`):
a selector may return a fresh object **if** it also passes an `isEqual`
comparator as the third arg. `shallowEqual` is exported for the common
"bag of primitive fields" case. Without a comparator the behaviour is
unchanged (`Object.is`), so all ~existing primitive-returning call sites are
untouched — but an object selector can no longer silently infinite-loop
`useSyncExternalStore`. The rule is in the hook's header comment.

### ADR log, CONTRIBUTING, PR template (§10.5)

- `docs/adr/` restored as an **index + template** (`README.md`, `TEMPLATE.md`).
  ADRs 0002–0008 are written up inline in _this_ file (former ADR files were
  deleted in `bf9ec0a`); the log table cross-references each. New ADRs get
  their own numbered file.
- `CONTRIBUTING.md` — setup, the merge-gate table, the `eslint-disable` /
  `any` / commit-scope rules.
- `.github/pull_request_template.md` — checklist including an a11y line for UI
  PRs and a "no linked platform service touched" line.
- **Commit hygiene (§10.6):** one logical change per commit, module-scoped
  conventional-commit subjects (`feat(payment):` …), formatting/codemod
  commits isolated and blame-ignored. Documented in `CONTRIBUTING.md`; not
  retroactively applied to existing history.

### Dangling references swept (§10.3)

`README.md` "Quote flow" rewritten to the real 9 steps (was listing the
removed `/credentials` and `/coverage` steps); the dead "Naming note:
`licensureStore` / `LicensurePage`" section removed (that page and route no
longer exist); `.js`/`.jsx` extension references in `README.md` and
`constants.ts` corrected to `.ts`/`.tsx`. `REACT_FRONTEND_AUDIT.md §N`
citations in source comments are left as-is — that file is a standing
workspace-root reference (`CLAUDE.md` cites it the same way), not a deleted
repo file.

---

## Retained-but-inactive code

Kept in-tree on purpose (this project's don't-delete-working-code-you-might-need
practice), but **not on any live path**. `npm run lint:dead` (knip) is
configured to ignore the whole-directory cases so its report only surfaces
_new_ dead code — see `knip.json` `ignore`.

| Module                                                                                                                     | State                                                                                                                                                                                                                                                                                                            | Why kept                                                                                                                                                        |
| -------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/modules/Quote/data/*.js` (rate tables, lookups)                                                                       | Not consumed by any page — every displayed price comes from `ilfDlfStore` (`POST /auth/quotedata`). Still imported by `nursingRatingService.js`.                                                                                                                                                                 | Reference shape + fallback if the local engine is ever re-enabled. `knip.json` ignores `src/modules/Quote/data/**`.                                             |
| `src/modules/Quote/services/nursingRatingService.js`                                                                       | Still _executes_ — `useLocalQuoteRecompute` feeds it — but its output (`quoteResultStore.quote`) is no longer read by `derivedValues.ts`, so it affects nothing on screen.                                                                                                                                       | The only remaining local rating implementation; cheap to keep running, useful as a live reference. Remove the `useLocalQuoteRecompute` call to fully retire it. |
| `src/local/**`                                                                                                             | Local "backend" scaffolding. Only the account + submission _shadows_ (`authLocal.syncAccountShadow`, `submissionLocal.ensureSubmissionShadow` / `patchSubmission` / `recordAttestation`) are still called. Everything else (`db.ts` table helpers, `ids.ts`, `latency.ts`, `submissionLocal`'s CRUD) is dormant. | `postAttestation` / `patchSubmissionDetails` have no real `ins` endpoint; the shadows are their only sink. `knip.json` ignores `src/local/**`.                  |
| `ratingApi.postIlfDlfList` (`POST /auth/ilf-dlf`)                                                                          | Unused — its only consumer was the removed `CoveragePage`. The Home Page limit picker uses `/auth/{zip}/coverage-limits` instead.                                                                                                                                                                                | Real endpoint, may return if a full candidate-limit list is needed again. Surfaced by knip.                                                                     |
| `quoteApi.postAttestation`, `quoteApi.patchSubmissionDetails`                                                              | No caller — `patchSubmissionDetails`'s `/credentials` step is gone; `postAttestation` is superseded by `ReviewDocusignPage`'s real DocuSign flow.                                                                                                                                                                | Nursing-local inventions with no real endpoint; kept as the shadow-write contract. Surfaced by knip.                                                            |
| `practiceStore` step-2 fields (`hoursPerWeek`, `workSetting`, `moonlights`, `moonlightWhere`, `scopeIds`, `WORK_SETTINGS`) | Not written by any page — `PracticeDetailsPage` renders the real "License, Scope & Practice" question-tree group instead. Still read by `useLocalQuoteRecompute`.                                                                                                                                                | Same lifecycle as `nursingRatingService` — retire together.                                                                                                     |

`quoteService.ts` and several `ratingApi` / `questionsApi` / `paymentApi`
wrappers also show up in `npm run lint:dead` — those are **not** in the
ignore list on purpose: they are candidates for real deletion, not
sanctioned dead code.
