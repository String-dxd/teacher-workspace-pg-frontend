// TODO: replace with shadcn Calendar + react-day-picker once the dependency is
// added to the project. This stub keeps TypeScript and rendering from
// crashing while Calendar usage is wired in other components.

interface CalendarProps {
  mode?: 'single' | 'multiple' | 'range';
  selected?: Date | undefined;
  onSelect?: (date: Date | undefined) => void;
  disabled?: boolean | { before?: Date; after?: Date };
  className?: string;
}

export function Calendar({ selected, onSelect, disabled, className }: CalendarProps) {
  const isDisabledFn = (d: Date): boolean => {
    if (typeof disabled === 'boolean') return disabled;
    if (typeof disabled === 'object') {
      if (disabled.before && d < disabled.before) return true;
      if (disabled.after && d > disabled.after) return true;
    }
    return false;
  };

  // Render a minimal 7-day week picker centred on the current month.
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const year = today.getFullYear();
  const month = today.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const days = Array.from({ length: daysInMonth }, (_, i) => new Date(year, month, i + 1));

  return (
    <div className={className} role="grid" aria-label="Date picker">
      <div className="grid grid-cols-7 gap-1 p-2 text-xs">
        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => (
          <span key={d} className="text-center text-muted-foreground">
            {d}
          </span>
        ))}
        {/* leading blank cells */}
        {Array.from({ length: days[0]?.getDay() ?? 0 }).map((_, i) => (
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
              className={[
                'rounded-md py-1 text-center text-sm',
                dis ? 'cursor-not-allowed text-muted-foreground/40' : 'hover:bg-accent',
                isSelected ? 'bg-primary text-primary-foreground' : '',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              {d.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
}
