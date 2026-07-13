import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('./http', () => ({
  fetchApi: vi.fn(),
  mutateApi: vi.fn(),
  deleteApi: vi.fn(),
}));

import {
  cancelAnnouncementSchedule,
  createAnnouncement,
  createDraft,
  deleteAnnouncement,
  deleteDraft,
  duplicateAnnouncement,
  duplicateAnnouncementDraft,
  fetchAnnouncementDetail,
  fetchAnnouncementDraftDetail,
  fetchAnnouncements,
  fetchSharedAnnouncements,
  rescheduleAnnouncementDraft,
  scheduleExistingAnnouncementDraft,
  scheduleNewAnnouncementDraft,
  updateAnnouncementEnquiryEmail,
  updateAnnouncementStaffInCharge,
  updateDraft,
} from './announcements';
import { fetchApi, mutateApi, deleteApi } from './http';

describe('api/announcements', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('reads', () => {
    it('fetchAnnouncements calls GET /announcements', async () => {
      vi.mocked(fetchApi).mockResolvedValue([]);
      await fetchAnnouncements();
      expect(fetchApi).toHaveBeenCalledWith('/announcements');
    });

    it('fetchSharedAnnouncements calls GET /announcements/shared', async () => {
      vi.mocked(fetchApi).mockResolvedValue([]);
      await fetchSharedAnnouncements();
      expect(fetchApi).toHaveBeenCalledWith('/announcements/shared');
    });

    it('fetchAnnouncementDetail unwraps array response', async () => {
      const detail = { id: 1, title: 'Test' };
      vi.mocked(fetchApi).mockResolvedValue([detail]);
      const result = await fetchAnnouncementDetail(1);
      expect(fetchApi).toHaveBeenCalledWith('/announcements/1');
      expect(result).toEqual(detail);
    });

    it('fetchAnnouncementDraftDetail unwraps array response', async () => {
      const draft = { id: 2, title: 'Draft' };
      vi.mocked(fetchApi).mockResolvedValue([draft]);
      const result = await fetchAnnouncementDraftDetail(2);
      expect(fetchApi).toHaveBeenCalledWith('/announcements/drafts/2');
      expect(result).toEqual(draft);
    });
  });

  describe('writes', () => {
    it('createAnnouncement POSTs to /announcements', async () => {
      const payload = { title: 'New' } as any;
      vi.mocked(mutateApi).mockResolvedValue({ postId: 10 });
      const result = await createAnnouncement(payload);
      expect(mutateApi).toHaveBeenCalledWith('POST', '/announcements', payload, undefined);
      expect(result).toEqual({ postId: 10 });
    });

    it('createDraft POSTs to /announcements/drafts with options', async () => {
      const payload = { title: 'Draft' } as any;
      const options = { signal: new AbortController().signal };
      vi.mocked(mutateApi).mockResolvedValue({ announcementDraftId: 42 });
      await createDraft(payload, options);
      expect(mutateApi).toHaveBeenCalledWith('POST', '/announcements/drafts', payload, options);
    });

    it('updateDraft PUTs to /announcements/drafts/:id', async () => {
      const payload = { title: 'Updated' } as any;
      vi.mocked(mutateApi).mockResolvedValue(undefined);
      await updateDraft(5, payload);
      expect(mutateApi).toHaveBeenCalledWith('PUT', '/announcements/drafts/5', payload, undefined);
    });

    it('rescheduleAnnouncementDraft remaps scheduledSendAt to scheduledDateTime', async () => {
      vi.mocked(mutateApi).mockResolvedValue(undefined);
      await rescheduleAnnouncementDraft(3, { scheduledSendAt: '2026-01-01T00:00:00Z' });
      expect(mutateApi).toHaveBeenCalledWith(
        'PUT',
        '/announcements/drafts/3/rescheduleSchedule',
        { scheduledDateTime: '2026-01-01T00:00:00Z' },
        undefined,
      );
    });

    it('updateAnnouncementStaffInCharge maps staffIds to staffGroups', async () => {
      vi.mocked(mutateApi).mockResolvedValue(undefined);
      await updateAnnouncementStaffInCharge(7, [10, 20]);
      expect(mutateApi).toHaveBeenCalledWith('POST', '/announcements/7/addStaffInCharge', {
        staffGroups: [
          { type: 'individual', label: '', value: 10 },
          { type: 'individual', label: '', value: 20 },
        ],
      });
    });

    it('scheduleNewAnnouncementDraft POSTs to /announcements/drafts/schedule', async () => {
      const payload = { title: 'Scheduled', scheduledSendAt: '2026-07-01T09:00:00Z' } as any;
      vi.mocked(mutateApi).mockResolvedValue({ announcementDraftId: 50, updatedAt: '2026-07-01' });
      const result = await scheduleNewAnnouncementDraft(payload);
      expect(mutateApi).toHaveBeenCalledWith(
        'POST',
        '/announcements/drafts/schedule',
        payload,
        undefined,
      );
      expect(result).toEqual({ announcementDraftId: 50, updatedAt: '2026-07-01' });
    });

    it('scheduleExistingAnnouncementDraft PUTs to /announcements/drafts/schedule/:id', async () => {
      const payload = { title: 'Rescheduled', scheduledSendAt: '2026-08-01T09:00:00Z' } as any;
      vi.mocked(mutateApi).mockResolvedValue({ announcementDraftId: 3, updatedAt: '2026-08-01' });
      const result = await scheduleExistingAnnouncementDraft(3, payload);
      expect(mutateApi).toHaveBeenCalledWith(
        'PUT',
        '/announcements/drafts/schedule/3',
        payload,
        undefined,
      );
      expect(result).toEqual({ announcementDraftId: 3, updatedAt: '2026-08-01' });
    });

    it('cancelAnnouncementSchedule POSTs to /announcements/drafts/:id/cancelSchedule', async () => {
      vi.mocked(mutateApi).mockResolvedValue(undefined);
      await cancelAnnouncementSchedule(9);
      expect(mutateApi).toHaveBeenCalledWith(
        'POST',
        '/announcements/drafts/9/cancelSchedule',
        {},
        undefined,
      );
    });

    it('duplicateAnnouncement POSTs to /announcements/duplicate', async () => {
      vi.mocked(mutateApi).mockResolvedValue({ announcementDraftId: 77, updatedAt: '2026-07-01' });
      const result = await duplicateAnnouncement(5);
      expect(mutateApi).toHaveBeenCalledWith('POST', '/announcements/duplicate', {
        announcementId: 5,
      });
      expect(result).toEqual({ announcementDraftId: 77, updatedAt: '2026-07-01' });
    });

    it('duplicateAnnouncementDraft POSTs to /announcements/drafts/duplicate', async () => {
      vi.mocked(mutateApi).mockResolvedValue({ announcementDraftId: 78, updatedAt: '2026-07-01' });
      const result = await duplicateAnnouncementDraft(6);
      expect(mutateApi).toHaveBeenCalledWith('POST', '/announcements/drafts/duplicate', {
        announcementDraftId: 6,
      });
      expect(result).toEqual({ announcementDraftId: 78, updatedAt: '2026-07-01' });
    });

    it('updateAnnouncementEnquiryEmail PUTs to /announcements/:id/enquiryEmailAddress', async () => {
      vi.mocked(mutateApi).mockResolvedValue(undefined);
      await updateAnnouncementEnquiryEmail(11, { enquiryEmailAddress: 'test@school.edu.sg' });
      expect(mutateApi).toHaveBeenCalledWith('PUT', '/announcements/11/enquiryEmailAddress', {
        enquiryEmailAddress: 'test@school.edu.sg',
      });
    });

    it('deleteAnnouncement calls DELETE /announcements/:id', async () => {
      vi.mocked(deleteApi).mockResolvedValue(undefined);
      await deleteAnnouncement(7);
      expect(deleteApi).toHaveBeenCalledWith('/announcements/7');
    });

    it('deleteDraft calls DELETE /announcements/drafts/:id', async () => {
      vi.mocked(deleteApi).mockResolvedValue(undefined);
      await deleteDraft(8);
      expect(deleteApi).toHaveBeenCalledWith('/announcements/drafts/8');
    });
  });
});
