import type { AnnouncementPost } from '~/data/posts-registry';

import { deleteApi, fetchApi, mutateApi } from './http';
import {
  mapAnnouncementDetail,
  mapAnnouncementDraftDetail,
  mapAnnouncementSummary,
  mergeAndDedup,
} from './mappers';
import type {
  ApiAnnouncementDetail,
  ApiAnnouncementDraft,
  ApiAnnouncementList,
  ApiCreateAnnouncementPayload,
  ApiCreateDraftPayload,
  ApiDuplicateAnnouncementResponse,
  ApiGroupTarget,
} from './types';

export function fetchAnnouncements(): Promise<ApiAnnouncementList> {
  return fetchApi('/announcements');
}

export function fetchSharedAnnouncements(): Promise<ApiAnnouncementList> {
  return fetchApi('/announcements/shared');
}

export async function fetchAnnouncementDetail(postId: number): Promise<ApiAnnouncementDetail> {
  const list = await fetchApi<ApiAnnouncementDetail[]>(`/announcements/${postId}`);
  return list[0];
}

export async function fetchAnnouncementDraftDetail(draftId: number): Promise<ApiAnnouncementDraft> {
  const list = await fetchApi<ApiAnnouncementDraft[]>(`/announcements/drafts/${draftId}`);
  return list[0];
}

export function createAnnouncement(
  payload: ApiCreateAnnouncementPayload,
  options?: { signal?: AbortSignal },
): Promise<{ postId: number }> {
  return mutateApi('POST', '/announcements', payload, options);
}

export function createDraft(
  payload: ApiCreateDraftPayload,
  options?: { signal?: AbortSignal; timeoutMs?: number },
): Promise<{ announcementDraftId: number }> {
  return mutateApi('POST', '/announcements/drafts', payload, options);
}

export function scheduleNewAnnouncementDraft(
  payload: ApiCreateDraftPayload & { scheduledSendAt: string },
  options?: { signal?: AbortSignal },
): Promise<{ announcementDraftId: number; updatedAt: string }> {
  return mutateApi('POST', '/announcements/drafts/schedule', payload, options);
}

export function scheduleExistingAnnouncementDraft(
  draftId: number,
  payload: ApiCreateDraftPayload & { scheduledSendAt: string },
  options?: { signal?: AbortSignal },
): Promise<{ announcementDraftId: number; updatedAt: string }> {
  return mutateApi('PUT', `/announcements/drafts/schedule/${draftId}`, payload, options);
}

export function rescheduleAnnouncementDraft(
  draftId: number,
  payload: { scheduledSendAt: string },
  options?: { signal?: AbortSignal },
): Promise<void> {
  return mutateApi(
    'PUT',
    `/announcements/drafts/${draftId}/rescheduleSchedule`,
    { scheduledDateTime: payload.scheduledSendAt },
    options,
  );
}

export function cancelAnnouncementSchedule(
  draftId: number,
  options?: { signal?: AbortSignal },
): Promise<void> {
  return mutateApi('POST', `/announcements/drafts/${draftId}/cancelSchedule`, {}, options);
}

export function updateDraft(
  draftId: number,
  payload: ApiCreateDraftPayload,
  options?: { signal?: AbortSignal },
): Promise<void> {
  return mutateApi('PUT', `/announcements/drafts/${draftId}`, payload, options);
}

export function duplicateAnnouncement(
  announcementId: number,
): Promise<ApiDuplicateAnnouncementResponse> {
  return mutateApi('POST', '/announcements/duplicate', { announcementId });
}

export function duplicateAnnouncementDraft(
  announcementDraftId: number,
): Promise<ApiDuplicateAnnouncementResponse> {
  return mutateApi('POST', '/announcements/drafts/duplicate', { announcementDraftId });
}

export function updateAnnouncementEnquiryEmail(
  postId: number,
  payload: { enquiryEmailAddress: string },
): Promise<void> {
  return mutateApi('PUT', `/announcements/${postId}/enquiryEmailAddress`, payload);
}

export function updateAnnouncementStaffInCharge(postId: number, staffIds: number[]): Promise<void> {
  const staffGroups: ApiGroupTarget[] = staffIds.map((id) => ({
    type: 'individual',
    label: '',
    value: id,
  }));
  return mutateApi('POST', `/announcements/${postId}/addStaffInCharge`, { staffGroups });
}

export function deleteAnnouncement(postId: number): Promise<void> {
  return deleteApi(`/announcements/${postId}`);
}

export function deleteDraft(draftId: number): Promise<void> {
  return deleteApi(`/announcements/drafts/${draftId}`);
}

// ─── Composed loaders ───────────────────────────────────────────────────────

export async function loadPostsList(): Promise<AnnouncementPost[]> {
  const [own, shared] = await Promise.all([fetchAnnouncements(), fetchSharedAnnouncements()]);
  const mappedOwn = own.map((p) => mapAnnouncementSummary(p, 'mine'));
  const mappedShared = shared.map((p) => mapAnnouncementSummary(p, 'shared'));
  return mergeAndDedup(mappedOwn, mappedShared);
}

export async function loadPostDetail(postId: number): Promise<AnnouncementPost> {
  const detail = await fetchAnnouncementDetail(postId);
  return mapAnnouncementDetail(detail);
}

export async function loadAnnouncementDraftDetail(draftId: number): Promise<AnnouncementPost> {
  const detail = await fetchAnnouncementDraftDetail(draftId);
  return mapAnnouncementDraftDetail(detail);
}
