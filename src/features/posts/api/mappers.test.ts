import { describe, expect, it } from 'vitest';

import { describeScheduledSendFailure } from '~/data/posts-registry';

import {
  mapAnnouncementSummary,
  mapConsentFormDetail,
  mapConsentFormSummaryToPost,
  mapReminder,
  toPGCreatePayload,
} from './mappers';
import type {
  ApiAnnouncementSummary,
  ApiConsentFormDetail,
  ApiConsentFormStudent,
  ApiConsentFormSummary,
  ApiCreateAnnouncementPayload,
} from './types';

const basePayload: ApiCreateAnnouncementPayload = {
  title: 'Test',
  richTextContent: '{"type":"doc","content":[]}',
  enquiryEmailAddress: 'test@moe.edu.sg',
  studentGroups: [],
};

describe('toPGCreatePayload', () => {
  it('builds a write payload from a complete input', () => {
    const out = toPGCreatePayload(basePayload);
    expect(out.title).toBe('Test');
    expect(out.enquiryEmailAddress).toBe('test@moe.edu.sg');
    expect(out.studentGroups).toEqual([]);
  });

  it('throws when enquiryEmailAddress is missing and allowPartial is not set', () => {
    const payload = { ...basePayload, enquiryEmailAddress: '' };
    expect(() => toPGCreatePayload(payload)).toThrow(/enquiryEmailAddress is required/i);
  });

  it('does not throw on missing enquiryEmailAddress when allowPartial is true', () => {
    // Mirrors pgw-web's AnnouncementDraftManager.test:
    // 'should call the AnnouncementDraftService even if all form inputs are provided with empty values'
    const payload = { ...basePayload, enquiryEmailAddress: '' };
    expect(() => toPGCreatePayload(payload, { allowPartial: true })).not.toThrow();
    expect(toPGCreatePayload(payload, { allowPartial: true }).enquiryEmailAddress).toBe('');
  });

  it('passes studentGroups through to the wire (PGW expects {type, label, value})', () => {
    const payload: ApiCreateAnnouncementPayload = {
      ...basePayload,
      studentGroups: [
        { type: 'class', label: 'P1A', value: 1 },
        { type: 'class', label: 'P1B', value: 2 },
        { type: 'cca', label: 'Choir', value: 3 },
        { type: 'level', label: 'Primary 1', value: 4 },
      ],
    };
    const out = toPGCreatePayload(payload);
    expect(out.studentGroups).toEqual([
      { type: 'class', label: 'P1A', value: 1 },
      { type: 'class', label: 'P1B', value: 2 },
      { type: 'cca', label: 'Choir', value: 3 },
      { type: 'level', label: 'Primary 1', value: 4 },
    ]);
  });

  it('renames websiteLinks → urls and shortcutLink → shortcuts on the wire', () => {
    const payload: ApiCreateAnnouncementPayload = {
      ...basePayload,
      websiteLinks: [{ url: 'https://x.sg', title: 'X' }],
      shortcutLink: ['TRAVEL_DECLARATION'],
    };
    const out = toPGCreatePayload(payload);
    expect(out.urls).toEqual([{ webLink: 'https://x.sg', linkDescription: 'X' }]);
    expect(out.shortcuts).toEqual(['TRAVEL_DECLARATION']);
  });
});

const baseConsentFormSummary: ApiConsentFormSummary = {
  id: '42',
  postId: 42,
  title: 'Test form',
  date: '2026-04-01T00:00:00.000Z',
  status: 'OPEN',
  toParentsOf: [],
  respondedMetrics: { respondedPerStudent: 0.5, totalStudents: 10 },
  scheduledSendFailureCode: null,
  createdByName: 'Teacher A',
  consentByDate: '2026-05-01T00:00:00.000Z',
};

const baseAnnouncementSummary: ApiAnnouncementSummary = {
  id: 'ann_100',
  postId: 100,
  title: 'Test announcement',
  date: '2026-04-01T00:00:00.000Z',
  status: 'SCHEDULED',
  responseType: 'VIEW_ONLY',
  toParentsOf: [],
  readMetrics: { readPerStudent: 0, totalStudents: 0 },
  scheduledSendFailureCode: null,
  createdByName: 'Teacher A',
};

describe('describeScheduledSendFailure', () => {
  it('returns null for null or empty codes (the common happy path)', () => {
    expect(describeScheduledSendFailure(null)).toBeNull();
    expect(describeScheduledSendFailure(undefined)).toBeNull();
    expect(describeScheduledSendFailure('')).toBeNull();
  });

  it('looks up known codes in the catalogue', () => {
    expect(describeScheduledSendFailure('UPSTREAM_TIMEOUT')).toBe(
      "The messaging service didn't respond in time.",
    );
    expect(describeScheduledSendFailure('RECIPIENT_INVALID')).toBe(
      'Some recipients are no longer valid.',
    );
  });

  it('falls back to a generic apology for unknown codes', () => {
    expect(describeScheduledSendFailure('SOMETHING_PG_ADDED_LATER')).toBe(
      'Something went wrong on our side.',
    );
  });
});

