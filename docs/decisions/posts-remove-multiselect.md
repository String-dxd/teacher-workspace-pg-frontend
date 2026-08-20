# Design decision record — Posts list: remove multi-select delete

- **Date:** 2026-08-18
- **Product:** TW surface (Posts)
- **Change type:** modification
- **Page type:** workspace view
- **Run type:** attended
- **The teacher and the moment:** Ms. Lim, P5 Form Teacher, tidying her Posts list
  between lessons — one stale draft at a time, on a shared laptop, in a hurry.

## Sprint contract (done-criteria)

1. No checkbox appears anywhere on the My Posts list; multi-select delete is not
   reachable by mouse or keyboard.
2. Deleting a post is still confirmed before it executes. The sent-post path still
   states that parents lose it immediately, but confirms in one click — no typed
   `DELETE`.
3. The success toast names the post that was deleted, in one line, for any title
   length and for untitled drafts — identically whether the delete started on the
   list or on the post detail page.
4. The Title column occupies the space the checkbox column vacated with no left-edge
   gap, and stays pinned when the table scrolls sideways.
5. Shared posts remain undeletable.

## Chosen approach

Diverge skipped — a removal on a fixed structure, per the modification path.

Removed the checkbox column (header + row), the floating selection bar, the second
`DeletePostDialog` wired to bulk delete, and the selection state behind them
(`selectedIds`, `toggleSelect`, `toggleSelectAllInView`, `pagedSelectedCount`,
`allInViewSelected`, `someInViewSelected`, `selectedRows`, `bulkDeleteOpen`,
`bulkDeleting`, `bulkDeleteMode`, `confirmBulkDelete`, and the tab-change reset
effect). The selected-row tint went with it.

The Title column absorbed the vacated 44px: it moves from `sticky left-[44px] pl-2`
to `sticky left-0 pl-6`, in both the header and the row, so the first column aligns
with the page heading above it rather than leaving a gap.

`DeletePostDialog` lost its typed-`DELETE` gate for sent posts (builder's call,
mid-run). The heavier warning copy and the blunter `Delete for everyone` label stay,
so the consequence is still stated before the action executes; only the typing
friction is gone. `CONFIRM_WORD`, the `confirmInput` state, the `canDelete` gate and
the `Input`/`Label` block went with it, and `handleOpenChange` collapsed into
`onOpenChange` since there is no longer any input to reset.

The toast moves from the fixed `'Post deleted.'` to `'<title>' has been deleted.`,
matching the existing duplicate toast's shape. `postToastTitle()` renders untitled
drafts as `Untitled` — the same word `DeletePostDialog` already shows — and elides
past 60 characters so the toast stays one line.

The post **detail** page said `'Post deleted.'` too, so the same deletion announced
itself differently depending on where it was started. `postToastTitle()` therefore
lives beside `DeletePostDialog` and both pages import it, rather than the list page
owning a private copy. Deleting from either surface now reads identically.

## Rejected options

- **Keep the generic `Post deleted.`** — shorter and never awkward, but with the
  batch path gone the toast had a chance to confirm _which_ post went; several posts
  in a term carry near-identical titles.
- **Disable the checkboxes rather than remove them** — leaves dead affordance and
  keyboard-reachable controls that do nothing; fails the contract's first criterion.
- **Keep the typed `DELETE` for sent posts** — the stronger guard, and what the
  surface shipped with. Dropped on the builder's explicit instruction: with
  multi-select gone, a delete already costs a menu, a dialog and a deliberate click
  on a button labelled "Delete for everyone".

## Tradeoffs, named

Clearing many old drafts is now one delete at a time — genuinely slower for
end-of-term cleanup. Accepted deliberately: this change exists to make accidental
mass deletion impossible, and deletion of sent posts is irreversible for every parent
who already has it. The slow path is the safe path.

