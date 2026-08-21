import {
  AlertTriangle,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Copy,
  Crown,
  MoreHorizontal,
  Plus,
  Search,
  Trash2,
} from 'lucide-react';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';

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
  Popover,
  PopoverContent,
  PopoverTrigger,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
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
  loadSchoolAnnouncementsList,
} from '~/features/posts/api/announcements';
import {
  deleteConsentForm,
  deleteConsentFormDraft,
  duplicateConsentForm,
  duplicateConsentFormDraft,
  loadConsentPostsList,
  loadSchoolConsentPostsList,
} from '~/features/posts/api/consent-forms';
import { NotFoundError } from '~/features/posts/api/errors';
import { fetchSession, getConfigs } from '~/features/posts/api/session';
import type { ApiConfig } from '~/features/posts/api/types';
import { DeletePostDialog, postToastTitle } from '~/features/posts/components/DeletePostDialog';
import {
  DEFAULT_POST_FILTERS,
  PostFilterPopover,
  type PostFilters,
  type PostOwnershipFilter,
  type PostResponseFilter,
  type PostStatusFilter,
} from '~/features/posts/components/PostFilterPopover';
import { ReadRateBar } from '~/features/posts/components/ReadRateBar';
import {
  SortableHeader,
  type SortDirection,
  type SortState,
} from '~/features/posts/components/SortableHeader';
import { usePagination } from '~/features/posts/hooks/usePagination';
import { usePostsQuery } from '~/features/posts/hooks/usePostsQuery';
import { formatDate } from '~/helpers/dateTime';
import { notify } from '~/lib/notify';
import { cn, stripSalutation } from '~/lib/utils';

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

/**
 * Where a row goes when clicked. `postHref` sends anything scheduled to the
 * draft editor, but a scheduled post's two actions — Reschedule and Cancel
 * send — live on its detail page, so that is where the row has to land.
 */
function rowHref(row: PostRowData, goToEdit: boolean): string {
  if (row.status === 'scheduled') {
    const kind = row.kind === 'announcement' ? 'announcements' : 'consent-forms';
    return `${kind}/${row.numericId}`;
  }
  return postHref(row, { edit: goToEdit });
}

function duplicateDraftHref(kind: 'announcement' | 'form', draftId: number): string {
  return kind === 'announcement'
    ? `announcements/drafts/${draftId}/edit`
    : `consent-forms/drafts/${draftId}/edit`;
}

export const __duplicateDraftHref = duplicateDraftHref;
export const __rowHref = rowHref;

type PostTab = 'view-only' | 'with-responses';
type PostScope = 'mine' | 'school';

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
  // The tab is about whether a response is required, not the post kind — an
  // announcement with an Acknowledge/Yes-No response type still belongs in
  // "Response Required", not "Read Only", even though it isn't a form.
  if (filters.tab === 'view-only' && row.responseType !== 'view-only') return false;
  if (filters.tab === 'with-responses' && row.responseType === 'view-only') return false;
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

function dateLabel(status: Post['status']): string {
  if (status === 'scheduled') return 'Scheduled for';
  if (status === 'draft') return 'Edited on';
  return 'Posted on';
}

function createdByLabel(row: PostRowData, scope: PostScope): string {
  // A whole-school view is about who posted it, so never collapse to "Me".
  if (scope === 'school') return stripSalutation(row.createdBy);
  return row.ownership === 'shared' ? stripSalutation(row.createdBy) : 'Me';
}

function classLabelsFor(row: PostRowData): string | null {
  const labels =
    row.toParentsOf && row.toParentsOf.length > 0
      ? [...new Set(row.toParentsOf)]
      : [...new Set(row.recipients.map((r) => r.classLabel))];
  return labels.length > 0 ? labels.join(', ') : null;
}

/** Read (announcements) or responded (forms) counts, or null when not yet sent. */
function responseCounts(row: PostRowData): { count: number; total: number } | null {
  if (row.kind === 'announcement') {
    if (row.status !== 'posted') return null;
    // View-only announcements track reads; Acknowledge/Yes-No ones track
    // actual responses — the two aren't the same number.
    const count = row.responseType === 'view-only' ? row.stats.readCount : row.stats.responseCount;
    return { count, total: row.stats.totalCount };
  }
  if (row.status !== 'open' && row.status !== 'closed') return null;
  return { count: row.stats.totalCount - row.stats.pendingCount, total: row.stats.totalCount };
}

