import { CalendarIcon } from 'lucide-react';
import { useMemo } from 'react';

// TODO: add Calendar to ~/components/ui (shadcn calendar component + react-day-picker)
import { Label } from '~/components/ui';
import { Popover, PopoverContent, PopoverTrigger } from '~/components/ui/popover';

interface DueDateSectionProps {
  value: string; // YYYY-MM-DD
  onChange: (value: string) => void;
  required?: boolean;
}

/** Parse a `YYYY-MM-DD` string as a local-midnight Date (avoids UTC-shift). */
function isoToLocalDate(iso: string): Date | undefined {
  if (!iso) return undefined;
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return undefined;
  return new Date(y, m - 1, d);
}

/** Format a local Date back to `YYYY-MM-DD`. */
function localDateToIso(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Format a naive-local `YYYY-MM-DD` string as `"30 Mar 2026"`. */
function formatLocalDate(local: string | undefined): string | undefined {
  if (!local) return undefined;
  const [y, mo, d] = local.split('-').map(Number);
  if (![y, mo, d].every((n) => Number.isFinite(n))) return undefined;
  const dt = new Date(y, (mo ?? 1) - 1, d);
  if (Number.isNaN(dt.getTime())) return undefined;
  const day = dt.getDate();
  const month = dt.toLocaleDateString('en-GB', { month: 'short' });
  const year = dt.getFullYear();
  return `${day} ${month} ${year}`;
}

function DueDateSection({ value, onChange, required = false }: DueDateSectionProps) {
  const today = useMemo(() => {
    const t = new Date();
    t.setHours(0, 0, 0, 0);
    return t;
  }, []);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const selected = useMemo(() => isoToLocalDate(value), [value]);
  const formattedDate = value ? (formatLocalDate(value) ?? value) : null;

  return (
    <div className="space-y-1.5">
      <Label>Due Date{required && <span className="text-destructive"> *</span>}</Label>
      <p className="text-sm text-muted-foreground">
        The latest date by which parents must respond.
      </p>

      <Popover>
        <PopoverTrigger className="inline-flex h-9 w-[240px] items-center gap-2 rounded-[14px] border border-input bg-background px-3 text-left text-sm font-normal transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none">
          <CalendarIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
          {formattedDate ?? <span className="text-muted-foreground">Pick a date</span>}
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          {/* TODO: render <Calendar> once ~/components/ui/calendar is added.
              For now fall back to a native date input. */}
          <input
            type="date"
            className="m-2 rounded border border-input bg-background px-3 py-2 text-sm"
            value={value}
            min={localDateToIso(today)}
            onChange={(e) => {
              if (e.target.value) onChange(e.target.value);
            }}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}

export { DueDateSection };
export type { DueDateSectionProps };