describe('mapAnnouncementSummary', () => {
  it('passes through scheduledSendFailureCode on the summary', () => {
    const summary: ApiAnnouncementSummary = {
      ...baseAnnouncementSummary,
      scheduledSendFailureCode: 'UPSTREAM_TIMEOUT',
    };
    const out = mapAnnouncementSummary(summary, 'mine');
    expect(out.scheduledSendFailureCode).toBe('UPSTREAM_TIMEOUT');
  });

  it('normalises a missing failure code to null', () => {
    const out = mapAnnouncementSummary(baseAnnouncementSummary, 'mine');
    expect(out.scheduledSendFailureCode).toBeNull();
  });
});

describe('mapConsentFormSummaryToPost', () => {
  it('passes through scheduledSendFailureCode on the summary', () => {
    const summary: ApiConsentFormSummary = {
      ...baseConsentFormSummary,
      scheduledSendFailureCode: 'RECIPIENT_INVALID',
    };
    const out = mapConsentFormSummaryToPost(summary, 'mine');
    expect(out.scheduledSendFailureCode).toBe('RECIPIENT_INVALID');
  });
});

const baseConsentFormDetail: ApiConsentFormDetail = {
  consentFormId: 1038,
  title: 'Consent Form',
  content: null,
  richTextContent: null,
  responseType: 'YES_NO',
  eventStartDate: null,
  eventEndDate: null,
  consentByDate: null,
  addReminderType: 'NONE',
  reminderDate: null,
  postedDate: '2026-04-01T00:00:00.000Z',
  venue: null,
  enquiryEmailAddress: 'teacher@moe.edu.sg',
  staffName: 'Teacher A',
  createdBy: 1013,
  createdAt: '2026-04-01T00:00:00.000Z',
  images: [],
  webLinkList: [],
  customQuestions: null,
  staffOwners: [],
  consentFormRecipients: [],
  consentFormHistory: [],
};

describe('mapConsentFormDetail — attachments rehydration', () => {
  it('rehydrates non-empty attachments into UploadingFile shape', () => {
    const detail: ApiConsentFormDetail = {
      ...baseConsentFormDetail,
      attachments: [
        { attachmentId: 8100, name: 'briefing.pdf', size: 213456, url: '/dl/8100' },
        { attachmentId: 8101, name: 'itinerary.pdf', size: 98765, url: '/dl/8101' },
      ],
    };
    const out = mapConsentFormDetail(detail);
    expect(out.attachments).toHaveLength(2);
    expect(out.attachments?.[0]).toMatchObject({
      kind: 'file',
      status: 'ready',
      attachmentId: 8100,
      name: 'briefing.pdf',
      size: 213456,
      url: '/dl/8100',
    });
    expect(out.attachments?.[1]?.localId).toBe('rehydrated-file-8101');
  });

  it('returns an empty array when attachments are omitted', () => {
    const out = mapConsentFormDetail(baseConsentFormDetail);
    expect(out.attachments).toEqual([]);
  });

  it('returns an empty array when attachments is an empty list', () => {
    const out = mapConsentFormDetail({ ...baseConsentFormDetail, attachments: [] });
    expect(out.attachments).toEqual([]);
  });
});

const baseConsentFormRecipient: ApiConsentFormStudent = {
  studentId: 3001,
  reply: 'YES',
  replyDate: '2026-04-02T00:00:00.000Z',
  replyByParent: 'Mrs Tan',
  remarks: null,
  isIndividual: false,
  onBoardedCategory: 'ONBOARDED',
  student: {
    studentId: 3001,
    studentName: 'Alice Tan',
    className: '3A',
    indexNumber: '3A01',
  },
};

