import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';

import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Label,
} from '~/components/ui';
import type { Post } from '~/data/posts-registry';
import {
  removeAccessFromAnnouncement,
  updateAnnouncementStaffInCharge,
} from '~/features/posts/api/announcements';
import {
  removeAccessFromConsentForm,
  updateConsentFormStaffInCharge,
} from '~/features/posts/api/consent-forms';
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
  /** Signed-in teacher's staffId — their own chip is highlighted and removable. */
  currentStaffId?: number;
  onSaved: () => void;
}

/** Build the selector's current value from the post's staff-owner ids. */
function deriveSelectedStaff(
  post: Post,
  staff: ApiSchoolStaff[],
  selfId: string | null,
): SelectedEntity[] {
  const byStaffId = new Map(staff.map((s) => [s.staffId, s]));
  const withYouSuffix = (entity: SelectedEntity): SelectedEntity =>
    entity.id === selfId ? { ...entity, label: `${entity.label} (You)` } : entity;
  if (post.staffOwnerIds && post.staffOwnerIds.length > 0) {
    return post.staffOwnerIds.map((id) => {
      const s = byStaffId.get(id);
      return withYouSuffix(
        s
          ? {
              id: s.staffId.toString(),
              label: stripSalutation(s.name),
              type: 'individual',
              count: 1,
            }
          : { id: id.toString(), label: 'Unknown staff', type: 'individual', count: 1 },
      );
    });
  }
  if (post.staffInCharge) {
    return staff
      .filter((s) => s.name === post.staffInCharge)
      .map((s) =>
        withYouSuffix({
          id: s.staffId.toString(),
          label: stripSalutation(s.name),
          type: 'individual' as const,
          count: 1,
        }),
      );
  }
  return [];
}

function EditStaffInChargeDialog({
  open,
  onOpenChange,
  post,
  staff,
  currentStaffId,
  onSaved,
}: EditStaffInChargeDialogProps) {
  const navigate = useNavigate();
  const selfId = currentStaffId != null ? String(currentStaffId) : null;
  const [value, setValue] = useState<SelectedEntity[]>(() =>
    deriveSelectedStaff(post, staff, selfId),
  );
  const [saving, setSaving] = useState(false);
  const [confirmingSelfRemoval, setConfirmingSelfRemoval] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [removeFailed, setRemoveFailed] = useState(false);

  // Re-seed from the current post each time the dialog opens.
  useEffect(() => {
    if (open) setValue(deriveSelectedStaff(post, staff, selfId));
  }, [open, post, staff, selfId]);

  // Assigned staff can't be removed by the creator — except yourself, which
  // routes through the self-removal confirmation instead.
  const lockedStaffIds = new Set(
    deriveSelectedStaff(post, staff, selfId)
      .map((s) => s.id)
      .filter((id) => id !== selfId),
  );
  const highlightedStaffIds = selfId ? new Set([selfId]) : undefined;
  const selfSelected = selfId != null && value.some((e) => e.id === selfId);

  // Removing your own chip (via its X or Clear all) needs confirmation first —
  // the chip stays until the removal is confirmed and committed.
  function handleChange(next: SelectedEntity[]) {
    if (selfSelected && !next.some((e) => e.id === selfId)) {
      setRemoveFailed(false);
      setConfirmingSelfRemoval(true);
      return;
    }
    setValue(next);
  }

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

  // Self-removal commits immediately on confirm — the warning "after you
  // confirm" must be literally true, so it never waits behind Save changes.
  async function handleRemoveSelf() {
    if (removing) return;
    setRemoving(true);
    setRemoveFailed(false);
    try {
      if (post.kind === 'announcement') {
        await removeAccessFromAnnouncement(post.numericId);
      } else {
        await removeAccessFromConsentForm(post.numericId);
      }
      notify.success(`You're no longer staff-in-charge of "${post.title}".`);
      navigate('/posts');
    } catch {
      setRemoveFailed(true);
    } finally {
      setRemoving(false);
    }
  }

  const responsesNoun = post.kind === 'form' ? 'responses' : 'read status';

  return (
    <>
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
              onChange={handleChange}
              lockedStaffIds={lockedStaffIds}
              highlightedStaffIds={highlightedStaffIds}
              hideClearAll
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

      <Dialog open={confirmingSelfRemoval} onOpenChange={setConfirmingSelfRemoval}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Remove yourself from this post?</DialogTitle>
            <DialogDescription>
              You'll lose access to this post and its {responsesNoun}. If you need{' '}
              {post.kind === 'form' ? 'them' : 'it'}, cancel and download{' '}
              {post.kind === 'form' ? 'them' : 'it'} first.
            </DialogDescription>
          </DialogHeader>

          {removeFailed && (
            <p role="alert" className="text-sm text-destructive">
              Couldn't remove you from this post. Check your connection and try again.
            </p>
          )}

          <DialogFooter>
            <Button
              variant="secondary"
              onClick={() => setConfirmingSelfRemoval(false)}
              disabled={removing}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleRemoveSelf} disabled={removing}>
              {removing ? 'Removing…' : 'Remove myself'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export { EditStaffInChargeDialog };
export type { EditStaffInChargeDialogProps };
