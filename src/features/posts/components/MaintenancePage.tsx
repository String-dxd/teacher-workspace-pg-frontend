import type { NavigateFunction } from 'react-router';

import { Button } from '~/components/ui';
import { ServiceUnavailableError } from '~/features/posts/api/errors';

/** Placeholder pending UXD confirmation (issue #118) — kept in one constant
 *  so the confirmed copy is a one-line change. */
const MAINTENANCE_COPY = {
  heading: 'This section is under maintenance',
  body: 'We’re making some improvements. You can come back later.',
};

/**
 * Static maintenance notice for PG 503s. Mirrors the host shell's
 * ModuleLoadError layout (same illustration, type, and spacing) but with
 * maintenance copy and no retry — retrying always fails during a maintenance
 * window. "Back to home" is a full-page navigation so the host shell's router
 * takes over. Fills its container; the surrounding chrome stays in place.
 */
function MaintenancePage() {
  return (
    <div className="flex min-h-[400px] flex-1 flex-col items-center justify-center px-6 py-16">
      <div className="flex max-w-md flex-col items-center gap-6 text-center">
        <img
          src="/503-error-illustration.png"
          alt="A person surrounded by scattered papers and screens"
          className="h-auto w-64 object-contain"
        />
        <div className="flex flex-col gap-2">
          <h2 className="text-2xl font-semibold text-foreground">{MAINTENANCE_COPY.heading}</h2>
          <p className="text-muted-foreground">{MAINTENANCE_COPY.body}</p>
        </div>
        <Button variant="secondary" render={<a href="/" />} nativeButton={false}>
          Back to home
        </Button>
      </div>
    </div>
  );
}

export function navigateOnMaintenance(err: unknown, navigate: NavigateFunction): boolean {
  if (err instanceof ServiceUnavailableError) {
    navigate('/posts/maintenance');
    return true;
  }
  return false;
}

export { MaintenancePage, MAINTENANCE_COPY };
