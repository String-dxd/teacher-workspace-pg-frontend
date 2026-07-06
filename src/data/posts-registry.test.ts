import { describe, expect, it } from 'vitest';

import { postHref } from './posts-registry';

describe('postHref', () => {
  it('returns detail path for posted announcement', () => {
    const post = { kind: 'announcement', status: 'posted', numericId: 42 } as any;
    expect(postHref(post)).toBe('/posts/announcements/42');
  });

  it('returns edit path for posted announcement with edit option', () => {
    const post = { kind: 'announcement', status: 'posted', numericId: 42 } as any;
    expect(postHref(post, { edit: true })).toBe('/posts/announcements/42/edit');
  });

  it('returns draft edit path for draft announcement', () => {
    const post = { kind: 'announcement', status: 'draft', numericId: 301 } as any;
    expect(postHref(post)).toBe('/posts/announcements/drafts/301/edit');
  });

  it('returns draft edit path for scheduled announcement', () => {
    const post = { kind: 'announcement', status: 'scheduled', numericId: 301 } as any;
    expect(postHref(post)).toBe('/posts/announcements/drafts/301/edit');
  });

  it('returns detail path for posted consent form', () => {
    const post = { kind: 'form', status: 'open', numericId: 55 } as any;
    expect(postHref(post)).toBe('/posts/consent-forms/55');
  });

  it('returns draft edit path for draft consent form', () => {
    const post = { kind: 'form', status: 'draft', numericId: 501 } as any;
    expect(postHref(post)).toBe('/posts/consent-forms/drafts/501/edit');
  });

  it('returns draft edit path for scheduled consent form', () => {
    const post = { kind: 'form', status: 'scheduled', numericId: 501 } as any;
    expect(postHref(post)).toBe('/posts/consent-forms/drafts/501/edit');
  });

  it('returns edit path for posted consent form with edit option', () => {
    const post = { kind: 'form', status: 'open', numericId: 55 } as any;
    expect(postHref(post, { edit: true })).toBe('/posts/consent-forms/55/edit');
  });
});
