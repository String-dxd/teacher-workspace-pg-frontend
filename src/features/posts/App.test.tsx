import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';

import { PostRoutes } from './App';

function renderAtPath(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <PostRoutes />
    </MemoryRouter>,
  );
}

describe('Posts routing within host', () => {
  it('matches the index route at /posts', () => {
    const { container } = renderAtPath('/');
    expect(container.innerHTML).not.toBe('');
  });

  it('matches the create route at /posts/new', () => {
    const { container } = renderAtPath('/new');
    expect(container.innerHTML).not.toBe('');
  });

  it('matches a detail route at /posts/announcements/1', () => {
    const { container } = renderAtPath('/announcements/1');
    expect(container.innerHTML).not.toBe('');
  });

  it('matches an edit route at /posts/announcements/1/edit', () => {
    const { container } = renderAtPath('/announcements/1/edit');
    expect(container.innerHTML).not.toBe('');
  });

  it('matches a draft edit route at /posts/announcements/drafts/1/edit', () => {
    const { container } = renderAtPath('/announcements/drafts/1/edit');
    expect(container.innerHTML).not.toBe('');
  });
});
