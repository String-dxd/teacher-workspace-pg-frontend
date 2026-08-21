import { cn } from '~/lib/utils';

interface ReadRateBarProps {
  readCount: number;
  totalCount: number;
  className?: string;
}

/** Progress bar + fraction label for read/response rates. Amber below 50%. */
function ReadRateBar({ readCount, totalCount, className }: ReadRateBarProps) {
  if (totalCount === 0) {
    return <span className="text-sm text-muted-foreground">{'—'}</span>;
  }

  const pct = Math.round((readCount / totalCount) * 100);
  const isLow = pct < 50;

  return (
    <div className={cn('flex w-full items-center gap-2', className)}>
      {/* The bar takes whatever space the ratio leaves, rather than a fixed
          width: at a fixed 80px the pair overflowed its cell, and the overflow
          grew with the digit count, so the ratios ended at different points. */}
      <div className="h-1.5 min-w-8 flex-1 overflow-hidden rounded-full bg-muted">
        <div
          className={cn('h-full rounded-full transition-all', isLow ? 'bg-amber-9' : 'bg-primary')}
          style={{ width: `${pct}%` }}
        />
      </div>
      {/* Tabular figures, ending on the cell's right edge, so the ratios stack
          into a column the eye can run down. */}
      <span className="shrink-0 text-sm whitespace-nowrap text-muted-foreground tabular-nums">
        {readCount} / {totalCount}
      </span>
    </div>
  );
}

export { ReadRateBar };
