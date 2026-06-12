import { useMemo, useState } from 'react';

import {
  Button,
  Checkbox,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
} from '~/components/ui';
import { notify } from '~/lib/notify';

import type { ApiSchoolStaff } from '../api/types';

interface ShareGroupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  staff: ApiSchoolStaff[];
  creatorStaffId: number;
  alreadySharedStaffIds: number[];
  onShare: (staffIds: number[]) => Promise<void>;
}

export function ShareGroupDialog({
  open,
  onOpenChange,
  staff,
  creatorStaffId,
  alreadySharedStaffIds,
  onShare,
}: ShareGroupDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {open && (
        <ShareGroupDialogContent
          staff={staff}
          creatorStaffId={creatorStaffId}
          alreadySharedStaffIds={alreadySharedStaffIds}
          onShare={onShare}
          onClose={() => onOpenChange(false)}
        />
      )}
    </Dialog>
  );
}

function ShareGroupDialogContent({
  staff,
  creatorStaffId,
  alreadySharedStaffIds,
  onShare,
  onClose,
}: {
  staff: ApiSchoolStaff[];
  creatorStaffId: number;
  alreadySharedStaffIds: number[];
  onShare: (staffIds: number[]) => Promise<void>;
  onClose: () => void;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [query, setQuery] = useState('');

  const alreadySharedSet = useMemo(() => new Set(alreadySharedStaffIds), [alreadySharedStaffIds]);

  const pickerStaff = useMemo(
    () => staff.filter((s) => s.staffId !== creatorStaffId && !alreadySharedSet.has(s.staffId)),
    [staff, creatorStaffId, alreadySharedSet],
  );

  const filtered = useMemo(() => {
    if (!query) return pickerStaff;
    const q = query.toLowerCase();
    return pickerStaff.filter(
      (s) => s.name.toLowerCase().includes(q) || s.email.toLowerCase().includes(q),
    );
  }, [pickerStaff, query]);

  function toggle(staffId: number) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(staffId)) next.delete(staffId);
      else next.add(staffId);
      return next;
    });
  }

  async function handleShare() {
    if (selectedIds.size === 0) return;
    setSubmitting(true);
    try {
      await onShare(Array.from(selectedIds));
      onClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Could not share the group.';
      notify.error(msg);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <DialogContent className="sm:max-w-lg">
      <DialogHeader>
        <DialogTitle>Share group</DialogTitle>
        <DialogDescription>
          By sharing this group, other staff members will have access to:
        </DialogDescription>
      </DialogHeader>

      <ul className="list-disc space-y-1 pl-5 text-sm">
        <li>View and send to the group</li>
        <li>Edit the group name</li>
        <li>Add or delete students</li>
        <li>Share the group with other staff</li>
      </ul>

      <div className="mt-2 space-y-3">
        <Input
          placeholder="Search staff by name or email"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <div className="max-h-48 overflow-y-auto rounded-md border">
          {filtered.length === 0 ? (
            <p className="p-3 text-center text-sm text-muted-foreground">No staff available.</p>
          ) : (
            <ul className="divide-y">
              {filtered.map((s) => (
                <li key={s.staffId} className="flex items-center gap-3 px-3 py-2">
                  <Checkbox
                    checked={selectedIds.has(s.staffId)}
                    onCheckedChange={() => toggle(s.staffId)}
                    aria-label={`Select ${s.name}`}
                  />
                  <div className="text-sm">
                    <div className="font-medium">{s.name}</div>
                    <div className="text-xs text-muted-foreground">{s.email}</div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <DialogFooter>
        <Button disabled={selectedIds.size === 0 || submitting} onClick={handleShare}>
          {submitting ? 'Sharing…' : 'Share group'}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