function compareBySort(a: PostRowData, b: PostRowData, sort: SortState, scope: PostScope): number {
  const dir = sort.direction === 'asc' ? 1 : -1;
  switch (sort.column) {
    case 'title':
      return a.title.localeCompare(b.title) * dir;
    case 'date':
      return (a._dateTs - b._dateTs) * dir;
    case 'status':
      return a.status.localeCompare(b.status) * dir;
    case 'created-by':
      return createdByLabel(a, scope).localeCompare(createdByLabel(b, scope)) * dir;
    default:
      return 0;
  }
}

function deletePostRow(row: PostRowData): Promise<unknown> {
  const isDraft = row.status === 'draft' || row.status === 'scheduled';
  if (row.kind === 'form') {
    return isDraft ? deleteConsentFormDraft(row.numericId) : deleteConsentForm(row.numericId);
  }
  return isDraft ? deleteDraft(row.numericId) : deleteAnnouncement(row.numericId);
}

const PAGE_SIZE = 20;

// ─── Component ──────────────────────────────────────────────────────────────

const PostsListPage: React.FC = () => {
  const [scope, setScope] = useState<PostScope>('mine');
  // usePostsQuery rethrows a 503 so the boundary shows the maintenance page.
  const { data, isLoading, error, refetch } = usePostsQuery(
    () =>
      Promise.all([
        scope === 'school'
          ? Promise.all([loadSchoolAnnouncementsList(), loadSchoolConsentPostsList()])
          : Promise.all([loadPostsList(), loadConsentPostsList()]),
        getConfigs(),
        fetchSession(),
      ]).then(([[announcements, forms], configs, session]) => ({
        rows: [...announcements, ...forms].map(withDateTs),
        configs,
        isAdmin: session.isA,
      })),
    [scope],
  );
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = (searchParams.get('tab') as PostTab | null) ?? 'with-responses';
  const [filters, setFilters] = useState<PostFilters>(DEFAULT_POST_FILTERS);
  const [searchQuery, setSearchQuery] = useState('');
  const [sort, setSort] = useState<SortState | null>(null);
  const [scopeOpen, setScopeOpen] = useState(false);

  const isAdmin = data?.isAdmin ?? false;
  const posts = data?.rows ?? [];
  const configs: ApiConfig | undefined = data?.configs;

  const duplicateEnabled =
    configs?.flags.duplicate_announcement_form_post?.enabled === true ||
    (import.meta as { env?: { DEV?: boolean } }).env?.DEV === true;

  const sorted = useMemo(() => {
    const rows = posts.filter((p) =>
      matchesPostFilters(p, { tab, query: searchQuery, ...filters }),
    );
    rows.sort(
      sort ? (a, b) => compareBySort(a, b, sort, scope) || comparePosts(a, b) : comparePosts,
    );
    return rows;
  }, [posts, searchQuery, tab, filters, sort, scope]);

  const pagination = usePagination({ totalItems: sorted.length, pageSize: PAGE_SIZE });
  const paged = sorted.slice(pagination.startIndex, pagination.startIndex + PAGE_SIZE);

  // Status and Ownership are hidden in School scope (see PostFilterPopover
  // below) — clear them on the way in so a selection made in My Posts can't
  // silently filter out every row with no visible control to undo it.
  useEffect(() => {
    setFilters(DEFAULT_POST_FILTERS);
  }, [scope]);

  const filtersActive =
    filters.status.length > 0 ||
    filters.ownership.length > 0 ||
    filters.response.length > 0 ||
    filters.dateFrom != null ||
    filters.dateTo != null;

  const handleSort = useCallback((column: string, direction: SortDirection) => {
    setSort({ column, direction });
  }, []);

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
          notify.success(`'${postToastTitle(row.title)}' has been duplicated.`, {
            action: { label: 'View draft', onClick: () => navigate(href) },
          });
        })
        .catch(() => {
          notify.error('Failed to duplicate post.');
        });
    },
    [refetch, navigate],
  );

  // Single delete
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
      await deletePostRow(row);
      refetch();
      notify.success(`'${postToastTitle(row.title)}' has been deleted.`);
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
    <main className="flex flex-col">
      {/* Admin banner */}
      {isAdmin && (
        <div className="flex items-center justify-center gap-2 border-b border-amber-6 bg-amber-2 px-6 py-2 text-sm text-amber-12">
          <Crown className="h-3.5 w-3.5 shrink-0 text-amber-9" />
          <span>
            <span className="font-semibold">You have admin access.</span>{' '}
            {scope === 'school'
              ? 'To view your own posts, use the dropdown next to School Posts.'
              : 'To view school posts, use the dropdown next to My Posts.'}
          </span>
        </div>
      )}

      {/* Page header */}
      <div className="px-6 pt-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            {isAdmin ? (
              <Popover open={scopeOpen} onOpenChange={setScopeOpen}>
                {/* The scope switcher is the page title, so it has to BE the
                    heading rather than sit where one should be — otherwise the
                    page ships with no h1 at all for anyone navigating by
                    headings. The button keeps its own role inside it. */}
                <h1 className="text-2xl font-semibold tracking-tight">
                  <PopoverTrigger className="inline-flex cursor-pointer items-center gap-1.5 bg-transparent p-0 text-2xl font-semibold tracking-tight outline-none">
                    {scope === 'school' ? 'School Posts' : 'My Posts'}
                    <ChevronDown className="h-5 w-5 text-muted-foreground" />
                  </PopoverTrigger>
                </h1>
                <PopoverContent
                  align="start"
                  className="w-56 gap-0 overflow-hidden rounded-2xl p-1"
                >
                  <button
                    type="button"
                    onClick={() => {
                      setScope('mine');
                      setScopeOpen(false);
                    }}
                    className={cn(
                      'flex w-full flex-col rounded-xl px-3 py-2 text-left transition-colors',
                      scope === 'mine' ? 'bg-accent' : 'hover:bg-slate-4',
                    )}
                  >
                    <span className="flex items-center justify-between">
                      <span className="text-sm font-medium">My posts</span>
                      {scope === 'mine' && <Check className="h-4 w-4 text-primary" />}
                    </span>
                    <span className="text-xs text-muted-foreground">Posts you created</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setScope('school');
                      setScopeOpen(false);
                    }}
                    className={cn(
                      'flex w-full flex-col rounded-xl px-3 py-2 text-left transition-colors',
                      scope === 'school' ? 'bg-accent' : 'hover:bg-slate-4',
                    )}
                  >
                    <span className="flex items-center justify-between">
                      <span className="text-sm font-medium">School posts</span>
                      {scope === 'school' && <Check className="h-4 w-4 text-primary" />}
                    </span>
                    <span className="text-xs text-muted-foreground">Posts across your school</span>
                  </button>
                </PopoverContent>
              </Popover>
            ) : (
              <h1 className="text-2xl font-semibold tracking-tight">My Posts</h1>
            )}
            <p className="mt-1 text-sm text-muted-foreground">
              {scope === 'school'
                ? 'Every post already sent to parents across your school.'
                : 'Send posts to parents via Parents Gateway. Choose whether parents need to respond.'}
            </p>
          </div>
          <Button variant="default" size="sm" render={<Link to="new" />} nativeButton={false}>
            <Plus className="h-4 w-4" />
            Create
          </Button>
        </div>
      </div>

      {/* Toolbar: tabs + selection actions + search/filter */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-b px-6 pb-4">
        <Tabs value={tab} onValueChange={(v) => setSearchParams({ tab: v }, { replace: true })}>
          <TabsList>
            <TabsTrigger value="with-responses">Response Required</TabsTrigger>
            <TabsTrigger value="view-only">Read Only</TabsTrigger>
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
            showStatus={scope === 'mine'}
            showOwnership={scope === 'mine'}
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

      {/* Table (sm and up) / stacked rows (below sm).

          The max-height gives the body its own scroll region, which is what
          lets the pinned header work at all: `overflow-x-auto` already makes
          this box the scroll container, so a sticky header inside it stays put
          only if the box itself is what scrolls. Without the height the page
          scrolled instead and the header went with it. */}
      <div className="max-h-[calc(100vh-15rem)] max-w-full overflow-x-auto">
        {sorted.length === 0 ? (
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
            ) : scope === 'school' ? (
              <>
                <p className="text-base text-foreground">No posts sent in your school yet.</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Posts appear here once a teacher sends one to parents.
                </p>
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
                  render={<Link to="/posts/new" />}
                  nativeButton={false}
                >
                  <Plus className="h-4 w-4" />
                  Create
                </Button>
              </>
            )}
          </div>
        ) : (
          <>
            {/* Below sm the table's seven columns run to 1150px in a 360px
                viewport, so six of them — including the actions menu — sit off
                the right edge with nothing signalling the sideways scroll.
                Stacked rows carry the same fields the teacher scans for. */}
            <ul className="divide-y border-b sm:hidden">
              {paged.map((row) => (
                <PostStackedRow
                  key={row.id}
                  row={row}
                  tab={tab}
                  scope={scope}
                  duplicateEnabled={duplicateEnabled}
                  onDuplicate={handleDuplicate}
                  onDelete={handleDelete}
                />
              ))}
            </ul>

            <Table tableClassName="hidden w-full table-fixed sm:table">
              {/* Pinned: the page shows up to 20 rows, and the two count
                  columns swap meaning with the tab, so the labels have to stay
                  on screen while the body scrolls. */}
              <TableHeader className="sticky top-0 z-20 border-b bg-background">
                <TableRow className="border-0 hover:bg-transparent">
                  <TableHead className="sticky left-0 z-10 w-[360px] bg-background pl-6">
                    <SortableHeader label="Title" column="title" sort={sort} onSort={handleSort} />
                  </TableHead>
                  <TableHead className="w-[140px]">
                    <SortableHeader
                      label={scope === 'school' ? 'Posted on' : 'Date'}
                      column="date"
                      sort={sort}
                      onSort={handleSort}
                    />
                  </TableHead>
                  {/* School Posts is sent-only, so a Status column would read
                      the same on every row. Who sent it is the column an admin
                      is actually scanning for, so it takes that slot. */}
                  {scope === 'mine' ? (
                    <TableHead className="w-[110px]">
                      <SortableHeader
                        label="Status"
                        column="status"
                        sort={sort}
                        onSort={handleSort}
                      />
                    </TableHead>
                  ) : (
                    <TableHead className="w-[150px]">
                      <SortableHeader
                        label="Created by"
                        column="created-by"
                        sort={sort}
                        onSort={handleSort}
                      />
                    </TableHead>
                  )}
                  <TableHead className="w-[150px] pr-6 text-right">
                    {tab === 'with-responses' ? 'Response' : 'Read'}
                  </TableHead>
                  <TableHead className="w-[180px]">To parents of</TableHead>
                  {scope === 'mine' && (
                    <TableHead className="w-[130px]">
                      <SortableHeader
                        label="Created by"
                        column="created-by"
                        sort={sort}
                        onSort={handleSort}
                      />
                    </TableHead>
                  )}
                  <TableHead className="w-[80px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paged.map((row) => (
                  <PostTableRow
                    key={row.id}
                    row={row}
                    scope={scope}
                    duplicateEnabled={duplicateEnabled}
                    onDuplicate={handleDuplicate}
                    onDelete={handleDelete}
                  />
                ))}
              </TableBody>
            </Table>

            {/* Pagination */}
            <div className="flex items-center justify-between px-6 py-4">
              <p className="text-sm text-muted-foreground">
                {pagination.startIndex + 1}–
                {Math.min(pagination.startIndex + PAGE_SIZE, sorted.length)} of {sorted.length}{' '}
                records
              </p>
              {pagination.totalPages > 1 && (
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={pagination.goToPreviousPage}
                    disabled={!pagination.canGoPrevious}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </Button>
                  {pagination.pageNumbers.map((page, index) =>
                    page === 'ellipsis' ? (
                      <span key={`ellipsis-${index}`} className="px-2 text-muted-foreground">
                        ...
                      </span>
                    ) : (
                      <Button
                        key={page}
                        variant={pagination.currentPage === page ? 'secondary' : 'ghost'}
                        size="icon-sm"
                        onClick={() => pagination.goToPage(page)}
                      >
                        {page}
                      </Button>
                    ),
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={pagination.goToNextPage}
                    disabled={!pagination.canGoNext}
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          </>
        )}
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
    </main>
  );
};

