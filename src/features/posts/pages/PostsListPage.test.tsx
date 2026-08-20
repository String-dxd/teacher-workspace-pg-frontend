import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { AnnouncementPost, ConsentFormPost } from '~/data/posts-registry';

vi.mock('~/features/posts/api/announcements', () => ({
  loadPostsList: vi.fn(),
  loadSchoolAnnouncementsList: vi.fn(),
  deleteAnnouncement: vi.fn(),
  deleteDraft: vi.fn(),
  duplicateAnnouncement: vi.fn(),
  duplicateAnnouncementDraft: vi.fn(),
}));

vi.mock('~/features/posts/api/consent-forms', () => ({
  loadConsentPostsList: vi.fn(),
  loadSchoolConsentPostsList: vi.fn(),
  deleteConsentForm: vi.fn(),
  deleteConsentFormDraft: vi.fn(),
  duplicateConsentForm: vi.fn(),
  duplicateConsentFormDraft: vi.fn(),
}));

vi.mock('~/features/posts/api/session', () => ({
  getConfigs: vi.fn(),
  fetchSession: vi.fn(),
}));

import {
  deleteAnnouncement,
  loadPostsList,
  loadSchoolAnnouncementsList,
} from '~/features/posts/api/announcements';
import {
  loadConsentPostsList,
  loadSchoolConsentPostsList,
} from '~/features/posts/api/consent-forms';
import { fetchSession, getConfigs } from '~/features/posts/api/session';

import { PostsListPage } from './PostsListPage';

// ─── Fixtures ───────────────────────────────────────────────────────────────

function announcement(over: Partial<AnnouncementPost> = {}): AnnouncementPost {
  return {
    kind: 'announcement',
    id: '1',
    numericId: 1,
    title: 'My own announcement',
    description: '',
    status: 'posted',
    responseType: 'view-only',
    ownership: 'mine',
    recipients: [],
    toParentsOf: ['4A'],
    stats: { totalCount: 10, readCount: 7, responseCount: 4, yesCount: 0, noCount: 0 },
    postedAt: '2026-07-01T09:00:00+08:00',
    createdBy: 'Ms Tan Wei Ling',
    ...over,
  };
}

function form(over: Partial<ConsentFormPost> = {}): ConsentFormPost {
  return {
    kind: 'form',
    id: 'cf_2',
    numericId: 2,
    title: 'My own consent form',
    description: '',
    status: 'open',
    responseType: 'yes-no',
    ownership: 'mine',
    recipients: [],
    toParentsOf: ['4B'],
    stats: { totalCount: 10, yesCount: 4, noCount: 0, pendingCount: 6 },
    postedAt: '2026-07-02T09:00:00+08:00',
    createdBy: 'Ms Tan Wei Ling',
    questions: [],
    consentByDate: '2026-07-10',
    reminder: { type: 'NONE' },
    history: [],
    ...over,
  };
}

/** A post the viewer did not create — the case School Posts exists for. */
const otherTeachersForm = form({
  id: 'cf_601',
  numericId: 601,
  title: 'Parent-Teacher Meeting',
  ownership: 'shared',
  createdBy: 'Ms Koh Bee Hwa',
});

function renderPage() {
  return render(
    <MemoryRouter>
      <PostsListPage />
    </MemoryRouter>,
  );
}

/** Switch the scope switcher to School posts and wait for the reload. */
async function selectSchoolScope() {
  fireEvent.click(await screen.findByRole('button', { name: /my posts/i }));
  fireEvent.click(await screen.findByRole('button', { name: /school posts/i }));
  await waitFor(() => expect(loadSchoolConsentPostsList).toHaveBeenCalled());
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getConfigs).mockResolvedValue({ flags: {}, configs: {} });
  vi.mocked(fetchSession).mockResolvedValue({
    staffId: 1001,
    staffName: 'Ms Tan Wei Ling',
    isA: true,
  } as Awaited<ReturnType<typeof fetchSession>>);
  vi.mocked(loadPostsList).mockResolvedValue([announcement()]);
  vi.mocked(loadConsentPostsList).mockResolvedValue([form()]);
  vi.mocked(loadSchoolAnnouncementsList).mockResolvedValue([]);
  vi.mocked(loadSchoolConsentPostsList).mockResolvedValue([otherTeachersForm]);
});

// ─── Scope switching ────────────────────────────────────────────────────────

