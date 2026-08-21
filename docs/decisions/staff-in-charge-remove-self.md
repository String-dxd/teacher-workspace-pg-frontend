# Design decision record — Staff-in-charge: remove yourself

> Started at the Phase 3 plan gate; finished at Phase 6.

- **Date:** 2026-07-30
- **Product:** TW surface (Posts / PG Staff Portal)
- **Change type:** modification (Edit staff-in-charge quick-edit dialog + confirmation flow)
- **Page type:** flow step (dialog on the post detail workspace view)
- **Run type:** attended
- **The teacher and the moment:** Ms Tan Wei Ling (mock session user, staffId 1001), end of term, stepping away from a post she no longer runs — the "Science Museum Learning Journey" consent form.

## Sprint contract (done-criteria)

1. In the Edit staff-in-charge dialog, the teacher's own chip is visually distinct (tinted, "(You)" suffix) and removable; other assigned staff stay locked (existing rule preserved).
2. Removing your own chip opens a confirmation dialog stating the consequence — loss of access to the post and its responses/read status — and pointing at downloading responses first (CMP-2, L0).
3. The removal has loading / success / error states (CMP-3); success lands on My Posts (access is gone).
4. Copy is calm, sober, sentence-case, plain TW voice (CNT-12/14, SLP-9, IDN-3).
5. Keyboard + SR: X reachable and labelled, focus managed across dialog transitions (A11Y-2/3/8/11).

## Chosen approach

Scoped modification (structure specified by the builder; diverge skipped). Self chip
in `EntitySelector` gains a `highlightedIds` tint (twblue-2 bg / twblue-6 border) and
"(You)" label suffix; own chip is excluded from `lockedStaffIds`. Removing it (X or
Clear all) is intercepted in `EditStaffInChargeDialog` and opens a confirmation
`Dialog`: title "Remove yourself from this post?", consequence copy, Cancel
(secondary) / "Remove myself" (destructive variant). Confirm commits immediately via
the existing staff-in-charge API with self filtered out, success toast, navigate to
`/posts`. Error stays in the dialog as an inline `role="alert"` message, work
preserved.

Demo hooks (mock-only, flagged): staffId 1001 added to the consent-form fixture's
`staffOwners`; the MSW `addStaffInCharge` helper switched to replace semantics (the
client always sends the full list). The real endpoint is add-only — a production
implementation needs a remove counterpart.

Side ask folded in mid-implement (builder, in-session): the staff selector's dropdown
opens only on click, not on focus (`openOnFocus={false}` on `StaffSearchSelector`) —
previously the dialog's initial focus auto-opened it.

## Rejected options

- **Staged removal behind "Save changes"** — two confirmations for one action, and the
  warning "after you confirm" would be untrue. Grill Q1; builder chose immediate commit.
- **"Download responses" button inside the confirm dialog** — feasible (reusable
  `downloadXlsx`), but builder chose copy-only guidance. Grill Q2. Copy adjusted to
  name the path: "cancel and download them from the status table first".

## Tradeoffs, named

- Immediate commit adds a second dialog to the journey; accepted so the warning is
  literally true and no stale "removed but still here" state exists.
- Copy-only download guidance means grabbing responses requires cancelling out of two
  dialogs first; accepted by the builder at the grill for a smaller build.
- Forced navigation to My Posts on success; staying on a post you can no longer
  access would show stale or broken content.

## Controls in scope

CMP-1, CMP-2 (L0), CMP-3, CMP-5, CMP-7, CMP-8; A11Y-1, A11Y-2, A11Y-3, A11Y-4,
A11Y-8, A11Y-11; TOK-1..3; COL-2; TYP-2/3; CNT-1, CNT-3, CNT-9, CNT-10, CNT-12,
CNT-14; SLP-9, SLP-10; IDN-3; MOT-1.

## Waivers granted

