import { memo } from 'react';

import { Card, CardContent, Progress } from '~/components/ui';
import type { AnnouncementStats, ConsentFormStats, ResponseType } from '~/data/posts-registry';
import { cn } from '~/lib/utils';

export type ReadCardFilter = 'read' | 'unread' | null;
export type ConsentFormTileFilter = 'all' | 'yes' | 'no' | 'no-response';

type ReadTrackingCardsProps =
  | {
      kind?: 'announcement';
      responseType: ResponseType;
      stats: AnnouncementStats;
      readFilter?: ReadCardFilter;
      onReadFilterChange?: (next: ReadCardFilter) => void;
    }
  | {
      kind: 'form';
      responseType: 'acknowledge' | 'yes-no';
      stats: ConsentFormStats;
      /** Yes/No forms only: which tile (if any) is the active table filter. */
      activeFilter?: ConsentFormTileFilter;
      onFilterChange?: (next: ConsentFormTileFilter) => void;
    };

interface ResponseCardProps {
  label: string;
  count: number;
  total: number;
  pendingNote?: string | null;
  onMainActivate?: () => void;
  onPendingActivate?: () => void;
  active?: 'main' | 'pending' | null;
}

const ResponseCard = memo(function ResponseCard({
  label,
  count,
  total,
  pendingNote,
  onMainActivate,
  onPendingActivate,
  active = null,
}: ResponseCardProps) {
  const percent = total > 0 ? (count / total) * 100 : 0;

  const mainContent = (
    <div className="flex items-baseline gap-1.5 whitespace-nowrap">
      <span className="text-4xl leading-none font-semibold tracking-tight tabular-nums">
        {count}
      </span>
      <span className="text-xl text-muted-foreground tabular-nums">/ {total}</span>
    </div>
  );

  return (
    <Card>
      <CardContent className="flex flex-col gap-5 p-6">
        <div className="flex items-start justify-between gap-6">
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold tracking-[0.14em] text-muted-foreground uppercase">
              {label}
            </span>
            {onMainActivate ? (
              <button
                type="button"
                onClick={onMainActivate}
                aria-pressed={active === 'main'}
                className={cn(
                  'rounded-md text-left transition-colors',
                  'focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none',
                  active === 'main' ? 'ring-2 ring-primary' : 'hover:bg-muted/40',
                )}
              >
                {mainContent}
              </button>
            ) : (
              mainContent
            )}
            {pendingNote &&
              (onPendingActivate ? (
                <button
                  type="button"
                  onClick={onPendingActivate}
                  aria-pressed={active === 'pending'}
                  className={cn(
                    'rounded-md px-1 text-left text-sm font-medium text-warning-foreground transition-colors',
                    'focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none',
                    active === 'pending'
                      ? 'bg-warning/20 ring-2 ring-warning'
                      : 'hover:bg-warning/10',
                  )}
                >
                  {pendingNote}
                </button>
              ) : (
                <span className="text-sm font-medium text-warning-foreground">{pendingNote}</span>
              ))}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Progress value={percent} className="flex-1" aria-label={`${label} progress`} />
          <span className="shrink-0 text-sm text-muted-foreground tabular-nums">
            {count} / {total}
          </span>
        </div>
      </CardContent>
    </Card>
  );
});

// ─── Announcement variant ───────────────────────────────────────────────────

function AnnouncementCard({
  stats,
  readFilter,
  onReadFilterChange,
}: {
  responseType: ResponseType;
  stats: AnnouncementStats;
  readFilter?: ReadCardFilter;
  onReadFilterChange?: (next: ReadCardFilter) => void;
}) {
  const { totalCount, readCount } = stats;
  const unreadCount = Math.max(totalCount - readCount, 0);

  const active: 'main' | 'pending' | null =
    readFilter === 'read' ? 'main' : readFilter === 'unread' ? 'pending' : null;
  const toggle = (scope: 'read' | 'unread') => {
    if (!onReadFilterChange) return;
    onReadFilterChange(readFilter === scope ? null : scope);
  };

  return (
    <ResponseCard
      label="Read by parents"
      count={readCount}
      total={totalCount}
      pendingNote={unreadCount > 0 ? `${unreadCount} unread` : null}
      onMainActivate={onReadFilterChange ? () => toggle('read') : undefined}
      onPendingActivate={onReadFilterChange && unreadCount > 0 ? () => toggle('unread') : undefined}
      active={active}
    />
  );
}

