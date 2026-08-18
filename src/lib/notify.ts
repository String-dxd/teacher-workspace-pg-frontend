import { toast } from 'sonner';

interface NotifyOptions {
  /** Optional follow-up the teacher can take straight from the toast. */
  action?: { label: string; onClick: () => void };
}

export const notify = {
  success: (message: string, options?: NotifyOptions) => toast.success(message, options),
  error: (message: string, options?: NotifyOptions) => toast.error(message, options),
};
