import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '~/components/ui';

interface DeletePostDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /**
   * `'draft'` states the draft is going. `'posted'` carries the heavier
   * live-content warning — parents lose it immediately — and a blunter confirm
   * label. Both confirm in one click. `null` renders nothing.
   */
  mode: 'draft' | 'posted' | null;
  /** Post title surfaced in the description so teachers see what they're about to delete. */
  title: string;
  onConfirm: () => Promise<void>;
  /** Disables the primary button while the delete request is in flight. */
  pending?: boolean;
}

function DeletePostDialog({
  open,
  onOpenChange,
  mode,
  title,
  onConfirm,
  pending = false,
}: DeletePostDialogProps) {
  if (!mode) return null;

  const isDraft = mode === 'draft';

  const description = isDraft
    ? 'This draft will be permanently removed. This cannot be undone.'
    : 'This post has been sent to parents. Deleting it will remove it from the Parents Gateway app for everyone immediately. This cannot be undone.';

  const confirmLabel = isDraft ? 'Delete draft' : 'Delete for everyone';

  async function handleConfirm() {
    if (pending) return;
    await onConfirm();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Delete post?</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-1 py-1">
          <p className="text-xs text-muted-foreground">Post</p>
          <p className="truncate text-sm font-medium">{title || 'Untitled'}</p>
        </div>

        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)} disabled={pending}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleConfirm} disabled={pending}>
            {pending ? 'Deleting…' : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export { DeletePostDialog };
export type { DeletePostDialogProps };
