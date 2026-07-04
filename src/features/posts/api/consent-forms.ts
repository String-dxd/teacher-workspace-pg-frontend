import { deleteApi, fetchApi, mutateApi } from './http';
import type {
  ApiConsentFormDetail,
  ApiConsentFormDraft,
  ApiConsentFormList,
  ApiCreateConsentFormDraftPayload,
  ApiCreateConsentFormPayload,
  ApiDuplicateConsentFormResponse,
  ApiGroupTarget,
} from './types';

export function fetchConsentForms(): Promise<ApiConsentFormList> {
  return fetchApi('/consentForms');
}

export function fetchSharedConsentForms(): Promise<ApiConsentFormList> {
  return fetchApi('/consentForms/shared');
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
