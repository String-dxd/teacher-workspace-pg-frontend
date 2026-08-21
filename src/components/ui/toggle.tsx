import { Toggle as TogglePrimitive } from '@base-ui/react/toggle';
import { cva } from 'class-variance-authority';
import type { VariantProps } from 'class-variance-authority';

import { cn } from '~/lib/utils';

const toggleVariants = cva(
  "group/toggle inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 rounded-md text-sm font-medium whitespace-nowrap outline-none transition-colors focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 data-disabled:pointer-events-none data-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: 'bg-transparent hover:bg-muted data-pressed:bg-muted data-pressed:text-foreground',
        outline:
          'border border-input bg-transparent hover:bg-muted data-pressed:bg-muted data-pressed:text-foreground',
      },
      size: {
        default: 'h-9 min-w-9 px-2.5',
        sm: 'h-8 min-w-8 px-2',
        lg: 'h-10 min-w-10 px-3',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

function Toggle({
  className,
  variant,
  size,
  ...props
}: TogglePrimitive.Props<string> & VariantProps<typeof toggleVariants>) {
  return (
    <TogglePrimitive
      data-slot="toggle"
      className={cn(toggleVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Toggle, toggleVariants };
