import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ConsentFormRecipient, Recipient } from '~/data/posts-registry';

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

beforeEach(() => {
  vi.clearAllMocks();
});

const QUESTIONS = [
  { id: '1', text: 'Does your child have any food allergies?' },
  { id: '2', text: 'Preferred lunch option' },
];

const FORM_RECIPIENTS: ConsentFormRecipient[] = [
  {
    studentId: 'f1',
    studentName: 'Alice Tan',
    classLabel: '3A',
    response: 'YES',
    respondedAt: '2026-07-01T10:00:00Z',
    replyByParent: 'Mrs Tan',
    pgStatus: 'onboarded',
    questionAnswers: { '1': 'No allergies', '2': 'Chicken Rice' },
  },
  {
    studentId: 'f2',
    studentName: 'Bob Lee',
    classLabel: '3B',
    response: null,
    respondedAt: null,
    replyByParent: null,
    pgStatus: 'not-onboarded',
    questionAnswers: {},
  },
];

function renderFormTable() {
  return render(
    <RecipientReadTable
      kind="form"
      recipients={FORM_RECIPIENTS}
      responseType="yes-no"
      exportId="cf-1"
      questions={QUESTIONS}
    />,
  );
}

describe('RecipientReadTable custom-question columns', () => {
  it('renders one column per question with each recipient answer', () => {
    renderFormTable();

    for (const q of QUESTIONS) {
      expect(screen.getByRole('columnheader', { name: q.text })).toBeInTheDocument();
    }

    const aliceRow = screen.getByText('Alice Tan').closest('tr')!;
    expect(within(aliceRow).getByText('No allergies')).toBeInTheDocument();
    expect(within(aliceRow).getByText('Chicken Rice')).toBeInTheDocument();
  });

  it('renders a dash for a recipient without an answer', () => {
    renderFormTable();

    const bobRow = screen.getByText('Bob Lee').closest('tr')!;
    expect(within(bobRow).queryByText('No allergies')).toBeNull();
    // Two question cells plus the timestamp and parent/guardian cells fall back to a dash.
    expect(within(bobRow).getAllByText('—').length).toBeGreaterThanOrEqual(2);
  });

  it('hides a question column when unchecked in the column popover', async () => {
    renderFormTable();

    fireEvent.click(screen.getByRole('button', { name: 'Show/hide columns' }));
    // The option is a wrapping <label> holding the checkbox and a nested <label> with the text.
    const optionText = await screen.findByText('Preferred lunch option', { selector: 'label' });
    fireEvent.click(within(optionText.parentElement!).getByRole('checkbox'));

    expect(screen.queryByRole('columnheader', { name: 'Preferred lunch option' })).toBeNull();
    expect(
      screen.getByRole('columnheader', { name: 'Does your child have any food allergies?' }),
    ).toBeInTheDocument();
  });

  it('exports question columns after the Status column with answer values', async () => {
    renderFormTable();

    fireEvent.click(screen.getByRole('button', { name: 'Export to Excel' }));
    await vi.waitFor(() => expect(downloadXlsx).toHaveBeenCalled());

    const [, input] = (downloadXlsx as ReturnType<typeof vi.fn>).mock.calls[0];
    const headers = input.columns.map((c: { header: string }) => c.header);
    const statusIndex = headers.indexOf('Status');
    expect(headers.slice(statusIndex + 1, statusIndex + 3)).toEqual([
      'Does your child have any food allergies?',
      'Preferred lunch option',
    ]);
    // Pending recipients sort first, so Bob (unanswered) precedes Alice.
    expect(input.rows[0].question_1).toBe('');
    expect(input.rows[0].question_2).toBe('');
    expect(input.rows[1].question_1).toBe('No allergies');
    expect(input.rows[1].question_2).toBe('Chicken Rice');
  });

  it('excludes a question column hidden via the popover from the export', async () => {
    renderFormTable();

    fireEvent.click(screen.getByRole('button', { name: 'Show/hide columns' }));
    const optionText = await screen.findByText('Preferred lunch option', { selector: 'label' });
    fireEvent.click(within(optionText.parentElement!).getByRole('checkbox'));

    fireEvent.click(screen.getByRole('button', { name: 'Export to Excel' }));
    await vi.waitFor(() => expect(downloadXlsx).toHaveBeenCalled());

    const [, input] = (downloadXlsx as ReturnType<typeof vi.fn>).mock.calls[0];
    const headers = input.columns.map((c: { header: string }) => c.header);
    expect(headers).toContain('Does your child have any food allergies?');
    expect(headers).not.toContain('Preferred lunch option');
  });
});

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
