import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';

import { GroupRoutes } from './App';

function renderAtPath(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <GroupRoutes />
    </MemoryRouter>,
  );
}

describe('Groups routing within host', () => {
  it('matches the index route at /groups', () => {
    const { container } = renderAtPath('/');
    expect(container.innerHTML).not.toBe('');
  });

  it('matches the create route at /groups/new', () => {
    const { container } = renderAtPath('/new');
    expect(container.innerHTML).not.toBe('');
  });

  it('matches a detail route at /groups/1', () => {
    const { container } = renderAtPath('/1');
    expect(container.innerHTML).not.toBe('');
  });

  it('matches an edit route at /groups/1/edit', () => {
    const { container } = renderAtPath('/1/edit');
    expect(container.innerHTML).not.toBe('');
  });

  it('matches the class detail route at /groups/classes/1', () => {
    const { container } = renderAtPath('/classes/1');
    expect(container.innerHTML).not.toBe('');
  });
});
