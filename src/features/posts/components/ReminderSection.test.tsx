import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

import type { ReminderConfig } from '~/data/posts-registry';

import { ReminderSection } from './ReminderSection';

function setup(value: ReminderConfig = { type: 'NONE' }, consentByDate?: string) {
  const onChange = vi.fn();
  render(<ReminderSection value={value} onChange={onChange} consentByDate={consentByDate} />);
  return onChange;
}

describe('ReminderSection', () => {
  describe('rendering', () => {
    it('renders None, One-time, and Daily options when due date is set', () => {
      setup({ type: 'NONE' }, '2026-07-15');
      expect(screen.getByText('None')).toBeInTheDocument();
      expect(screen.getByText('One-time')).toBeInTheDocument();
      expect(screen.getByText('Daily')).toBeInTheDocument();
    });

    it('renders the date picker trigger when type is ONE_TIME', () => {
      setup({ type: 'ONE_TIME', date: '2026-07-10' }, '2026-07-15');
      expect(screen.getByText('10 Jul 2026')).toBeInTheDocument();
    });
  });

  describe('date picker labeling', () => {
    it('shows "Pick a date" placeholder when type is NONE', () => {
      setup({ type: 'NONE' }, '2026-07-15');
      expect(screen.queryByText('Pick a date')).toBeInTheDocument();
    });

    it('shows label "Date" and formatted date when type is ONE_TIME', () => {
      setup({ type: 'ONE_TIME', date: '2026-07-10' }, '2026-07-15');
      expect(screen.getByText('Date')).toBeInTheDocument();
      expect(screen.getByText('10 Jul 2026')).toBeInTheDocument();
    });

    it('shows label "Starting" and formatted date when type is DAILY', () => {
      setup({ type: 'DAILY', date: '2026-07-10' }, '2026-07-15');
      expect(screen.getByText('Starting')).toBeInTheDocument();
      expect(screen.getByText('10 Jul 2026')).toBeInTheDocument();
    });
  });

  describe('date trigger', () => {
    it('shows formatted date on trigger when date is set', () => {
      setup({ type: 'ONE_TIME', date: '2026-07-10' }, '2026-07-15');
      expect(screen.getByText('10 Jul 2026')).toBeInTheDocument();
    });

    it('shows "Pick a date" on trigger when date is empty', () => {
      setup({ type: 'ONE_TIME', date: '' }, '2026-07-15');
      expect(screen.getByText('Pick a date')).toBeInTheDocument();
    });
  });

  describe('date out of range error', () => {
    it('shows error when date is before min (tomorrow)', () => {
      const today = new Date();
      const todayIso = today.toISOString().slice(0, 10);
      setup({ type: 'ONE_TIME', date: todayIso }, '2026-12-31');
      expect(
        screen.getByText('Reminder must fall between tomorrow and the day before the due date.'),
      ).toBeInTheDocument();
    });

    it('shows error when date equals due date', () => {
      setup({ type: 'ONE_TIME', date: '2026-07-15' }, '2026-07-15');
      expect(
        screen.getByText('Reminder must fall between tomorrow and the day before the due date.'),
      ).toBeInTheDocument();
    });

    it('does not show error when date is within valid range', () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowIso = tomorrow.toISOString().slice(0, 10);
      setup({ type: 'ONE_TIME', date: tomorrowIso }, '2026-12-31');
      expect(
        screen.queryByText('Reminder must fall between tomorrow and the day before the due date.'),
      ).not.toBeInTheDocument();
    });

    it('does not show error for NONE type even with stale date', () => {
      setup({ type: 'NONE', lastDate: '2020-01-01' }, '2026-07-15');
      expect(
        screen.queryByText('Reminder must fall between tomorrow and the day before the due date.'),
      ).not.toBeInTheDocument();
    });
  });

  describe('disabled state (no due date)', () => {
    it('shows "Set a due date first." when consentByDate is empty', () => {
      setup({ type: 'NONE' }, undefined);
      expect(screen.getByText('Set a due date first.')).toBeInTheDocument();
    });

    it('shows reminder description when consentByDate is provided', () => {
      setup({ type: 'NONE' }, '2026-07-15');
      expect(screen.getByText('Remind parents who have not yet responded.')).toBeInTheDocument();
    });

    it('does not render radio options when no consentByDate', () => {
      setup({ type: 'NONE' }, undefined);
      expect(screen.queryByText('None')).not.toBeInTheDocument();
      expect(screen.queryByText('One-time')).not.toBeInTheDocument();
    });

    it('renders radio options when consentByDate is provided', () => {
      setup({ type: 'NONE' }, '2026-07-15');
      expect(screen.getByText('None')).toBeInTheDocument();
      expect(screen.getByText('One-time')).toBeInTheDocument();
    });

    it('hides default reminder date text when disabled', () => {
      setup({ type: 'NONE' }, undefined);
      expect(screen.queryByText(/Default reminder will be sent on/)).not.toBeInTheDocument();
    });

    it('shows default reminder date when consentByDate is set', () => {
      setup({ type: 'NONE' }, '2026-07-15');
      expect(screen.getByText(/Default reminder will be sent on/)).toBeInTheDocument();
    });
  });
});
