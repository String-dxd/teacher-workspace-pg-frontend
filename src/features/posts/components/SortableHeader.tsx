import { ArrowDown, ArrowUp, Check, ChevronDown } from 'lucide-react';
import { useState } from 'react';

import { Popover, PopoverContent, PopoverTrigger } from '~/components/ui';
import { cn } from '~/lib/utils';

export type SortDirection = 'asc' | 'desc';

export interface SortState {
  column: string;
  direction: SortDirection;
}

interface SortableHeaderProps {
  label: string;
  column: string;
  sort: SortState | null;
  onSort: (column: string, direction: SortDirection) => void;
}

function SortableHeader({ label, column, sort, onSort }: SortableHeaderProps) {
  const [open, setOpen] = useState(false);
  const isSortedBy = sort?.column === column;
  const sortDir = isSortedBy ? sort.direction : null;

  function pick(direction: SortDirection) {
    onSort(column, direction);
    setOpen(false);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        className={cn(
          '-ml-2 flex cursor-pointer items-center gap-1 rounded-md px-2 py-1 whitespace-nowrap transition-colors',
          'hover:bg-muted hover:text-foreground',
          isSortedBy && 'text-primary',
        )}
      >
        <span>{label}</span>
        <span className="shrink-0">
          {sortDir === 'asc' ? (
            <ArrowUp className="h-3 w-3" />
          ) : sortDir === 'desc' ? (
            <ArrowDown className="h-3 w-3" />
          ) : (
            <ChevronDown className="h-3 w-3" />
          )}
        </span>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-52 gap-1 p-3">
        <button
          type="button"
          onClick={() => pick('asc')}
          className={cn(
            'flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-muted',
            isSortedBy && sortDir === 'asc' && 'bg-muted',
          )}
        >
          <ArrowUp className="h-4 w-4 text-muted-foreground" />
          Sort ascending
          {isSortedBy && sortDir === 'asc' && (
            <Check className="ml-auto h-4 w-4 text-muted-foreground" />
          )}
        </button>
        <button
          type="button"
          onClick={() => pick('desc')}
          className={cn(
            'flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-muted',
            isSortedBy && sortDir === 'desc' && 'bg-muted',
          )}
        >
          <ArrowDown className="h-4 w-4 text-muted-foreground" />
          Sort descending
          {isSortedBy && sortDir === 'desc' && (
            <Check className="ml-auto h-4 w-4 text-muted-foreground" />
          )}
        </button>
      </PopoverContent>
    </Popover>
  );
}

export { SortableHeader };
