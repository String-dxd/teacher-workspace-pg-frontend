import { CalendarIcon } from 'lucide-react';

import { Calendar, Popover, PopoverContent, PopoverTrigger } from '~/components/ui';
import { formatLocalDate } from '~/helpers/dateTime';

interface DateRangeFieldsProps {
  startDate: string;
  endDate: string;
  onStartDateChange: (value: string) => void;
  onEndDateChange: (value: string) => void;
}

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

function DatePickerField({
  label,
  value,
  onChange,
  minDate,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  minDate?: string;
}) {
  return (
    <Popover>
      <PopoverTrigger
        aria-label={label}
        className="inline-flex h-9 flex-1 items-center gap-2 rounded-[14px] border border-input bg-background px-3 text-left text-sm font-normal transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none"
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
          onSelect={(date) => {
            if (date) onChange(localDateToIso(date));
          }}
          disabled={minDate ? { before: isoToLocalDate(minDate) } : undefined}
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
  return (
    <div className="flex items-center gap-2">
      <DatePickerField label="Start date" value={startDate} onChange={onStartDateChange} />
      <span className="text-muted-foreground">–</span>
      <DatePickerField
        label="End date"
        value={endDate}
        onChange={onEndDateChange}
        minDate={startDate}
      />
    </div>
  );
}

export { DateRangeFields };
export type { DateRangeFieldsProps };
