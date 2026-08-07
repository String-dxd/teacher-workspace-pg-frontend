# Design decision record — My Reports page

> Started at the Phase 3 plan gate; finished at Phase 6.

- **Date:** 2026-07-30
- **Product:** TW surface (Posts / PG Staff Portal)
- **Change type:** new page (`/reports`)
- **Page type:** workspace view (generator/download panel, not a data table)
- **Run type:** attended
- **The teacher and the moment:** Ms Tan Wei Ling, homeroom teacher of 3A, pulling an onboarding roster at the start of term or a travel-declaration list before a school holiday.

## Sprint contract (done-criteria)

1. Header, admin banner, and scope-dropdown structure match `PostsListPage` (CMP-7).
2. Onboarding/Travel declaration switching reuses the exact `Tabs` pattern from Posts.
3. Download has real loading/success/error states (CMP-3), not asserted ones.
4. Declaration-status and date fields reuse this app's own established patterns (bordered radio row, the `rounded-[14px]` picker trigger already used 3x elsewhere) — no new one-off styling.
5. Own Module-Federation-style feature slice (`src/features/reports/`), mounted at `/reports/*`, alongside `posts`/`groups`.

## Chosen approach

Single-page, Tabs-on-top structure (matches the "similar to My Posts, be consistent" brief). School reports is a real second scope (not a "Coming soon" placeholder, per grill) — selecting it swaps the class label for the school name (`session.schoolName`), since a school-wide report has no single class to pick (corrected mid-build: the first cut wrongly added a class picker under School reports; the actual requirement is "download for the whole school").

**Redesign round:** built and live-previewed 4 structural alternatives (Sectioned — stacked Cards per `CreatePostPage`'s own multi-section convention; Sidebar — settings-style left-rail report picker; Catalog — Xero/QuickBooks-style expandable report list; Compact — single dense toolbar) behind a temporary in-page switcher. Builder chose to keep the original single-card structure ("stick to current"). All four alternatives and the switcher were removed before shipping — dev-only scaffolding, never intended to ship.

**Post-pick refinement:** on the Travel declaration tab, added a `Separator` between the date-range fields and the Download button — the same divider treatment the Onboarding tab's footnote already gets, giving the action its own visual beat instead of running straight off the fields.

## Rejected options

- **Sectioned** — genuinely grounded in `CreatePostPage`'s own precedent (multi-card sections), and my own top recommendation. Not picked; builder preferred the smaller footprint of the single card.
- **Sidebar** — bigger structural swing (changes the page template to settings-style); would only be worth it if a third report type appears.
- **Catalog** — closest runner-up to Sectioned; scales better long-term but wasn't picked.
- **Compact** — explicitly flagged as the roughest of the five (density issues in `DateRangeFields`, unfixed `SelectValue` label bug); offered for completeness, not seriously proposed.
- **Class picker for School reports** (first cut) — wrong: rejected and replaced with the school-name display once the actual requirement (whole-school download, not per-class) was clarified.

## Tradeoffs, named

- Single dense card (not Sectioned) trades some breathing room for a smaller page footprint — accepted by the builder.
- The uppercase eyebrow-label convention is preserved to match Posts, even though it technically reads as TYP-4 "all-caps" — see waiver below. Fixing it only on this page would have made Reports *less* consistent with Posts, working against the brief.
- Mocked reports return a real downloadable CSV blob (not a toast-only stub) so CMP-3's loading/success/error states are genuinely demonstrable, not asserted.

## Controls in scope

CMP-1/3/5/7, A11Y-1/2/3/8/11, TOK-1..3, COL-1/2, TYP-2/3/4, CNT-2/3/9/10/12/14, SLP-9/11, IDN-3, MOT-1, LAY-3/5/7.

## Waivers granted

| Control | Tier | Reason | Approver | Where recorded |
|---------|------|--------|----------|----------------|
| TYP-4 | L2 | Eyebrow-label `uppercase` matches the section-eyebrow-label convention used 10+ times across Posts (`PostCard`, `CreatePostPage`, `ConsentFormHistoryList`, `RecipientFilterPopover`, `SendConfirmationDialog`, `PostPreview`, `EntitySelector`) — an established house pattern, not a one-off. Unilaterally fixing only this page would reduce consistency with Posts. | Builder (in-session) | Inline `tfx-waive` comment in `ReportsListPage.tsx`, and here |

> L0 controls are never waivable — see the A11Y-2 fix below, which was not waived.

## Plan approval

- **Approved by:** Grace Chan (builder) — via the two-question grill (School reports scope, eyebrow copy) plus icon choice, then explicit Approve
- **Approved on:** 2026-07-30
- **Post-approval scope correction:** School reports' class picker was wrong and replaced with the school-name display, per direct builder correction mid-build (not re-grilled — small, unambiguous fix).
- **Redesign round:** re-opened post-ship via `/tfx:design "redesign this page"`; 4 live alternatives built and shown; builder picked "stick to current" after review.

## Verify verdict

**Standards check (`/tfx:standards`), run against `src/features/reports/`:**

| Control | Method | Evidence |
|---------|--------|----------|
| TOK-1/2/3, COL-2 | script | `token-audit.py src/index.css src/features/reports/` — clean (amber tokens resolve via the project's own `--color-amber-*` theme declarations) |
| **A11Y-2 (L0)** | script + manual | `a11y-static.py` initially failed: "My Reports" scope-dropdown trigger had `outline-none` with no `focus-visible` replacement (copied from Posts' identical, also-unfixed trigger). **Fixed** — added `focus-visible:ring-2 focus-visible:ring-ring/50` (matching the date-picker triggers' own convention). Re-ran script: clean. Also confirmed live via `element.focus()` + `:focus-visible` match + computed `box-shadow` — real 2px ring renders. |
| TYP-4 | script (waived) | `type-scan.py` flags the eyebrow `uppercase` class; L2 waiver recorded above and inline — script correctly still reports it (waivers don't silence L1/L2 findings, a human closes the loop) |
| Contrast (A11Y-1) | script | `contrast.py --tokens src/index.css` — clean |
| Content-lint | script | clean, no findings |
| A11Y-3, A11Y-8 | manual | Every field (`Label` + control) has a programmatic/visible label; `DeclarationStatusOption` exposes `type="radio"` with a visible label; verified via the browser accessibility tree (role/name/state correct on every control) during interactive testing this session |
| CMP-3 | manual | Loading ("Generating…"), success (toast + file download), and error (inline `role="alert"`, demo-triggered via mock classId 303) all exercised live in the browser this session |
| LAY-2 (320px reflow) | unverified | Not captured at 320px in this session — flag for a follow-up pass |

**Dark mode:** N/A — product has no dark mode.

**Evaluator verdict:** not run — no `evaluator` agent was spawned for this page; all verification above is direct script output plus manual browser interaction by the builder and me in-session, not an independent evaluator pass.

## Ratchet

- **Flagged, not fixed:** the identical A11Y-2 defect (`outline-none`, no `focus-visible` replacement) exists on Posts' own "My Posts" dropdown trigger (`PostsListPage.tsx`) — the source this page's header was copied from. Real, shipped, L0. Out of scope for this record since it's a different page; surfaced to the builder for a separate fix.
- **Ratchet candidate:** TYP-4 is being waived here with the same reasoning that would apply to 10+ pre-existing, unwaived uses across Posts. Worth a catalog-level conversation — either a documented exception for "section eyebrow labels" as a pattern, or a portfolio-wide sweep to add inline waivers where the convention is used. Not proposed as a formal control change in this record; flagging for the design lead.
- No other uncovered defect surfaced this session — ratchet otherwise: no proposal.
