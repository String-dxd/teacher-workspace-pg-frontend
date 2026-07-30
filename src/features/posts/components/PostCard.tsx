import { generateHTML } from '@tiptap/react';
import DOMPurify from 'dompurify';
import { Download, Paperclip, Pencil } from 'lucide-react';
import { useMemo, useState } from 'react';

import {
  Card,
  CardContent,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Separator,
} from '~/components/ui';
import type { ConsentFormPost, Post, ReminderConfig } from '~/data/posts-registry';
import type { ApiSchoolStaff } from '~/features/posts/api/types';
import { EditDueDateDialog } from '~/features/posts/components/EditDueDateDialog';
import { EditEnquiryEmailDialog } from '~/features/posts/components/EditEnquiryEmailDialog';
import { EditStaffInChargeDialog } from '~/features/posts/components/EditStaffInChargeDialog';
import { formatDate, formatDateTime } from '~/helpers/dateTime';
import { createRichTextExtensions, extractTextFromTiptap } from '~/helpers/tiptap';
import { stripSalutation } from '~/lib/utils';

// Built once — `generateHTML` only reads the schema, so this never needs a
// maxLength here (CharacterCount has no effect on static rendering).
const RICH_TEXT_EXTENSIONS = createRichTextExtensions();

// Statuses where the post has already been sent — the 3 quick-edit dialogs
// only make sense here; drafts/scheduled posts still use the full CreatePostPage
// edit flow, where these fields are freely editable alongside everything else.
const SENT_STATUSES = new Set(['posted', 'open', 'closed', 'posting']);

interface Attachment {
  name: string;
  sizeKb: number;
  url: string;
}

/**
 * Extract a `YYYY-MM-DD` string in the Asia/Singapore timezone from a UTC ISO
 * timestamp (e.g. `"2026-03-30T15:59:59.000Z"` → `"2026-03-30"`).
 * Returns `""` for missing or unparseable inputs.
 */
export function isoToSgtDate(iso: string | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-CA', { timeZone: 'Asia/Singapore' });
}

interface PostCardProps {
  post: Post;
  /** Optional attachments — not yet carried by `Post`; wired from callers as needed. */
  attachments?: Attachment[];
  className?: string;
  /** School staff list, for the staff-in-charge quick-edit dialog. */
  staff?: ApiSchoolStaff[];
  /** Preset email options for the enquiry email quick-edit dialog. */
  emailOptions?: string[];
  /** Called after any quick-edit dialog saves successfully, to refetch the post. */
  onSaved?: () => void;
}

function formatSize(sizeKb: number) {
  if (sizeKb >= 1024) {
    return `${(sizeKb / 1024).toFixed(2)} MB`;
  }
  return `${sizeKb.toFixed(2)} KB`;
}

function reminderSummary(reminder: ReminderConfig): string | null {
  if (reminder.type === 'NONE') return null;
  const when = formatDate(reminder.date);
  return reminder.type === 'ONE_TIME' ? `One-time on ${when}` : `Daily from ${when}`;
}

function EditTrigger({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="shrink-0 rounded-full p-1 text-muted-foreground hover:bg-slate-4 hover:text-foreground sm:rounded-none sm:bg-transparent sm:p-0 sm:text-xs sm:font-medium sm:hover:bg-transparent sm:hover:text-foreground sm:hover:underline sm:underline-offset-2"
    >
      <Pencil className="h-3.5 w-3.5 sm:hidden" />
      <span className="hidden sm:inline">Edit</span>
    </button>
  );
}

/**
 * Right-rail summary card on the post detail view. Narrows on `post.kind` to
 * render announcement- vs consent-form-specific metadata inline; the prop
 * surface stays `{ post }` so form-only fields don't leak onto the shared API.
 */
