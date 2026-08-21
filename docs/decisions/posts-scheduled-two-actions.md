# Design decision record — Scheduled post: two actions

- **Date:** 2026-08-20
- **Product:** TW surface (Posts)
- **Change type:** modification
- **Page type:** detail view
- **Run type:** attended
- **The teacher and the moment:** Ms. Lim has a post queued for Monday morning and
  the trip it announces has just moved. She wants to push the send back, or stop it
  and rewrite — nothing else.

## Sprint contract (done-criteria)

1. A post with `status === 'scheduled'` offers exactly two actions: **Reschedule**
   and **Cancel send**. No Delete, no Edit.
2. Reschedule opens the existing schedule picker.
3. Cancel send returns the post to Draft, and the badge says so.
4. Both actions are reachable from the posts list without typing a URL.
5. Neither action confirms through a native browser dialog.

## Chosen approach

The header action group branches on `isScheduled` rather than accumulating buttons.
While scheduled it renders Cancel send + Reschedule; otherwise it renders the
previous Delete + conditional Edit unchanged.

Delete and Edit are **hidden, not disabled**, and not removed from the product —
they live behind Draft, which cancelling the send returns the post to. That is the
whole argument for two options: a scheduled post does two things, and the way to do
anything else is to stop the send first. The cost is that discarding a scheduled post
is now two steps.

`window.confirm` is replaced by `CancelSendDialog`, modelled on `DeletePostDialog`
but deliberately **not** destructive-styled — nothing is lost, the content survives
intact. Its buttons are "Keep it scheduled" and "Cancel send", both naming their
outcome, so neither reads as the safe default by position alone.

Reaching the actions needed two fixes, not one. A scheduled row was deliberately
unclickable, and `postHref` routes anything scheduled to `drafts/:id/edit` — so
merely enabling the click landed on the full editor. `rowHref` carries the exception:
scheduled rows go to the detail page, everything else defers to `postHref`.

The MSW handlers now hold cancelled schedule ids and answer as the backend would.
Without that the flow looked broken — cancel succeeded and the post still read
Scheduled, because the fixtures are static.

## Rejected options

- **Disable Delete and Edit rather than hide them** — a disabled control that never
  explains itself reads as a bug, and there is nowhere on this header to put the
  explanation.
- **Keep Delete on a scheduled post** — defensible, since discarding a queued post is
  a real intent. Rejected because it reintroduces a third action on a screen whose
  brief was two, and Draft already provides the route.
- **Change `postHref` instead of adding `rowHref`** — smaller diff, wider blast
  radius; `postHref` has callers beyond this list. If the exception proves general,
  `postHref` is its proper home.

## Tradeoffs, named

Discarding a scheduled post costs two steps instead of one: cancel the send, then
delete the draft. Accepted — the brief asked for two actions, and this is what makes
that count honest rather than achieved by hiding a third somewhere else.

Scheduled rows are now clickable, so the row no longer has a non-navigating state.
Consistent with every other status on the table.

## Controls in scope

CMP-2 (confirmation before a state change — Cancel send now confirms in-app rather
than through the browser), CMP-3 (async: `Cancelling…` on the primary, success toast,
error toast), CNT-1/CNT-3 (dialog and toast copy), SLP-9 (no AI-writing tells in the
new strings), A11Y-2 (keyboard reach — two buttons removed while scheduled, two
present).

## Waivers granted

None.

## Plan approval

- **Approved by:** Grace Chan (builder), in-session, from a published preview
- **Approved on:** 2026-08-20

## Verify verdict

- **Method:** driven against the running app in Chrome via Playwright, MSW serving
  the fixtures. The in-app browser pane cannot register a service worker, so MSW
  never boots there and the page does not render; this is why capture goes through
  Chrome.
- **Verification ledger:**

  | Contract                | Method | Evidence                                                          |
  | ----------------------- | ------ | ----------------------------------------------------------------- |
  | 1 (exactly two actions) | script | Header buttons read `["Cancel send", "Reschedule"]`               |
  | 2 (picker opens)        | manual | SchedulePickerDialog, "Choose when parents receive this post"      |
  | 3 (returns to Draft)    | script | Badge `Scheduled` → `Draft`; actions become `["Delete", "Edit"]`  |
  | 4 (reachable)           | script | Row click lands on `/posts/announcements/201`                     |
  | 5 (no native confirm)   | script | `window.confirm` spy not called; `role="dialog"` present instead   |
  | Regression              | script | `tsc --noEmit` exit 0; `oxlint` clean but the pre-existing         |
  |                         |        | `exportXlsx.test.ts` warning; 375/375 tests across 29 files        |

- **Dark mode:** N/A — product has no dark mode.
- **Evaluator verdict:** not run — no independent reviewer agent was spawned.

## Ratchet

- **Raise on the ticket — blocking, needs a backend answer.** A scheduled
  announcement lives as a *draft* on the wire; cancelling posts to
  `/announcements/drafts/201/cancelSchedule`. The mock serves
  `GET /announcements/201` for it, but the real API may not, in which case `rowHref`
  should target the draft endpoint instead. Everything here rests on fixture
  behaviour and must be confirmed before merge.
- **Raise on the ticket:** the mock's cancelled state is per page load — a browser
  refresh puts the post back to Scheduled. Fine for a demo, misleading mid-walkthrough.
- **Raise on the ticket — pre-existing, untouched:** the scheduled detail header
  reads `Posted <created date>` on a post that has not been sent, and shows a
  `Read by parents 0 / 0` card. Outside this change's brief.
- **Ratchet:** no proposal — nothing uncovered by an existing control.
