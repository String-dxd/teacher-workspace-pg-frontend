import { describe, it, expect } from 'vitest';

import type { FormQuestion } from '~/data/posts-registry';

import { INITIAL_STATE } from './initial-state';
import type { PostFormState } from './initial-state';
import { formReducer } from './reducer';

describe('formReducer', () => {
  it('SET_TITLE updates title', () => {
    const state = formReducer(INITIAL_STATE, { type: 'SET_TITLE', payload: 'Hello' });
    expect(state.title).toBe('Hello');
  });

  it('SET_KIND changes kind', () => {
    const state = formReducer(INITIAL_STATE, { type: 'SET_KIND', payload: 'form' });
    expect(state.kind).toBe('form');
  });

  it('ADD_UPLOAD adds an entry to attachments', () => {
    const state = formReducer(INITIAL_STATE, {
      type: 'ADD_UPLOAD',
      kind: 'file',
      payload: { localId: 'abc', name: 'doc.pdf', size: 1024, mimeType: 'application/pdf' },
    });
    expect(state.attachments).toHaveLength(1);
    expect(state.attachments[0].status).toBe('uploading');
    expect(state.attachments[0].localId).toBe('abc');
  });

  it('ADD_UPLOAD for photo sets first as cover', () => {
    const state = formReducer(INITIAL_STATE, {
      type: 'ADD_UPLOAD',
      kind: 'photo',
      payload: { localId: 'p1', name: 'img.png', size: 2048, mimeType: 'image/png' },
    });
    expect(state.photos[0].isCover).toBe(true);
  });

  it('ADD_UPLOAD for second photo does not auto-cover', () => {
    let state = formReducer(INITIAL_STATE, {
      type: 'ADD_UPLOAD',
      kind: 'photo',
      payload: { localId: 'p1', name: 'a.png', size: 1024, mimeType: 'image/png' },
    });
    state = formReducer(state, {
      type: 'ADD_UPLOAD',
      kind: 'photo',
      payload: { localId: 'p2', name: 'b.png', size: 1024, mimeType: 'image/png' },
    });
    expect(state.photos[1].isCover).toBeFalsy();
  });

  it('REMOVE_UPLOAD removes by localId', () => {
    const withFile = formReducer(INITIAL_STATE, {
      type: 'ADD_UPLOAD',
      kind: 'file',
      payload: { localId: 'abc', name: 'doc.pdf', size: 1024, mimeType: 'application/pdf' },
    });
    const state = formReducer(withFile, { type: 'REMOVE_UPLOAD', kind: 'file', localId: 'abc' });
    expect(state.attachments).toHaveLength(0);
  });

  it('REMOVE_UPLOAD auto-promotes next photo to cover when cover is removed', () => {
    let state = formReducer(INITIAL_STATE, {
      type: 'ADD_UPLOAD',
      kind: 'photo',
      payload: { localId: 'p1', name: 'a.png', size: 1024, mimeType: 'image/png' },
    });
    state = formReducer(state, {
      type: 'ADD_UPLOAD',
      kind: 'photo',
      payload: { localId: 'p2', name: 'b.png', size: 1024, mimeType: 'image/png' },
    });
    expect(state.photos[0].isCover).toBe(true);
    state = formReducer(state, { type: 'REMOVE_UPLOAD', kind: 'photo', localId: 'p1' });
    expect(state.photos).toHaveLength(1);
    expect(state.photos[0].isCover).toBe(true);
  });

  it('REMOVE_UPLOAD does not promote when other covers remain', () => {
    let state = INITIAL_STATE;
    state = formReducer(state, {
      type: 'ADD_UPLOAD',
      kind: 'photo',
      payload: { localId: 'p1', name: 'a.png', size: 1024, mimeType: 'image/png' },
    });
    state = formReducer(state, {
      type: 'ADD_UPLOAD',
      kind: 'photo',
      payload: { localId: 'p2', name: 'b.png', size: 1024, mimeType: 'image/png' },
    });
    state = formReducer(state, { type: 'SET_COVER_PHOTO', localId: 'p2' });
    // p2 is the cover; removing p1 (non-cover) leaves p2 as cover
    state = formReducer(state, { type: 'REMOVE_UPLOAD', kind: 'photo', localId: 'p1' });
    expect(state.photos[0].localId).toBe('p2');
    expect(state.photos[0].isCover).toBe(true);
  });

  it('ADD_WEBSITE_LINK respects max 3 cap', () => {
    let state = INITIAL_STATE;
    for (let i = 0; i < 4; i++) {
      state = formReducer(state, { type: 'ADD_WEBSITE_LINK' });
    }
    expect(state.websiteLinks).toHaveLength(3);
  });

  // ─── Consent form actions ───────────────────────────────────────────────────

  describe('SET_DUE_DATE', () => {
    it('sets dueDate', () => {
      const state = formReducer(INITIAL_STATE, { type: 'SET_DUE_DATE', payload: '2026-07-01' });
      expect(state.dueDate).toBe('2026-07-01');
    });
  });

  describe('SET_REMINDER', () => {
    it('sets NONE reminder', () => {
      const state = formReducer(INITIAL_STATE, {
        type: 'SET_REMINDER',
        payload: { type: 'NONE' },
      });
      expect(state.reminder).toEqual({ type: 'NONE' });
    });

    it('sets ONE_TIME reminder with date', () => {
      const state = formReducer(INITIAL_STATE, {
        type: 'SET_REMINDER',
        payload: { type: 'ONE_TIME', date: '2026-06-30' },
      });
      expect(state.reminder).toEqual({ type: 'ONE_TIME', date: '2026-06-30' });
    });

    it('sets DAILY reminder with date', () => {
      const state = formReducer(INITIAL_STATE, {
        type: 'SET_REMINDER',
        payload: { type: 'DAILY', date: '2026-06-28' },
      });
      expect(state.reminder).toEqual({ type: 'DAILY', date: '2026-06-28' });
    });
  });

  describe('SET_RESPONSE_TYPE', () => {
    it('sets responseType', () => {
      const state = formReducer(INITIAL_STATE, {
        type: 'SET_RESPONSE_TYPE',
        payload: 'yes-no',
      });
      expect(state.responseType).toBe('yes-no');
    });
  });

  describe('SET_EVENT', () => {
    it('sets event', () => {
      const event = { start: '2026-07-01T09:00', end: '2026-07-01T17:00', venue: 'Hall A' };
      const state = formReducer(INITIAL_STATE, { type: 'SET_EVENT', payload: event });
      expect(state.event).toEqual(event);
    });

    it('clears event with undefined', () => {
      const withEvent: PostFormState = {
        ...INITIAL_STATE,
        event: { start: '2026-07-01T09:00', end: '2026-07-01T17:00' },
      };
      const state = formReducer(withEvent, { type: 'SET_EVENT', payload: undefined });
      expect(state.event).toBeUndefined();
    });
  });

  describe('SET_VENUE', () => {
    it('sets venue', () => {
      const state = formReducer(INITIAL_STATE, { type: 'SET_VENUE', payload: 'Sports Hall' });
      expect(state.venue).toBe('Sports Hall');
    });
  });

  // ─── Question actions ───────────────────────────────────────────────────────

  describe('ADD_QUESTION', () => {
    it('adds a new free-text question', () => {
      const state = formReducer(INITIAL_STATE, { type: 'ADD_QUESTION' });
      expect(state.questions).toHaveLength(1);
      expect(state.questions[0].type).toBe('free-text');
      expect(state.questions[0].text).toBe('');
      expect(state.questions[0].id).toBeTruthy();
    });

    it('enforces max 5 questions', () => {
      let state = INITIAL_STATE;
      for (let i = 0; i < 7; i++) {
        state = formReducer(state, { type: 'ADD_QUESTION' });
      }
      expect(state.questions).toHaveLength(5);
    });
  });

  describe('UPDATE_QUESTION', () => {
    function stateWithQuestion(q: FormQuestion): PostFormState {
      return { ...INITIAL_STATE, questions: [q] };
    }

    it('updates question text', () => {
      const q: FormQuestion = { id: 'q1', text: '', type: 'free-text' };
      const state = formReducer(stateWithQuestion(q), {
        type: 'UPDATE_QUESTION',
        id: 'q1',
        payload: { text: 'What is your name?' },
      });
      expect(state.questions[0].text).toBe('What is your name?');
    });

    it('switches free-text to mcq with default options', () => {
      const q: FormQuestion = { id: 'q1', text: 'Pick one', type: 'free-text' };
      const state = formReducer(stateWithQuestion(q), {
        type: 'UPDATE_QUESTION',
        id: 'q1',
        payload: { type: 'mcq', options: ['', ''] },
      });
      expect(state.questions[0].type).toBe('mcq');
      if (state.questions[0].type === 'mcq') {
        expect(state.questions[0].options).toEqual(['', '']);
      }
    });

    it('switches mcq to free-text (strips options)', () => {
      const q: FormQuestion = { id: 'q1', text: 'Choose', type: 'mcq', options: ['A', 'B'] };
      const state = formReducer(stateWithQuestion(q), {
        type: 'UPDATE_QUESTION',
        id: 'q1',
        payload: { type: 'free-text' },
      });
      expect(state.questions[0].type).toBe('free-text');
      expect('options' in state.questions[0]).toBe(false);
    });

    it('updates mcq options without changing type', () => {
      const q: FormQuestion = { id: 'q1', text: 'Choose', type: 'mcq', options: ['A', 'B'] };
      const state = formReducer(stateWithQuestion(q), {
        type: 'UPDATE_QUESTION',
        id: 'q1',
        payload: { options: ['Yes', 'No', 'Maybe'] },
      });
      if (state.questions[0].type === 'mcq') {
        expect(state.questions[0].options).toEqual(['Yes', 'No', 'Maybe']);
      }
    });

    it('does nothing for non-existent question id', () => {
      const q: FormQuestion = { id: 'q1', text: 'Hello', type: 'free-text' };
      const before = stateWithQuestion(q);
      const state = formReducer(before, {
        type: 'UPDATE_QUESTION',
        id: 'nonexistent',
        payload: { text: 'Changed' },
      });
      expect(state.questions[0].text).toBe('Hello');
    });
  });

  describe('REMOVE_QUESTION', () => {
    it('removes question by id', () => {
      const state: PostFormState = {
        ...INITIAL_STATE,
        questions: [
          { id: 'q1', text: 'Q1', type: 'free-text' },
          { id: 'q2', text: 'Q2', type: 'free-text' },
        ],
      };
      const result = formReducer(state, { type: 'REMOVE_QUESTION', id: 'q1' });
      expect(result.questions).toHaveLength(1);
      expect(result.questions[0].id).toBe('q2');
    });

    it('does nothing for non-existent id', () => {
      const state: PostFormState = {
        ...INITIAL_STATE,
        questions: [{ id: 'q1', text: 'Q1', type: 'free-text' }],
      };
      const result = formReducer(state, { type: 'REMOVE_QUESTION', id: 'nonexistent' });
      expect(result.questions).toHaveLength(1);
    });
  });

  describe('MOVE_QUESTION', () => {
    const threeQuestions: PostFormState = {
      ...INITIAL_STATE,
      questions: [
        { id: 'q1', text: 'Q1', type: 'free-text' },
        { id: 'q2', text: 'Q2', type: 'free-text' },
        { id: 'q3', text: 'Q3', type: 'free-text' },
      ],
    };

    it('moves question up', () => {
      const state = formReducer(threeQuestions, {
        type: 'MOVE_QUESTION',
        id: 'q2',
        direction: 'up',
      });
      expect(state.questions.map((q) => q.id)).toEqual(['q2', 'q1', 'q3']);
    });

    it('moves question down', () => {
      const state = formReducer(threeQuestions, {
        type: 'MOVE_QUESTION',
        id: 'q2',
        direction: 'down',
      });
      expect(state.questions.map((q) => q.id)).toEqual(['q1', 'q3', 'q2']);
    });

    it('no-ops when first item moves up', () => {
      const state = formReducer(threeQuestions, {
        type: 'MOVE_QUESTION',
        id: 'q1',
        direction: 'up',
      });
      expect(state.questions.map((q) => q.id)).toEqual(['q1', 'q2', 'q3']);
    });

    it('no-ops when last item moves down', () => {
      const state = formReducer(threeQuestions, {
        type: 'MOVE_QUESTION',
        id: 'q3',
        direction: 'down',
      });
      expect(state.questions.map((q) => q.id)).toEqual(['q1', 'q2', 'q3']);
    });

    it('no-ops for non-existent id', () => {
      const state = formReducer(threeQuestions, {
        type: 'MOVE_QUESTION',
        id: 'nonexistent',
        direction: 'up',
      });
      expect(state.questions.map((q) => q.id)).toEqual(['q1', 'q2', 'q3']);
    });
  });

  // ─── Photo gallery actions ─────────────────────────────────────────────────

  describe('SET_COVER_PHOTO', () => {
    function stateWithPhotos(...ids: string[]): PostFormState {
      let state = INITIAL_STATE;
      for (const id of ids) {
        state = formReducer(state, {
          type: 'ADD_UPLOAD',
          kind: 'photo',
          payload: { localId: id, name: `${id}.png`, size: 1024, mimeType: 'image/png' },
        });
      }
      return state;
    }

    it('sets the selected photo as cover and unsets all others', () => {
      const state = stateWithPhotos('p1', 'p2', 'p3');
      const result = formReducer(state, { type: 'SET_COVER_PHOTO', localId: 'p2' });
      expect(result.photos.find((p) => p.localId === 'p1')!.isCover).toBe(false);
      expect(result.photos.find((p) => p.localId === 'p2')!.isCover).toBe(true);
      expect(result.photos.find((p) => p.localId === 'p3')!.isCover).toBe(false);
    });

    it('only one photo is cover at a time', () => {
      const state = stateWithPhotos('p1', 'p2');
      const result = formReducer(state, { type: 'SET_COVER_PHOTO', localId: 'p2' });
      expect(result.photos.filter((p) => p.isCover)).toHaveLength(1);
    });
  });

  describe('REORDER_PHOTOS', () => {
    function stateWithPhotos(...ids: string[]): PostFormState {
      let state = INITIAL_STATE;
      for (const id of ids) {
        state = formReducer(state, {
          type: 'ADD_UPLOAD',
          kind: 'photo',
          payload: { localId: id, name: `${id}.png`, size: 1024, mimeType: 'image/png' },
        });
      }
      return state;
    }

    it('moves photo from index 0 to index 2', () => {
      const state = stateWithPhotos('p1', 'p2', 'p3');
      const result = formReducer(state, { type: 'REORDER_PHOTOS', from: 0, to: 2 });
      expect(result.photos.map((p) => p.localId)).toEqual(['p2', 'p3', 'p1']);
    });

    it('moves photo from index 2 to index 0', () => {
      const state = stateWithPhotos('p1', 'p2', 'p3');
      const result = formReducer(state, { type: 'REORDER_PHOTOS', from: 2, to: 0 });
      expect(result.photos.map((p) => p.localId)).toEqual(['p3', 'p1', 'p2']);
    });

    it('no-ops when from equals to', () => {
      const state = stateWithPhotos('p1', 'p2');
      const result = formReducer(state, { type: 'REORDER_PHOTOS', from: 1, to: 1 });
      expect(result.photos.map((p) => p.localId)).toEqual(['p1', 'p2']);
    });

    it('preserves cover status after reorder', () => {
      const state = stateWithPhotos('p1', 'p2', 'p3');
      const result = formReducer(state, { type: 'REORDER_PHOTOS', from: 0, to: 2 });
      expect(result.photos.find((p) => p.localId === 'p1')!.isCover).toBe(true);
    });
  });
});