Second, and decided mid-run: deleting a post already sent to parents is now a
one-click confirm. The typed word was the last thing standing between a misread
dialog and content vanishing from every parent's app, and CMP-2 is satisfied either
way — it requires consequence plus confirmation, not a specific amount of friction.
This trades a real safety margin for speed on a genuinely irreversible action; it is
the builder's call, recorded here so it is visible rather than assumed.

Second: the row no longer has a non-navigating click target. Previously the checkbox
cell swallowed clicks; every part of the row now navigates. This is consistent with
the rest of the table and was already true of six of the eight columns.

## Controls in scope

CMP-2 (destructive confirm — the surviving path), CMP-3 (delete is async: loading via
the dialog's `Deleting…`, success toast, error toast), A11Y-11 (toast is a live
region; no focus move, and the removal deletes no announcement channel), A11Y-2
(keyboard reach — two controls removed, none added), CMP-6 (table semantics survive
column removal), CMP-7 (components at their defaults), LAY-6 (edge alignment of the
new first column), CNT-1/CNT-3 (toast copy), SLP-9 (no AI-writing tells in the new
string).

CMP-1: asserted, no manifest — `.dx/component-manifest.json` is absent from this repo;
no new component was introduced, and `Checkbox` was removed, not added.

## Waivers granted

None.

## Plan approval

- **Approved by:** Grace Chan (builder), in-session
- **Approved on:** 2026-08-18

## Verify verdict

- **Screenshots:** captured in-session at 1280 (list, row menu open, draft confirm
  dialog, sent-post confirm dialog, success toast for each) and at 375 (list, and the table scrolled 200px right to prove the
  pinned Title column). Not committed to the repo.
- **CMP-3 evidence:** success state captured as a frame (toast visible). Loading state
  **not** captured — the mocked delete resolves too fast for `Deleting…` to be
  photographed. Error state **not** captured — no fault-injection path exists in the
  MSW handlers for a failed delete. Both are pre-existing gaps in this surface's
  evidence, not introduced here; a human should witness them against a real API.
- **Dark mode:** N/A — product has no dark mode.
- **Verification ledger:**

  | Control                       | Method     | Evidence                                                                                                                       |
  | ----------------------------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------ |
  | Contract 1 (no checkboxes)    | manual     | Accessibility tree of `/posts` lists 13 interactive controls, none a checkbox                                                  |
  | Contract 2 (confirm survives) | manual     | Deleted a draft end to end: dialog read "This draft will be permanently removed. This cannot be undone." before executing      |
  | Contract 3 (toast names post) | manual     | Toast rendered `'Photography Club Outdoor Shoot' has been deleted.`                                                            |
  | Contract 4 (column alignment) | script     | Computed style at 375px, table scrolled 200px: header and body cell both `position: sticky`, `left: 0px`, `padding-left: 24px` |
  | Contract 5 (shared guard)     | manual     | Guard is `!isShared` on the row menu, untouched by this change                                                                 |
  | CMP-2                         | manual     | Typed-`DELETE` path for sent posts unchanged in `DeletePostDialog`                                                             |
  | A11Y-11                       | manual     | Toast still the only channel; no focus move added                                                                              |
  | Regression                    | script     | `tsc --noEmit` exit 0; `oxlint` clean but for the pre-existing `exportXlsx.test.ts` warning; 358/358 tests in 27 files         |
  | A11Y-2 (focus ring)           | unverified | `:focus-visible` does not fire under synthesized key events — a human should tab the row menu with a real keyboard             |
  | LAY-2 (320px reflow)          | unverified | Verified at 375, not 320; the browser pane's layout viewport does not reliably follow its visual viewport below 360            |

- **Evaluator verdict:** not run — no independent reviewer agent was spawned this run.
  All verification above is direct browser interaction and script output in-session.

## Ratchet

- **Raise on the ticket:** the e2e snapshot `e2e/posts-dashboard.spec.ts-snapshots/posts-dashboard-chromium-darwin.png`
  still shows the checkbox column and will fail until regenerated with
  `pnpm test:e2e:update`. Playwright browsers are not installed on this machine, so
  this was not run here.
