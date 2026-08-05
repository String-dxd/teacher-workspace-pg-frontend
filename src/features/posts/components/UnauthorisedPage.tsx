import { Button } from '~/components/ui';

/** Placeholder pending UXD confirmation (issue #129) — kept in one constant
 *  so the confirmed copy is a one-line change. */
const UNAUTHORISED_COPY = {
  heading: 'This section is restricted',
  body: 'You may be listed as inactive in School Cockpit. Check in with your school administrator.',
};

/**
 * Static unauthorised notice for PG 401s. Mirrors the host shell's
 * ModuleLoadError layout (same illustration, type, and spacing) — the same
 * pattern as `MaintenancePage` — but with access-issue copy and no retry:
 * SC has flagged the staff member as inactive/unauthorised, so retrying
 * always fails until that's resolved by an admin. "Back to home" is a
 * full-page navigation so the host shell's router takes over. Fills its
 * container; the surrounding chrome (left nav) stays in place.
 */
function UnauthorisedPage() {
  return (
    <div className="flex min-h-[400px] flex-1 flex-col items-center justify-center px-6 py-16">
      <div className="flex max-w-md flex-col items-center gap-6 text-center">
        <img
          src="/404-illustration.png"
          alt="A person surrounded by scattered papers and screens"
          className="h-auto w-64 object-contain"
        />
        <div className="flex flex-col gap-2">
          <h2 className="text-2xl font-semibold text-foreground">{UNAUTHORISED_COPY.heading}</h2>
          <p className="text-muted-foreground">{UNAUTHORISED_COPY.body}</p>
        </div>
        <Button variant="secondary" render={<a href="/" />} nativeButton={false}>
          Back to home
        </Button>
      </div>
    </div>
  );
}

export { UnauthorisedPage, UNAUTHORISED_COPY };
