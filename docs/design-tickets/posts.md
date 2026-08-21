# Design: /posts (My Posts)

Long-lived design ticket for the My Posts landing page. Local-markdown fallback —
no `design` label was created on the shared repo.

## Findings — 18 Aug 2026 — dx-design-critique

Report: https://claude.ai/code/artifact/08f0055c-c343-4259-8adb-58a366a5b655

Captured at 1280×900 and 360×800 against localhost:3001 with MSW mocks, on branch
`posts-remove-multiselect`. No product code was changed by the critique.

| F#  | Tier | Finding                                                             | Controls        | Fix | State           |
| --- | ---- | ------------------------------------------------------------------- | --------------- | --- | --------------- |
| F1  | L0   | "Open" status badge measures 4.29:1, under the 4.5 floor            | A11Y-1          | S1  | accepted, built |
| F2  | L0   | Admin banner text measures 4.43:1, under the 4.5 floor              | A11Y-1          | S1  | accepted, built |
| F3  | L1   | No headings and no landmarks anywhere on the page                   | A11Y-7, A11Y-10 | S2  | accepted, built |
| F4  | L2   | Response counts left-aligned with proportional figures              | CMP-6, TYP-5    | S3  | accepted, built |
| F5  | L2   | Column headers do not persist while the body scrolls                | CMP-6           | S3  | accepted, built |
| F6  | L2   | At 360px, six of seven columns are off-screen including Actions     | LAY-5           | S4  | accepted, built |
| F7  | L2   | Duplicate toast quotes the title raw; delete toast elides it        | CNT-10          | S5  | accepted, built |
| F8  | L2   | Two toast APIs in one file — sonner direct, plus the notify wrapper | CNT-10          | S5  | accepted, built |

Also recorded, no suggestion raised: the document title is the dev-server default
"Rsbuild App" rather than a descriptive page title (A11Y-9). Likely a shell-level
concern rather than this surface's.

### Suggestions

| S#  | Suggestion                                                                                           | Fixes  | Impact | Cost | State           |
| --- | ---------------------------------------------------------------------------------------------------- | ------ | ------ | ---- | --------------- |
| S1  | Step both failing colours up one token until each clears 4.5:1                                       | F1, F2 | High   | S    | accepted, built |
| S2  | Give the page a real `h1` and a `main` landmark                                                      | F3     | High   | S    | accepted, built |
| S4  | Below `sm`, drop the table for a stacked row carrying title, status, date and actions                | F6     | High   | M    | accepted, built |
| S3  | Right-align the count columns with tabular figures; pin the header row                               | F4, F5 | Med    | S    | accepted, built |
| S5  | One toast path: give `notify.success` an optional action; run both titles through `postToastTitle()` | F7, F8 | Low    | S    | accepted, built |

All five suggestions were approved on 18 Aug 2026 ("make the changes") and built —
see the run record below.

### Found while building, not in the critique

| F9 | L0 | Warning badge measures 4.25:1, under the 4.5 floor | A11Y-1 | fixed with F1/F2 | accepted, built |

The critique missed this one because no warning badge was on screen in either
capture. It shares the root cause with F1: a step-11 foreground on its own step-3
tint. Ratchet candidate — a status-token contrast check would have caught all three
without needing the badge rendered.

## Run record — 18 Aug 2026 — dx-design-execute

Removed multi-select delete; dropped the typed-DELETE gate on sent posts; delete
toast now names the post, identically from the list and the detail page.
Decision record: `docs/decisions/posts-remove-multiselect.md`.
Commits: `16926d8`, `88c2fd6`.

## Run record — 18 Aug 2026 — dx-design-execute (critique fixes)

Built S1–S5. Verified in-browser at 1280, 375 and ~320.

- **S1** — `--success-foreground` lime-11 → lime-12 and `--warning-foreground`
  amber-11 → amber-12 in `index.css`; admin banner `text-amber-11` → `text-amber-12`.
  Measured after: Open badge 4.29 → **9.82**, banner 4.43 → **10.93**. Hue mappings
  unchanged. `--info-foreground` left alone at 5.03. **Affects every success and
  warning badge across the app, not only this page.**
- **S2** — the scope switcher is now wrapped in an `h1`, and the page content in a
  `main`. Measured after: one `h1` ("My Posts"), one `MAIN` landmark, where both
  queries previously returned empty.
- **S3** — `ReadRateBar`'s bar became `flex-1 min-w-8` and the ratio `tabular-nums`.
  The first attempt (`w-20` bar + `ml-auto`) still overflowed the cell, so the ratios
  ended 8px apart; both now end at **736px** exactly. Header pinning needed a scroll
  region: `overflow-x-auto` already made the wrapper the scroll container, so
  `sticky top-0` did nothing until the wrapper got `max-h-[calc(100vh-15rem)]`.
  Verified with 28 injected rows — header held at top 186 through a 300px scroll.
- **S4** — new `PostStackedRow` below `sm`; the table is `hidden sm:table`. The row
  overflow menu was extracted to `PostRowActions` so both presentations share one
  implementation. At 375 and ~320 the document no longer scrolls horizontally.
- **S5** — `notify.success`/`error` now take an optional `action`; the duplicate
  toast routes through `notify` with `postToastTitle()`. The direct `sonner` import
  is gone from the page.

`tsc --noEmit` exit 0; `oxlint` clean bar the pre-existing `exportXlsx.test.ts`
warning; 358/358 tests in 27 files.

**Not verified, needs a human:** the row menu opens under a real click at desktop,
but two attempts to open it under the browser pane's touch emulation timed out — a
human should tap it on a real phone. The focus ring (A11Y-2) is still unverified for
the same reason as before: `:focus-visible` does not fire under synthesised events.
The ~320 check reported a 331px viewport, not 320.
