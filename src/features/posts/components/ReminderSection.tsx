import { CalendarIcon } from 'lucide-react';

import { Calendar, Label, Popover, PopoverContent, PopoverTrigger } from '~/components/ui';
import type { ReminderConfig } from '~/data/posts-registry';
import { formatLocalDate } from '~/helpers/dateTime';

type ReminderRadioValue = 'NONE' | 'ONE_TIME' | 'DAILY';

const REMINDER_OPTIONS: { value: ReminderRadioValue; label: string }[] = [
  { value: 'NONE', label: 'None' },
  { value: 'ONE_TIME', label: 'One time' },
  { value: 'DAILY', label: 'Daily' },
];

interface ReminderSectionProps {
  value: ReminderConfig;
  onChange: (value: ReminderConfig) => void;
  /** The consent-by date in `YYYY-MM-DD` form. Used to display the default
   *  reminder info line ("Default reminder will be sent on [date]"). */
  consentByDate?: string;
}

function ReminderSection({ value, onChange, consentByDate }: ReminderSectionProps) {
  const disabled = !consentByDate;

  // Stash the picked date on the NONE branch so ONE_TIME/DAILY toggles
  // restore it. Living in state (not a ref) means it survives remounts and
  // shows up in devtools.
  const lastDate = value.type === 'NONE' ? (value.lastDate ?? '') : value.date;

  function handleRadioChange(next: ReminderRadioValue) {
    if (next === 'NONE') {
      onChange({ type: 'NONE', lastDate: value.type === 'NONE' ? value.lastDate : value.date });
      return;
    }
    onChange({ type: next, date: lastDate });
  }

  function handleDateChange(nextDate: string) {
    if (value.type === 'NONE') return;
    onChange({ type: value.type, date: nextDate });
  }

  const showPicker = value.type === 'ONE_TIME' || value.type === 'DAILY';
  const pickerLabel = value.type === 'DAILY' ? 'From' : 'On';
  // Empty display on NONE so the hidden picker doesn't flash a stale date.
  const displayDate = value.type === 'NONE' ? '' : value.date;

  // PGW's reminder window is `[tomorrow, consentByDate - 1 day]` inclusive.
  // Reminders outside this window blow up with a server-side "Bad request" — gate them at the picker.
  const minDate = addDaysIso(todayIso(), 1);
  const maxDate = consentByDate ? addDaysIso(consentByDate, -1) : undefined;
  const dateOutOfRange =
    value.type !== 'NONE' &&
    value.date.length > 0 &&
    (value.date < minDate || (maxDate !== undefined && value.date > maxDate));

  if (disabled) {
    return (
      <div className="space-y-3 opacity-50">
        <div>
          <p className="text-sm font-medium">Send more reminders to parents</p>
          <p className="text-sm text-muted-foreground">Set a due date first.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">Send more reminders to parents</p>

      <div className="space-y-2" role="radiogroup">
        {REMINDER_OPTIONS.map((option) => (
          <label key={option.value} className="flex cursor-pointer items-center gap-2">
            <input
              type="radio"
              className="h-3.5 w-3.5 accent-primary"
              name="reminder-type"
              value={option.value}
              checked={value.type === option.value}
              onChange={() => handleRadioChange(option.value)}
            />
            <span className="text-sm">{option.label}</span>
          </label>
        ))}
      </div>

      {showPicker && (
        <div className="space-y-1.5 pt-1">
          <Label>{pickerLabel}</Label>
          <Popover>
            <PopoverTrigger className="inline-flex h-9 w-[240px] items-center gap-2 rounded-[14px] border border-input bg-background px-3 text-left text-sm font-normal transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none">
              <CalendarIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
              {displayDate ? (
                (formatLocalDate(displayDate) ?? displayDate)
              ) : (
                <span className="text-muted-foreground">Pick a date</span>
              )}
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={isoToLocalDate(displayDate)}
                onSelect={(date) => {
                  if (date) handleDateChange(localDateToIso(date));
                }}
                disabled={{
                  before: isoToLocalDate(minDate),
                  after: maxDate ? isoToLocalDate(maxDate) : undefined,
                }}
              />
            </PopoverContent>
          </Popover>
          {dateOutOfRange && (
            <p id="reminder-date-error" className="text-sm text-destructive">
              Reminder must fall between tomorrow and the day before the due date.
            </p>
          )}
        </div>
      )}
    </div>
  );
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

function todayIso(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function addDaysIso(iso: string, days: number): string {
  // Parse `YYYY-MM-DD` as a local-date (avoid `new Date(iso)` which treats it as UTC).
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return iso;
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() + days);
  const yy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
}

export { ReminderSection };
export type { ReminderSectionProps };
