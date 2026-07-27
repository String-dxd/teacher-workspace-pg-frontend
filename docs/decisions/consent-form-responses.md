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

| Scenario                                                              | E2E test file                        | Passed / failed |
| --------------------------------------------------------------------- | ------------------------------------ | --------------- |
| 1. Response summary stats displayed                                   | `e2e/consent-form-responses.spec.ts` | Passed          |
| 2. Guidance banner shown                                              | `e2e/consent-form-responses.spec.ts` | Passed          |
| 3. Per-student table columns                                          | `e2e/consent-form-responses.spec.ts` | Passed          |
| 4. Table columns configurable                                         | `e2e/consent-form-responses.spec.ts` | Passed          |
| 5. Filter by stat card click                                          | `e2e/consent-form-responses.spec.ts` | Passed          |
| 6. Filter by status dropdown                                          | `e2e/consent-form-responses.spec.ts` | Passed          |
| 7. Filter by class                                                    | `e2e/consent-form-responses.spec.ts` | Passed          |
| 8. Edit response on behalf                                            | `e2e/consent-form-responses.spec.ts` | Passed          |
| 9. Edit blocked when mandatory fields missing                         | `e2e/consent-form-responses.spec.ts` | Passed          |
| 10. Restricted for onboarded before due date (open + closed variants) | `e2e/consent-form-responses.spec.ts` | Passed          |
| 11. Edit available for non-onboarded / cannot-respond                 | `e2e/consent-form-responses.spec.ts` | Passed          |
| 12. Reply audit history visible                                       | `e2e/consent-form-responses.spec.ts` | Passed          |

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

- **Screenshots:** `docs/decisions/assets/consent-form-responses/` (committed alongside this record) — width evidence at 360/768/1280 (`360-open-default.png`, `768-open-default.png`, `1280-open-default.png` + `1280-open-table-scrolled.png` for the columns past the fold), the closed-form state (`1280-closed-default.png`, `1280-closed-table-scrolled.png`), both toolbar popovers (`filter-popover.png`, `filter-popover-fixed.png` after the Response/Onboarding relabel, `columns-popover.png`), and the full dialog journey (`dialog-empty.png`, `dialog-yes-selected.png`, `dialog-validation-error.png`, `dialog-loading.png`, `dialog-success-toast.png`, `dialog-error-toast.png`).
- **REQUIRED CMP-3 evidence (loading/success/error):** all three captured. The mock reply endpoint resolves near-instantly, so the loading frame required a temporary artificial delay (`delay(800)` in `src/mocks/handlers.ts`) and the error frame required temporary fault injection (a 500 response) — both reverted immediately after capture; `git diff --stat src/mocks/` shows only the intended reply-endpoint addition remains.
- **Token block line range:** N/A — no `tfx-tokens` exemption region used in this change.
- **Dark mode:** N/A — product has no dark mode. Confirmed by grep: no `.dark`/`data-theme` re-rendering layer or theme toggle exists anywhere in `src/`; the few `dark:` Tailwind classes on stack primitives (`button.tsx`, `dialog.tsx`) never resolve.
- **E2E:** all 14 tests in `e2e/consent-form-responses.spec.ts` pass, confirmed clean across 5 separate runs (including after every fix round below). The full existing suite has a 13-failed/8-not-run baseline that reproduces identically on completely unmodified spec files (`posts-dashboard.spec.ts`, `reminders.spec.ts`, `routing.spec.ts`) run in isolation — a dev-server/Module-Federation cold-start race in this sandbox, not a regression from this change. This exact 13/8 count matches what a prior, separate exploratory pass at this same issue (branch `design/consent-form-responses-edit-on-behalf`, not part of this run) documented as its own pre-existing baseline before any of its changes — independent corroboration this is environmental.

### Evaluator pass 1 — VERDICT: fail

