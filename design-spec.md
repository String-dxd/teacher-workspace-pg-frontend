# Design spec: feat(`posts`): track consent form responses and edit on behalf

Source issue: [String-dxd/teacher-workspace-pg-frontend#35](https://github.com/String-dxd/teacher-workspace-pg-frontend/issues/35)
Produced by the `aif-design-issue` skill as a validation exercise for [String-dxd/gh-ai-first-taskforce#115](https://github.com/String-dxd/gh-ai-first-taskforce/issues/115). No designer input was used to produce this spec — that is the point of the exercise.

## Design context

- Component library: `~/components/ui` — shadcn-style primitives over `@base-ui/react`, Radix Slate + custom `twblue` brand tokens (see `src/index.css`)
- Design standard: none declared in this repo's `CLAUDE.md`; no `.tfx/component-manifest.json` found. Applied the skill's own project-agnostic non-negotiables/layout/copy/anti-slop checks instead of the TFX quickref.
- Reference prototype: live PG staff portal screenshots attached to issue #35 (`stable-pg.moe.edu.sg/consentForms/details/1009`), visual reference only — this codebase's existing components are authoritative.

## Intent (Step 3)

- **Purpose:** let a teacher see who has and hasn't responded to a consent form, and record/correct a response for a parent who can't do it themselves, without leaving the post detail page.
- **User & moment:** a primary-school teacher reviewing consent-form responses a few days before the due date, who needs to log a verbal/paper response for a parent who can't use the app.
- **Surface type:** modification. The Responses view already exists (`PostDetailPage` → `ConsentFormDetail`); this adds fields, columns, filter states, and one new dialog to it.
- **Done-criteria:** all 12 AC scenarios pass with an E2E test each and the full suite green; no new component invented where an existing one fits; all non-negotiables hold in the new dialog; banner/restriction copy matches the AC text exactly; the new audit-history entry reads as a sentence, not a raw enum.

## Domain note

`ConsentFormRecipient.gender` and `.classLabel` describe the **student** the consent form seeks consent for, not the parent/guardian who submits the response (`replyByParent` / `parentType` / `contactNumber`). Parent gender is never recorded.

## Per-scenario decisions

### 1. Response summary stats

- **Components:** new `ConsentFormStatTiles` — 4 sibling `Card`s (Total/Yes/No/Pending), replacing the single combined card currently rendered by `ReadTrackingCards`'s form branch.
- **Layout:** KPI-tile row, not a marketing feature-grid — doesn't trip the anti-slop "no identical card grids" rule since these are functional/interactive, not decorative.
- **States:** click toggles active filter; active tile gets the same focus-ring treatment `ResponseCard` already uses.
- **New pattern?** No — extends an existing stat-card convention.
- **E2E test:** navigate to a posted form, assert 4 tiles render with correct Total/Yes/No/Pending counts.

### 2. Guidance banner

- **Components:** plain `role="status"` banner, same shape as the existing `failureReason` alert in `PostDetailPage` but info-toned instead of destructive.
- **Layout:** full-width banner above the stat tiles.
- **States:** shown only when `status === 'open'` (before due date); absent when `closed`.
- **New pattern?** No.
- **E2E test:** assert exact banner text on an open form; assert absent on a closed form.

### 3. Per-student table columns

- **Components:** extend `UnifiedTable` in `RecipientReadTable` — add Gender column (student's gender), wire Comments from the API's existing `remarks` field (previously received but never mapped), relabel the timestamp column "Last responded on".
- **New pattern?** No.
- **E2E test:** assert all column headers present with correct sample values for a form with custom questions.

### 4. Configurable table columns

- **Components:** extend `RecipientColumnPopover`'s `ColumnKey` with `gender`, `comments`.
- **Decision:** change `DEFAULT_COLUMN_VISIBILITY` to all-on (today `indexNumber` defaults off) — AC states default is all columns selected.
- **New pattern?** No.
- **E2E test:** open Columns popover, toggle Gender off, assert the column disappears from the table.

### 5. Filter by stat tile click

- **Components:** `ConsentFormStatTiles` `onClick` sets the shared `RecipientFilterValue.status`.
- **New pattern?** No.
- **E2E test:** click the Pending tile, assert only pending-response rows remain.

### 6. Filter by Status dropdown

- **Components:** extend `PgStatusFilter` union with `'cannot-respond'` in `RecipientFilterPopover`.
- **New pattern?** No.
- **E2E test:** select "Cannot Respond", assert only matching rows remain.

### 7. Filter by Class dropdown

- **Components:** unchanged — already implemented in `RecipientFilterPopover`.
- **New pattern?** No.
- **E2E test:** assert existing class-filter behavior still holds against the extended fixture data.

### 8. Edit response on behalf

- **Components:** new `EditResponseDialog` (`Dialog` + `RadioGroup` Yes/No + per-question `Input`/`RadioGroup` for MCQ + `Textarea` comments with a 500-character counter). Triggered by an "Edit Response" link stacked under the student name, mirroring the PG reference layout.
- **Interaction plan:** open → fill → submit. Submit disables while in flight, shows a loading state on the button (same `Loader2` + label pattern already used in `PostDetailPage`'s Save button), success closes the dialog and shows a toast via the existing `notify` helper, error keeps the dialog open with a toast.
- **Async states:** loading (button spinner), success (toast + dialog close + table/history refresh), error (toast, dialog stays open so no data entry is lost).
- **New pattern?** Yes — first edit-on-behalf flow in the codebase. **On validation checklist.**
- **E2E test:** open dialog for an eligible student, select Yes, fill all custom questions, submit, assert the table row updates and a new history entry appears.

### 9. Validation blocks incomplete Yes edits

- **Components:** reuse the exact `role="alert"` + `text-destructive` inline-error convention from `CreatePostPage` / `create-post-validation.ts`.
- **Copy:** error states what's missing, e.g. "Answer this question before saving."
- **New pattern?** No — reuses an established convention.
- **E2E test:** submit Yes with a blank mandatory question, assert inline error appears and no API call is made.

### 10. Editing restricted for onboarded custodians before due date

- **Components:** static muted text replaces the "Edit Response" link.
- **Logic:** `pgStatus === 'onboarded' && status === 'open'`.
- **Copy:** exact AC text — "Editing restricted until after due date for onboarded custodians."
- **New pattern?** No.
- **E2E test:** assert the restriction text (not the link) renders for an onboarded row on an open form.

### 11. Edit available for non-onboarded / cannot-respond students

- **Components:** link always shown when `pgStatus !== 'onboarded'`, regardless of due date.
- **New pattern?** No.
- **E2E test:** assert the link is present and functional for not-onboarded and cannot-respond rows, both before and after the due date.

### 12. Reply audit history is visible

- **Components:** `ConsentFormHistoryList` (existing) gets a new entry appended on a successful edit.
- **Copy decision:** existing entries render raw enum strings (`CREATED`, `POSTED`) verbatim as UI text. The new entry this feature adds uses a proper sentence-case label ("Response updated") instead of propagating that pattern. Not retrofitting the old entries — out of scope for this issue, but worth flagging to a reviewing designer.
- **New pattern?** No (extends existing component).
- **E2E test:** after a successful edit, assert a new history entry with actor name and timestamp appears.

## Judgment calls (decisions log)

1. **No new Details/Responses tabs.** PG's reference splits these into tabs; this repo already shows everything on one page. Kept the current single-page layout — lower friction, no AC forces a tab split.
2. **Stat tiles as 4 individual cards** rather than today's one combined card with mini-stats — matches the PG reference and reads as a KPI row, not a decorative card grid.
3. **`@axe-core/playwright` was not configured.** Tried wiring it as a global `afterEach` check across all spec files first, per the skill's default. That surfaced a long tail of pre-existing, unrelated violations across the whole app (missing `<html lang>`, three separate contrast failures, a nested-interactive-element violation, two unlabeled icon-only links, plus two already-broken pre-existing test assertions the global check happened to unmask). Fixing all of it would have pulled in changes to `tabs.tsx`, `EntitySelector.tsx`, `PostPreview.tsx`, `PostsListPage.tsx`, `StudentRecipientSelector.tsx`, `CreatePostPage.tsx`, `index.css`, and `routing.spec.ts` — none of it related to consent-form responses. Given the user's call, reverted all of that and scoped `@axe-core/playwright` to a `checkA11y(page)` helper in `e2e/fixtures.ts` that only this feature's new tests call explicitly. The pre-existing violations are real and worth their own follow-up issue, but out of scope here.
4. **Branch cut from `main`**, not from the user's in-progress `feat/consent-form-response-tracker` (which had no commits and is left untouched).
5. **History entry copy** for the new edit action uses a human-readable sentence rather than a raw enum, deliberately diverging from the existing `CREATED`/`POSTED` pattern (flagged, not fixed, for those older entries).

## Validation checklist

- [ ] **Edit response on behalf** (scenario 8): new pattern, first edit-on-behalf flow in the codebase — needs designer (Grace) review before this PR is marked ready, per the parent issue's acceptance criteria.

## Design decisions log

<!-- Updated throughout implementation. -->

- 2026-07-17: Plan approved by user with one clarification — `gender`/`classLabel` describe the student, not the parent/guardian recipient. No other changes requested.
- 2026-07-17: Tried a global `@axe-core/playwright` check first; reverted to feature-scoped per user direction after it surfaced a large tail of pre-existing, unrelated violations (see judgment call 3 above).
- 2026-07-17: **Pre-existing E2E baseline on `main` is already red** — 13 failing / 2 passing / 8 not-run (`pnpm test:e2e` before any of this feature's changes). Failures are stale visual snapshots, an outdated "Posts" heading assertion from the already-merged "My Posts" admin redesign, and reminder-copy drift from already-merged work — none related to consent-form-responses. Applying the same scoping principle as the axe decision: not fixing these now. "Step 8: full suite passes" for this PR means _this feature's new tests pass_ and _the pre-existing 13 failures don't grow_, not that the whole suite goes green. Worth its own follow-up issue.