// ─── Consent-form variant (acknowledge-type forms; yes-no forms use the stat
// tiles below) ────────────────────────────────────────────────────────────

function ConsentFormCard({ stats }: { stats: ConsentFormStats }) {
  const { totalCount, yesCount, pendingCount } = stats;

  return (
    <ResponseCard
      label="Acknowledgements received"
      count={yesCount}
      total={totalCount}
      pendingNote={pendingCount > 0 ? `${pendingCount} pending` : null}
    />
  );
}

// ─── Consent-form stat tiles (Yes/No forms) ─────────────────────────────────

interface StatTileProps {
  label: string;
  count: number;
  tone: 'neutral' | 'success' | 'destructive' | 'muted';
  active: boolean;
  onClick?: () => void;
}

const TILE_TONE: Record<StatTileProps['tone'], string> = {
  neutral: 'text-foreground',
  success: 'text-success-foreground',
  destructive: 'text-destructive',
  muted: 'text-warning-foreground',
};

const StatTile = memo(function StatTile({ label, count, tone, active, onClick }: StatTileProps) {
  return (
    <Card>
      <CardContent className="p-0">
        <button
          type="button"
          onClick={onClick}
          disabled={!onClick}
          aria-pressed={active}
          className={cn(
            'flex w-full cursor-pointer flex-col items-start gap-1 rounded-xl px-5 py-4 text-left transition-colors disabled:cursor-default',
            'focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none',
            active ? 'ring-2 ring-primary' : 'hover:bg-muted/40',
          )}
        >
          <span className="text-xs font-semibold tracking-[0.14em] text-muted-foreground uppercase">
            {label}
          </span>
          <span className={cn('text-3xl leading-none font-semibold tabular-nums', TILE_TONE[tone])}>
            {count}
          </span>
        </button>
      </CardContent>
    </Card>
  );
});

function ConsentFormStatTiles({
  stats,
  activeFilter = 'all',
  onFilterChange,
}: {
  stats: ConsentFormStats;
  activeFilter?: ConsentFormTileFilter;
  onFilterChange?: (next: ConsentFormTileFilter) => void;
}) {
  function toggle(scope: 'yes' | 'no' | 'no-response') {
    if (!onFilterChange) return;
    onFilterChange(activeFilter === scope ? 'all' : scope);
  }

  return (
    <div
      role="group"
      aria-label="Response summary"
      className="grid grid-cols-2 gap-4 sm:grid-cols-4"
    >
      <StatTile
        label="Total"
        count={stats.totalCount}
        tone="neutral"
        active={activeFilter === 'all'}
        onClick={onFilterChange ? () => onFilterChange('all') : undefined}
      />
      <StatTile
        label="Yes"
        count={stats.yesCount}
        tone="success"
        active={activeFilter === 'yes'}
        onClick={onFilterChange ? () => toggle('yes') : undefined}
      />
      <StatTile
        label="No"
        count={stats.noCount}
        tone="destructive"
        active={activeFilter === 'no'}
        onClick={onFilterChange ? () => toggle('no') : undefined}
      />
      <StatTile
        label="Pending"
        count={stats.pendingCount}
        tone="muted"
        active={activeFilter === 'no-response'}
        onClick={onFilterChange ? () => toggle('no-response') : undefined}
      />
    </div>
  );
}

export function ReadTrackingCards(props: ReadTrackingCardsProps) {
  if (props.kind === 'form') {
    if (props.responseType === 'yes-no') {
      return (
        <ConsentFormStatTiles
          stats={props.stats}
          activeFilter={props.activeFilter}
          onFilterChange={props.onFilterChange}
        />
      );
    }
    return <ConsentFormCard stats={props.stats} />;
  }
  return (
    <AnnouncementCard
      responseType={props.responseType}
      stats={props.stats}
      readFilter={props.readFilter}
      onReadFilterChange={props.onReadFilterChange}
    />
  );
}
