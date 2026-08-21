import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { AnnouncementPost } from '~/data/posts-registry';

vi.mock('~/features/posts/api/announcements', () => ({
  cancelAnnouncementSchedule: vi.fn(),
  deleteAnnouncement: vi.fn(),
  loadPostDetail: vi.fn(),
  rescheduleAnnouncementDraft: vi.fn(),
}));

vi.mock('~/features/posts/api/consent-forms', () => ({
  cancelConsentFormSchedule: vi.fn(),
  deleteConsentForm: vi.fn(),
  loadConsentPostDetail: vi.fn(),
  rescheduleConsentFormDraft: vi.fn(),
}));

vi.mock('~/features/posts/api/school', () => ({ fetchSchoolStaff: vi.fn() }));
vi.mock('~/features/posts/api/session', () => ({ getConfigs: vi.fn(), fetchSession: vi.fn() }));

import { cancelAnnouncementSchedule, loadPostDetail } from '~/features/posts/api/announcements';
import { fetchSchoolStaff } from '~/features/posts/api/school';
import { fetchSession, getConfigs } from '~/features/posts/api/session';

import { PostDetailPage } from './PostDetailPage';

function scheduledPost(over: Partial<AnnouncementPost> = {}): AnnouncementPost {
  return {
    kind: 'announcement',
    id: '201',
    numericId: 201,
    title: 'Sports Day Information',
    description: '',
    status: 'scheduled',
    responseType: 'view-only',
    ownership: 'mine',
    recipients: [],
    stats: { totalCount: 0, readCount: 0, responseCount: 0, yesCount: 0, noCount: 0 },
    scheduledAt: '2026-06-15T09:00:00+08:00',
    createdAt: '2026-06-09T10:00:00+08:00',
    createdBy: 'Ms Tan Wei Ling',
    ...over,
  };
}

function renderDetail() {
  return render(
    <MemoryRouter initialEntries={['/announcements/201']}>
      <Routes>
        <Route path="/announcements/:id" element={<PostDetailPage postKind="announcement" />} />
      </Routes>
    </MemoryRouter>,
  );
}

/** Buttons in the header action group, which is where the post's actions live. */
function headerActions(): string[] {
  const heading = screen.getByRole('heading', { level: 1 });
  const header = heading.closest('div.flex.items-start.justify-between');
  return within(header as HTMLElement)
    .getAllByRole('button')
    .map((b) => b.textContent?.trim() ?? '')
    .filter(Boolean);
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getConfigs).mockResolvedValue({ flags: {}, configs: {} });
  vi.mocked(fetchSession).mockResolvedValue({ staffId: 1001, isA: false } as Awaited<
    ReturnType<typeof fetchSession>
  >);
  vi.mocked(fetchSchoolStaff).mockResolvedValue([]);
  vi.mocked(loadPostDetail).mockResolvedValue(scheduledPost());
});

describe('a scheduled post offers two actions', () => {
  it('offers Cancel send and Reschedule, and nothing else', async () => {
    renderDetail();
    await screen.findByRole('heading', { level: 1, name: /Sports Day Information/ });

    await waitFor(() => expect(headerActions()).toContain('Reschedule'));
    // Delete and Edit are not removed from the product — they live behind
    // Draft, which cancelling the send returns the post to.
    expect(headerActions()).toEqual(expect.arrayContaining(['Cancel send', 'Reschedule']));
    expect(headerActions()).not.toContain('Delete');
    expect(screen.queryByRole('link', { name: /^Edit$/ })).toBeNull();
  });

  it('brings Delete and Edit back once the post is a draft', async () => {
    vi.mocked(loadPostDetail).mockResolvedValue(
      scheduledPost({ status: 'draft', scheduledAt: undefined }),
    );
    renderDetail();
    await screen.findByRole('heading', { level: 1, name: /Sports Day Information/ });

    await waitFor(() => expect(headerActions()).toContain('Delete'));
    expect(headerActions()).not.toContain('Cancel send');
    expect(headerActions()).not.toContain('Reschedule');
  });

  it('confirms the cancel in an in-app dialog, not a browser confirm', async () => {
    const nativeConfirm = vi.spyOn(window, 'confirm');
    renderDetail();
    await screen.findByRole('heading', { level: 1, name: /Sports Day Information/ });
    await waitFor(() => expect(headerActions()).toContain('Cancel send'));

    fireEvent.click(screen.getByRole('button', { name: 'Cancel send' }));

    const dialog = await screen.findByRole('dialog');
    expect(nativeConfirm).not.toHaveBeenCalled();
    expect(dialog).toHaveTextContent('Cancel this send?');
    // It names the post and when it would have gone out.
    expect(dialog).toHaveTextContent('Sports Day Information');
    expect(within(dialog).getByRole('button', { name: /keep it scheduled/i })).toBeEnabled();
  });

  it('calls cancelSchedule only after the dialog is confirmed', async () => {
    vi.mocked(cancelAnnouncementSchedule).mockResolvedValue(undefined as never);
    renderDetail();
    await screen.findByRole('heading', { level: 1, name: /Sports Day Information/ });
    await waitFor(() => expect(headerActions()).toContain('Cancel send'));

    fireEvent.click(screen.getByRole('button', { name: 'Cancel send' }));
    const dialog = await screen.findByRole('dialog');
    expect(cancelAnnouncementSchedule).not.toHaveBeenCalled();

    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel send' }));
    await waitFor(() => expect(cancelAnnouncementSchedule).toHaveBeenCalledWith(201));
  });

  it('opens the schedule picker from Reschedule', async () => {
    renderDetail();
    await screen.findByRole('heading', { level: 1, name: /Sports Day Information/ });
    await waitFor(() => expect(headerActions()).toContain('Reschedule'));

    fireEvent.click(screen.getByRole('button', { name: 'Reschedule' }));

    expect(await screen.findByRole('dialog')).toHaveTextContent(/schedule post/i);
  });
});
