import { AlertTriangle, Copy, MoreHorizontal, Plus, Search, Trash2, Users } from 'lucide-react';
import React, { useCallback, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { toast } from 'sonner';

import { QueryError } from '~/components/QueryError';
import {
  Badge,
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Input,
  Tabs,
  TabsList,
  TabsTrigger,
} from '~/components/ui';
import { getPostStatusBadge, postHref, type Post } from '~/data/posts-registry';
import {
  deleteAnnouncement,
  deleteDraft,
  duplicateAnnouncement,
  duplicateAnnouncementDraft,
  loadPostsList,
} from '~/features/posts/api/announcements';
import {
  deleteConsentForm,
  deleteConsentFormDraft,
  duplicateConsentForm,
  duplicateConsentFormDraft,
  loadConsentPostsList,
} from '~/features/posts/api/consent-forms';
import { NotFoundError } from '~/features/posts/api/errors';
import { getConfigs } from '~/features/posts/api/session';
import type { ApiConfig } from '~/features/posts/api/types';
import { DeletePostDialog } from '~/features/posts/components/DeletePostDialog';
import {
  DEFAULT_POST_FILTERS,
  PostFilterPopover,
  type PostFilters,
  type PostOwnershipFilter,
  type PostResponseFilter,
  type PostStatusFilter,
} from '~/features/posts/components/PostFilterPopover';
import { formatDate } from '~/helpers/dateTime';
import { useQuery } from '~/hooks/useQuery';
import { notify } from '~/lib/notify';

// ─── Local helpers ───────────────────────────────────────────────────────────

function getRelevantDate(post: Post): string | undefined {
  switch (post.kind) {
    case 'announcement':
      if (post.status === 'posted') return post.postedAt;
      if (post.status === 'scheduled') return post.scheduledAt;
      return post.createdAt;
    case 'form':
      if (post.status === 'open' || post.status === 'closed') return post.postedAt;
      if (post.status === 'scheduled') return post.scheduledAt;
      return post.createdAt;
    default:
      return undefined;
  }
}

function isLowReadRate(postedAt: string | undefined, readCount: number, total: number): boolean {
  if (!postedAt || total === 0) return false;
  const hoursElapsed = (Date.now() - new Date(postedAt).getTime()) / 3_600_000;
  return hoursElapsed >= 48 && readCount / total < 0.5;
}

function duplicateDraftHref(kind: 'announcement' | 'form', draftId: number): string {
  return kind === 'announcement'
    ? `announcements/drafts/${draftId}/edit`
    : `consent-forms/drafts/${draftId}/edit`;
}

export const __duplicateDraftHref = duplicateDraftHref;

type PostTab = 'view-only' | 'with-responses';

type PostRowData = Post & { _date: string | undefined; _dateTs: number };

// ─── Helpers ────────────────────────────────────────────────────────────────

const withDateTs = (p: Post): PostRowData => {
  const date = getRelevantDate(p);
  return { ...p, _date: date, _dateTs: date ? new Date(date).getTime() : 0 };
};

function comparePosts(a: PostRowData, b: PostRowData): number {
  if (a._dateTs !== b._dateTs) return b._dateTs - a._dateTs;
  if (a.kind !== b.kind) return a.kind === 'announcement' ? -1 : 1;
  return a.id.localeCompare(b.id);
}

function statusBucket(row: Pick<Post, 'status'>): PostStatusFilter | null {
  const s = row.status;
  if (s === 'posted' || s === 'posting' || s === 'open' || s === 'closed') return 'posted';
  if (s === 'scheduled') return 'scheduled';
  if (s === 'draft') return 'draft';
  return null;
}

export interface PostFilterQuery extends PostFilters {
  tab: PostTab;
  query: string;
}

export function matchesPostFilters(row: PostRowData, filters: PostFilterQuery): boolean {
  if (filters.tab === 'view-only' && row.kind === 'form') return false;
  if (filters.tab === 'with-responses' && row.kind !== 'form') return false;
  if (filters.query && !row.title.toLowerCase().includes(filters.query.toLowerCase())) return false;

  if (
    filters.ownership.length > 0 &&
    !filters.ownership.includes(row.ownership as PostOwnershipFilter)
  ) {
    return false;
  }

  if (filters.status.length > 0) {
    const bucket = statusBucket(row);
    if (bucket == null || !filters.status.includes(bucket)) return false;
  }

  if (
    filters.response.length > 0 &&
    !filters.response.includes(row.responseType as PostResponseFilter)
  ) {
    return false;
  }

  if (filters.dateFrom || filters.dateTo) {
    if (row._dateTs === 0) return false;
    if (filters.dateFrom && row._dateTs < Date.parse(`${filters.dateFrom}T00:00:00`)) return false;
    if (filters.dateTo && row._dateTs > Date.parse(`${filters.dateTo}T23:59:59.999`)) return false;
  }

  return true;
}

// ─── Component ──────────────────────────────────────────────────────────────

const PostsListPage: React.FC = () => {
  const { data, isLoading, error, refetch } = useQuery(
    () =>
      Promise.all([loadPostsList(), loadConsentPostsList(), getConfigs()]).then(
        ([announcements, forms, configs]) => ({
          rows: [...announcements, ...forms].map(withDateTs),
          configs,
        }),
      ),
    [],
  );
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = (searchParams.get('tab') as PostTab | null) ?? 'with-responses';
  const [filters, setFilters] = useState<PostFilters>(DEFAULT_POST_FILTERS);
  const [searchQuery, setSearchQuery] = useState('');

  const posts = data?.rows ?? [];
  const configs: ApiConfig | undefined = data?.configs;

  const duplicateEnabled =
    configs?.flags.duplicate_announcement_form_post?.enabled === true ||
    (import.meta as { env?: { DEV?: boolean } }).env?.DEV === true;

  const filtered = useMemo(() => {
    return posts
      .filter((p) => matchesPostFilters(p, { tab, query: searchQuery, ...filters }))
      .slice()
      .sort(comparePosts);
  }, [posts, searchQuery, tab, filters]);

  const filtersActive =
    filters.status.length > 0 ||
    filters.ownership.length > 0 ||
    filters.response.length > 0 ||
    filters.dateFrom != null ||
    filters.dateTo != null;

  const handleDuplicate = useCallback(
    (row: PostRowData) => {
      const isDraft = row.status === 'draft' || row.status === 'scheduled';
      const promise: Promise<number> =
        row.kind === 'announcement'
          ? (isDraft
              ? duplicateAnnouncementDraft(row.numericId)
              : duplicateAnnouncement(row.numericId)
            ).then((r) => r.announcementDraftId)
          : (isDraft
              ? duplicateConsentFormDraft(row.numericId)
              : duplicateConsentForm(row.numericId)
            ).then((r) => r.consentFormDraftId);

      promise
        .then((draftId) => {
          refetch();
          const href = duplicateDraftHref(row.kind, draftId);
          toast.success(`'${row.title}' has been duplicated.`, {
            action: { label: 'View draft', onClick: () => navigate(href) },
          });
        })
        .catch(() => {
          notify.error('Failed to duplicate post.');
        });
    },
    [refetch, navigate],
  );

  const [pendingDelete, setPendingDelete] = useState<PostRowData | null>(null);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = useCallback((row: PostRowData) => {
    setPendingDelete(row);
  }, []);

  const confirmDelete = useCallback(async () => {
    const row = pendingDelete;
    if (!row) return;
    setDeleting(true);
    try {
      const isDraft = row.status === 'draft' || row.status === 'scheduled';
      if (row.kind === 'form') {
        if (isDraft) {
          await deleteConsentFormDraft(row.numericId);
        } else {
          await deleteConsentForm(row.numericId);
        }
      } else {
        if (isDraft) {
          await deleteDraft(row.numericId);
        } else {
          await deleteAnnouncement(row.numericId);
        }
      }
      refetch();
      notify.success('Post deleted.');
      setPendingDelete(null);
    } catch (err) {
      if (!(err instanceof NotFoundError)) {
        notify.error('Failed to delete post.');
      }
    } finally {
      setDeleting(false);
    }
  }, [pendingDelete, refetch]);

  const deleteMode: 'draft' | 'posted' | null = !pendingDelete
    ? null
    : pendingDelete.status === 'draft' || pendingDelete.status === 'scheduled'
      ? 'draft'
      : 'posted';

  if (error) return <QueryError onRetry={refetch} />;
  if (isLoading) return null;

  return (
    <div className="flex flex-col">
      {/* Page header */}
      <div className="border-b px-6 py-5">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight">Posts</h1>
            <p className="text-sm text-muted-foreground">
              Send posts to parents via Parents Gateway, send a view-only post or collect responses.
            </p>
          </div>
          <Button variant="default" size="sm" render={<Link to="new" />} nativeButton={false}>
            <Plus className="h-4 w-4" />
            Create
          </Button>
        </div>
      </div>

      {/* Toolbar: view selector + search */}
      <div className="space-y-4 pt-4">
        <div className="flex flex-wrap items-center justify-between gap-3 px-6">
          <Tabs value={tab} onValueChange={(v) => setSearchParams({ tab: v }, { replace: true })}>
            <TabsList>
              <TabsTrigger value="view-only">View only</TabsTrigger>
              <TabsTrigger value="with-responses">With responses</TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search posts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full min-w-[220px] pl-9 sm:w-[280px]"
                aria-label="Search posts"
              />
            </div>
            <PostFilterPopover
              value={filters}
              onChange={setFilters}
              responseOptions={
                tab === 'view-only'
                  ? null
                  : [
                      { value: 'acknowledge', label: 'Acknowledge' },
                      { value: 'yes-no', label: 'Yes / No' },
                    ]
              }
            />
          </div>
        </div>

        {/* List */}
        <div className="max-w-full">
          {filtered.length === 0 ? (
            <div className="py-16 text-center">
              {searchQuery ? (
                <>
                  <p className="text-base text-foreground">No posts match your search.</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Try adjusting your search terms.
                  </p>
                </>
              ) : filtersActive ? (
                <>
                  <p className="text-base text-foreground">No posts match these filters.</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Loosen a filter or reset them to see more posts.
                  </p>
                  <Button
                    variant="secondary"
                    size="sm"
                    className="mt-4"
                    onClick={() => setFilters(DEFAULT_POST_FILTERS)}
                  >
                    Reset filters
                  </Button>
                </>
              ) : (
                <>
                  <p className="text-base text-foreground">No posts yet.</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Create your first post to get started.
                  </p>
                  <Button
                    variant="default"
                    size="sm"
                    className="mt-4"
                    render={<Link to="new" />}
                    nativeButton={false}
                  >
                    <Plus className="h-4 w-4" />
                    Create
                  </Button>
                </>
              )}
            </div>
          ) : (
            <div className="divide-y border-t">
              {filtered.map((row) => (
                <PostRow
                  key={row.id}
                  row={row}
                  duplicateEnabled={duplicateEnabled}
                  onDuplicate={handleDuplicate}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <DeletePostDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => {
          if (!open) setPendingDelete(null);
        }}
        mode={deleteMode}
        title={pendingDelete?.title ?? ''}
        pending={deleting}
        onConfirm={confirmDelete}
      />
    </div>
  );
};

// ─── Row ────────────────────────────────────────────────────────────────────

interface PostRowProps {
  row: PostRowData;
  duplicateEnabled: boolean;
  onDuplicate: (row: PostRowData) => void;
  onDelete: (row: PostRowData) => void;
}

const PostRowInner: React.FC<PostRowProps> = ({ row, duplicateEnabled, onDuplicate, onDelete }) => {
  const navigate = useNavigate();
  const isShared = row.ownership === 'shared';

  const statusBadge = getPostStatusBadge(row);

  const showLowRead =
    row.kind === 'announcement' &&
    row.status === 'posted' &&
    isLowReadRate(row.postedAt, row.stats.readCount, row.stats.totalCount);

  const hasSendFailure = Boolean(row.scheduledSendFailureCode);
  const clickable = (row.status !== 'scheduled' && row.status !== 'posting') || hasSendFailure;
  const goToEdit = row.status === 'draft' || hasSendFailure;

  return (
    <div
      className={`flex items-center gap-4 px-6 py-4 ${clickable ? 'cursor-pointer hover:bg-muted/50' : 'cursor-default'}`}
      onClick={clickable ? () => navigate(postHref(row, { edit: goToEdit })) : undefined}
    >
      {/* Title + description */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="truncate font-medium">{row.title}</span>
          {showLowRead && (
            <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-warning-foreground" />
          )}
        </div>
        {row.description && (
          <p className="mt-0.5 truncate text-xs text-muted-foreground">{row.description}</p>
        )}
      </div>

      {/* Date */}
      <span
        className={`hidden w-[100px] shrink-0 text-sm md:block ${row.status === 'scheduled' ? 'text-warning-foreground' : 'text-muted-foreground'}`}
      >
        {formatDate(row._date)}
      </span>

      {/* Status */}
      <div className="hidden w-[100px] shrink-0 sm:block">
        <Badge variant={statusBadge.variant}>{statusBadge.label}</Badge>
      </div>

      {/* Owner */}
      <div className="hidden w-[80px] shrink-0 items-center gap-1 text-sm text-muted-foreground lg:flex">
        {isShared ? (
          <>
            <Users className="h-3.5 w-3.5 shrink-0" />
            <span>Shared</span>
          </>
        ) : (
          <span>Mine</span>
        )}
      </div>

      {/* Read / Response */}
      <div className="hidden w-[140px] shrink-0 md:block">
        <PostRowResponseCell row={row} />
      </div>

      {/* Actions */}
      <div className="shrink-0">
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                aria-label="More actions"
                onClick={(e) => e.stopPropagation()}
              />
            }
          >
            <MoreHorizontal className="h-4 w-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {duplicateEnabled && (
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  onDuplicate(row);
                }}
              >
                <Copy className="mr-2 h-4 w-4" />
                Duplicate
              </DropdownMenuItem>
            )}
            {!isShared && (
              <>
                {duplicateEnabled && <DropdownMenuSeparator />}
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={(e) => {
                    e.stopPropagation();
                    void onDelete(row);
                  }}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
};

const PostRow = React.memo(PostRowInner, (prev, next) => {
  if (prev.onDuplicate !== next.onDuplicate || prev.onDelete !== next.onDelete) return false;
  if (prev.duplicateEnabled !== next.duplicateEnabled) return false;
  const a = prev.row;
  const b = next.row;
  if (a.id !== b.id) return false;
  if (a.status !== b.status) return false;
  if (a.kind !== b.kind) return false;
  if (a.ownership !== b.ownership) return false;
  if (a.title !== b.title) return false;
  if (a.description !== b.description) return false;
  if (a._date !== b._date) return false;
  if ((a.scheduledSendFailureCode ?? null) !== (b.scheduledSendFailureCode ?? null)) return false;
  if (a.stats.totalCount !== b.stats.totalCount) return false;
  if (a.kind === 'announcement' && b.kind === 'announcement') {
    if (a.stats.readCount !== b.stats.readCount) return false;
    if (a.postedAt !== b.postedAt) return false;
  }
  if (a.kind === 'form' && b.kind === 'form') {
    if (a.stats.yesCount !== b.stats.yesCount) return false;
    if (a.stats.noCount !== b.stats.noCount) return false;
    if (a.stats.pendingCount !== b.stats.pendingCount) return false;
  }
  return true;
});

// ─── Response cell ──────────────────────────────────────────────────────────

const PostRowResponseCell: React.FC<{ row: PostRowData }> = ({ row }) => {
  if (row.kind === 'announcement') {
    if (row.status !== 'posted') {
      return <span className="text-sm text-muted-foreground">{'—'}</span>;
    }
    const { readCount, totalCount } = row.stats;
    const pct = totalCount > 0 ? Math.round((readCount / totalCount) * 100) : 0;
    return (
      <span className="text-sm text-muted-foreground">
        {readCount}/{totalCount} ({pct}%)
      </span>
    );
  }

  if (row.status !== 'open' && row.status !== 'closed') {
    return <span className="text-sm text-muted-foreground">{'—'}</span>;
  }
  const respondedCount = row.stats.totalCount - row.stats.pendingCount;
  const pct =
    row.stats.totalCount > 0 ? Math.round((respondedCount / row.stats.totalCount) * 100) : 0;
  return (
    <span className="text-sm text-muted-foreground">
      {respondedCount}/{row.stats.totalCount} ({pct}%)
    </span>
  );
};

export { PostsListPage };
