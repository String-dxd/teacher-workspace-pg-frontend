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
import { updateAnnouncementStaffInCharge } from '~/features/posts/api/announcements';
import { updateConsentFormStaffInCharge } from '~/features/posts/api/consent-forms';
import type { ApiSchoolStaff } from '~/features/posts/api/types';
import type { SelectedEntity } from '~/features/posts/components/EntitySelector';
import { StaffSearchSelector } from '~/features/posts/components/StaffSearchSelector';
import { notify } from '~/lib/notify';
import { stripSalutation } from '~/lib/utils';

interface EditStaffInChargeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  post: Post;
  staff: ApiSchoolStaff[];
  onSaved: () => void;
}

/** Build the selector's current value from the post's staff-owner ids. */
function deriveSelectedStaff(post: Post, staff: ApiSchoolStaff[]): SelectedEntity[] {
  const byStaffId = new Map(staff.map((s) => [s.staffId, s]));
  if (post.staffOwnerIds && post.staffOwnerIds.length > 0) {
    return post.staffOwnerIds.map((id) => {
      const s = byStaffId.get(id);
      return s
        ? { id: s.staffId.toString(), label: stripSalutation(s.name), type: 'individual', count: 1 }
        : { id: id.toString(), label: 'Unknown staff', type: 'individual', count: 1 };
    });
  }
  if (post.staffInCharge) {
    return staff
      .filter((s) => s.name === post.staffInCharge)
      .map((s) => ({
        id: s.staffId.toString(),
        label: stripSalutation(s.name),
        type: 'individual' as const,
        count: 1,
      }));
  }
  return [];
}

function EditStaffInChargeDialog({
  open,
  onOpenChange,
  post,
  staff,
  onSaved,
}: EditStaffInChargeDialogProps) {
  const [value, setValue] = useState<SelectedEntity[]>(() => deriveSelectedStaff(post, staff));
  const [saving, setSaving] = useState(false);

  // Re-seed from the current post each time the dialog opens.
  useEffect(() => {
    if (open) setValue(deriveSelectedStaff(post, staff));
  }, [open, post, staff]);

  const lockedStaffIds = new Set(deriveSelectedStaff(post, staff).map((s) => s.id));

  async function handleSave() {
    if (saving) return;
    setSaving(true);
    try {
      const staffIds = value.map((s) => Number(s.id));
      if (post.kind === 'announcement') {
        await updateAnnouncementStaffInCharge(post.numericId, staffIds);
      } else {
        await updateConsentFormStaffInCharge(post.numericId, staffIds);
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
          <DialogTitle>Edit staff-in-charge</DialogTitle>
        </DialogHeader>

        <div className="space-y-1.5">
          <Label>
            Staff-in-charge{' '}
            <span className="text-xs font-normal text-muted-foreground">(optional)</span>
          </Label>
          <p className="text-sm text-muted-foreground">
            These staff will be able to view read status, and delete this post.
          </p>
          <StaffSearchSelector
            staff={staff}
            value={value}
            onChange={setValue}
            lockedStaffIds={lockedStaffIds}
          />
        </div>

        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : 'Save changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export { EditStaffInChargeDialog };
export type { EditStaffInChargeDialogProps };
