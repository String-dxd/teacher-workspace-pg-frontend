import { useEffect, useState } from 'react';

import {
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Separator,
} from '~/components/ui';
import type { ConsentFormPost, ReminderConfig } from '~/data/posts-registry';
import {
  updateConsentFormDueDate,
  updateConsentFormReminder,
} from '~/features/posts/api/consent-forms';
import { DueDateSection } from '~/features/posts/components/DueDateSection';
import { isoToSgtDate } from '~/features/posts/components/PostCard';
import { ReminderSection } from '~/features/posts/components/ReminderSection';
import { notify } from '~/lib/notify';

interface EditDueDateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  post: ConsentFormPost;
  onSaved: () => void;
}

function EditDueDateDialog({ open, onOpenChange, post, onSaved }: EditDueDateDialogProps) {
  const [dueDate, setDueDate] = useState(() => isoToSgtDate(post.consentByDate));
  const [reminder, setReminder] = useState<ReminderConfig>(post.reminder);
  const [saving, setSaving] = useState(false);

  // Re-seed from the current post each time the dialog opens.
  useEffect(() => {
    if (open) {
      setDueDate(isoToSgtDate(post.consentByDate));
      setReminder(post.reminder);
    }
  }, [open, post.consentByDate, post.reminder]);

  async function handleSave() {
    if (!dueDate.trim() || saving) return;
    setSaving(true);
    try {
      const calls: Promise<unknown>[] = [];
      if (dueDate !== isoToSgtDate(post.consentByDate)) {
        calls.push(
          updateConsentFormDueDate(post.numericId, { consentByDate: `${dueDate}T23:59:59+08:00` }),
        );
      }
      if (JSON.stringify(reminder) !== JSON.stringify(post.reminder)) {
        calls.push(
          updateConsentFormReminder(post.numericId, {
            addReminderType: reminder.type,
            reminderDate: reminder.type === 'NONE' ? '' : `${reminder.date}T23:59:59+08:00`,
          }),
        );
      }
      await Promise.all(calls);
      notify.success('Changes saved.');
      onOpenChange(false);
      onSaved();
    } catch {
      notify.error('Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit due date &amp; reminders</DialogTitle>
        </DialogHeader>

        <DueDateSection value={dueDate} onChange={setDueDate} required />

        <Separator />

        <ReminderSection value={reminder} onChange={setReminder} consentByDate={dueDate} />

        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving || !dueDate.trim()}>
            {saving ? 'Saving…' : 'Save changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export { EditDueDateDialog };
export type { EditDueDateDialogProps };
