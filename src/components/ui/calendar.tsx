import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useState } from 'react';

import { cn } from '~/lib/utils';

interface CalendarProps {
  mode?: 'single' | 'multiple' | 'range';
  selected?: Date | undefined;
  onSelect?: (date: Date | undefined) => void;
  disabled?: boolean | { before?: Date; after?: Date };
  className?: string;
}

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

export function Calendar({ selected, onSelect, disabled, className }: CalendarProps) {
  const initial = selected ?? new Date();
  const [viewYear, setViewYear] = useState(initial.getFullYear());
  const [viewMonth, setViewMonth] = useState(initial.getMonth());

  const isDisabledFn = (d: Date): boolean => {
    if (typeof disabled === 'boolean') return disabled;
    if (typeof disabled === 'object') {
      if (disabled.before && d < disabled.before) return true;
      if (disabled.after && d > disabled.after) return true;
    }
    return false;
  };

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const days = Array.from({ length: daysInMonth }, (_, i) => new Date(viewYear, viewMonth, i + 1));
  const firstDayOfWeek = days[0]?.getDay() ?? 0;

  function prevMonth() {
    if (viewMonth === 0) {
      setViewYear(viewYear - 1);
      setViewMonth(11);
    } else {
      setViewMonth(viewMonth - 1);
    }
  }

  function nextMonth() {
    if (viewMonth === 11) {
      setViewYear(viewYear + 1);
      setViewMonth(0);
    } else {
      setViewMonth(viewMonth + 1);
    }
  }

  return (
    <div className={cn('p-3', className)} role="grid" aria-label="Date picker">
      <div className="mb-2 flex items-center justify-between">
        <button
          type="button"
          onClick={prevMonth}
          className="inline-flex h-7 w-7 items-center justify-center rounded-md hover:bg-accent"
          aria-label="Previous month"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="text-sm font-medium">
          {MONTHS[viewMonth]} {viewYear}
        </span>
        <button
          type="button"
          onClick={nextMonth}
          className="inline-flex h-7 w-7 items-center justify-center rounded-md hover:bg-accent"
          aria-label="Next month"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-xs">
        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => (
          <span key={d} className="py-1 text-center text-muted-foreground">
            {d}
          </span>
        ))}
        {Array.from({ length: firstDayOfWeek }).map((_, i) => (
          <span key={`blank-${i}`} />
        ))}
        {days.map((d) => {
          const isSelected =
            selected &&
            d.getFullYear() === selected.getFullYear() &&
            d.getMonth() === selected.getMonth() &&
            d.getDate() === selected.getDate();
          const dis = isDisabledFn(d);
          return (
            <button
              key={d.toISOString()}
              type="button"
              disabled={dis}
              aria-pressed={isSelected ?? false}
              aria-label={d.toLocaleDateString()}
              onClick={() => !dis && onSelect?.(d)}
              className={cn(
                'h-8 w-8 rounded-md text-center text-sm',
                dis && 'cursor-not-allowed text-muted-foreground/40',
                !dis && 'hover:bg-accent',
                isSelected && 'bg-primary text-primary-foreground',
              )}
            >
              {d.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
}
