import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('./http', () => ({
  fetchApi: vi.fn(),
  mutateApi: vi.fn(),
  deleteApi: vi.fn(),
}));

import {
  fetchConsentForms,
  fetchSharedConsentForms,
  fetchConsentFormDetail,
  fetchConsentFormDraftDetail,
  createConsentForm,
  createConsentFormDraft,
  updateConsentFormDraft,
  updateConsentFormDueDate,
  scheduleNewConsentFormDraft,
  scheduleExistingConsentFormDraft,
  rescheduleConsentFormDraft,
  cancelConsentFormSchedule,
  duplicateConsentForm,
  duplicateConsentFormDraft,
  deleteConsentForm,
  deleteConsentFormDraft,
  updateConsentFormEnquiryEmail,
  updateConsentFormStaffInCharge,
} from './consent-forms';
import { fetchApi, mutateApi, deleteApi } from './http';

describe('api/consent-forms', () => {
  beforeEach(() => vi.clearAllMocks());

  describe('reads', () => {
    it('fetchConsentForms calls GET /consentForms', async () => {
      vi.mocked(fetchApi).mockResolvedValue([]);
      await fetchConsentForms();
      expect(fetchApi).toHaveBeenCalledWith('/consentForms');
    });

    it('fetchSharedConsentForms calls GET /consentForms/shared', async () => {
      vi.mocked(fetchApi).mockResolvedValue([]);
      await fetchSharedConsentForms();
      expect(fetchApi).toHaveBeenCalledWith('/consentForms/shared');
    });

    it('fetchConsentFormDetail unwraps array response', async () => {
      const detail = { id: 1, title: 'Form' };
      vi.mocked(fetchApi).mockResolvedValue([detail]);
      const result = await fetchConsentFormDetail(1);
      expect(fetchApi).toHaveBeenCalledWith('/consentForms/1');
      expect(result).toEqual(detail);
    });

    it('fetchConsentFormDraftDetail unwraps array response', async () => {
      const draft = { id: 2, title: 'Draft' };
      vi.mocked(fetchApi).mockResolvedValue([draft]);
      const result = await fetchConsentFormDraftDetail(2);
      expect(fetchApi).toHaveBeenCalledWith('/consentForms/drafts/2');
      expect(result).toEqual(draft);
    });
  });

  describe('writes', () => {
    it('createConsentForm POSTs to /consentForms', async () => {
      vi.mocked(mutateApi).mockResolvedValue({ consentFormId: 5 });
      const result = await createConsentForm({ title: 'CF' } as any);
      expect(mutateApi).toHaveBeenCalledWith('POST', '/consentForms', { title: 'CF' }, undefined);
      expect(result).toEqual({ consentFormId: 5 });
    });

    it('createConsentFormDraft POSTs to /consentForms/drafts', async () => {
      vi.mocked(mutateApi).mockResolvedValue({ consentFormDraftId: 10 });
      const signal = new AbortController().signal;
      const result = await createConsentFormDraft({ title: 'Draft CF' } as any, { signal });
      expect(mutateApi).toHaveBeenCalledWith(
        'POST',
        '/consentForms/drafts',
        { title: 'Draft CF' },
        { signal },
      );
      expect(result).toEqual({ consentFormDraftId: 10 });
    });

    it('updateConsentFormDraft PUTs to /consentForms/drafts/:id', async () => {
      vi.mocked(mutateApi).mockResolvedValue(undefined);
      await updateConsentFormDraft(8, { title: 'Updated' } as any);
      expect(mutateApi).toHaveBeenCalledWith(
        'PUT',
        '/consentForms/drafts/8',
        { title: 'Updated' },
        undefined,
      );
    });

    it('updateConsentFormDueDate PUTs to correct path', async () => {
      vi.mocked(mutateApi).mockResolvedValue(undefined);
      await updateConsentFormDueDate(3, { consentByDate: '2026-12-31' });
      expect(mutateApi).toHaveBeenCalledWith(
        'PUT',
        '/consentForms/3/updateDueDate',
        { consentByDate: '2026-12-31' },
        undefined,
      );
    });

    it('scheduleNewConsentFormDraft POSTs to /consentForms/drafts/schedule', async () => {
      vi.mocked(mutateApi).mockResolvedValue({ consentFormDraftId: 11, updatedAt: 'now' });
      const payload = { title: 'Sched', scheduledSendAt: '2026-06-01T09:00:00Z' } as any;
      const result = await scheduleNewConsentFormDraft(payload);
      expect(mutateApi).toHaveBeenCalledWith(
        'POST',
        '/consentForms/drafts/schedule',
        payload,
        undefined,
      );
      expect(result).toEqual({ consentFormDraftId: 11, updatedAt: 'now' });
    });

    it('scheduleExistingConsentFormDraft PUTs to /consentForms/drafts/schedule/:id', async () => {
      vi.mocked(mutateApi).mockResolvedValue({ consentFormDraftId: 12, updatedAt: 'now' });
      const payload = { title: 'Sched Existing', scheduledSendAt: '2026-07-01T09:00:00Z' } as any;
      const result = await scheduleExistingConsentFormDraft(12, payload);
      expect(mutateApi).toHaveBeenCalledWith(
        'PUT',
        '/consentForms/drafts/schedule/12',
        payload,
        undefined,
      );
      expect(result).toEqual({ consentFormDraftId: 12, updatedAt: 'now' });
    });

    it('rescheduleConsentFormDraft remaps scheduledSendAt to scheduledDateTime', async () => {
      vi.mocked(mutateApi).mockResolvedValue(undefined);
      await rescheduleConsentFormDraft(4, { scheduledSendAt: '2026-01-01T00:00:00Z' });
      expect(mutateApi).toHaveBeenCalledWith(
        'PUT',
        '/consentForms/drafts/4/rescheduleSchedule',
        { scheduledDateTime: '2026-01-01T00:00:00Z' },
        undefined,
      );
    });

    it('cancelConsentFormSchedule POSTs to /consentForms/drafts/:id/cancelSchedule', async () => {
      vi.mocked(mutateApi).mockResolvedValue(undefined);
      await cancelConsentFormSchedule(5);
      expect(mutateApi).toHaveBeenCalledWith(
        'POST',
        '/consentForms/drafts/5/cancelSchedule',
        {},
        undefined,
      );
    });

    it('duplicateConsentForm POSTs to /consentForms/duplicate', async () => {
      vi.mocked(mutateApi).mockResolvedValue({ consentFormDraftId: 20 });
      const result = await duplicateConsentForm(9);
      expect(mutateApi).toHaveBeenCalledWith('POST', '/consentForms/duplicate', {
        consentFormId: 9,
      });
      expect(result).toEqual({ consentFormDraftId: 20 });
    });

    it('duplicateConsentFormDraft POSTs to /consentForms/drafts/duplicate', async () => {
      vi.mocked(mutateApi).mockResolvedValue({ consentFormDraftId: 21 });
      const result = await duplicateConsentFormDraft(13);
      expect(mutateApi).toHaveBeenCalledWith('POST', '/consentForms/drafts/duplicate', {
        consentFormDraftId: 13,
      });
      expect(result).toEqual({ consentFormDraftId: 21 });
    });

    it('deleteConsentForm calls DELETE /consentForms/:id', async () => {
      vi.mocked(deleteApi).mockResolvedValue(undefined);
      await deleteConsentForm(6);
      expect(deleteApi).toHaveBeenCalledWith('/consentForms/6');
    });

    it('deleteConsentFormDraft calls DELETE /consentForms/drafts/:id', async () => {
      vi.mocked(deleteApi).mockResolvedValue(undefined);
      await deleteConsentFormDraft(7);
      expect(deleteApi).toHaveBeenCalledWith('/consentForms/drafts/7');
    });

    it('updateConsentFormEnquiryEmail PUTs to correct path', async () => {
      vi.mocked(mutateApi).mockResolvedValue(undefined);
      await updateConsentFormEnquiryEmail(14, { enquiryEmailAddress: 'test@example.com' });
      expect(mutateApi).toHaveBeenCalledWith(
        'PUT',
        '/consentForms/14/updateEnquiryEmail',
        { enquiryEmailAddress: 'test@example.com' },
        undefined,
      );
    });

    it('updateConsentFormStaffInCharge maps staffIds to staffGroups ApiGroupTarget[]', async () => {
      vi.mocked(mutateApi).mockResolvedValue(undefined);
      await updateConsentFormStaffInCharge(15, [101, 202]);
      expect(mutateApi).toHaveBeenCalledWith(
        'POST',
        '/consentForms/15/addStaffInCharge',
        {
          staffGroups: [
            { type: 'individual', label: '', value: 101 },
            { type: 'individual', label: '', value: 202 },
          ],
        },
        undefined,
      );
    });
  });
});
