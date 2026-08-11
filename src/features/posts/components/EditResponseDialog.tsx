import { Loader2 } from 'lucide-react';
import { useState } from 'react';

import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  RadioGroup,
  RadioGroupItem,
  Textarea,
} from '~/components/ui';
import type {
  ConsentFormHistoryEntry,
  ConsentFormRecipient,
  FormQuestion,
} from '~/data/posts-registry';
import { replyToConsentFormOnBehalf } from '~/features/posts/api/consent-forms';
import {
  COMMENTS_MAX_LENGTH,
  computeReplyErrors,
  type ConsentType,
} from '~/features/posts/validation/consent-form-reply-validation';
import { notify } from '~/lib/notify';

interface EditResponseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  formId: number;
  recipient: ConsentFormRecipient | null;
  questions: FormQuestion[];
  /** Staff name recorded as the audit-history actor. */
  actionBy: string;
  /** Next free `historyId` for the locally-appended audit entry. */
  nextHistoryId: number;
  onSuccess: (
    updatedRecipient: ConsentFormRecipient,
    historyEntry: ConsentFormHistoryEntry,
  ) => void;
}

function describeCurrentResponse(response: ConsentFormRecipient['response']): string {
  if (response === 'YES') return 'Yes';
  if (response === 'NO') return 'No';
  return 'no response yet';
}

