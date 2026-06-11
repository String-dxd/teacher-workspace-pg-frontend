import { describe, it, expect } from 'vitest';

import { INITIAL_STATE } from './initial-state';
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

  it('REMOVE_UPLOAD removes by localId', () => {
    const withFile = formReducer(INITIAL_STATE, {
      type: 'ADD_UPLOAD',
      kind: 'file',
      payload: { localId: 'abc', name: 'doc.pdf', size: 1024, mimeType: 'application/pdf' },
    });
    const state = formReducer(withFile, { type: 'REMOVE_UPLOAD', kind: 'file', localId: 'abc' });
    expect(state.attachments).toHaveLength(0);
  });

  it('ADD_WEBSITE_LINK respects max 3 cap', () => {
    let state = INITIAL_STATE;
    for (let i = 0; i < 4; i++) {
      state = formReducer(state, { type: 'ADD_WEBSITE_LINK' });
    }
    expect(state.websiteLinks).toHaveLength(3);
  });
});