The evaluator (a separate agent, spawned per the harness's orchestrator-dispatch rule) returned 2 BLOCKING findings against files this change edits:

- **A11Y-3 (L0):** the recipient-table search input had a placeholder only, no accessible name.
- **TYP-2 + TYP-3 (L1):** the active-filter-count badge used `text-[11px]` (below the 12px floor, off-scale).

Both are pre-existing (not on lines this change originally touched), but per the harness's own rule — "preserved is not waived," L0 is never waivable, and no L1 waiver was on file — both were fixed rather than deferred:

- Added `aria-label="Search students"` to the search `Input` (`RecipientReadTable.tsx`).
- Changed the badge to `text-xs` (`RecipientFilterPopover.tsx`).

The same pass also surfaced a real correctness bug in this change's own new code, filed as a SUGGESTION but fixed anyway given CMP-8/CMP-2 relevance: `EditResponseDialog.tsx`'s discard-confirm sub-view let Esc/backdrop fall through to _confirm_ the destructive discard instead of backing out to editing (the safe default). Fixed in `handleRootOpenChange`.

Also flagged (CNT-10, ADVISORY): renaming the Yes/No form's response column from "Status" to "Response" (this change's own decision, matching AC's column naming) left the filter popover's matching section still labelled "Status," alongside a second, unrelated "Status" section for PG-onboarding — two identically-labelled sections in one popover. Fixed: the response-status filter section and its filter-chip prefix now read "Response" (yes-no forms only; unchanged for view-only/acknowledge); the PG-onboarding section renamed "Onboarding."

### Evaluator pass 2 (fresh agent, re-verifying the fixes) — VERDICT: pass-with-findings

```
BLOCKING (must fix before ship):
- None. Both prior BLOCKING findings are independently confirmed fixed:
  - A11Y-3 (L0) — RecipientReadTable.tsx now carries aria-label="Search students" on
    the search Input. checks/a11y-static.py runs clean.
  - TYP-2 + TYP-3 (L1) — the active-filter-count badge is now text-xs; type-scan
    reports only the two out-of-scope TYP-4 lines, zero TYP-2/TYP-3.

ADVISORY (should fix):
- CNT-10 (L1) residual term drift — "Onboarding" (filter/chip) vs "Status" (table
  column/toggle) for the same pgStatus field. [Fixed after this pass — see below.]
- CNT-10 on the sibling acknowledge-consent path (not in-scope, derived from code) —
  for responseType === 'acknowledge', the response column AND the pgStatus column
  are both titled "Status" — a pre-existing collision this change didn't introduce
  (acknowledge-type forms are explicitly out of scope per issue #35). Not fixed;
  recorded for a future acknowledge-forms pass.
- CMP-7 (L2) mixed PG-status badge treatment, accepted with reason — "Onboarded"
  keeps a custom twblue pill while "Not Onboarded"/"Cannot Respond" use
  Badge variant="secondary". A full fix needs a new brand-colour Badge variant,
  a design-system change beyond this modification's scope. Contrast re-checked
  clean under A11Y-1. Agreed as sound reasoning by the evaluator.
- TYP-4 (L2) uppercase micro-labels, unfixed on purpose — confirmed present at
  exactly the same 4 pre-existing sites as pass 1, no new instances. Pervasive,
  deliberate pattern; deferred to a ratchet decision (see Ratchet below).
- CMP-9 boundary note (not in the graded region) — a dangerouslySetInnerHTML exists
  in the sibling PostPreview.tsx (pre-existing, renders the teacher's own authored
  post, outside the Responses region this change touches). In-scope cross-user
  content (comments, question answers) renders as plain text — CMP-9 holds for the
  graded surface.

SUGGESTIONS:
- Explicit focus-visible ring on raw <button>s that bypass the Button component
  (Edit Response cell, chip-remove, popover Reset/Show-all/Hide-all) for visual
  consistency with the ring used elsewhere. [Not applied — cosmetic-only,
  UA focus outline is present, no control violation.]
- Reconsider the "Status" section heading above the recipients table
  (PostDetailPage.tsx) given the Response/Onboarding vocabulary nearby.
  [Not applied — the heading titles the whole card, not a field; judged
  low-value churn for a suggestion-tier item.]

QUALITY GRADES: design quality strong / originality acceptable / craft strong /
functionality strong / dark mode N/A

JUDGMENT CONTROL NOTES: CMP-2 pass, CMP-8 pass (Esc/backdrop-on-confirm fix
independently re-derived and confirmed correct), CMP-9 pass, CMP-7 pass-with-caveat,
CNT-10 pass-with-caveat, CNT-14 pass, IDN-3 pass, SLP-9 pass, SLP-5 pass, A11Y-8 pass,
COL-2 pass.

VERIFICATION LEDGER:
| Control | Method | Evidence |
|---------|--------|----------|
| A11Y-1  | script | checks/contrast.py --tokens src/index.css clean on all changed components incl. the twblue pill |
| A11Y-2  | manual | every interactive control carries focus-visible:ring or the UA outline; no global outline reset |
| A11Y-3  | script | checks/a11y-static.py clean; aria-label confirmed on the search input |
| A11Y-6  | manual | all icons decorative or paired with visible text/aria-label |
| A11Y-7  | manual | real table/thead/tbody; stat tiles wrapped role="group" aria-label |
| A11Y-8  | manual | aria-pressed tracks active ring; RadioGroups aria-labelledby |
| A11Y-11 | manual | toast (live region) for success/error, role="status" banner, no double-announce |
| TOK-1   | script | checks/token-audit.py clean on all changed components |
| TYP-1   | script | checks/type-scan.py — no findings |
| TYP-2   | script | checks/type-scan.py clean (badge fixed to text-xs) |
| TYP-3   | script | checks/type-scan.py clean |
| TYP-4   | script | checks/type-scan.py — 4 pre-existing, out-of-scope sites, no new instances |
| COL-2   | manual | status colours sourced from Radix/token scales |
| CMP-2   | manual | consequence line names object + states overwrite; discard copy sober |
| CMP-3   | manual | loading/success/error states all present and reachable |
| CMP-5   | manual | destructive variant distinct from primary/ghost |
| CMP-6   | manual | semantic Table/TableHead/TableRow/TableCell |
| CMP-7   | manual | recorded twblue "Onboarded" override vs. sibling Badge usage |
| CMP-8   | manual | confirmingDiscard state machine re-derived independently; Esc/backdrop backs out to editing |
| CMP-9   | script | grep for dangerouslySetInnerHTML/v-html clean on in-scope components |
| CNT-10  | manual | response/onboarding terms collected across filter, chips, headers, toggle, dialog |
| CNT-14  | manual | calm/precise tone on dialog, banner, toasts |
| IDN-3   | manual | plain TW register, no switched voice |
| LAY-2   | manual | 360px screenshot reflows correctly, no page-level clipping |
| LAY-7   | manual | banner → tiles → table → history matches task priority |
| SLP-5   | manual | tiles are interactive filters, not decorative |
| SLP-9   | manual | copy free of AI-tell filler |
| A11Y-4  | unverified | hit-area needs computed layout — flag for a human |
| LAY-1/3/4/5/6 | unverified | no declared grid in .tfx/design.json; not computed this pass |

UNCOVERED: None new. TYP-4 uppercase pattern remains the standing ratchet candidate.
```

### Fix applied after evaluator pass 2 (not re-verified by a third full pass)

The CNT-10 "Onboarding vs. Status" residual drift the second pass flagged as ADVISORY ("to fully close it, relabel the table column + toggle to Onboarding") was closed: the `pgStatus` table column header and the Show/hide-columns toggle label for Yes/No forms now also read "Onboarding" (`RecipientReadTable.tsx`, `RecipientFilterPopover.tsx`; unchanged for view-only/acknowledge forms). Re-verified directly (not via a third evaluator round, since this is a low-risk, purely mechanical label-threading change already covered by the same reasoning the second pass endorsed): `pnpm typecheck`/`lint`/`test` clean, `type-scan.py` unchanged (same 2 pre-existing TYP-4 hits, no new ones), all 14 E2E tests still pass, and `filter-popover-fixed.png` confirms the popover no longer shows two "Status" sections.

## Ratchet

- **TYP-4 vs. CMP-7 tension (proposed — pending design-lead approval):** the uppercase micro-label convention (`text-xs font-semibold tracking-[0.14em] uppercase`) is used identically across `ResponseCard`, the new `StatTile`, and both popover section headers — simultaneously CMP-7-consistent and TYP-4-non-compliant everywhere it appears. Both evaluator passes confirmed this is pervasive and pre-existing, not introduced by this change. Proposing a catalog decision: either a registered TYP-4 exception for this established micro-label convention, or a tracked migration of all instances to sentence case. Not resolved by this change — flagged for the design lead.
- **Pre-existing CMP-3 silent-swallow pattern (out of scope, confirmed accurate, not a new defect):** `if (!(err instanceof AppError)) notify.error(...)` in `PostDetailPage.tsx`'s `handleRescheduleConfirm`/`handleCancelSchedule` and the analogous `CreatePostPage.tsx` save/schedule/send handlers leaves a bare unmapped-500 `AppError` with no visible feedback. This change deliberately did not copy that pattern into `EditResponseDialog.tsx` (its catch unconditionally toasts). Worth a follow-up ticket against those pre-existing call sites — not this change's scope.
- **Acknowledge-type consent forms' double-"Status" column collision (out of scope):** for `responseType === 'acknowledge'`, the response column and the PG-status column are both titled "Status" — pre-existing, unrelated to this change (acknowledge-type response tracking is explicitly out of scope per issue #35). Worth fixing whenever that surface is next touched.