- **Ratchet:** no proposal — nothing uncovered by an existing control.

## Addendum — School Posts carries the same treatment (2026-08-20)

Requested after approval: everything above had to hold when the scope switcher is
set to **School posts**, not only My Posts. At the time this record was written that
option was a disabled "Coming soon" item, so there was no second scope for any of it
to apply to. The scope itself already existed on the unmerged `postadminview` branch
(`4bb713b`), which predates the multi-select removal; it was ported onto this branch
rather than merged, because it was written against the pre-removal page.

What the port brings: `scope` state, the `/announcements/schoolAdmins` and
`/consentForms/schoolAdmins` loaders (sent posts only — admin oversight does not
cover other teachers' unsent drafts), other-teacher fixtures, `isA` from the session
in place of the hardcoded `IS_ADMIN`, a scope-aware column set, and a filter popover
that hides Status and Ownership where a whole-school view cannot use them.

What this change adds on top, so the treatment actually reaches the second scope:

- The **stacked phone row** is scope-aware. It was written after `postadminview`
  branched, so the school scope had no phone presentation at all; without this, the
  1150px table would have been the only way to read school posts on a 360px screen —
  the exact defect the critique raised.
- **Delete** is one click, one post, through the same `DeletePostDialog` and the same
  `postToastTitle` toast, in both scopes. The guard differs by design: My Posts hides
  Delete on anything shared; School Posts is oversight, so an admin can delete any
  row. Contract criterion 5 ("shared posts remain undeletable") is therefore scoped
  to My Posts, and deliberately so — see the tradeoff below.
- **Duplicate** is hidden in School scope: copying a colleague's post into your own
  drafts is not what an oversight view is for.
- The `h1`, the `main` landmark, the pinned header, and the right-aligned tabular
  counts hold across both scopes. The counts column keeps its position when the scope
  changes, so the ratios stay in one place as you switch.
- The Status column is dropped in School scope — every row there is already sent, so
  it would read identically on all of them — and the creator takes its slot, in the
  table and in the badge slot of the stacked row.

Two behaviour changes ride along from `4bb713b` and touch **My Posts too**, not only
the new scope: the Response Required / Read Only tabs now split on `responseType`
rather than post kind (an Acknowledge announcement is no longer forced into Read
Only), and an Acknowledge/Yes-No announcement's counts read `responseCount` rather
than `readCount`. Both are corrections, and both are visible on the existing page.

**Tradeoff, named:** deletion of a post the admin did not write is now reachable in
two clicks, on content already in parents' hands, with no typed confirmation — the
combination of this change and the one-click confirm decided above. The dialog still
states that parents lose it immediately. This is the sharpest edge in the change and
is recorded rather than assumed.

**Not deliberately ported:** the pagination page-number restyle from `4bb713b`
(ghost + `rounded-full` + border in place of the `secondary` variant). It is unrelated
to scope and the current styling came out of the design critique above.

### Verify verdict (addendum)

- **Browser evidence: none.** Neither browser surface could run the app this session —
  the in-app pane cannot register a service worker, so MSW never boots and the page
  never renders, and the Chrome extension was not connected. **Nothing below was seen
  on screen; a human should look at both scopes, including at 375px.**
- **Covered by test instead:** `src/features/posts/pages/PostsListPage.test.tsx` is
  new and asserts, in School scope, the `h1` + `main`, the stacked row and its
  creator, Delete offered on a post the viewer did not create, Duplicate absent, the
  dialog with no confirmation textbox, the dropped Status column, and that the
  switcher is hidden entirely for a non-admin.
- **Regression:** `tsc --noEmit` exit 0; `oxlint` clean but for the pre-existing
  `exportXlsx.test.ts` warning; 368/368 tests in 28 files.
- **Still unverified:** everything in the ledger above marked unverified, plus the
  visual result of the scope-aware column swap at any width.
