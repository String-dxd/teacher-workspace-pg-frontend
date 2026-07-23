import type { ConsentFormPost } from '~/data/posts-registry';

import { deleteApi, fetchApi, mutateApi } from './http';
import {
  mapConsentFormDetail,
  mapConsentFormDraftDetail,
  mapConsentFormSummaryToPost,
  mergeAndDedup,
} from './mappers';
import type {
  ApiConsentFormDetail,
  ApiConsentFormDraft,
  ApiConsentFormList,
  ApiCreateConsentFormDraftPayload,
  ApiCreateConsentFormPayload,
  ApiDuplicateConsentFormResponse,
  ApiGroupTarget,
  ApiReminderType,
} from './types';

export function fetchConsentForms(): Promise<ApiConsentFormList> {
  return fetchApi('/consentForms');
}

export function fetchSharedConsentForms(): Promise<ApiConsentFormList> {
  return fetchApi('/consentForms/shared');
}

/** Every consent form in the school, regardless of creator — admin oversight only. */
export function fetchSchoolConsentForms(): Promise<ApiConsentFormList> {
  return fetchApi('/consentForms/schoolAdmins');
}

export async function fetchConsentFormDetail(formId: number): Promise<ApiConsentFormDetail> {
  const list = await fetchApi<ApiConsentFormDetail[]>(`/consentForms/${formId}`);
  return list[0];
}

export async function fetchConsentFormDraftDetail(draftId: number): Promise<ApiConsentFormDraft> {
  const list = await fetchApi<ApiConsentFormDraft[]>(`/consentForms/drafts/${draftId}`);
  return list[0];
}

export function createConsentForm(
  payload: ApiCreateConsentFormPayload,
  options?: { signal?: AbortSignal },
): Promise<{ consentFormId: number }> {
  return mutateApi('POST', '/consentForms', payload, options);
}

export function createConsentFormDraft(
  payload: ApiCreateConsentFormDraftPayload,
  options?: { signal?: AbortSignal },
): Promise<{ consentFormDraftId: number }> {
  return mutateApi('POST', '/consentForms/drafts', payload, options);
}

export function updateConsentFormDraft(
  draftId: number,
  payload: ApiCreateConsentFormDraftPayload,
  options?: { signal?: AbortSignal },
): Promise<void> {
  return mutateApi('PUT', `/consentForms/drafts/${draftId}`, payload, options);
}

export function updateConsentFormDueDate(
  formId: number,
  payload: { consentByDate: string },
  options?: { signal?: AbortSignal },
): Promise<void> {
  return mutateApi('PUT', `/consentForms/${formId}/updateDueDate`, payload, options);
}

export function updateConsentFormReminder(
  formId: number,
  payload: { addReminderType: ApiReminderType; reminderDate: string },
  options?: { signal?: AbortSignal },
): Promise<void> {
  return mutateApi('PUT', `/consentForms/${formId}/updateReminder`, payload, options);
}

export function scheduleNewConsentFormDraft(
  payload: ApiCreateConsentFormDraftPayload & { scheduledSendAt: string },
  options?: { signal?: AbortSignal },
): Promise<{ consentFormDraftId: number; updatedAt: string }> {
  return mutateApi('POST', '/consentForms/drafts/schedule', payload, options);
}

export function scheduleExistingConsentFormDraft(
  draftId: number,
  payload: ApiCreateConsentFormDraftPayload & { scheduledSendAt: string },
  options?: { signal?: AbortSignal },
): Promise<{ consentFormDraftId: number; updatedAt: string }> {
  return mutateApi('PUT', `/consentForms/drafts/schedule/${draftId}`, payload, options);
}

export function rescheduleConsentFormDraft(
  draftId: number,
  payload: { scheduledSendAt: string },
  options?: { signal?: AbortSignal },
): Promise<void> {
  return mutateApi(
    'PUT',
    `/consentForms/drafts/${draftId}/rescheduleSchedule`,
    { scheduledDateTime: payload.scheduledSendAt },
    options,
  );
}

export function cancelConsentFormSchedule(
  draftId: number,
  options?: { signal?: AbortSignal },
): Promise<void> {
  return mutateApi('POST', `/consentForms/drafts/${draftId}/cancelSchedule`, {}, options);
}

export function duplicateConsentForm(
  consentFormId: number,
): Promise<ApiDuplicateConsentFormResponse> {
  return mutateApi('POST', '/consentForms/duplicate', { consentFormId });
}

export function duplicateConsentFormDraft(
  consentFormDraftId: number,
): Promise<ApiDuplicateConsentFormResponse> {
  return mutateApi('POST', '/consentForms/drafts/duplicate', { consentFormDraftId });
}

export function deleteConsentForm(formId: number): Promise<void> {
  return deleteApi(`/consentForms/${formId}`);
}

export function deleteConsentFormDraft(draftId: number): Promise<void> {
  return deleteApi(`/consentForms/drafts/${draftId}`);
}

export function updateConsentFormEnquiryEmail(
  formId: number,
  payload: { enquiryEmailAddress: string },
  options?: { signal?: AbortSignal },
): Promise<void> {
  return mutateApi('PUT', `/consentForms/${formId}/updateEnquiryEmail`, payload, options);
}

export function updateConsentFormStaffInCharge(formId: number, staffIds: number[]): Promise<void> {
  const staffGroups: ApiGroupTarget[] = staffIds.map((id) => ({
    type: 'individual',
    label: '',
    value: id,
  }));
  return mutateApi('POST', `/consentForms/${formId}/addStaffInCharge`, { staffGroups }, undefined);
}

// ─── Composed loaders ───────────────────────────────────────────────────────

export async function loadConsentPostsList(): Promise<ConsentFormPost[]> {
  const [own, shared] = await Promise.all([fetchConsentForms(), fetchSharedConsentForms()]);
  const mappedOwn = own.map((p) => mapConsentFormSummaryToPost(p, 'mine'));
  const mappedShared = shared.map((p) => mapConsentFormSummaryToPost(p, 'shared'));
  return mergeAndDedup(mappedOwn, mappedShared);
}

/** Every consent form in the school, for the admin "School Posts" view. */
export async function loadSchoolConsentPostsList(): Promise<ConsentFormPost[]> {
  const all = await fetchSchoolConsentForms();
  // Admin oversight only covers posts that have actually been sent — not
  // other teachers' unsent drafts or not-yet-sent scheduled posts.
  return all
    .map((p) => mapConsentFormSummaryToPost(p, 'mine'))
    .filter((p) => p.status === 'open' || p.status === 'closed' || p.status === 'posting');
}

export async function loadConsentPostDetail(formId: number): Promise<ConsentFormPost> {
  const detail = await fetchConsentFormDetail(formId);
  return mapConsentFormDetail(detail);
}

export async function loadConsentFormDraftDetail(draftId: number): Promise<ConsentFormPost> {
  const draft = await fetchConsentFormDraftDetail(draftId);
  return mapConsentFormDraftDetail(draft);
}
