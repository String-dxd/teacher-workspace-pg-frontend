import { ArrowLeft } from 'lucide-react';
import React, { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';

import { Badge, Button } from '~/components/ui';
import {
  describeScheduledSendFailure,
  getPostStatusBadge,
  type AnnouncementPost,
  type ConsentFormPost,
  type Post,
} from '~/data/posts-registry';
import {
  cancelAnnouncementSchedule,
  deleteAnnouncement,
  loadPostDetail,
  rescheduleAnnouncementDraft,
} from '~/features/posts/api/announcements';
import {
  cancelConsentFormSchedule,
  deleteConsentForm,
  loadConsentPostDetail,
  rescheduleConsentFormDraft,
} from '~/features/posts/api/consent-forms';
import { AppError, NotFoundError } from '~/features/posts/api/errors';
import { fetchSchoolStaff } from '~/features/posts/api/school';
import { fetchSession, getConfigs } from '~/features/posts/api/session';
import type { ApiSchoolStaff, ApiSession } from '~/features/posts/api/types';
import { ConsentFormHistoryList } from '~/features/posts/components/ConsentFormHistoryList';
import { DeletePostDialog } from '~/features/posts/components/DeletePostDialog';
import { PostCard } from '~/features/posts/components/PostCard';
import {
  ReadTrackingCards,
  type ReadCardFilter,
} from '~/features/posts/components/ReadTrackingCards';
import {
  DEFAULT_RECIPIENT_FILTER,
  type RecipientFilterValue,
} from '~/features/posts/components/RecipientFilterPopover';
import { RecipientReadTable } from '~/features/posts/components/RecipientReadTable';
import { SchedulePickerDialog } from '~/features/posts/components/SchedulePickerDialog';
import { formatDate, formatDateTime } from '~/helpers/dateTime';
import { useQuery } from '~/hooks/useQuery';
import { notify } from '~/lib/notify';
import { stripSalutation } from '~/lib/utils';

// ─── Helpers ────────────────────────────────────────────────────────────────

function extractDraftNumericId(id: string): number | null {
  const n = Number(id);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function deleteMode(post: Post): 'posted' | 'draft' {
  if (post.kind === 'announcement') {
    return post.status === 'posted' || post.status === 'posting' ? 'posted' : 'draft';
  }
  return post.status === 'open' || post.status === 'closed' || post.status === 'posting'
    ? 'posted'
    : 'draft';
}

// ─── Detail header ───────────────────────────────────────────────────────────

interface DetailHeaderProps {
  post: Post;
  onDelete: () => void;
  onRefetch: () => void;
}

function DetailHeader({ post, onDelete, onRefetch }: DetailHeaderProps) {
  const badge = getPostStatusBadge(post);
  const iso = post.postedAt ?? post.createdAt;
  const postedDate = formatDateTime(iso) ?? formatDate(iso);
  const navigate = useNavigate();
  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const [rescheduling, setRescheduling] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const canReschedule = post.status === 'scheduled';

  async function handleRescheduleConfirm(scheduledSendAt: string) {
    const draftId = extractDraftNumericId(post.id);
    if (draftId === null) {
      notify.error('Could not resolve the scheduled post id.');
      return;
    }
    setRescheduling(true);
    try {
      if (post.kind === 'form') {
        await rescheduleConsentFormDraft(draftId, { scheduledSendAt });
      } else {
        await rescheduleAnnouncementDraft(draftId, { scheduledSendAt });
      }
      notify.success('Post rescheduled.');
      setRescheduleOpen(false);
      onRefetch();
    } catch (err) {
      if (!(err instanceof AppError)) {
        notify.error('Failed to reschedule. Please try again.');
      }
    } finally {
      setRescheduling(false);
    }
  }

  async function handleCancelSchedule() {
    const draftId = extractDraftNumericId(post.id);
    if (draftId === null) {
      notify.error('Could not resolve the scheduled post id.');
      return;
    }
    const confirmed = window.confirm(
      'Cancel the scheduled send? The post will return to Draft so you can edit or reschedule it.',
    );
    if (!confirmed) return;
    setCancelling(true);
    try {
      if (post.kind === 'form') {
        await cancelConsentFormSchedule(draftId);
      } else {
        await cancelAnnouncementSchedule(draftId);
      }
      notify.success('Scheduled send cancelled.');
      onRefetch();
    } catch (err) {
      if (!(err instanceof AppError)) {
        notify.error('Failed to cancel the scheduled send.');
      }
    } finally {
      setCancelling(false);
    }
  }

  return (
    <div className="flex items-start justify-between gap-4">
      <div className="flex items-start gap-3">
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Back to Posts"
          className="mt-1"
          onClick={() => navigate(-1)}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>

        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">{post.title}</h1>
            <Badge variant={badge.variant}>{badge.label}</Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Posted {postedDate}
            {post.createdBy ? ` · ${stripSalutation(post.createdBy)}` : ''}
          </p>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        {canReschedule && (
          <>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCancelSchedule}
              disabled={cancelling || rescheduling}
            >
              Cancel schedule
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setRescheduleOpen(true)}
              disabled={cancelling || rescheduling}
            >
              Reschedule
            </Button>
          </>
        )}

        <Button
          variant="ghost"
          size="sm"
          className="text-destructive hover:text-destructive"
          onClick={onDelete}
        >
          Delete
        </Button>
        {/* Sent posts (posted/open/closed/posting) edit their fields inline via
            PostCard's quick-edit dialogs instead of this full-page flow. */}
        {deleteMode(post) === 'draft' && (
          <Button variant="secondary" size="sm" render={<Link to="edit" />} nativeButton={false}>
            Edit
          </Button>
        )}
      </div>

      {canReschedule && (
        <SchedulePickerDialog
          open={rescheduleOpen}
          onOpenChange={setRescheduleOpen}
          onConfirm={handleRescheduleConfirm}
          busy={rescheduling}
        />
      )}
    </div>
  );
}

