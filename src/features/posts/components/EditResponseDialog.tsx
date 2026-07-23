import { Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';

import {
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  RadioGroup,
  RadioGroupItem,
  Textarea,
} from '~/components/ui';
import type { ConsentFormRecipient, FormQuestion } from '~/data/posts-registry';

const COMMENTS_MAX_LENGTH = 500;

export interface EditResponseSubmitPayload {
  consentType: 'YES' | 'NO';
  comments: string;
  answers: Record<string, string>;
}

interface EditResponseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recipient: ConsentFormRecipient;
  questions: FormQuestion[];
  onSubmit: (payload: EditResponseSubmitPayload) => Promise<void>;
}

function EditResponseDialog({
  open,
  onOpenChange,
  recipient,
  questions,
  onSubmit,
}: EditResponseDialogProps) {
  const [consentType, setConsentType] = useState<'YES' | 'NO' | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [comments, setComments] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  // Reset to the recipient's current response each time the dialog opens.
  useEffect(() => {
    if (!open) return;
    setConsentType(recipient.response);
    setAnswers(
      Object.fromEntries(
        Object.entries(recipient.questionAnswers ?? {}).map(([id, value]) => [id, value ?? '']),
      ),
    );
    setComments(recipient.comments ?? '');
    setFieldErrors({});
  }, [open, recipient]);

  function handleOpenChange(next: boolean) {
    if (!submitting) onOpenChange(next);
  }

  function setAnswer(questionId: string, value: string) {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
    setFieldErrors((prev) => {
      if (!(questionId in prev)) return prev;
      const next = { ...prev };
      delete next[questionId];
      return next;
    });
  }

  function validate(): boolean {
    if (consentType !== 'YES') return true;
    const errors: Record<string, string> = {};
    for (const q of questions) {
      if (!answers[q.id]?.trim()) {
        errors[q.id] = 'Answer this question before saving.';
      }
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSubmit() {
    if (!consentType || submitting) return;
    if (!validate()) return;
    setSubmitting(true);
    try {
      await onSubmit({ consentType, comments, answers });
      onOpenChange(false);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit response — {recipient.studentName}</DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          <div className="space-y-2">
            <Label>Response</Label>
            <RadioGroup
              value={consentType ?? undefined}
              onValueChange={(v) => setConsentType(v as 'YES' | 'NO')}
              className="flex gap-4"
            >
              <label className="flex cursor-pointer items-center gap-2">
                <RadioGroupItem value="YES" />
                <span className="text-sm">Yes</span>
              </label>
              <label className="flex cursor-pointer items-center gap-2">
                <RadioGroupItem value="NO" />
                <span className="text-sm">No</span>
              </label>
            </RadioGroup>
          </div>

          {consentType === 'YES' &&
            questions.map((q) => (
              <div key={q.id} className="space-y-1.5">
                <Label htmlFor={`question-${q.id}`}>
                  {q.text} <span className="text-destructive">*</span>
                </Label>
                {q.type === 'mcq' ? (
                  <RadioGroup
                    value={answers[q.id] ?? ''}
                    onValueChange={(v) => setAnswer(q.id, v)}
                    className="gap-2"
                  >
                    {q.options.map((option) => (
                      <label key={option} className="flex cursor-pointer items-center gap-2">
                        <RadioGroupItem value={option} />
                        <span className="text-sm">{option}</span>
                      </label>
                    ))}
                  </RadioGroup>
                ) : (
                  <Input
                    id={`question-${q.id}`}
                    value={answers[q.id] ?? ''}
                    onChange={(e) => setAnswer(q.id, e.target.value)}
                    aria-invalid={q.id in fieldErrors}
                  />
                )}
                {fieldErrors[q.id] && (
                  <p role="alert" className="text-sm text-destructive">
                    {fieldErrors[q.id]}
                  </p>
                )}
              </div>
            ))}

          <div className="space-y-1.5">
            <div className="flex items-baseline justify-between">
              <Label htmlFor="response-comments">Comments</Label>
              <span className="text-xs text-muted-foreground">
                {comments.length}/{COMMENTS_MAX_LENGTH}
              </span>
            </div>
            <Textarea
              id="response-comments"
              value={comments}
              onChange={(e) => setComments(e.target.value.slice(0, COMMENTS_MAX_LENGTH))}
              maxLength={COMMENTS_MAX_LENGTH}
              placeholder="Visible to parents."
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => handleOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!consentType || submitting}>
            {submitting ? (
              <>
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
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

export { EditResponseDialog };
