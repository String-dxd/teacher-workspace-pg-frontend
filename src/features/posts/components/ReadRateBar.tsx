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
    <div className={cn('flex items-center gap-2', className)}>
      <div className="h-1.5 w-20 overflow-hidden rounded-full bg-muted">
        <div
          className={cn('h-full rounded-full transition-all', isLow ? 'bg-amber-9' : 'bg-primary')}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-sm whitespace-nowrap text-muted-foreground">
        {readCount} / {totalCount}
      </span>
    </div>
  );
}

export { ReadRateBar };
