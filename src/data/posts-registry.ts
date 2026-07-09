import type { ApiConsentFormHistoryEntry } from '~/features/posts/api/types';

export type PostStatus = 'posted' | 'scheduled' | 'draft' | 'posting';
export type ResponseType = 'view-only' | 'acknowledge' | 'yes-no';

export const POST_STATUS_BADGE: Record<
  PostStatus,
  { label: string; variant: 'success' | 'info' | 'secondary' }
> = {
  posted: { label: 'Posted', variant: 'success' },
  scheduled: { label: 'Scheduled', variant: 'info' },
  posting: { label: 'Posting', variant: 'info' },
  draft: { label: 'Draft', variant: 'secondary' },
};

export const RESPONSE_TYPE_META: Record<ResponseType, { label: string; description: string }> = {
  'view-only': { label: 'View Only', description: 'Parents can read but not respond' },
  acknowledge: { label: 'Acknowledge', description: 'Parents must acknowledge receipt' },
  'yes-no': { label: 'Yes / No', description: 'Parents respond with Yes or No' },
};

export type ResponseTypeWithResponse = 'acknowledge' | 'yes-no';

export function requiresResponse(rt: ResponseType): rt is ResponseTypeWithResponse {
  return rt === 'acknowledge' || rt === 'yes-no';
}

export type Ownership = 'mine' | 'shared';

export interface Shortcut {
  id: string;
  label: string;
  url: string;
}

export interface WebsiteLink {
  url: string;
  title: string;
}

export type FormQuestionType = 'free-text' | 'mcq';

export type FormQuestion =
  | { id: string; text: string; description?: string; type: 'free-text' }
  | { id: string; text: string; description?: string; type: 'mcq'; options: [string, ...string[]] };

export interface Recipient {
  studentId: string;
  studentName: string;
  classLabel: string;
  indexNumber?: string;
  readStatus: 'read' | 'unread';
  respondedAt?: string;
  formResponse?: 'yes' | 'no';
  acknowledgedAt?: string;
  questionAnswers?: Record<string, string>;
  pgStatus?: 'onboarded' | 'not-onboarded';
  replyByParent?: string | null;
}

export type TargetType = 'class' | 'group' | 'cca' | 'level';

export interface AnnouncementTarget {
  type: TargetType;
  id: number;
  label: string;
}

export interface AnnouncementStats {
  totalCount: number;
  readCount: number;
  responseCount: number;
  yesCount: number;
  noCount: number;
}

export interface UploadedFile {
  localId: string;
  kind: 'file' | 'photo';
  name: string;
  size: number;
  mimeType: string;
  status: 'ready';
  attachmentId: number;
  url: string;
  thumbnailUrl?: string;
  isCover?: boolean;
}

export type ReminderConfig =
  | { type: 'NONE'; lastDate?: string }
  | { type: 'ONE_TIME'; date: string }
  | { type: 'DAILY'; date: string };

export interface PostEvent {
  start: string;
  end: string;
  venue?: string;
}

export type ConsentFormHistoryEntry = ApiConsentFormHistoryEntry;

export interface ConsentFormRecipient {
  studentId: string;
  studentName: string;
  classLabel: string;
  indexNumber?: string;
  response: 'YES' | 'NO' | null;
  respondedAt: string | null;
  replyByParent?: string | null;
  parentType?: string | null;
  contactNumber?: string | null;
  pgStatus: 'onboarded' | 'not-onboarded';
}

export interface ConsentFormStats {
  totalCount: number;
  yesCount: number;
  noCount: number;
  pendingCount: number;
}

export type ConsentFormStatus = 'open' | 'closed' | 'posting' | 'scheduled' | 'draft';

export const CONSENT_FORM_STATUS_BADGE: Record<
  ConsentFormStatus,
  { label: string; variant: 'success' | 'info' | 'secondary' }
> = {
  open: { label: 'Open', variant: 'success' },
  closed: { label: 'Closed', variant: 'secondary' },
  posting: { label: 'Posting', variant: 'info' },
  scheduled: { label: 'Scheduled', variant: 'info' },
  draft: { label: 'Draft', variant: 'secondary' },
};

export interface AnnouncementPost {
  kind: 'announcement';
  id: string;
  numericId: number;
  title: string;
  description: string;
  richTextContent?: Record<string, unknown> | null;
  status: PostStatus;
  responseType: ResponseType;
  ownership: Ownership;
  role?: 'owner' | 'viewer';
  recipients: Recipient[];
  stats: AnnouncementStats;
  postedAt?: string;
  scheduledAt?: string;
  createdAt?: string;
  createdBy: string;
  staffInCharge?: string;
  staffOwnerIds?: number[];
  targets?: AnnouncementTarget[];
  enquiryEmail?: string;
  shortcuts?: Shortcut[];
  websiteLinks?: WebsiteLink[];
  questions?: FormQuestion[];
  dueDate?: string;
  attachments?: UploadedFile[];
  photos?: UploadedFile[];
  scheduledSendFailureCode?: string | null;
}

export interface ConsentFormPost {
  kind: 'form';
  id: string;
  numericId: number;
  title: string;
  description: string;
  richTextContent?: Record<string, unknown> | null;
  status: ConsentFormStatus;
  responseType: 'acknowledge' | 'yes-no';
  ownership: Ownership;
  role?: 'owner' | 'viewer';
  recipients: ConsentFormRecipient[];
  stats: ConsentFormStats;
  postedAt?: string;
  scheduledAt?: string;
  createdAt?: string;
  createdBy: string;
  staffInCharge?: string;
  staffOwnerIds?: number[];
  targets?: AnnouncementTarget[];
  enquiryEmail?: string;
  shortcuts?: Shortcut[];
  websiteLinks?: WebsiteLink[];
  questions: FormQuestion[];
  consentByDate: string;
  reminder: ReminderConfig;
  event?: PostEvent;
  history: ConsentFormHistoryEntry[];
  attachments?: UploadedFile[];
  photos?: UploadedFile[];
  scheduledSendFailureCode?: string | null;
}

export type Post = AnnouncementPost | ConsentFormPost;

export type BadgeVariant = 'success' | 'info' | 'secondary' | 'destructive';

export const SCHEDULED_FAILURE_REASON: Record<string, string> = {
  UPSTREAM_TIMEOUT: "The messaging service didn't respond in time.",
  RECIPIENT_INVALID: 'Some recipients are no longer valid.',
  ATTACHMENT_REJECTED: 'An attachment was blocked by virus scan.',
};

export function describeScheduledSendFailure(code: string | null | undefined): string | null {
  if (!code) return null;
  return SCHEDULED_FAILURE_REASON[code] ?? 'Something went wrong on our side.';
}

export function getPostStatusBadge(post: Post): { label: string; variant: BadgeVariant } {
  if (post.status === 'scheduled' && post.scheduledSendFailureCode) {
    return { label: 'Send failed', variant: 'destructive' };
  }
  return post.kind === 'form'
    ? CONSENT_FORM_STATUS_BADGE[post.status]
    : POST_STATUS_BADGE[post.status];
}

// ─── Post IDs ─────────────────────────────────────────────────────────────────

export function postHref(
  post: Pick<Post, 'kind' | 'status' | 'numericId'>,
  opts?: { edit?: boolean },
): string {
  const kind = post.kind === 'announcement' ? 'announcements' : 'consent-forms';
  const isDraft = post.status === 'draft' || post.status === 'scheduled';

  if (isDraft) return `${kind}/drafts/${post.numericId}/edit`;
  if (opts?.edit) return `${kind}/${post.numericId}/edit`;
  return `${kind}/${post.numericId}`;
}
