# Design: /posts (My Posts)

Long-lived design ticket for the My Posts landing page. Local-markdown fallback —
no `design` label was created on the shared repo.

## Findings — 18 Aug 2026 — dx-design-critique

Report: https://claude.ai/code/artifact/08f0055c-c343-4259-8adb-58a366a5b655

Captured at 1280×900 and 360×800 against localhost:3001 with MSW mocks, on branch
`posts-remove-multiselect`. No product code was changed by the critique.

| F# | Tier | Finding | Controls | Fix | State |
|----|------|---------|----------|-----|-------|
| F1 | L0 | "Open" status badge measures 4.29:1, under the 4.5 floor | A11Y-1 | S1 | pending |
| F2 | L0 | Admin banner text measures 4.43:1, under the 4.5 floor | A11Y-1 | S1 | pending |
| F3 | L1 | No headings and no landmarks anywhere on the page | A11Y-7, A11Y-10 | S2 | pending |
| F4 | L2 | Response counts left-aligned with proportional figures | CMP-6, TYP-5 | S3 | pending |
| F5 | L2 | Column headers do not persist while the body scrolls | CMP-6 | S3 | pending |
| F6 | L2 | At 360px, six of seven columns are off-screen including Actions | LAY-5 | S4 | pending |
| F7 | L2 | Duplicate toast quotes the title raw; delete toast elides it | CNT-10 | S5 | pending |
| F8 | L2 | Two toast APIs in one file — sonner direct, plus the notify wrapper | CNT-10 | S5 | pending |

Also recorded, no suggestion raised: the document title is the dev-server default
"Rsbuild App" rather than a descriptive page title (A11Y-9). Likely a shell-level
concern rather than this surface's.

### Suggestions

| S# | Suggestion | Fixes | Impact | Cost | State |
|----|-----------|-------|--------|------|-------|
| S1 | Step both failing colours up one token until each clears 4.5:1 | F1, F2 | High | S | pending |
| S2 | Give the page a real `h1` and a `main` landmark | F3 | High | S | pending |
| S4 | Below `sm`, drop the table for a stacked row carrying title, status, date and actions | F6 | High | M | pending |
| S3 | Right-align the count columns with tabular figures; pin the header row | F4, F5 | Med | S | pending |
| S5 | One toast path: give `notify.success` an optional action; run both titles through `postToastTitle()` | F7, F8 | Low | S | pending |

Approval happens here: reply with S-numbers. Accepted findings go to
`dx-design-execute` in a later run, which keeps its own plan gate.

## Run record — 18 Aug 2026 — dx-design-execute

Removed multi-select delete; dropped the typed-DELETE gate on sent posts; delete
toast now names the post, identically from the list and the detail page.
Decision record: `docs/decisions/posts-remove-multiselect.md`.
Commits: `16926d8`, `88c2fd6`.
