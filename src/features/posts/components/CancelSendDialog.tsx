import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '~/components/ui';

interface CancelSendDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Post title, so the teacher sees which scheduled send they are stopping. */
  title: string;
  /** When the post would have gone out, formatted for display. */
  scheduledFor?: string;
  onConfirm: () => Promise<void>;
  /** Disables the primary button while the request is in flight. */
  pending?: boolean;
}

/**
 * Confirms stopping a scheduled send. Replaces a bare `window.confirm`, which
 * came out unstyled and unbranded next to the app's own dialogs.
 *
 * Deliberately not destructive-styled: nothing is lost here. The post returns
 * to Draft with its content intact, which is also the only route back to Edit
 * and Delete — a scheduled post offers neither until its send is called off.
 */
function CancelSendDialog({
  open,
  onOpenChange,
  title,
  scheduledFor,
  onConfirm,
  pending = false,
}: CancelSendDialogProps) {
  async function handleConfirm() {
    if (pending) return;
    await onConfirm();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Cancel this send?</DialogTitle>
          <DialogDescription>
            The post returns to Draft with everything it holds now, so you can edit it, delete it,
            or schedule it again. Parents are not notified.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-1 py-1">
          <p className="text-xs text-muted-foreground">Post</p>
          <p className="truncate text-sm font-medium">{title || 'Untitled'}</p>
          {scheduledFor && (
            <p className="pt-1 text-xs text-muted-foreground">Due to send {scheduledFor}</p>
          )}
        </div>

        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)} disabled={pending}>
            Keep it scheduled
          </Button>
          <Button onClick={handleConfirm} disabled={pending}>
            {pending ? 'Cancelling…' : 'Cancel send'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export { CancelSendDialog };
export type { CancelSendDialogProps };
