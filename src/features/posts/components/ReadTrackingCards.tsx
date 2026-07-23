import { memo } from 'react';

import { Card, CardContent, Progress } from '~/components/ui';
import type { AnnouncementStats, ConsentFormStats, ResponseType } from '~/data/posts-registry';
import { cn } from '~/lib/utils';

import type { StatusFilter } from './RecipientFilterPopover';

export type ReadCardFilter = 'read' | 'unread' | null;

/** Which stat tile a Yes/No consent form's status filter currently matches. */
export type ConsentFormStatFilter = Extract<StatusFilter, 'all' | 'yes' | 'no' | 'no-response'>;

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
      statFilter?: ConsentFormStatFilter;
      onStatFilterChange?: (next: ConsentFormStatFilter) => void;
    };

interface MiniStat {
  count: number;
  label: string;
  tone: 'success' | 'destructive' | 'muted';
}

const MINI_TONE: Record<MiniStat['tone'], string> = {
  success: 'text-success-foreground',
  destructive: 'text-destructive',
  muted: 'text-muted-foreground',
};

function MiniStatCell({ count, label, tone }: MiniStat) {
  return (
    <div className="flex min-w-[44px] flex-col items-center gap-0.5">
      <span className={cn('text-3xl leading-none font-semibold tabular-nums', MINI_TONE[tone])}>
        {count}
      </span>
      <span className="text-[10px] font-semibold tracking-[0.14em] text-muted-foreground uppercase">
        {label}
      </span>
    </div>
  );
}

interface ResponseCardProps {
  label: string;
  count: number;
  total: number;
  pendingNote?: string | null;
  miniStats?: MiniStat[];
  onMainActivate?: () => void;
  onPendingActivate?: () => void;
  active?: 'main' | 'pending' | null;
}

const ResponseCard = memo(function ResponseCard({
  label,
  count,
  total,
  pendingNote,
  miniStats = [],
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

          {miniStats.length > 0 && (
            <div className="flex items-start gap-4 pt-1">
              {miniStats.map((s) => (
                <MiniStatCell key={s.label} {...s} />
              ))}
            </div>
          )}
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

// ─── Consent-form variant ───────────────────────────────────────────────────

function ConsentFormCard({
  responseType,
  stats,
}: {
  responseType: 'acknowledge' | 'yes-no';
  stats: ConsentFormStats;
}) {
  const { totalCount, yesCount, noCount, pendingCount } = stats;
  const respondedCount =
    responseType === 'acknowledge' ? yesCount : Math.max(totalCount - pendingCount, 0);
  const label = responseType === 'acknowledge' ? 'Acknowledgements received' : 'Post responses';
  const miniStats: MiniStat[] =
    responseType === 'yes-no'
      ? [
          { count: yesCount, label: 'Yes', tone: 'success' },
          { count: noCount, label: 'No', tone: 'destructive' },
        ]
      : [];

  return (
    <ResponseCard
      label={label}
      count={respondedCount}
      total={totalCount}
      pendingNote={pendingCount > 0 ? `${pendingCount} pending` : null}
      miniStats={miniStats}
    />
  );
}

// ─── Consent-form stat tiles (Yes/No forms only) ────────────────────────────

interface StatTileProps {
  label: string;
  count: number;
  active: boolean;
  tone?: 'success' | 'destructive' | 'warning';
  onClick: () => void;
}

const STAT_TILE_TONE: Record<NonNullable<StatTileProps['tone']>, string> = {
  success: 'text-success-foreground',
  destructive: 'text-destructive',
  warning: 'text-warning-foreground',
};

function StatTile({ label, count, active, tone, onClick }: StatTileProps) {
  return (
    <Card className={cn('p-0', active && 'ring-2 ring-primary')}>
      <button
        type="button"
        onClick={onClick}
        aria-pressed={active}
        className={cn(
          'flex w-full cursor-pointer flex-col items-center gap-1 rounded-3xl px-6 py-6 text-left transition-colors',
          'focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none',
          !active && 'hover:bg-muted/40',
        )}
      >
        <span
          className={cn(
            'text-3xl leading-none font-semibold tabular-nums',
            tone ? STAT_TILE_TONE[tone] : 'text-foreground',
          )}
        >
          {count}
        </span>
        <span className="text-xs font-semibold tracking-[0.14em] text-muted-foreground uppercase">
          {label}
        </span>
      </button>
    </Card>
  );
}

function ConsentFormStatTiles({
  stats,
  statFilter = 'all',
  onStatFilterChange,
}: {
  stats: ConsentFormStats;
  statFilter?: ConsentFormStatFilter;
  onStatFilterChange?: (next: ConsentFormStatFilter) => void;
}) {
  const { totalCount, yesCount, noCount, pendingCount } = stats;

  function toggle(next: ConsentFormStatFilter) {
    onStatFilterChange?.(next);
  }

  return (
    <div className="grid grid-cols-4 gap-3">
      <StatTile
        label="Total"
        count={totalCount}
        active={statFilter === 'all'}
        onClick={() => toggle('all')}
      />
      <StatTile
        label="Yes"
        count={yesCount}
        tone="success"
        active={statFilter === 'yes'}
        onClick={() => toggle('yes')}
      />
      <StatTile
        label="No"
        count={noCount}
        tone="destructive"
        active={statFilter === 'no'}
        onClick={() => toggle('no')}
      />
      <StatTile
        label="Pending"
        count={pendingCount}
        tone="warning"
        active={statFilter === 'no-response'}
        onClick={() => toggle('no-response')}
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
          statFilter={props.statFilter}
          onStatFilterChange={props.onStatFilterChange}
        />
      );
    }
    return <ConsentFormCard responseType={props.responseType} stats={props.stats} />;
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
