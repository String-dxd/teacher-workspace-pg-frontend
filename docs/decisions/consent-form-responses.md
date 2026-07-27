# Design decision record — Track consent form responses and edit on behalf

> One record per page or significant change. Started at the Phase 3 plan gate (the
> approved plan is the fixed artifact the verify phase grades against), finished at
> Phase 6. Keeps the human approval, waivers, and verdict traceable.

- **Date:** 2026-07-27
- **Product:** TW (Posts)
- **Change type:** modification
- **Page type:** workspace view (post detail page, Responses region)
- **Run type:** attended
- **Hand-off:** solo
- **The teacher and the moment:** Ms. Tan, P4 Science, the afternoon before a museum-trip due date — checking who's still pending, and recording a phone-in Yes from a parent who isn't onboarded to the app.

## Sprint contract (done-criteria)

1. Total/Yes/No/Pending stat tiles render as a functional KPI row, each click toggles the table's status filter.
2. The guidance banner shows the exact AC copy when the form is `open`, absent when `closed`.
3. The per-student table is a real `<table>` (CMP-6) with every AC-listed column, including two currently-unmapped API fields (gender, comments) and a new `Cannot Respond` status value.
4. "Show Columns" toggles column visibility, default all-on.
5. All three filter paths (tile click, Status dropdown incl. Cannot Respond, Class dropdown) compose correctly against the table.
6. Edit-on-behalf: dialog opens per eligible row, Yes/No + mandatory custom questions (when Yes) + optional ≤500-char comments, inline validation blocks incomplete submits, a CMP-2 consequence line states what the edit overwrites, restricted rows show static text instead of a link before the due date for onboarded custodians, and a successful edit appends a readable audit-history entry.
7. Compliance floor throughout: AA contrast, keyboard reach + visible focus, one A11Y-11 announcement channel per async state, CMP-8 discard-confirm on unsaved-changes exit.

Scope dimension (confirmed with builder): UX & flow + Compliance — no deliberate visual/brand redesign; extend existing stat-card, filter, and table conventions as-is.

## Acceptance criteria → E2E mapping

