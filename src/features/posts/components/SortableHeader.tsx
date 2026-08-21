import { ArrowDown, ArrowUp, ChevronDown } from 'lucide-react';
import { useState } from 'react';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '~/components/ui';
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
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger
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
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-52 min-w-52">
        <DropdownMenuRadioGroup
          value={sortDir ?? ''}
          onValueChange={(value) => pick(value as SortDirection)}
        >
          <DropdownMenuRadioItem value="asc">
            <ArrowUp className="text-muted-foreground" />
            Sort ascending
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="desc">
            <ArrowDown className="text-muted-foreground" />
            Sort descending
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export { SortableHeader };
