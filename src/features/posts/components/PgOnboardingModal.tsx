import { useEffect, useState, type ReactNode } from 'react';
import { useLocation } from 'react-router';

import { Button, Dialog, DialogContent, DialogDescription, DialogTitle } from '~/components/ui';

const SEEN_KEY = 'pg-onboarding-seen';

// PG never loaded on these routes, so an orientation modal would sit on top of
// a dead end — and worse, burn the seen-flag on a visit where the teacher never
// reached Posts at all. Suppress, leave the flag unwritten, catch them next
// time. (Both routes arrive with issues #118 and #129; harmless until then.)
const SUPPRESSED_ROUTES = ['/maintenance', '/unauthorised'];

// Close reasons that mean the teacher deliberately chose to leave. Everything
// else — an unmount, a programmatic close, and notably a stray click on the
// backdrop — closes WITHOUT persisting, so they get the orientation again next
// visit. A mis-aimed click must not cost someone the whole thing.
const DISMISSAL_REASONS = new Set(['escape-key', 'close-press']);

/**
 * Inline emphasis for the terms being renamed, matching WelcomeModal's own
 * treatment: `font-medium` on `text-foreground`, which lifts the word out of
 * the muted body without going full bold.
 */
function Term({ children }: { children: ReactNode }) {
  return <strong className="font-medium text-foreground">{children}</strong>;
}

const TITLE = 'Parents Gateway lives here now';

const PARAGRAPHS: { id: string; content: ReactNode }[] = [
  {
    // The rename leads: it is the fact that stops a teacher finding things.
    // Which type to pick is left to the page itself — the tabs and the create
    // flow both name Read Only and Response Required, so repeating it here is
    // detail the teacher does not need to be told twice. No "now" either; the
    // heading already sets the timeframe.
    id: 'renamed',
    content: (
      <>
        <Term>Announcements</Term> and <Term>Forms</Term> are both called <Term>Posts</Term>.
      </>
    ),
  },
  {
    // Bounds the change rather than restating the move — the heading already
    // said where things live, so repeating it here would announce the move
    // twice with the rename sandwiched between.
    id: 'unchanged',
    content: 'Nothing else changed. Your posts and drafts are all here.',
  },
];

function hasSeenOnboarding(): boolean {
  try {
    return localStorage.getItem(SEEN_KEY) === '1';
  } catch {
    // Private mode / blocked storage — show it rather than crash. Worst case a
    // teacher sees the orientation twice, which beats a white screen.
    return false;
  }
}

/**
 * One-time orientation for teachers who used Announcements and Forms before PG
 * moved into Teacher Workspace. Single page, dismissed by any close path and
 * never shown again. Mirrors the host shell's WelcomeModal: same illustration
 * treatment, width, spacing, and single right-aligned CTA.
 */
export function PgOnboardingModal() {
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);

  const suppressed = SUPPRESSED_ROUTES.some((route) => pathname.endsWith(route));

  useEffect(() => {
    if (suppressed || hasSeenOnboarding()) return;
    setOpen(true);
  }, [suppressed]);

  function dismiss() {
    try {
      localStorage.setItem(SEEN_KEY, '1');
    } catch {
      // Storage unavailable — close anyway. The modal reappears next visit,
      // which is a smaller cost than trapping the teacher behind it.
    }
    setOpen(false);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next, details) => {
        if (next) return;
        if (DISMISSAL_REASONS.has(details.reason)) dismiss();
        else setOpen(false);
      }}
    >
      {/* `max-w-xs` is inert at desktop — the base Dialog's `sm:max-w-md` wins,
          since Tailwind doesn't dedupe a base utility against an `sm:` variant.
          Kept because WelcomeModal carries the identical class, so both render
          at the same 448px. Fixing it here alone would make them diverge. */}
      <DialogContent showCloseButton={false} className="max-w-xs gap-0 overflow-hidden p-0">
        <div className="flex flex-col items-start gap-4 p-6">
          {/* 256px, matching WelcomeModal exactly. */}
          <div className="flex w-full justify-center">
            <div className="w-[256px] shrink-0 overflow-hidden rounded-2xl bg-slate-1">
              <video
                src="/video-onboarding.mp4"
                autoPlay
                loop
                muted
                playsInline
                className="h-full w-full object-cover"
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <DialogTitle className="text-base leading-snug font-semibold">{TITLE}</DialogTitle>
            {PARAGRAPHS.map((paragraph) => (
              <DialogDescription
                key={paragraph.id}
                className="text-sm leading-relaxed text-muted-foreground"
              >
                {paragraph.content}
              </DialogDescription>
            ))}
          </div>

          <div className="flex w-full items-center justify-end">
            <Button className="w-fit" onClick={dismiss}>
              Get started
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
