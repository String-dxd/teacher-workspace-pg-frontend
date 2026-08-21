import { Button } from '~/components/ui';

export type PostKind = 'post' | 'post-with-response';

interface PostTypePickerProps {
  onSelect: (type: PostKind) => void;
}

// Entry chooser ported from the design-teacher-workspace create page (PR #165).
// The design's third "Custom form" card is feature-flagged there and has no
// counterpart in this app, so only the two post kinds are offered.

function AnnouncementMockup() {
  return (
    <div className="flex flex-col gap-1.5 p-4">
      <div className="h-2.5 w-2/3 rounded-full bg-border" />
      <div className="h-2 w-full rounded-full bg-border/50" />
      <div className="h-2 w-full rounded-full bg-border/50" />
      <div className="h-2 w-full rounded-full bg-border/50" />
      <div className="h-2 w-full rounded-full bg-border/50" />
      <div className="h-2 w-full rounded-full bg-border/50" />
    </div>
  );
}

function ResponseMockup() {
  return (
    <div className="flex flex-col gap-2 p-4">
      <div className="h-2.5 w-2/3 rounded-full bg-border" />
      <div className="h-2 w-full rounded-full bg-border/50" />
      <div className="h-2 w-full rounded-full bg-border/50" />
      {/* PG acknowledge button colour — matches the parent-app mockup in PostPreview */}
      <div className="mt-1 flex h-7 items-center justify-center rounded-md bg-[#c9826b]">
        <div className="h-1.5 w-14 rounded-full bg-white/70" />
      </div>
    </div>
  );
}

interface CreateOption {
  kind: PostKind;
  title: string;
  description: string;
  mockup: React.ReactNode;
}

const CREATE_OPTIONS: CreateOption[] = [
  {
    kind: 'post',
    title: 'Read Only',
    description: 'Parents read the post on Parents Gateway. No action required.',
    mockup: <AnnouncementMockup />,
  },
  {
    kind: 'post-with-response',
    title: 'Response Required',
    description: 'Parents acknowledge or answer yes/no on Parents Gateway.',
    mockup: <ResponseMockup />,
  },
];

function PostTypePicker({ onSelect }: PostTypePickerProps) {
  return (
    <div className="flex flex-1 items-start justify-center px-6 pt-12 sm:items-center sm:pt-24">
      <div className="w-full max-w-2xl">
        <div className="mb-8 text-center">
          <h1 className="text-xl font-semibold text-foreground sm:text-2xl">Create new post</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Choose whether parents need to respond.
          </p>
        </div>

        <div className="mx-auto grid grid-cols-1 gap-4 sm:grid-cols-2">
          {CREATE_OPTIONS.map((option) => (
            <Button
              key={option.kind}
              type="button"
              variant="secondary"
              onClick={() => onSelect(option.kind)}
              className="group h-auto flex-col items-stretch justify-start overflow-hidden rounded-xl border-2 border-border bg-card p-0 text-left whitespace-normal transition-all duration-150 ease-out hover:border-slate-8 hover:bg-card hover:shadow-sm active:scale-[0.98]"
            >
              <span className="block h-28 w-full border-b border-border bg-muted">
                {option.mockup}
              </span>
              <span className="flex flex-1 flex-col justify-between p-4">
                <span className="block">
                  <span className="block text-sm font-semibold text-foreground">
                    {option.title}
                  </span>
                  <span className="mt-1 block text-xs leading-relaxed font-normal text-muted-foreground">
                    {option.description}
                  </span>
                </span>
              </span>
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}

export { PostTypePicker };
export type { PostTypePickerProps };