// ─── Component ──────────────────────────────────────────────────────────────

interface PostDetailPageProps {
  postKind: 'announcement' | 'form';
}

const PostDetailPage: React.FC<PostDetailPageProps> = ({ postKind }) => {
  const { id } = useParams();
  const numericId = Number(id);
  const { data, isLoading, error, refetch } = useQuery(
    () =>
      Promise.all([
        postKind === 'form' ? loadConsentPostDetail(numericId) : loadPostDetail(numericId),
        getConfigs(),
        fetchSchoolStaff().catch(() => [] as ApiSchoolStaff[]),
        fetchSession(),
      ]).then(([post, _configs, staff, session]) => ({ post, staff, session })),
    [id, postKind],
  );
  const navigate = useNavigate();

  if (error) {
    const isNotFound = error instanceof NotFoundError;
    return (
      <div className="flex flex-col items-center justify-center gap-4 px-6 py-16">
        <h2 className="text-xl font-semibold tracking-tight">
          {isNotFound ? 'Post not found' : 'Could not load post'}
        </h2>
        <p className="text-sm text-muted-foreground">
          {isNotFound
            ? 'This post may have been deleted.'
            : 'The server may be unavailable. Please try again.'}
        </p>
        <Button variant="secondary" size="sm" onClick={() => navigate(-1)}>
          Back to Posts
        </Button>
      </div>
    );
  }

  if (isLoading || !data) return null;

  const { post, staff, session } = data;

  return <PostDetailContent post={post} staff={staff} session={session} refetch={refetch} />;
};

// ─── Inner content ──────────────────────────────────────────────────────────

interface PostDetailContentProps {
  post: Post;
  staff: ApiSchoolStaff[];
  session: ApiSession;
  refetch: () => void;
}

