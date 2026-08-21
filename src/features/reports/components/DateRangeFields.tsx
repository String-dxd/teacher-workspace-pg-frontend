import { CalendarIcon } from 'lucide-react';

import { Calendar, outsideRange, Popover, PopoverContent, PopoverTrigger } from '~/components/ui';
import { formatLocalDate } from '~/helpers/dateTime';
import { cn } from '~/lib/utils';

interface DateRangeFieldsProps {
  startDate: string;
  endDate: string;
  onStartDateChange: (value: string) => void;
  onEndDateChange: (value: string) => void;
}

// The start date is bounded by whole months around today; the end date is
// bounded by whatever start date the teacher picked.
const START_MONTHS_BACK = 3;
const START_MONTHS_FORWARD = 12;
const END_MONTHS_AFTER_START = 3;

function isoToLocalDate(iso: string): Date | undefined {
  if (!iso) return undefined;
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return undefined;
  return new Date(y, m - 1, d);
}

function localDateToIso(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** First day of the month `offset` months from `base`. */
function monthStart(base: Date, offset: number): Date {
  return new Date(base.getFullYear(), base.getMonth() + offset, 1);
}

/** Last day of the month `offset` months from `base`. Day 0 of the following
 *  month is the last day of the one before it. */
function monthEnd(base: Date, offset: number): Date {
  return new Date(base.getFullYear(), base.getMonth() + offset + 1, 0);
}

function DatePickerField({
  label,
  value,
  onChange,
  minDate,
  maxDate,
  defaultMonth,
  disabled = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  minDate?: Date;
  maxDate?: Date;
  defaultMonth?: Date;
  disabled?: boolean;
}) {
  return (
    <Popover>
      <PopoverTrigger
        aria-label={label}
        disabled={disabled}
        className={cn(
          'inline-flex h-9 flex-1 items-center gap-2 rounded-[14px] border border-input bg-background px-3 text-left text-sm font-normal transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none',
          disabled && 'pointer-events-none opacity-50',
        )}
      >
        <CalendarIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
        {value ? (
          (formatLocalDate(value) ?? value)
        ) : (
          <span className="text-muted-foreground">{label}</span>
        )}
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={isoToLocalDate(value)}
          defaultMonth={defaultMonth}
          onSelect={(date) => {
            if (date) onChange(localDateToIso(date));
          }}
          disabled={outsideRange(minDate, maxDate)}
        />
      </PopoverContent>
    </Popover>
  );
}

function DateRangeFields({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
}: DateRangeFieldsProps) {
  const today = new Date();
  const startMin = monthStart(today, -START_MONTHS_BACK);
  const startMax = monthEnd(today, START_MONTHS_FORWARD);

  const start = isoToLocalDate(startDate);
  const endMax = start ? monthEnd(start, END_MONTHS_AFTER_START) : undefined;

  function handleStartDateChange(value: string) {
    onStartDateChange(value);

    // A previously chosen end date can fall outside the new window. Clear it
    // rather than quietly moving it — the teacher picks again, and Download
    // stays disabled until they do, so nothing wrong gets submitted unnoticed.
    const nextStart = isoToLocalDate(value);
    const currentEnd = isoToLocalDate(endDate);
    if (!nextStart || !currentEnd) return;
    const nextEndMax = monthEnd(nextStart, END_MONTHS_AFTER_START);
    if (currentEnd < nextStart || currentEnd > nextEndMax) onEndDateChange('');
  }

  return (
    <div className="flex items-center gap-2">
      <DatePickerField
        label="Start date"
        value={startDate}
        onChange={handleStartDateChange}
        minDate={startMin}
        maxDate={startMax}
      />
      <span className="text-muted-foreground">–</span>
      <DatePickerField
        label="End date"
        value={endDate}
        onChange={onEndDateChange}
        minDate={start}
        maxDate={endMax}
        // Opens on the start month, not today — with a future start date the
        // calendar would otherwise open on a month where everything is
        // disabled.
        defaultMonth={start}
        // The end range is defined entirely from the start date, so there is
        // nothing to pick against until one exists.
        disabled={!start}
      />
    </div>
  );
}

export { DateRangeFields };
export type { DateRangeFieldsProps };
