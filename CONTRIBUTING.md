# Contributing to Q2BInternalMedicine

A short guide to the local workflow and what the merge gate enforces. Read
`README.md` for the app overview and `CLAUDE.md` for the architecture rules
that matter most when changing code.

## Setup

```bash
nvm use            # Node from .nvmrc (22.x) — must match package.json engines
npm ci
cp .env.local.example .env.local   # if present; point VITE_UPSTREAM_URL at a running ins
npm run dev        # http://localhost:4500
```

## The merge gate

`.github/workflows/ci.yml` runs on every PR to `main` and must be a **required
status check** in branch protection. Run the same checks locally before you
push:

| Command                | What it checks                                                                                                       | Blocking in CI                                |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------- | --------------------------------------------- |
| `npm run lint`         | ESLint (`--max-warnings=0`) — correctness, `react-hooks`, `jsx-a11y`, unused code, stale `eslint-disable` directives | ✅                                            |
| `npm run format:check` | Prettier — formatting only                                                                                           | ✅                                            |
| `npm run typecheck`    | `tsc --noEmit` (`strict`)                                                                                            | ✅                                            |
| `npm test`             | Vitest (pure-logic suite)                                                                                            | ✅                                            |
| `npm run build`        | `vite build`                                                                                                         | ✅                                            |
| `npm run lint:cycles`  | `madge` — no new import cycles                                                                                       | ✅                                            |
| `npm run lint:dead`    | `knip` — unused files / exports / deps                                                                               | informational (~70 sanctioned findings today) |

`npm run lint:fix` and `npm run format` auto-fix most lint/format failures.

### On `eslint-disable`

Every `// eslint-disable*` in the tree must carry a `-- <reason>` explaining
why the rule is wrong _here_. CI fails on a directive that no longer
suppresses anything (`reportUnusedDisableDirectives: "error"`), so a disable
left behind after a refactor is caught. Don't add a blanket file-level disable
to get a PR green — fix the code or justify the single line.

### On `any`

`@typescript-eslint/no-explicit-any` is **off** on purpose (see
`eslint.config.js`): `ins` owns the order / policy / question / submission row
shapes and doesn't publish them, so they're typed `any` to match
`src/local/db.ts`'s predicate contract. Everything that _is_ typed stays under
`strict`. Don't add `any` to code that could be typed.

## Commits & PRs

- **One logical change per commit.** Module-scoped conventional-commit
  subjects: `feat(payment): …`, `fix(quote): …`, `refactor(auth): …`,
  `docs: …`, `chore(ci): …`. Avoid catch-all scopes like
  `Refactor(InternalMedicine): codebase` — they make `git bisect` and change-to-reason
  tracing hard.
- A pure-formatting or codemod commit goes in on its own and is added to
  `.git-blame-ignore-revs` (configure once with
  `git config blame.ignoreRevsFile .git-blame-ignore-revs`).
- Fill in the PR template checklist. A PR that changes UI must say how it was
  checked for keyboard + screen-reader use (audit area 5).
- **Never change a linked platform service** (`ins`, `service-register`, …) —
  see `CLAUDE.md` → "Out of scope for this repo".

## Architecture decisions

Anything that changes a cross-cutting pattern — a new state or data-fetching
approach, a routing change, a build/deploy change, dropping or adding a
dependency class — gets a short entry in `docs/adr/`. Copy
`docs/adr/TEMPLATE.md`, number it next in sequence, and link it from
`docs/adr/README.md`. Keep it to the decision, the context, and the
consequences — not an essay.