function EditResponseDialogContent({
  open,
  recipient,
  questions,
  formId,
  actionBy,
  nextHistoryId,
  onOpenChange,
  onSuccess,
}: {
  open: boolean;
  recipient: ConsentFormRecipient;
  questions: FormQuestion[];
  formId: number;
  actionBy: string;
  nextHistoryId: number;
  onOpenChange: (open: boolean) => void;
  onSuccess: (
    updatedRecipient: ConsentFormRecipient,
    historyEntry: ConsentFormHistoryEntry,
  ) => void;
}) {
  const [consentType, setConsentType] = useState<ConsentType | null>(recipient.response);
  const [answers, setAnswers] = useState<Record<string, string>>(() =>
    Object.fromEntries(questions.map((q) => [q.id, recipient.questionAnswers?.[q.id] ?? ''])),
  );
  const [comments, setComments] = useState(recipient.comments ?? '');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [confirmingDiscard, setConfirmingDiscard] = useState(false);

  const dirty =
    consentType !== recipient.response ||
    comments !== (recipient.comments ?? '') ||
    questions.some((q) => answers[q.id] !== (recipient.questionAnswers?.[q.id] ?? ''));

  function requestClose() {
    if (dirty && !confirmingDiscard) {
      setConfirmingDiscard(true);
      return;
    }
    onOpenChange(false);
  }

  async function handleSubmit() {
    const validationErrors = computeReplyErrors(consentType, answers, questions, comments);
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;

    setSubmitting(true);
    try {
      await replyToConsentFormOnBehalf(formId, Number(recipient.studentId), {
        consentType: consentType!,
        remarks: comments || undefined,
        customQuestionReply:
          consentType === 'YES'
            ? questions.map((q) => {
                const answer = answers[q.id];
                return q.type === 'mcq'
                  ? { customQuestionId: q.id, answer: { choice: answer } }
                  : { customQuestionId: q.id, answer: { text: answer } };
              })
            : [],
      });

      const updatedRecipient: ConsentFormRecipient = {
        ...recipient,
        response: consentType,
        respondedAt: new Date().toISOString(),
        comments: comments || null,
        questionAnswers: consentType === 'YES' ? answers : recipient.questionAnswers,
      };
      const historyEntry: ConsentFormHistoryEntry = {
        historyId: nextHistoryId,
        action: 'Response updated',
        actionBy,
        actionAt: new Date().toISOString(),
      };

      notify.success('Response updated.');
      onSuccess(updatedRecipient, historyEntry);
      onOpenChange(false);
    } catch {
      // Dialog stays open on error so nothing typed is lost. Always toast —
      // unlike some existing call sites, this action has no other feedback
      // path (no redirect, no field-level error) for a bare AppError to defer
      // to, so swallowing it here would leave a failed submit with no
      // visible error state at all (CMP-3).
      notify.error('Failed to update the response. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  // Every close path (Cancel, Esc, backdrop, the built-in X button) routes
  // through this — Base UI's root `onOpenChange` fires on all of them, so
  // intercepting only the Cancel button would leave the other three able to
  // silently discard in-progress edits (CMP-8).
  function handleRootOpenChange(next: boolean) {
    if (!next) {
      // Esc/backdrop on the discard-confirm sub-view backs out to editing —
      // it must never read as confirming the destructive action.
      if (confirmingDiscard) {
        setConfirmingDiscard(false);
        return;
      }
      requestClose();
      return;
    }
    onOpenChange(next);
  }

  if (confirmingDiscard) {
    return (
      <Dialog open={open} onOpenChange={handleRootOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Discard this response?</DialogTitle>
            <DialogDescription>Your entries won&rsquo;t be saved.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setConfirmingDiscard(false)}>
              Keep editing
            </Button>
            <Button variant="destructive" onClick={() => onOpenChange(false)}>
              Discard
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleRootOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit response — {recipient.studentName}</DialogTitle>
          <DialogDescription>
            Record this student&rsquo;s response on behalf of their parent/guardian.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <div className="space-y-2">
            <p id="edit-response-consent-type-label" className="text-sm font-medium">
              Response <span className="text-muted-foreground">(required)</span>
            </p>
            <RadioGroup
              aria-labelledby="edit-response-consent-type-label"
              value={consentType ?? undefined}
              onValueChange={(v) => setConsentType(v as ConsentType)}
              className="flex gap-4"
            >
              <label className="flex cursor-pointer items-center gap-2">
                <RadioGroupItem value="YES" />
                <Label className="cursor-pointer text-sm font-normal">Yes</Label>
              </label>
              <label className="flex cursor-pointer items-center gap-2">
                <RadioGroupItem value="NO" />
                <Label className="cursor-pointer text-sm font-normal">No</Label>
              </label>
            </RadioGroup>
            {errors.consentType && (
              <p role="alert" className="text-xs text-destructive">
                {errors.consentType}
              </p>
            )}
          </div>

          {consentType === 'YES' &&
            questions.map((q) => (
              <div key={q.id} className="space-y-2">
                <p id={`edit-response-question-${q.id}-label`} className="text-sm font-medium">
                  {q.text} <span className="text-muted-foreground">(required)</span>
                </p>
                {q.type === 'mcq' ? (
                  <RadioGroup
                    aria-labelledby={`edit-response-question-${q.id}-label`}
                    value={answers[q.id] || undefined}
                    onValueChange={(v) => setAnswers((prev) => ({ ...prev, [q.id]: v }))}
                    className="gap-2"
                  >
                    {q.options.map((option) => (
                      <label key={option} className="flex cursor-pointer items-center gap-2">
                        <RadioGroupItem value={option} />
                        <Label className="cursor-pointer text-sm font-normal">{option}</Label>
                      </label>
                    ))}
                  </RadioGroup>
                ) : (
                  <Input
                    id={`edit-response-question-${q.id}`}
                    aria-labelledby={`edit-response-question-${q.id}-label`}
                    value={answers[q.id] ?? ''}
                    onChange={(e) => setAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))}
                    aria-invalid={Boolean(errors[q.id])}
                    autoComplete="off"
                  />
                )}
                {errors[q.id] && (
                  <p role="alert" className="text-xs text-destructive">
                    {errors[q.id]}
                  </p>
                )}
              </div>
            ))}

          <div className="space-y-2">
            <div className="flex items-baseline justify-between">
              <Label htmlFor="edit-response-comments">
                Parent&rsquo;s comments <span className="text-muted-foreground">(optional)</span>
              </Label>
              <span className="text-xs text-muted-foreground">
                {comments.length} / {COMMENTS_MAX_LENGTH}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Any comments you add can be viewed by parents on their Parents Gateway app.
            </p>
            <Textarea
              id="edit-response-comments"
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              aria-invalid={Boolean(errors.comments)}
              placeholder="Type your answer here…"
            />
            {errors.comments && (
              <p role="alert" className="text-xs text-destructive">
                {errors.comments}
              </p>
            )}
          </div>

          {consentType && (
            <p className="text-xs text-muted-foreground">
              {recipient.response === null
                ? `This will record ${recipient.studentName}'s response for the first time.`
                : `This replaces ${recipient.studentName}'s current response ("${describeCurrentResponse(recipient.response)}").`}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={requestClose} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Updating…
              </>
            ) : (
              'Update response'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function EditResponseDialog({
  open,
  onOpenChange,
  formId,
  recipient,
  questions,
  actionBy,
  nextHistoryId,
  onSuccess,
}: EditResponseDialogProps) {
  if (!recipient) return null;

  return (
    <EditResponseDialogContent
      key={recipient.studentId}
      open={open}
      recipient={recipient}
      questions={questions}
      formId={formId}
      actionBy={actionBy}
      nextHistoryId={nextHistoryId}
      onOpenChange={onOpenChange}
      onSuccess={onSuccess}
    />
  );
}
