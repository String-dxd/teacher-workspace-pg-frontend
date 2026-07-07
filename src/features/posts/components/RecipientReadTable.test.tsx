import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { Recipient } from '~/data/posts-registry';

vi.mock('~/helpers/exportXlsx', () => ({
  downloadXlsx: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('~/hooks/useIsMobile', () => ({
  useIsMobile: vi.fn(() => false),
}));

import { downloadXlsx } from '~/helpers/exportXlsx';
import { useIsMobile } from '~/hooks/useIsMobile';

import { RecipientReadTable } from './RecipientReadTable';

const RECIPIENTS: Recipient[] = [
  {
    studentId: 's1',
    studentName: 'Alice Tan',
    classLabel: '3A',
    readStatus: 'read',
    respondedAt: '2026-07-01T10:00:00Z',
    replyByParent: 'Mrs Tan',
  },
  {
    studentId: 's2',
    studentName: 'Bob Lee',
    classLabel: '3B',
    readStatus: 'unread',
    replyByParent: undefined,
  },
];

describe('RecipientReadTable export', () => {
  it('calls downloadXlsx with .xlsx filename when Export is clicked', async () => {
    render(
      <RecipientReadTable recipients={RECIPIENTS} responseType="view-only" exportId="ann-42" />,
    );

    const exportBtn = screen.getByRole('button', { name: 'Export to Excel' });
    fireEvent.click(exportBtn);
    await vi.waitFor(() => expect(downloadXlsx).toHaveBeenCalled());

    expect(downloadXlsx).toHaveBeenCalledTimes(1);
    const [filename, input] = (downloadXlsx as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(filename).toMatch(/^recipients-ann-42-\d{4}-\d{2}-\d{2}\.xlsx$/);
    expect(input.rows).toHaveLength(2);
    expect(input.columns[0].header).toBe('Student');
  });

  it('disables Export button on mobile', () => {
    vi.mocked(useIsMobile).mockReturnValue(true);
    render(
      <RecipientReadTable recipients={RECIPIENTS} responseType="view-only" exportId="ann-42" />,
    );

    const exportBtn = screen.getByRole('button', { name: 'Export to Excel' });
    expect(exportBtn).toBeDisabled();

    vi.mocked(useIsMobile).mockReturnValue(false);
  });

  it('shows "Not supported on mobile" tooltip when disabled', () => {
    vi.mocked(useIsMobile).mockReturnValue(true);
    render(
      <RecipientReadTable recipients={RECIPIENTS} responseType="view-only" exportId="ann-42" />,
    );

    const exportBtn = screen.getByRole('button', { name: 'Export to Excel' });
    expect(exportBtn).toHaveAttribute('title', 'Not supported on mobile');

    vi.mocked(useIsMobile).mockReturnValue(false);
  });
});