const PostDetailContent: React.FC<PostDetailContentProps> = ({ post, staff, session, refetch }) => {
  const navigate = useNavigate();
  const failureReason = describeScheduledSendFailure(post.scheduledSendFailureCode);

  // ── Delete state ───────────────────────────────────────────────────────────
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleDeleteConfirm() {
    setDeleting(true);
    try {
      if (post.kind === 'announcement') {
        await deleteAnnouncement(post.numericId);
      } else {
        await deleteConsentForm(post.numericId);
      }
      notify.success('Post deleted.');
      void navigate('..');
    } catch {
      notify.error('Failed to delete. Please try again.');
    } finally {
      setDeleting(false);
      setDeleteOpen(false);
    }
  }

  // ── Email options from session ─────────────────────────────────────────────
  const emailOptions = [session.staffEmailAdd, session.schoolEmailAddress].filter(
    (e): e is string => Boolean(e),
  );

  const attachments = (post.attachments ?? []).map((a) => ({
    name: a.name,
    sizeKb: a.size / 1024,
    url: a.url,
  }));

  const cardProps = {
    staff,
    emailOptions,
    onSaved: refetch,
  };

  return (
    <div className="space-y-6 px-6 py-6">
      <DetailHeader post={post} onDelete={() => setDeleteOpen(true)} onRefetch={refetch} />

      {failureReason && (
        <div
          role="alert"
          className="rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive"
        >
          <span className="font-medium">This post wasn&rsquo;t sent.</span> {failureReason} Pick a
          new time to try again, or cancel to return it to drafts.
        </div>
      )}

      {post.kind === 'announcement' ? (
        <AnnouncementDetail post={post} attachments={attachments} {...cardProps} />
      ) : (
        <ConsentFormDetail post={post} attachments={attachments} {...cardProps} />
      )}

      <DeletePostDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        mode={deleteMode(post)}
        title={post.title}
        onConfirm={handleDeleteConfirm}
        pending={deleting}
      />
    </div>
  );
};

// ─── Subviews ──────────────────────────────────────────────────────────────

interface DetailCardProps {
  staff: ApiSchoolStaff[];
  emailOptions: string[];
  onSaved: () => void;
  attachments: { name: string; sizeKb: number; url: string }[];
}

function AnnouncementDetail({
  post,
  attachments,
  staff,
  emailOptions,
  onSaved,
}: { post: AnnouncementPost } & DetailCardProps) {
  const [filter, setFilter] = useState<RecipientFilterValue>(DEFAULT_RECIPIENT_FILTER);
  const readCardFilter: ReadCardFilter =
    filter.status === 'read' ? 'read' : filter.status === 'unread' ? 'unread' : null;

  const showTable = post.status === 'posted' && post.stats.totalCount > 0;

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="space-y-6 lg:col-span-2">
        <ReadTrackingCards
          responseType={post.responseType}
          stats={post.stats}
          readFilter={readCardFilter}
          onReadFilterChange={(next) =>
            setFilter((f) => ({ ...f, status: next === null ? 'all' : next }))
          }
        />

        {showTable && (
          <div className="space-y-4 rounded-lg border bg-background p-6">
            <p className="text-sm font-semibold">Status</p>
            <RecipientReadTable
              recipients={post.recipients}
              responseType={post.responseType}
              filter={filter}
              onFilterChange={setFilter}
              exportId={String(post.id)}
            />
          </div>
        )}
      </div>

      <div className="lg:sticky lg:top-6 lg:self-start">
        <PostCard
          post={post}
          attachments={attachments}
          staff={staff}
          emailOptions={emailOptions}
          onSaved={onSaved}
        />
      </div>
    </div>
  );
}

function ConsentFormDetail({
  post,
  attachments,
  staff,
  emailOptions,
  onSaved,
}: { post: ConsentFormPost } & DetailCardProps) {
  const showTable =
    (post.status === 'open' || post.status === 'closed') && post.stats.totalCount > 0;

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="space-y-6 lg:col-span-2">
        <ReadTrackingCards kind="form" responseType={post.responseType} stats={post.stats} />

        {showTable && (
          <div className="space-y-4 rounded-lg border bg-background p-6">
            <p className="text-sm font-semibold">Status</p>
            <RecipientReadTable
              kind="form"
              recipients={post.recipients}
              responseType={post.responseType}
              exportId={String(post.id)}
              questions={post.questions}
            />
          </div>
        )}

        <ConsentFormHistoryList entries={post.history} />
      </div>

      <div className="lg:sticky lg:top-6 lg:self-start">
        <PostCard
          post={post}
          attachments={attachments}
          staff={staff}
          emailOptions={emailOptions}
          onSaved={onSaved}
        />
      </div>
    </div>
  );
}

export { PostDetailPage };