Issue-initiated: [#35](https://github.com/String-dxd/teacher-workspace-pg-frontend/issues/35).

| Scenario                                                              | E2E test file                        | Passed / failed   |
| --------------------------------------------------------------------- | ------------------------------------ | ----------------- |
| 1. Response summary stats displayed                                   | `e2e/consent-form-responses.spec.ts` | pending Phase 4/5 |
| 2. Guidance banner shown                                              | `e2e/consent-form-responses.spec.ts` | pending Phase 4/5 |
| 3. Per-student table columns                                          | `e2e/consent-form-responses.spec.ts` | pending Phase 4/5 |
| 4. Table columns configurable                                         | `e2e/consent-form-responses.spec.ts` | pending Phase 4/5 |
| 5. Filter by stat card click                                          | `e2e/consent-form-responses.spec.ts` | pending Phase 4/5 |
| 6. Filter by status dropdown                                          | `e2e/consent-form-responses.spec.ts` | pending Phase 4/5 |
| 7. Filter by class                                                    | `e2e/consent-form-responses.spec.ts` | pending Phase 4/5 |
| 8. Edit response on behalf                                            | `e2e/consent-form-responses.spec.ts` | pending Phase 4/5 |
| 9. Edit blocked when mandatory fields missing                         | `e2e/consent-form-responses.spec.ts` | pending Phase 4/5 |
| 10. Restricted for onboarded before due date (open + closed variants) | `e2e/consent-form-responses.spec.ts` | pending Phase 4/5 |
| 11. Edit available for non-onboarded / cannot-respond                 | `e2e/consent-form-responses.spec.ts` | pending Phase 4/5 |
| 12. Reply audit history visible                                       | `e2e/consent-form-responses.spec.ts` | pending Phase 4/5 |

13 tests total (scenario 10 gets both due-date variants).

## Reviewer routing

| Scenario                           | Recommendation                          | Reason                                                   |
| ---------------------------------- | --------------------------------------- | -------------------------------------------------------- |
| 8. Edit response on behalf         | strongly recommended → designer (Grace) | New pattern — first edit-on-behalf flow in this codebase |
| 1, 2, 3, 4, 5, 6, 7, 9, 10, 11, 12 | can defer                               | Modification to existing UI with clear AC                |

**Note on scope:** the issue's grooming comment states this run is meant to happen without a designer collaborating on the design/build — confirmed with the builder that this refers to the design phase only, not to skipping review. The PR opens as **draft** and is not marked ready until Grace reviews scenario 8, per the routing table's default.

## Chosen approach

Diverge (Phase 2) was skipped: the PG reference screenshots plus all 12 AC scenarios already fix the page's structure (banner → 4 stat tiles → filter toolbar → table → per-row edit trigger → dialog), and every scenario maps to a scoped region of the existing Responses section. No structurally different option was worth proposing.

Built as an extension of existing components:

- `ReadTrackingCards` (form variant): 4 individual stat tiles replace the 1 combined `ConsentFormCard`.
- Guidance banner: new, `role="status"`, shown only when `post.status === 'open'`.
- `RecipientFilterPopover`: `PgStatusFilter` extended with `'cannot-respond'`; `ColumnKey` extended with `gender`, `comments` (both default-visible).
- `RecipientReadTable` / `UnifiedTable`: Gender + Comments columns added; an Edit-Response cell (link or restricted text) added per form row.
- New `EditResponseDialog`: Yes/No radio, per-question fields, comments textarea with a 500-char counter, a CMP-2 consequence line, submit with loading state, CMP-8 discard-confirm on unsaved-changes exit.
- `ConsentFormHistoryList`: unchanged component; a new "Response updated" entry appended after a successful edit.
- `PostDetailPage` → `ConsentFormDetail`: filter state lifted to controlled (previously uncontrolled, unlike `AnnouncementDetail`); owns dialog open/submit orchestration and patches local `post` state on success (the mock reply endpoint doesn't mutate server-side state).

## Rejected options

- No Phase 2 alternatives were proposed — structure was fixed by the AC/reference, per the modification loop's explicit allowance to skip Diverge in that case.

## Tradeoffs, named

1. **No new tabs.** Kept the current single-page layout rather than PG's Details/Responses tab split — consistent with how every other post detail page in this repo renders, at the cost of exact PG-reference parity.
2. **`onBoardedCategory` → `'cannot-respond'` mapping is an assumption.** The issue itself flags the backend contract as "pending grooming" — no confirmed raw enum value exists yet for this third status. Picked a placeholder (`'CANNOT_RESPOND'`) in the mapper and mock fixtures, clearly commented as an assumption to confirm with backend, rather than blocking the feature on an unanswered API question.
3. **No draft-persistence across page reloads for the edit dialog.** CMP-8's discard-confirm covers the same-session close case; it does not persist across a browser refresh. Acceptable given the form is short.

## Controls in scope

A11Y-1, A11Y-2, A11Y-3 (L0, non-waivable) · A11Y-6, A11Y-7, A11Y-9, A11Y-10, A11Y-11 · TOK-1, TOK-2, TOK-3 · TYP-1, TYP-2, TYP-3 · COL-2 · CMP-2 (L0 — judged applicable, see below) · CMP-3 · CMP-5 · CMP-6 · CMP-7 · CMP-8 · CMP-9 (confirmed already satisfied — plain-text rendering, no `dangerouslySetInnerHTML`) · SLP-5 (confirmed not tripped — tiles are interactive, not decorative) · SLP-9.

**CMP-2 judgment (resolved at grill):** editing a parent's response on their behalf overwrites their existing answer — confirmed with the builder this counts as a destructive action needing an explicit consequence statement, not just a plain save. Resolved as: a consequence line above the "Update response" button, dynamically stating what it overwrites (e.g. "This replaces [Parent name]'s current response of 'No'"), satisfying "not silent, states what will be lost" without a second nested confirm dialog.

**CMP-8 (grilled in):** the edit dialog is a data-entry task. Cancel/Esc/backdrop-click closes immediately if no field was touched; if any field changed, a discard-confirm ("Discard this response? Your entries won't be saved." / Keep editing / Discard) appears first. This wasn't explicit in an earlier exploratory pass at this issue — added here as a genuine improvement, not carried over by default.

## Waivers granted

| Control  | Tier | Reason | Approver | Where recorded |
| -------- | ---- | ------ | -------- | -------------- |
| — none — |      |        |          |                |

## Plan approval

- **Approved by:** Natasha Ann (builder, solo mode)
- **Approved on:** 2026-07-27

## Verify verdict

_Pending Phase 5._

## Ratchet

_Pending Phase 6._
