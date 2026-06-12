import { describe, it, expect } from 'vitest';

import { INITIAL_STATE } from '../state/initial-state';
import type { PostFormState } from '../state/initial-state';
import {
  isCreatePostFormValid,
  computeInlineErrors,
  hasPendingUploads,
} from './create-post-validation';

const VALID_STATE: PostFormState = {
  ...INITIAL_STATE,
  title: 'Test Post',
  description: 'A description that is not empty',
  enquiryEmail: 'teacher@school.edu.sg',
  selectedRecipients: [{ id: '1', label: 'Class 1A', type: 'class' }],
};

function daysFromToday(offset: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

describe('isCreatePostFormValid', () => {
  it('returns false for empty state', () => {
    expect(isCreatePostFormValid(INITIAL_STATE, 'announcement')).toBe(false);
  });

  it('returns true for valid announcement', () => {
    expect(isCreatePostFormValid(VALID_STATE, 'announcement')).toBe(true);
  });

  it('returns false for consent form without due date', () => {
    expect(isCreatePostFormValid(VALID_STATE, 'post-with-response')).toBe(false);
  });

  it('returns true for consent form with future due date', () => {
    const state = { ...VALID_STATE, dueDate: daysFromToday(3) };
    expect(isCreatePostFormValid(state, 'post-with-response')).toBe(true);
  });

  it('returns true for consent form with due date = today', () => {
    const state = { ...VALID_STATE, dueDate: daysFromToday(0) };
    expect(isCreatePostFormValid(state, 'post-with-response')).toBe(true);
  });

  it('returns false for consent form with due date in the past', () => {
    const state = { ...VALID_STATE, dueDate: daysFromToday(-1) };
    expect(isCreatePostFormValid(state, 'post-with-response')).toBe(false);
  });

  describe('reminder date validation', () => {
    it('NONE reminder is always valid', () => {
      const state: PostFormState = {
        ...VALID_STATE,
        dueDate: daysFromToday(5),
        reminder: { type: 'NONE' },
      };
      expect(isCreatePostFormValid(state, 'post-with-response')).toBe(true);
    });

    it('ONE_TIME with valid date (tomorrow, due in 3 days) passes', () => {
      const state: PostFormState = {
        ...VALID_STATE,
        dueDate: daysFromToday(3),
        reminder: { type: 'ONE_TIME', date: daysFromToday(1) },
      };
      expect(isCreatePostFormValid(state, 'post-with-response')).toBe(true);
    });

    it('ONE_TIME with date = day before due date passes', () => {
      const state: PostFormState = {
        ...VALID_STATE,
        dueDate: daysFromToday(5),
        reminder: { type: 'ONE_TIME', date: daysFromToday(4) },
      };
      expect(isCreatePostFormValid(state, 'post-with-response')).toBe(true);
    });

    it('ONE_TIME with date = due date is rejected (must be before due)', () => {
      const dueDate = daysFromToday(3);
      const state: PostFormState = {
        ...VALID_STATE,
        dueDate,
        reminder: { type: 'ONE_TIME', date: dueDate },
      };
      expect(isCreatePostFormValid(state, 'post-with-response')).toBe(false);
    });

    it('ONE_TIME with date = today is rejected (must be >= tomorrow)', () => {
      const state: PostFormState = {
        ...VALID_STATE,
        dueDate: daysFromToday(5),
        reminder: { type: 'ONE_TIME', date: daysFromToday(0) },
      };
      expect(isCreatePostFormValid(state, 'post-with-response')).toBe(false);
    });

    it('DAILY with valid date passes', () => {
      const state: PostFormState = {
        ...VALID_STATE,
        dueDate: daysFromToday(5),
        reminder: { type: 'DAILY', date: daysFromToday(2) },
      };
      expect(isCreatePostFormValid(state, 'post-with-response')).toBe(true);
    });

    it('DAILY with date in past is rejected', () => {
      const state: PostFormState = {
        ...VALID_STATE,
        dueDate: daysFromToday(5),
        reminder: { type: 'DAILY', date: daysFromToday(-1) },
      };
      expect(isCreatePostFormValid(state, 'post-with-response')).toBe(false);
    });

    it('ONE_TIME with empty date is rejected', () => {
      const state: PostFormState = {
        ...VALID_STATE,
        dueDate: daysFromToday(5),
        reminder: { type: 'ONE_TIME', date: '' },
      };
      expect(isCreatePostFormValid(state, 'post-with-response')).toBe(false);
    });

    it('due date = tomorrow means reminder window is exactly [tomorrow, today] which is empty → ONE_TIME fails', () => {
      const state: PostFormState = {
        ...VALID_STATE,
        dueDate: daysFromToday(1),
        reminder: { type: 'ONE_TIME', date: daysFromToday(1) },
      };
      // max = dueDate - 1 = today; min = tomorrow → min > max → always invalid
      expect(isCreatePostFormValid(state, 'post-with-response')).toBe(false);
    });
  });

  it('returns false when uploads are in flight', () => {
    const state: PostFormState = {
      ...VALID_STATE,
      dueDate: daysFromToday(3),
      attachments: [
        { localId: 'x', kind: 'file', name: 'f', size: 1, mimeType: '', status: 'uploading' },
      ],
    };
    expect(isCreatePostFormValid(state, 'post-with-response')).toBe(false);
  });
});

describe('computeInlineErrors', () => {
  it('returns errors for all empty fields', () => {
    const errors = computeInlineErrors(INITIAL_STATE, 'announcement');
    expect(errors.title).toBeDefined();
    expect(errors.description).toBeDefined();
    expect(errors.enquiryEmail).toBeDefined();
    expect(errors.recipients).toBeDefined();
  });

  it('returns dueDate error for consent form without due date', () => {
    const errors = computeInlineErrors(VALID_STATE, 'post-with-response');
    expect(errors.dueDate).toBeDefined();
  });

  it('returns no errors for valid consent form state', () => {
    const state = { ...VALID_STATE, dueDate: daysFromToday(3) };
    const errors = computeInlineErrors(state, 'post-with-response');
    expect(Object.keys(errors)).toHaveLength(0);
  });
});

describe('hasPendingUploads', () => {
  it('returns false with no uploads', () => {
    expect(hasPendingUploads(INITIAL_STATE)).toBe(false);
  });

  it('returns true with uploading attachment', () => {
    const state: PostFormState = {
      ...INITIAL_STATE,
      attachments: [
        { localId: 'x', kind: 'file', name: 'f', size: 1, mimeType: '', status: 'uploading' },
      ],
    };
    expect(hasPendingUploads(state)).toBe(true);
  });

  it('returns true with verifying photo', () => {
    const state: PostFormState = {
      ...INITIAL_STATE,
      photos: [
        {
          localId: 'p1',
          kind: 'photo',
          name: 'img.png',
          size: 1,
          mimeType: '',
          status: 'verifying',
        },
      ],
    };
    expect(hasPendingUploads(state)).toBe(true);
  });

  it('returns false when all uploads are ready or error', () => {
    const state: PostFormState = {
      ...INITIAL_STATE,
      attachments: [
        { localId: 'x', kind: 'file', name: 'f', size: 1, mimeType: '', status: 'ready' },
      ],
      photos: [
        { localId: 'p1', kind: 'photo', name: 'img.png', size: 1, mimeType: '', status: 'error' },
      ],
    };
    expect(hasPendingUploads(state)).toBe(false);
  });
});