describe('mapConsentFormDetail — custom-question answers', () => {
  function mapSingleRecipient(recipient: ApiConsentFormStudent) {
    const out = mapConsentFormDetail({
      ...baseConsentFormDetail,
      consentFormRecipients: [recipient],
    });
    return out.recipients[0];
  }

  it('maps customQuestionReply entries into questionAnswers keyed by question id', () => {
    const recipient = mapSingleRecipient({
      ...baseConsentFormRecipient,
      customQuestionReply: [
        { customQuestionId: '1', answer: { text: 'No allergies' } },
        { customQuestionId: '2', answer: { choice: 'Chicken Rice' } },
      ],
    });
    expect(recipient.questionAnswers).toEqual({ '1': 'No allergies', '2': 'Chicken Rice' });
  });

  it('joins multi-select choices into a single display string', () => {
    const recipient = mapSingleRecipient({
      ...baseConsentFormRecipient,
      customQuestionReply: [
        { customQuestionId: '2', answer: { choices: ['Chicken Rice', 'Vegetarian'] } },
      ],
    });
    expect(recipient.questionAnswers).toEqual({ '2': 'Chicken Rice, Vegetarian' });
  });

  it('maps a null answer to a null entry', () => {
    const recipient = mapSingleRecipient({
      ...baseConsentFormRecipient,
      customQuestionReply: [{ customQuestionId: '1', answer: null }],
    });
    expect(recipient.questionAnswers).toEqual({ '1': null });
  });

  it('maps a null customQuestionReply to an empty questionAnswers object', () => {
    const recipient = mapSingleRecipient({
      ...baseConsentFormRecipient,
      customQuestionReply: null,
    });
    expect(recipient.questionAnswers).toEqual({});
  });

  it('maps an absent customQuestionReply to an empty questionAnswers object', () => {
    const recipient = mapSingleRecipient(baseConsentFormRecipient);
    expect(recipient.questionAnswers).toEqual({});
  });
});

describe('mapConsentFormDetail — recipient class label', () => {
  it('derives the class from a class-prefixed index number', () => {
    const out = mapConsentFormDetail({
      ...baseConsentFormDetail,
      consentFormRecipients: [
        {
          ...baseConsentFormRecipient,
          student: {
            ...baseConsentFormRecipient.student,
            indexNumber: '4A001',
            className: 'Choir',
          },
        },
      ],
    });
    expect(out.recipients[0].classLabel).toBe('4A');
  });

  it('falls back to className when the index number has no class prefix', () => {
    const out = mapConsentFormDetail({
      ...baseConsentFormDetail,
      consentFormRecipients: [
        {
          ...baseConsentFormRecipient,
          student: { ...baseConsentFormRecipient.student, indexNumber: '07', className: '4A' },
        },
      ],
    });
    expect(out.recipients[0].classLabel).toBe('4A');
  });
});

describe('mapConsentFormSummaryToPost — status branching', () => {
  it('maps posted rows with id and numericId', () => {
    const out = mapConsentFormSummaryToPost(baseConsentFormSummary, 'mine');
    expect(out.id).toBe('42');
    expect(out.numericId).toBe(42);
    expect(out.status).toBe('open');
  });

  it('maps draft rows with id and numericId', () => {
    const draft: ApiConsentFormSummary = { ...baseConsentFormSummary, status: 'DRAFT' };
    const out = mapConsentFormSummaryToPost(draft, 'mine');
    expect(out.id).toBe('42');
    expect(out.numericId).toBe(42);
    expect(out.status).toBe('draft');
  });

  it('maps scheduled rows with id and numericId (PGW: scheduled forms live in the draft table)', () => {
    const scheduled: ApiConsentFormSummary = {
      ...baseConsentFormSummary,
      status: 'SCHEDULED',
    };
    const out = mapConsentFormSummaryToPost(scheduled, 'mine');
    expect(out.id).toBe('42');
    expect(out.numericId).toBe(42);
    expect(out.status).toBe('scheduled');
  });
});

describe('mapReminder', () => {
  it('returns NONE for type NONE regardless of date', () => {
    expect(mapReminder('NONE', null)).toEqual({ type: 'NONE' });
    expect(mapReminder('NONE', '2026-05-15T00:00:00.000Z')).toEqual({ type: 'NONE' });
  });

  it('returns ONE_TIME with the date in YYYY-MM-DD form from an ISO timestamp', () => {
    expect(mapReminder('ONE_TIME', '2026-05-15T00:00:00.000Z')).toEqual({
      type: 'ONE_TIME',
      date: '2026-05-15',
    });
  });

  it('returns ONE_TIME with the date in YYYY-MM-DD form from a bare date string', () => {
    expect(mapReminder('ONE_TIME', '2026-05-15')).toEqual({
      type: 'ONE_TIME',
      date: '2026-05-15',
    });
  });

  it('returns DAILY with the date in YYYY-MM-DD form', () => {
    expect(mapReminder('DAILY', '2026-05-15T00:00:00.000Z')).toEqual({
      type: 'DAILY',
      date: '2026-05-15',
    });
  });

  it('falls back to NONE when type is unknown / addReminderType is empty string', () => {
    // Cast to silence TS — real-world guard against unexpected wire values.
    expect(mapReminder('' as 'NONE', null)).toEqual({ type: 'NONE' });
  });

  it('falls back to NONE when type is ONE_TIME but reminderDate is null', () => {
    expect(mapReminder('ONE_TIME', null)).toEqual({ type: 'NONE' });
  });

  it('falls back to NONE when type is DAILY but reminderDate is null', () => {
    expect(mapReminder('DAILY', null)).toEqual({ type: 'NONE' });
  });
});