export function PostCard({
  post,
  attachments,
  className,
  staff = [],
  emailOptions = [],
  onSaved,
}: PostCardProps) {
  const [recipientsDialogOpen, setRecipientsDialogOpen] = useState(false);
  const [dialogTargetLabel, setDialogTargetLabel] = useState('');
  const [editDialog, setEditDialog] = useState<'email' | 'staff' | 'dueDate' | null>(null);

  const isForm = post.kind === 'form';
  const kindLabel = 'Post';
  const canQuickEdit = SENT_STATUSES.has(post.status);

  // `event.start` / `event.end` arrive as SGT-anchored ISO-8601 from the detail
  // mapper (see `mapConsentFormDetail`), so `formatDateTime` renders them in
  // the teacher's intended timezone without a conversion round-trip.
  const eventStart = isForm && post.event ? formatDateTime(post.event.start) : undefined;
  const eventEnd = isForm && post.event ? formatDateTime(post.event.end) : undefined;
  const venue = isForm ? post.event?.venue : undefined;
  const dueDate = isForm ? formatDate((post as ConsentFormPost).consentByDate) : undefined;
  const reminder = isForm ? reminderSummary((post as ConsentFormPost).reminder) : null;
  // Default reminder is always sent on the consent-by date itself (PGW behaviour).
  // Only show when a due date has been set on the form.
  const defaultReminderDate =
    isForm && (post as ConsentFormPost).consentByDate
      ? formatDate((post as ConsentFormPost).consentByDate)
      : undefined;
  const questions = isForm ? (post as ConsentFormPost).questions : undefined;

  const descriptionHtml = useMemo(() => {
    if (!post.richTextContent) return '';
    if (!extractTextFromTiptap(post.richTextContent)) return '';
    const raw = generateHTML(
      post.richTextContent as Parameters<typeof generateHTML>[0],
      RICH_TEXT_EXTENSIONS,
    );
    return DOMPurify.sanitize(raw);
  }, [post.richTextContent]);

  return (
    <>
      <Card className={className}>
        <CardContent className="space-y-4 p-5">
          <p className="text-xs font-medium tracking-widest text-muted-foreground uppercase">
            {kindLabel}
          </p>

          <div className="space-y-3">
            <h3 className="text-base leading-snug font-semibold">{post.title}</h3>
            {descriptionHtml ? (
              <div
                className="rich-content"
                // `generateHTML` serializes a trusted Tiptap schema; Link is
                // constrained to http/https/mailto via createRichTextExtensions.
                // DOMPurify provides defense-in-depth against schema drift.
                dangerouslySetInnerHTML={{ __html: descriptionHtml }}
              />
            ) : (
              <p className="text-sm leading-relaxed whitespace-pre-line text-muted-foreground">
                {post.description}
              </p>
            )}
          </div>

          {/* Sent to */}
          {post.targets && post.targets.length > 0 && (
            <>
              <Separator />
              <div className="space-y-1.5">
                <p className="text-sm font-medium">Sent to</p>
                <ul className="space-y-1">
                  {post.targets.map((t) => (
                    <li key={t.id}>
                      <button
                        type="button"
                        className="cursor-pointer text-left text-sm font-medium underline-offset-2 hover:underline"
                        onClick={() => {
                          setDialogTargetLabel(t.label);
                          setRecipientsDialogOpen(true);
                        }}
                      >
                        {t.label}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            </>
          )}

          {isForm && (eventStart || venue) && (
            <>
              <Separator />
              <div className="space-y-2">
                <p className="text-sm font-medium">Event details</p>
                <div className="space-y-1.5">
                  {eventStart && (
                    <p className="text-sm">
                      <span className="text-muted-foreground">Event Start: </span>
                      {eventStart}
                    </p>
                  )}
                  {eventEnd && (
                    <p className="text-sm">
                      <span className="text-muted-foreground">Event End: </span>
                      {eventEnd}
                    </p>
                  )}
                  {venue && (
                    <p className="text-sm">
                      <span className="text-muted-foreground">Venue: </span>
                      {venue}
                    </p>
                  )}
                </div>
              </div>
            </>
          )}

          {isForm && (dueDate || reminder || defaultReminderDate) && (
            <>
              <Separator />
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium">Due date &amp; reminders</p>
                  {canQuickEdit && (
                    <EditTrigger
                      label="Edit due date and reminders"
                      onClick={() => setEditDialog('dueDate')}
                    />
                  )}
                </div>
                <div className="space-y-1.5">
                  {dueDate && (
                    <p className="text-sm">
                      <span className="text-muted-foreground">Due date: </span>
                      {dueDate}
                    </p>
                  )}
                  {reminder && (
                    <p className="text-sm">
                      <span className="text-muted-foreground">Other reminder: </span>
                      {reminder}
                    </p>
                  )}
                  {defaultReminderDate && (
                    <p className="text-sm text-muted-foreground">
                      Default reminder: {defaultReminderDate}
                    </p>
                  )}
                </div>
              </div>
            </>
          )}

          {isForm && questions && questions.length > 0 && (
            <>
              <Separator />
              <div className="space-y-2">
                <p className="text-sm font-medium">Questions</p>
                <ul className="space-y-2">
                  {questions.map((q, i) => (
                    <li key={q.id} className="text-sm">
                      <div>
                        <span>
                          {i + 1}. {q.text}
                          {q.type === 'mcq' && (
                            <span className="ml-1 text-xs text-muted-foreground">
                              (Multiple choice)
                            </span>
                          )}
                        </span>
                        {q.type === 'mcq' && (
                          <ul className="mt-1 space-y-0.5 pl-1">
                            {q.options.map((opt, oi) => (
                              // eslint-disable-next-line react/no-array-index-key
                              <li key={oi} className="text-xs text-muted-foreground">
                                {String.fromCharCode(97 + oi)}. {opt}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </>
          )}

          {attachments && attachments.length > 0 && (
            <>
              <Separator />
              <div className="space-y-2">
                <p className="text-sm font-medium">Attachments</p>
                {/* File expiry notice — only relevant for drafts whose attachments haven't been published yet */}
                {post.status === 'draft' && (
                  <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                    Attached files may expire after a period. Download them before they become
                    unavailable.
                  </div>
                )}
                <ul className="space-y-1.5">
                  {attachments.map((att) => (
                    <li key={att.name}>
                      <a
                        href={att.url}
                        download={att.name}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-2 rounded-md text-sm hover:bg-slate-3"
                      >
                        <Paperclip className="h-4 w-4 shrink-0 text-muted-foreground" />
                        <span className="flex-1 truncate underline-offset-2 hover:underline">
                          {att.name}
                        </span>
                        <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                          {formatSize(att.sizeKb)}
                        </span>
                        <Download className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            </>
          )}

          {/* Enquiry email */}
          {(post.enquiryEmail || canQuickEdit) && (
            <>
              <Separator />
              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium">Enquiry email</p>
                  {canQuickEdit && (
                    <EditTrigger
                      label="Edit enquiry email"
                      onClick={() => setEditDialog('email')}
                    />
                  )}
                </div>
                <p className="text-sm font-medium">{post.enquiryEmail}</p>
              </div>
            </>
          )}

          {/* Staff in charge */}
          {(post.staffInCharge || canQuickEdit) && (
            <>
              <Separator />
              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium">Staff-in-charge</p>
                  {canQuickEdit && (
                    <EditTrigger
                      label="Edit staff-in-charge"
                      onClick={() => setEditDialog('staff')}
                    />
                  )}
                </div>
                <p className="text-sm font-medium">
                  {post.staffInCharge?.split(', ').map(stripSalutation).join(', ')}
                </p>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Recipients dialog (replaces Sheet — Sheet not yet in ui components) */}
      <Dialog open={recipientsDialogOpen} onOpenChange={setRecipientsDialogOpen}>
        <DialogContent className="flex max-h-[80vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-md">
          <DialogHeader className="border-b px-6 py-4">
            <DialogTitle>{dialogTargetLabel}</DialogTitle>
          </DialogHeader>
          <ul className="flex-1 divide-y overflow-y-auto px-6">
            {[...post.recipients]
              .sort((a, b) => {
                const byClass = a.classLabel.localeCompare(b.classLabel);
                return byClass !== 0 ? byClass : a.studentName.localeCompare(b.studentName);
              })
              .map((r) => (
                <li key={r.studentId} className="flex items-center gap-3 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{r.studentName}</p>
                    {r.indexNumber && (
                      <p className="text-xs text-muted-foreground tabular-nums">{r.indexNumber}</p>
                    )}
                  </div>
                  <span className="shrink-0 text-xs text-muted-foreground">{r.classLabel}</span>
                </li>
              ))}
          </ul>
        </DialogContent>
      </Dialog>

      <EditEnquiryEmailDialog
        open={editDialog === 'email'}
        onOpenChange={(open) => setEditDialog(open ? 'email' : null)}
        post={post}
        emailOptions={emailOptions}
        onSaved={() => onSaved?.()}
      />

      <EditStaffInChargeDialog
        open={editDialog === 'staff'}
        onOpenChange={(open) => setEditDialog(open ? 'staff' : null)}
        post={post}
        staff={staff}
        onSaved={() => onSaved?.()}
      />

      {post.kind === 'form' && (
        <EditDueDateDialog
          open={editDialog === 'dueDate'}
          onOpenChange={(open) => setEditDialog(open ? 'dueDate' : null)}
          post={post}
          onSaved={() => onSaved?.()}
        />
      )}
    </>
  );
}
