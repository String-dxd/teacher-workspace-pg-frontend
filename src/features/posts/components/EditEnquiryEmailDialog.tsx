import { useEffect, useState } from 'react';

import {
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Label,
} from '~/components/ui';
import type { Post } from '~/data/posts-registry';
import { updateAnnouncementEnquiryEmail } from '~/features/posts/api/announcements';
import { updateConsentFormEnquiryEmail } from '~/features/posts/api/consent-forms';
import { EnquiryEmailSelector } from '~/features/posts/components/EnquiryEmailSelector';
import { notify } from '~/lib/notify';

interface EditEnquiryEmailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  post: Post;
  emailOptions: string[];
  onSaved: () => void;
}

function EditEnquiryEmailDialog({
  open,
  onOpenChange,
  post,
  emailOptions,
  onSaved,
}: EditEnquiryEmailDialogProps) {
  const [value, setValue] = useState(post.enquiryEmail ?? '');
  const [saving, setSaving] = useState(false);

  // Re-seed from the current post each time the dialog opens, so a stale
  // edit from a prior open (cancelled without saving) doesn't linger.
  useEffect(() => {
    if (open) setValue(post.enquiryEmail ?? '');
  }, [open, post.enquiryEmail]);

  async function handleSave() {
    if (!value.trim() || saving) return;
    setSaving(true);
    try {
      if (post.kind === 'announcement') {
        await updateAnnouncementEnquiryEmail(post.numericId, { enquiryEmailAddress: value });
      } else {
        await updateConsentFormEnquiryEmail(post.numericId, { enquiryEmailAddress: value });
      }
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
          <DialogTitle>Edit enquiry email</DialogTitle>
        </DialogHeader>

        <div className="space-y-1.5">
          <Label>
            Enquiry email <span className="text-destructive">*</span>
          </Label>
          <p className="text-sm text-muted-foreground">
            Parents’ enquiries go to this email address.
          </p>
          <EnquiryEmailSelector emailOptions={emailOptions} value={value} onChange={setValue} />
        </div>

        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving || !value.trim()}>
            {saving ? 'Saving…' : 'Save changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export { EditEnquiryEmailDialog };
export type { EditEnquiryEmailDialogProps };
