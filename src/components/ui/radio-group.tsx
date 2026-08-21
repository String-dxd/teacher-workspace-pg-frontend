import { Radio as RadioPrimitive } from '@base-ui/react/radio';
import { RadioGroup as RadioGroupPrimitive } from '@base-ui/react/radio-group';
import * as React from 'react';

import { cn } from '~/lib/utils';

function RadioGroup({ className, ...props }: RadioGroupPrimitive.Props<string>) {
  return (
    <RadioGroupPrimitive
      data-slot="radio-group"
      className={cn('grid gap-2', className)}
      {...props}
    />
  );
}

function RadioGroupItem({ className, ...props }: RadioPrimitive.Root.Props<string>) {
  return (
    <RadioPrimitive.Root
      data-slot="radio-group-item"
      className={cn(
        'relative flex size-[18px] shrink-0 items-center justify-center rounded-full border-[1.5px] border-muted-foreground/50 bg-background outline-none transition-all after:absolute after:-inset-x-3 after:-inset-y-2 hover:border-muted-foreground/80 hover:bg-muted/50 focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 data-checked:border-primary data-checked:bg-primary data-checked:text-primary-foreground data-disabled:cursor-not-allowed data-disabled:opacity-50 data-readonly:cursor-default aria-invalid:border-destructive aria-invalid:ring-[3px] aria-invalid:ring-destructive/20',
        className,
      )}
      {...props}
    >
      <RadioPrimitive.Indicator
        data-slot="radio-group-indicator"
        className="size-2 rounded-full bg-current transition-none data-unchecked:hidden"
      />
    </RadioPrimitive.Root>
  );
}

/**
 * A radio whose hit area is a whole card or row rather than a dot. Renders a
 * `div` so block content (headings, previews) stays valid inside it; Base UI
 * still supplies `role="radio"`, roving tabindex and arrow-key traversal.
 */
function RadioGroupCard({ className, ...props }: RadioPrimitive.Root.Props<string>) {
  return (
    <RadioPrimitive.Root
      data-slot="radio-group-card"
      render={<div />}
      className={cn(
        'group/radio-card cursor-pointer text-left outline-none transition-colors focus-visible:ring-2 focus-visible:ring-primary data-disabled:pointer-events-none data-disabled:opacity-50',
        className,
      )}
      {...props}
    />
  );
}

/**
 * The dot for a `RadioGroupCard`. Presentational only — it reads the card's
 * own `data-checked` state, so the card stays the single radio in the group
 * rather than nesting a second one inside itself.
 */
function RadioGroupCardIndicator({ className, ...props }: React.ComponentProps<'span'>) {
  return (
    <span
      aria-hidden
      data-slot="radio-group-card-indicator"
      className={cn(
        'relative flex size-[18px] shrink-0 items-center justify-center rounded-full border-[1.5px] border-muted-foreground/50 bg-background transition-colors group-hover/radio-card:border-muted-foreground/80 group-data-checked/radio-card:border-primary group-data-checked/radio-card:bg-primary group-data-checked/radio-card:text-primary-foreground',
        className,
      )}
      {...props}
    >
      <span className="size-2 rounded-full bg-current opacity-0 transition-opacity group-data-checked/radio-card:opacity-100" />
    </span>
  );
}

export { RadioGroup, RadioGroupCard, RadioGroupCardIndicator, RadioGroupItem };