// ─── Row ────────────────────────────────────────────────────────────────────

interface PostTableRowProps {
  row: PostRowData;
  scope: PostScope;
  duplicateEnabled: boolean;
  onDuplicate: (row: PostRowData) => void;
  onDelete: (row: PostRowData) => void;
}

const PostTableRow: React.FC<PostTableRowProps> = ({
  row,
  scope,
  duplicateEnabled,
  onDuplicate,
  onDelete,
}) => {
  const navigate = useNavigate();

  const statusBadge = getPostStatusBadge(row);

  const showLowRead =
    row.kind === 'announcement' &&
    row.status === 'posted' &&
    isLowReadRate(row.postedAt, row.stats.readCount, row.stats.totalCount);

  const hasSendFailure = Boolean(row.scheduledSendFailureCode);
  // A scheduled row opens its detail page — that is the only place Reschedule
  // and Cancel send live, and it was previously reachable only by URL.
  const clickable = row.status !== 'posting' || hasSendFailure;
  const goToEdit = row.status === 'draft' || hasSendFailure;

  const counts = responseCounts(row);
  const classLabels = classLabelsFor(row);

  // Same cell either way — only its position in the row changes with the scope,
  // so the right-aligned tabular figures stay right-aligned in both.
  const countsCell = (
    <TableCell className="pr-6 text-right">
      {counts ? (
        <ReadRateBar readCount={counts.count} totalCount={counts.total} />
      ) : (
        <span className="text-sm text-muted-foreground">{'—'}</span>
      )}
    </TableCell>
  );

  return (
    <TableRow
      className={clickable ? 'cursor-pointer' : 'cursor-default'}
      onClick={clickable ? () => navigate(rowHref(row, goToEdit)) : undefined}
    >
      <TableCell className="sticky left-0 z-10 overflow-hidden bg-background pl-6 whitespace-normal">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="truncate font-medium">{row.title}</span>
            {row.responseType === 'acknowledge' && (
              <span className="shrink-0 rounded-full bg-twblue-3 px-1.5 py-0.5 text-[10px] font-medium text-twblue-11 ring-1 ring-twblue-6 ring-inset">
                Acknowledge
              </span>
            )}
            {row.responseType === 'yes-no' && (
              <span className="shrink-0 rounded-full bg-violet-3 px-1.5 py-0.5 text-[10px] font-medium text-violet-11 ring-1 ring-violet-6 ring-inset">
                Yes/No
              </span>
            )}
            {showLowRead && (
              <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-warning-foreground" />
            )}
          </div>
        </div>
      </TableCell>
      <TableCell>
        {row._date ? (
          <div className="flex flex-col">
            <span className="text-xs text-muted-foreground">{dateLabel(row.status)}</span>
            <span className="text-sm text-foreground">{formatDate(row._date)}</span>
          </div>
        ) : (
          <span className="text-sm text-muted-foreground">{'—'}</span>
        )}
      </TableCell>
      {scope === 'mine' ? (
        <TableCell>
          <Badge variant={statusBadge.variant}>{statusBadge.label}</Badge>
        </TableCell>
      ) : (
        <TableCell>
          <span className="truncate text-sm text-muted-foreground">
            {createdByLabel(row, scope)}
          </span>
        </TableCell>
      )}
      {countsCell}
      <TableCell>
        {classLabels ? (
          <span className="line-clamp-2 text-sm whitespace-normal text-muted-foreground">
            {classLabels}
          </span>
        ) : (
          <span className="text-sm text-muted-foreground">{'—'}</span>
        )}
      </TableCell>
      {scope === 'mine' && (
        <TableCell>
          <span className="truncate text-sm text-muted-foreground">
            {createdByLabel(row, scope)}
          </span>
        </TableCell>
      )}
      <TableCell onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-start">
          <PostRowActions
            row={row}
            scope={scope}
            duplicateEnabled={duplicateEnabled}
            onDuplicate={onDuplicate}
            onDelete={onDelete}
          />
        </div>
      </TableCell>
    </TableRow>
  );
};

