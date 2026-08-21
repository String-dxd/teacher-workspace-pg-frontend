import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react';
import * as React from 'react';
import { DayPicker, type Matcher } from 'react-day-picker';

import { cn } from '~/lib/utils';

import { buttonVariants } from './button';

type CalendarProps = React.ComponentProps<typeof DayPicker>;

/**
 * Date picker, backed by `react-day-picker` the way upstream Shadcn's calendar
 * is. It replaced a hand-written month grid that mimicked this prop signature
 * without the behaviour — no keyboard navigation, and a `role="grid"` with no
 * rows or cells beneath it.
 *
 * Note on `disabled`: react-day-picker reads `{ before, after }` as its
 * *interval* matcher — the days BETWEEN the two dates. To disable everything
 * OUTSIDE a window, pass the two matchers separately, which reads as OR:
 * `disabled={[{ before: min }, { after: max }]}`.
 */
function Calendar({ className, classNames, showOutsideDays = true, ...props }: CalendarProps) {
  return (
    <DayPicker
      data-slot="calendar"
      showOutsideDays={showOutsideDays}
      className={cn('p-3', className)}
      classNames={{
        // Day appearance lives in the DayButton component below, not here.
        months: 'flex flex-col gap-4 sm:flex-row',
        month: 'flex flex-col gap-4',
        month_caption: 'flex h-7 items-center justify-center',
        caption_label: 'text-sm font-medium',
        nav: 'flex items-center justify-between absolute inset-x-3 top-3 h-7 pointer-events-none',
        button_previous: cn(
          buttonVariants({ variant: 'ghost', size: 'icon-sm' }),
          'pointer-events-auto size-7 rounded-md p-0 text-muted-foreground hover:text-foreground disabled:opacity-40',
        ),
        button_next: cn(
          buttonVariants({ variant: 'ghost', size: 'icon-sm' }),
          'pointer-events-auto size-7 rounded-md p-0 text-muted-foreground hover:text-foreground disabled:opacity-40',
        ),
        month_grid: 'w-full border-collapse',
        weekdays: 'flex',
        weekday: 'w-8 py-1 text-center text-xs font-normal text-muted-foreground',
        week: 'mt-1 flex w-full',
        day: 'relative p-0 text-center text-sm',
        hidden: 'invisible',
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation, className: chevronClassName, ...chevronProps }) => {
          const Icon = orientation === 'left' ? ChevronLeftIcon : ChevronRightIcon;
          return <Icon className={cn('size-4', chevronClassName)} {...chevronProps} />;
        },
        // react-day-picker keeps day state on the cell, not the button, so
        // styling the button from it would mean variants reaching up to a
        // parent. It hands the modifiers straight to this component instead,
        // which keeps the day's appearance to plain conditional classes.
        DayButton: ({ day: _day, modifiers, className: dayClassName, ...dayProps }) => (
          <button
            {...dayProps}
            className={cn(
              'size-8 rounded-md p-0 font-normal transition-colors outline-none',
              'focus-visible:ring-[3px] focus-visible:ring-ring/50',
              modifiers.selected
                ? 'bg-primary text-primary-foreground hover:bg-primary'
                : 'hover:bg-accent hover:text-accent-foreground',
              modifiers.today && !modifiers.selected && 'font-semibold text-primary',
              modifiers.outside && !modifiers.selected && 'text-muted-foreground/50',
              modifiers.disabled &&
                'cursor-not-allowed text-muted-foreground/40 hover:bg-transparent hover:text-muted-foreground/40',
              dayClassName,
            )}
          />
        ),
      }}
      {...props}
    />
  );
}

/**
 * Disable every date outside an optional `[min, max]` window — the shape every
 * date picker in this app wants.
 *
 * Written as two matchers rather than one `{ before, after }` object on
 * purpose: react-day-picker reads that object as its *interval* matcher, the
 * days BETWEEN the two, so passing it directly disables the window instead of
 * everything around it. An array reads as OR, which is the intended meaning.
 * Undefined bounds are dropped, so an open-ended window just works.
 */
function outsideRange(min?: Date, max?: Date): Matcher[] {
  const matchers: Matcher[] = [];
  if (min) matchers.push({ before: min });
  if (max) matchers.push({ after: max });
  return matchers;
}

export { Calendar, outsideRange };
export type { CalendarProps };