describe('PostsListPage scope switcher', () => {
  it('starts on My Posts and reads from the teacher-scoped endpoints', async () => {
    renderPage();

    expect(await screen.findByRole('heading', { level: 1 })).toHaveTextContent('My Posts');
    await waitFor(() => expect(loadPostsList).toHaveBeenCalled());
    expect(loadSchoolAnnouncementsList).not.toHaveBeenCalled();
  });

  it('hides the switcher entirely for a non-admin', async () => {
    vi.mocked(fetchSession).mockResolvedValue({
      staffId: 1001,
      staffName: 'Ms Tan Wei Ling',
      isA: false,
    } as Awaited<ReturnType<typeof fetchSession>>);
    renderPage();

    const heading = await screen.findByRole('heading', { level: 1 });
    expect(heading).toHaveTextContent('My Posts');
    expect(within(heading).queryByRole('button')).toBeNull();
  });

  it('loads the school-wide endpoints when School posts is selected', async () => {
    renderPage();
    await screen.findByRole('heading', { level: 1 });

    await selectSchoolScope();

    expect(loadSchoolAnnouncementsList).toHaveBeenCalled();
    expect(await screen.findByRole('heading', { level: 1 })).toHaveTextContent('School Posts');
  });
});

// ─── The PR's changes, in School scope ──────────────────────────────────────

describe('School Posts carries the My Posts treatment', () => {
  it('keeps the h1 and main landmark across both scopes', async () => {
    const { container } = renderPage();
    await screen.findByRole('heading', { level: 1 });
    expect(container.querySelector('main')).not.toBeNull();

    await selectSchoolScope();

    expect(container.querySelector('main')).not.toBeNull();
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('School Posts');
  });

  it('renders the phone stacked row alongside the table', async () => {
    const { container } = renderPage();
    await screen.findByRole('heading', { level: 1 });
    await selectSchoolScope();

    // The stacked list is the below-sm presentation; it is always in the DOM
    // and hidden by CSS, so its presence is what we can assert here.
    const stacked = container.querySelector('ul.sm\\:hidden');
    await waitFor(() => expect(stacked?.querySelectorAll('li').length).toBe(1));
    expect(stacked).toHaveTextContent('Parent-Teacher Meeting');
    // The creator takes the badge slot, since every school row is already sent.
    expect(stacked).toHaveTextContent('Koh Bee Hwa');
  });

  it('offers a one-click delete on a post the viewer did not create', async () => {
    renderPage();
    await screen.findByRole('heading', { level: 1 });
    await selectSchoolScope();

    const menus = await screen.findAllByRole('button', {
      name: /more actions for Parent-Teacher Meeting/i,
    });
    fireEvent.click(menus[0]);

    // Delete reaches other teachers' posts here — in My Posts it is hidden on
    // anything shared. Duplicate is not offered: this view is oversight.
    expect(await screen.findByRole('menuitem', { name: /delete/i })).toBeInTheDocument();
    expect(screen.queryByRole('menuitem', { name: /duplicate/i })).toBeNull();
  });

  it('deletes through the same single-post dialog, with no DELETE to type', async () => {
    vi.mocked(deleteAnnouncement).mockResolvedValue(undefined as never);
    renderPage();
    await screen.findByRole('heading', { level: 1 });
    await selectSchoolScope();

    const menus = await screen.findAllByRole('button', {
      name: /more actions for Parent-Teacher Meeting/i,
    });
    fireEvent.click(menus[0]);
    fireEvent.click(await screen.findByRole('menuitem', { name: /delete/i }));

    const dialog = await screen.findByRole('dialog');
    // No confirmation textbox stands between the admin and the action.
    expect(within(dialog).queryByRole('textbox')).toBeNull();
    expect(within(dialog).getByRole('button', { name: /delete for everyone/i })).toBeEnabled();
  });

  it('drops the Status column and shows the real creator', async () => {
    renderPage();
    await screen.findByRole('heading', { level: 1 });
    await selectSchoolScope();

    await waitFor(() => expect(screen.queryByRole('columnheader', { name: /status/i })).toBeNull());
    expect(screen.getByRole('columnheader', { name: /created by/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /posted on/i })).toBeInTheDocument();
    // "Me" is a My Posts label; a whole-school view names the sender.
    expect(screen.getAllByText(/Koh Bee Hwa/).length).toBeGreaterThan(0);
    expect(screen.queryByText(/^Me$/)).toBeNull();
  });
});