// ─── Stacked row (below sm) ─────────────────────────────────────────────────

interface PostStackedRowProps {
  row: PostRowData;
  tab: PostTab;
  scope: PostScope;
  duplicateEnabled: boolean;
  onDuplicate: (row: PostRowData) => void;
  onDelete: (row: PostRowData) => void;
}

/**
 * The phone presentation of a post. Same information the teacher scans for in
 * the table — title, response type, status, date, and the counts — stacked
 * instead of columned, with the overflow menu in reach. Composed from the same
 * primitives as the row, so the two cannot drift apart in behaviour.
 */
const PostStackedRow: React.FC<PostStackedRowProps> = ({
  row,
  tab,
  scope,
  duplicateEnabled,
  onDuplicate,
  onDelete,
}) => {
  const navigate = useNavigate();
  const statusBadge = getPostStatusBadge(row);
  const counts = responseCounts(row);
  const classLabels = classLabelsFor(row);

  const hasSendFailure = Boolean(row.scheduledSendFailureCode);
  // A scheduled row opens its detail page — that is the only place Reschedule
  // and Cancel send live, and it was previously reachable only by URL.
  const clickable = row.status !== 'posting' || hasSendFailure;
  const goToEdit = row.status === 'draft' || hasSendFailure;

  const showLowRead =
    row.kind === 'announcement' &&
    row.status === 'posted' &&
    isLowReadRate(row.postedAt, row.stats.readCount, row.stats.totalCount);

  return (
    <li
      className={cn('flex items-start gap-3 px-6 py-4', clickable && 'cursor-pointer')}
      onClick={clickable ? () => navigate(rowHref(row, goToEdit)) : undefined}
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-start gap-1.5">
          <span className="min-w-0 font-medium">{row.title || 'Untitled'}</span>
          {showLowRead && (
            <AlertTriangle className="mt-1 h-3.5 w-3.5 shrink-0 text-warning-foreground" />
          )}
        </div>

        <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
          {scope === 'mine' ? (
            <Badge variant={statusBadge.variant}>{statusBadge.label}</Badge>
          ) : (
            <span className="text-xs font-medium text-foreground">
              {createdByLabel(row, scope)}
            </span>
          )}
          {row.responseType === 'acknowledge' && (
            <span className="shrink-0 rounded-full bg-twblue-3 px-1.5 py-0.5 text-[10px] font-medium text-twblue-11 ring-1 ring-twblue-6 ring-inset">
              Acknowledge
            </span>
          )}
          {row.responseType === 'yes-no' && (
            <span className="shrink-0 rounded-full bg-violet-3 px-1.5 py-0.5 text-[10px] font-medium text-violet-11 ring-1 ring-violet-6 ring-inset">
              Yes/No
            </span>
          )}
          <span className="text-xs text-muted-foreground">
            {dateLabel(row.status)} {row._date ? formatDate(row._date) : '—'}
          </span>
        </div>

        {counts && (
          <p className="mt-1.5 text-xs text-muted-foreground tabular-nums">
            {tab === 'with-responses' ? 'Responded' : 'Read'} {counts.count} / {counts.total}
            {classLabels ? ` · ${classLabels}` : ''}
          </p>
        )}
        {!counts && classLabels && (
          <p className="mt-1.5 text-xs text-muted-foreground">{classLabels}</p>
        )}
      </div>

      <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
        <PostRowActions
          row={row}
          scope={scope}
          duplicateEnabled={duplicateEnabled}
          onDuplicate={onDuplicate}
          onDelete={onDelete}
        />
      </div>
    </li>
  );
};

// ─── Row actions ────────────────────────────────────────────────────────────

interface PostRowActionsProps {
  row: PostRowData;
  scope: PostScope;
  duplicateEnabled: boolean;
  onDuplicate: (row: PostRowData) => void;
  onDelete: (row: PostRowData) => void;
}

/**
 * The per-post overflow menu. Extracted because the table row and the stacked
 * mobile row both need it — and duplicating a destructive action's wiring in
 * two places is how the two drift apart.
 */
const PostRowActions: React.FC<PostRowActionsProps> = ({
  row,
  scope,
  duplicateEnabled,
  onDuplicate,
  onDelete,
}) => {
  // School Posts is oversight, not authoring: duplicating someone else's post
  // into your own drafts isn't what the view is for. Delete is the opposite —
  // an admin can remove any row, not only their own.
  const showDuplicate = duplicateEnabled && scope === 'mine';
  const showDelete = scope === 'school' || row.ownership !== 'shared';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            aria-label={`More actions for ${row.title || 'Untitled'}`}
          />
        }
      >
        <MoreHorizontal className="h-4 w-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {showDuplicate && (
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
        {showDelete && (
          <>
            {showDuplicate && <DropdownMenuSeparator />}
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
  );
};

export { PostsListPage };
