# Architecture Decision Records

Short, dated notes on decisions that shape more than one module — a state or
data-fetching pattern, a routing or build change, adding/dropping a dependency
class. Not a design doc: the decision, why, and what it costs.

## How to add one

1. `cp TEMPLATE.md 000N-short-title.md` (next number in sequence).
2. Fill it in. Keep it to one screen.
3. Add a row to the log below.
4. If it changes a rule contributors must follow, also update `CLAUDE.md` /
   `docs/ARCHITECTURE.md` — the ADR records _why_, those record _what to do_.

## Log

| #    | Title                                                                | Status                                           | Where                                                     |
| ---- | -------------------------------------------------------------------- | ------------------------------------------------ | --------------------------------------------------------- |
| 0001 | Local-first mock backend (superseded — everything is real `ins` now) | Superseded                                       | history only; see `CLAUDE.md` → "What's still local"      |
| 0002 | TypeScript migration — complete + `strict`                           | Accepted                                         | `docs/ARCHITECTURE.md` → "Key decisions"                  |
| 0003 | Identity-store consolidation                                         | Accepted                                         | `docs/ARCHITECTURE.md` → "Key decisions"                  |
| 0004 | Inline-style / theme-coupling migration                              | Accepted (partial — inline `style={{}}` remains) | `docs/ARCHITECTURE.md` → "Key decisions"                  |
| 0005 | Server state owned by `@tanstack/react-query`                        | Accepted                                         | `docs/ARCHITECTURE.md` → "Server state — react-query"     |
| 0006 | Route + component code splitting (`React.lazy`)                      | Accepted                                         | `docs/ARCHITECTURE.md` → "Performance — code splitting"   |
| 0007 | Provider-agnostic observability sink, DSN-gated Sentry               | Accepted                                         | `docs/ARCHITECTURE.md` → "Error handling & observability" |
| 0008 | ESLint + Prettier + CI merge gate                                    | Accepted                                         | `docs/ARCHITECTURE.md` → "Code quality & tooling"         |

ADRs 0002–0008 were written up inline in `docs/ARCHITECTURE.md` rather than as
separate files (the original `docs/adr/0001–0004` files were deleted in
`bf9ec0a` and their content folded into that doc). New ADRs from here on get
their own file in this directory.
