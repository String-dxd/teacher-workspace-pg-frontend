import { CalendarClock, Send, Users } from 'lucide-react';

import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '~/components/ui';
import type { ResponseType } from '~/data/posts-registry';

// Design port (PR #165 SendConfirmationSheet): label/value summary the teacher
// reviews before sending. Doubles as schedule step 2 — when `scheduledAt` is
// set the copy flips to scheduling and the parent reopens the picker on close.

/** One recipient chip as chosen on the compose page. */
export interface RecipientGroup {
  label: string;
  count: number;
}

interface SendConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  recipientGroups: RecipientGroup[];
  totalRecipients: number;
  /** ISO string — if set, this is a scheduled send. */
  scheduledAt?: string;
  onConfirm: () => void;
  responseType?: ResponseType;
  dueDate?: string;
  /** Disables the confirm button while the send is in flight. */
  busy?: boolean;
}

function formatScheduledAt(iso: string): string {
  // en-SG lowercases am/pm by default; the schedule picker shows it uppercase,
  // so match that here — same value, same casing everywhere.
  return new Date(iso)
    .toLocaleString('en-SG', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      timeZone: 'Asia/Singapore',
    })
    .replace(/\bam\b/, 'AM')
    .replace(/\bpm\b/, 'PM');
}

/** Quiet section label — the review reads as label/value pairs. */
function SummaryLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
      {children}
    </p>
  );
}

function SendConfirmationDialog({
  open,
  onOpenChange,
  title,
  recipientGroups,
  totalRecipients,
  scheduledAt,
  onConfirm,
  responseType,
  dueDate,
  busy = false,
}: SendConfirmationDialogProps) {
  const isScheduled = Boolean(scheduledAt);
  const hasResponse = responseType === 'acknowledge' || responseType === 'yes-no';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isScheduled ? 'Schedule post?' : 'Send post?'}</DialogTitle>
          <DialogDescription>
            Review the details before {isScheduled ? 'scheduling.' : 'sending to parents.'}
          </DialogDescription>
        </DialogHeader>

        {/* Label/value pairs, whitespace-separated — reviewable at a glance. */}
        <div className="space-y-4">
          <div className="space-y-1">
            <SummaryLabel>Title</SummaryLabel>
            <p className="text-sm font-semibold text-foreground">{title || 'Untitled post'}</p>
          </div>

          <div className="space-y-1.5">
            <SummaryLabel>Recipients</SummaryLabel>
            {recipientGroups.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {recipientGroups.map((g) => (
                  <span
                    key={g.label}
                    className="inline-flex shrink-0 items-center gap-1 rounded-md bg-twblue-2 px-2 py-0.5 text-xs font-medium text-twblue-9"
                  >
                    <Users className="h-3 w-3 shrink-0" />
                    <span className="truncate">{g.label}</span>
                    <span className="opacity-60">· {g.count}</span>
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-sm text-foreground">
                {totalRecipients > 0
                  ? `${totalRecipients} parent${totalRecipients !== 1 ? 's' : ''}`
                  : 'No recipients selected'}
              </p>
            )}
          </div>

          <div className="space-y-1">
            <SummaryLabel>{isScheduled ? 'Scheduled' : 'Delivery'}</SummaryLabel>
            <p className="text-sm text-foreground">
              {isScheduled && scheduledAt
                ? formatScheduledAt(scheduledAt)
                : 'Immediately via Parents Gateway'}
            </p>
          </div>

          {/* Response due — acknowledge / yes-no only */}
          {hasResponse && (
            <div className="space-y-1">
              <SummaryLabel>Response due</SummaryLabel>
              <p className="text-sm text-foreground">
                {dueDate
                  ? `${new Date(dueDate).toLocaleDateString('en-SG', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })} (${responseType === 'acknowledge' ? 'Acknowledgement' : 'Yes / No'})`
                  : responseType === 'acknowledge'
                    ? 'Acknowledgement'
                    : 'Yes / No'}
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={onConfirm} disabled={busy}>
            {isScheduled ? (
              <>
                <CalendarClock className="mr-2 h-4 w-4" />
                Schedule post
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                Send post
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export { SendConfirmationDialog };
export type { SendConfirmationDialogProps };
