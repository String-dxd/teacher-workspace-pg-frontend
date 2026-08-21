# Design decision record — PG onboarding modal

- **Date:** 2026-08-11
- **Product:** TW surface (Posts / PG Staff Portal)
- **Change type:** new component (`PgOnboardingModal`), mounted in the Posts route layout
- **Page type:** onboarding overlay on an existing workspace view
- **Run type:** attended
- **Ticket:** [String-dxd/teacher-workspace#43](https://github.com/String-dxd/teacher-workspace/issues/43)
- **The teacher and the moment:** Mrs. Lim, who sent Announcements and Forms through the old TW flow for two terms, opens Posts for the first time after PG launched — mid-task, likely trying to send something.

## Sprint contract (done-criteria)

1. Fires the first time a teacher enters any `/posts` route; never again after dismissal, persisted across sessions.
2. Maps old → new terms explicitly (ticket AC2).
3. Says what PG brings into TW (ticket AC1).
4. Reuses the existing TW modal convention rather than inventing one (CMP-1, CMP-7).
5. Dismissible; the page underneath stays fully usable afterward.
6. Additive only — no regression to `PostsListPage`.

## Chosen approach

**Single page**, mirroring the host shell's `WelcomeModal`: illustration, heading, two body paragraphs, one right-aligned CTA.

> **Parents Gateway lives here now**
>
> The same tools you know, in the same place as everything else. Your posts and drafts came across with you.
>
> Announcements and Forms are both called Posts now. You pick Read Only or Response Required when you create one.
>
> `Get started`

**It was a two-step flow first.** The builder originally chose two steps (rename, then the move), and it was built, critiqued, and fixed through several rounds. It collapsed to one page late: two paragraphs carry both messages inside `WelcomeModal`'s own structure, and the stepper cost real machinery — step state, Skip/Back, height-matching between steps, a live-region step counter, and an `initialFocus` guard to stop Enter landing on "Skip" and discarding the orientation. None of that is needed on one page.

**Terminology diverges from the ticket, deliberately.** The issue says "Posts with responses"; the product says **"Response Required"** — in the list tabs (`PostsListPage.tsx`) and the create options (`PostTypePicker.tsx`). Teaching the ticket's phrase would send a teacher hunting for a term that appears nowhere in the UI (CNT-11). **Worth raising on the ticket.** "Forms / Consent" was also cut to just **"Forms"** — consent is not a user-facing term here, though it survives internally (`ConsentFormPost`, `/consentForms`, `/posts/consent-forms/:id`).

**The rename is prose, not a before/after list.** An earlier cut showed it as two rows (`Announcements → Posts · Read Only`). That is eight things to parse — two old names, two arrows, "Posts" twice, two pills — to learn one fact, and it repeated the one word that isn't changing. A sentence carries it.

**Mounted in `PostsLayout`, not `PostsListPage`,** so a teacher who deep-links straight into a post or the create flow still gets it. `PostsLayout` also wraps `/posts/maintenance` and `/posts/unauthorised` (arriving with #118 and #129), so the modal suppresses itself there and leaves the flag unwritten — an orientation modal on a dead end is noise, and burning the flag on a visit where the teacher never reached Posts would cost them the real showing.

## Rejected options

- **Two steps** — built and refined, then collapsed. Both messages fit one page without cutting anything.
- **Icon tiles instead of the illustration** — diverged from `WelcomeModal`; size and styling consistency with the host shell was the binding constraint.
- **Shrinking the illustration to 160px** — applied after a critique found it takes ~50% of the modal height and wins the squint test, then reverted for the same reason. The finding stands and is accepted as a deliberate trade.
- **Renaming the product's tabs to match the ticket** — bigger than this ticket, needs its own sign-off.

## Tradeoffs, named

- **The illustration is stock and carries neither message.** It takes about half the modal and wins the squint test. Accepted so the modal reads as the same product as `WelcomeModal`.
- **`localStorage`, not a server flag.** Per-browser, so a teacher on a second device sees it again. The ticket left the mechanism open; this matches the repo's existing convention and needs no API work.
- **A backdrop click closes without persisting.** Slightly surprising, deliberately: found during critique that one mis-aimed click permanently discarded the orientation. Only Escape and the CTA count as dismissal.

## Controls in scope

CMP-1 (v0-limit, asserted — no component manifest in this repo), CMP-5, CMP-7, A11Y-1/2/3, TOK-1..3, TYP-1..3, COL-1/2, SLP-1..11, IDN-2/3, CNT-1/3/6/9/10/11/12/13/14, MOT-1, LAY-2/4/5/7.

## Waivers granted

None.

## Verify verdict

| Control | Method | Evidence |
|---------|--------|----------|
| Trigger + persistence | manual, live | Fires on first `/posts` visit; `Get started` writes `localStorage['pg-onboarding-seen']`; absent on reload |
| Backdrop click is forgiving | manual, live | Real backdrop click closes it, flag stays `null`, modal reappears on reload |
| Size parity with WelcomeModal | measured, live | Modal 448px, illustration 256×256 — identical to `WelcomeModal` measured under the same viewport |
| Regression | script | `tsc --noEmit` exit 0; `oxlint` clean; full suite 358/358 |
| A11Y-1 (contrast) | inherited | Body and title use the same semantic tokens as `WelcomeModal`; no new colours introduced |
| **A11Y-2 (focus ring)** | **not photographed** | `:focus-visible` does not fire under synthesized key events. The CTA is a stock `Button` with no focus override. **A human should confirm with a real keyboard.** |
| **LAY-2 (320px reflow)** | **not photographed** | The browser pane's layout viewport did not follow its visual viewport, so the fixed-position dialog rendered outside the frame. `max-w-[calc(100%-2rem)]` applies below `sm`. **A human should confirm at 320/360.** |

**Dark mode:** N/A — product has no dark mode.

**Evaluator verdict:** not run — no independent evaluator agent was spawned. All verification above is direct browser interaction and script output in-session.

## Dev hook

No dedicated toggle. To re-trigger during review:

```js
localStorage.removeItem('pg-onboarding-seen')
```

Then reload any `/posts` route.

## Ratchet

- **Raise on the ticket:** the "Posts with responses" vs "Response Required" mismatch between spec and product.
- **Raise in the moe repo:** `WelcomeModal` is unreachable in production — mounted inside `RequireAuthGate` (renders only when `isLoggedIn`) but hides itself whenever `isLoggedIn`. Those conditions never overlap.
- **Raise in the moe repo:** `WelcomeModal`'s "Beta" pill uses `text-twblue-9` at `text-xs` on `twblue-3` — measures ~4.4:1, under the AA floor. One-token fix to `twblue-11`.
- **Raise in the moe repo:** `WelcomeModal`'s `max-w-xs` never applies — `sm:max-w-md` from the base `Dialog` wins at desktop, so it renders at 448px, not 320px. This modal carries the same class for parity.
