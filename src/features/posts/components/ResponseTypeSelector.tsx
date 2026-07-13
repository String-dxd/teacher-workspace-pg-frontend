import { Check } from 'lucide-react';

import { RESPONSE_TYPE_META, type ResponseType } from '~/data/posts-registry';
import { cn } from '~/lib/utils';

interface ResponseTypeSelectorProps {
  value: ResponseType;
  onChange: (value: ResponseType) => void;
  children?: React.ReactNode;
  /**
   * Consent-form variant: hide the `view-only` option. Per R2, Posts-with-
   * Responses must offer Acknowledge + Yes/No only (view-only is an
   * announcement-only response type).
   */
  hideViewOnly?: boolean;
}

const RESPONSE_OPTIONS = (
  Object.entries(RESPONSE_TYPE_META) as [ResponseType, (typeof RESPONSE_TYPE_META)[ResponseType]][]
).map(([value, meta]) => ({ value, ...meta }));

function ResponseTypeSelector({
  value,
  onChange,
  children,
  hideViewOnly = false,
}: ResponseTypeSelectorProps) {
  const showChildren = value === 'acknowledge' || value === 'yes-no';
  const options = hideViewOnly
    ? RESPONSE_OPTIONS.filter((o) => o.value !== 'view-only')
    : RESPONSE_OPTIONS;

  return (
    <div className="space-y-4">
      <div role="radiogroup" aria-label="Response type" className="grid gap-3 sm:grid-cols-2">
        {options.map((option) => {
          const selected = value === option.value;
          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onChange(option.value)}
              className={cn(
                'group relative flex flex-col overflow-hidden rounded-xl border bg-card p-4 text-left transition-colors',
                'hover:border-input hover:bg-muted focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none',
                selected
                  ? 'border-primary bg-primary/[0.04] ring-1 ring-primary/20 hover:bg-primary/[0.04]'
                  : 'border-border',
              )}
            >
              {selected && (
                <span className="absolute top-3 right-3 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  <Check className="h-3 w-3" strokeWidth={3} />
                </span>
              )}
              <ResponseTypePreview type={option.value} />
              <div className="mt-3 space-y-1">
                <p className="text-sm font-semibold text-foreground">{option.label}</p>
                <p className="text-xs text-muted-foreground">{option.description}</p>
              </div>
            </button>
          );
        })}
      </div>

      {showChildren && children}
    </div>
  );
}

function ResponseTypePreview({ type }: { type: ResponseType }) {
  return (
    <div className="flex h-28 flex-col justify-end gap-2 rounded-lg bg-muted/60 p-3">
      <div className="space-y-1.5">
        <div className="h-1.5 w-full rounded-full bg-muted-foreground/20" />
        <div className="h-1.5 w-3/4 rounded-full bg-muted-foreground/20" />
      </div>
      {/* PG acknowledge button colour — matches the parent-app mockup in PostPreview */}
      {type === 'acknowledge' && (
        <div className="mt-1 flex h-6 items-center justify-center rounded-md bg-[#c9826b] text-[10px] font-medium text-white">
          Acknowledge
        </div>
      )}
      {type === 'yes-no' && (
        <div className="mt-1 flex gap-1.5">
          <div className="flex h-6 flex-1 items-center justify-center rounded-md bg-[#c9826b] text-[10px] font-medium text-white">
            Yes
          </div>
          <div className="flex h-6 flex-1 items-center justify-center rounded-md border border-[#c9826b] text-[10px] font-medium text-[#c9826b]">
            No
          </div>
        </div>
      )}
      {type === 'view-only' && <div className="h-1.5 w-1/2 rounded-full bg-muted-foreground/20" />}
    </div>
  );
}

export { ResponseTypeSelector };
export type { ResponseTypeSelectorProps };