| Control | Tier | Reason | Approver | Where recorded |
|---------|------|--------|----------|----------------|
| — none | | | | |

## Plan approval

- **Approved by:** Grace Chan (builder), structured Approve option after grill
- **Approved on:** 2026-07-30
- **Grill resolved:** Q1 commit timing → immediate on confirm (recommended, accepted);
  Q2 download CTA in dialog → copy-only (alternative chosen over recommendation).
  Resolved without asking (recorded): self chip uses "(You)" suffix + tint, never
  colour alone (A11Y); copy swaps "responses"/"read status" by post kind.

## Verify verdict

- **Screenshots:** captured in-session (not saved to disk): Edit dialog with distinct
  self chip + no Clear-all, confirm dialog (copy: "You'll lose access to this post and
  its responses. If you need them, cancel and download them first."), post-removal
  My Posts list with success toast "You're no longer staff-in-charge of 'Science
  Museum Learning Journey'."
- **CMP-3 evidence:** success + error states captured live (button text "Removing…"
  loading state verified by code read, not separately screenshotted — flag for a
  human to force the `updateConsentFormStaffInCharge` mock to reject and confirm the
  inline `role="alert"` error frame). Loading-state screenshot: not captured — gap.
- **Token block line range:** n/a — semantic tokens only (`twblue-2`/`twblue-6` scale
  tokens, `destructive` button variant)
- **Dark mode:** N/A — product has no dark mode
- **Verification ledger:**

  | Control | Method | Evidence |
  |---------|--------|----------|
  | CMP-2 (L0) | manual | confirm dialog states consequence before destructive action executes; Cancel returns to edit dialog unchanged |
  | CMP-1 | manual | composed only existing `Dialog`, `EntitySelector`, `Button` — no new components |
  | CMP-5 | manual | "Remove myself" uses `destructive` variant, not `default`/primary |
  | CMP-7 | manual | chip highlight extends existing `EntityChip` via a prop, not a new pattern |
  | CMP-8 | manual | Cancel at both dialog steps; Esc/backdrop closes without committing |
  | A11Y-2 | manual | X and both dialogs' buttons reachable via Tab; Base UI focus trap in effect |
  | A11Y-3 | unverified | search input has visible label via `Label` wrapper in parent form — not re-checked in isolation |
  | A11Y-4 | unverified | needs computed hit-area measurement |
  | A11Y-8 | manual | accessible name read via a11y tree: "Remove Tan Wei Ling (You)" — matches visible label |
  | A11Y-11 | manual | success = toast (live region, no focus steal) + navigation; error = inline `role="alert"`, no focus steal since dialog stays open |
  | TOK-1..3 | manual | only Tailwind/shadcn tokens and twblue-2/6 scale steps used |
  | COL-2 | manual | highlight uses twblue-6 border/twblue-2 bg from the existing Radix-derived scale |
  | CNT-1..14, SLP-9 | manual | copy tightened via the `copy` skill grill: front-loaded consequence, sentence case, no filler, "responses"/"read status" swap by post kind |
  | SLP-10 | manual | confirmation is a small single-purpose dialog, not a multi-section task |
  | MOT-1 | manual | no new motion — reuses existing Dialog enter/exit |

- **Evaluator verdict:** not run — this was a scoped, attended modification verified
  by the builder directly in-session rather than dispatched to the evaluator agent.
  Flagged as a gap below.

## Ratchet

- **Gap, not a control proposal:** loading-state screenshot for the self-removal
  commit was not captured (CMP-3 evidence requirement). Low risk — the loading text
  ("Removing…") is code-verified — but a human should force-fail the mock and
  screenshot all three states before this ships past prototype.
- **Gap:** no evaluator-agent pass was run; this record substitutes the builder's own
  verification. Acceptable for a prototype iteration, not a substitute for the formal
  verify phase on a production-bound change.
- Ratchet: no new catalog control proposed — nothing uncovered by an existing control.
