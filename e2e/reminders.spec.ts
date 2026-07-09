import { expect, test } from '@playwright/test';

// Freeze time to June 10, 2026 so all fixture dates are in the future.
// Draft fixture: consentByDate '2026-07-01', reminderDate '2026-06-30'
// Posted fixture: consentByDate '2026-06-18', reminderDate '2026-06-16'
test.use({
  timezoneId: 'Asia/Singapore',
});

test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: new Date('2026-06-10T10:00:00+08:00') });
});

test.describe('reminders — consent form draft edit', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/posts/consent-forms/drafts/501/edit');
    await expect(page.getByRole('heading', { name: 'Edit Post' })).toBeVisible();
    await expect(page.getByText('Remind parents who have not yet responded.')).toBeVisible();
  });

  test('displays all three reminder radio options', async ({ page }) => {
    await expect(page.getByRole('radio', { name: 'None' })).toBeVisible();
    await expect(page.getByRole('radio', { name: 'One-time' })).toBeVisible();
    await expect(page.getByRole('radio', { name: 'Daily' })).toBeVisible();
  });

  test('ONE_TIME is pre-selected from fixture with correct date', async ({ page }) => {
    const oneTimeRadio = page.getByRole('radio', { name: 'One-time' });
    await expect(oneTimeRadio).toBeChecked();

    // Fixture reminderDate: '2026-06-30' displayed as "30 Jun 2026".
    await expect(page.getByRole('button', { name: '30 Jun 2026' })).toBeVisible();

    await expect(page).toHaveScreenshot('draft-edit-one-time.png', { fullPage: true });
  });

  test('shows default reminder date matching the due date', async ({ page }) => {
    // Fixture consentByDate: '2026-07-01' displayed as "1 Jul 2026".
    await expect(page.getByText('Default reminder will be sent on 1 Jul 2026')).toBeVisible();
  });

  test('switching to Daily shows "Starting" label with same date', async ({ page }) => {
    const dailyRadio = page.getByRole('radio', { name: 'Daily' });
    await dailyRadio.click();
    await expect(dailyRadio).toBeChecked();

    await expect(page.getByText('Starting')).toBeVisible();
    // The date carries over from the ONE_TIME fixture value.
    await expect(page.getByRole('button', { name: '30 Jun 2026' })).toBeVisible();

    await expect(page).toHaveScreenshot('draft-edit-daily.png', { fullPage: true });
  });

  test('switching to None hides the date picker', async ({ page }) => {
    // Verify picker is visible first (ONE_TIME is pre-selected).
    await expect(page.getByRole('button', { name: '30 Jun 2026' })).toBeVisible();

    const noneRadio = page.getByRole('radio', { name: 'None' });
    await noneRadio.click();
    await expect(noneRadio).toBeChecked();

    await expect(page.getByText('Starting')).toBeHidden();

    await expect(page).toHaveScreenshot('draft-edit-none.png', { fullPage: true });
  });
});

test.describe('reminders — create new consent form', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/posts/new');
    await page.getByText('With responses').click();
    await expect(page.getByRole('heading', { name: 'New Post' })).toBeVisible();
  });

  test('reminder section is disabled when no due date is set', async ({ page }) => {
    await expect(page.getByText('Set a due date first.')).toBeVisible();
    await expect(page.getByRole('radio', { name: 'None' })).not.toBeVisible();
    await expect(page.getByRole('radio', { name: 'One-time' })).not.toBeVisible();
    await expect(page.getByRole('radio', { name: 'Daily' })).not.toBeVisible();

    await expect(page).toHaveScreenshot('create-new-disabled.png', { fullPage: true });
  });

  test('reminder enables and defaults to None after setting due date', async ({ page }) => {
    // Pick a due date (Jun 25) via the Due Date calendar.
    const dueDateHelper = page.getByText('The latest date by which parents must respond.');
    const dueDateContainer = dueDateHelper.locator('..');
    const dueDateTrigger = dueDateContainer.locator('button', { hasText: 'Pick a date' });
    await dueDateTrigger.click();

    const calendar = page.getByRole('grid', { name: 'Date picker' });
    await expect(calendar).toBeVisible();
    // With clock frozen at Jun 10, day 25 is selectable in the current month.
    await calendar.getByRole('button', { name: /\/25\// }).click();
    await page.keyboard.press('Escape');

    // Reminder section should now be active with None selected.
    await expect(page.getByText('Remind parents who have not yet responded.')).toBeVisible();
    const noneRadio = page.getByRole('radio', { name: 'None' });
    await expect(noneRadio).toBeChecked();

    // Default reminder shows the due date.
    await expect(page.getByText('Default reminder will be sent on 25 Jun 2026')).toBeVisible();

    await expect(page).toHaveScreenshot('create-new-enabled.png', { fullPage: true });
  });
});

test.describe('reminders — view-only posts have no reminders', () => {
  test('reminder section does not appear for view-only announcements', async ({ page }) => {
    await page.goto('/posts/new');
    await page.getByText('View only').click();
    await expect(page.getByRole('heading', { name: 'New Post' })).toBeVisible();

    // The "Due Date & Reminder" card should not exist for view-only posts.
    await expect(page.getByText('Due Date & Reminder')).not.toBeVisible();
    await expect(page.getByText('Remind parents who have not yet responded.')).not.toBeVisible();
    await expect(page.getByText('Set a due date first.')).not.toBeVisible();
  });

  test('reminder section does not appear when editing an announcement draft', async ({ page }) => {
    await page.goto('/posts/announcements/drafts/301/edit');
    await expect(page.getByRole('heading', { name: 'Edit Post' })).toBeVisible();

    await expect(page.getByText('Due Date & Reminder')).not.toBeVisible();
    await expect(page.getByText('Remind parents who have not yet responded.')).not.toBeVisible();
  });
});

test.describe('reminders — posted consent form edit', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/posts/consent-forms/401/edit');
    await expect(page.getByRole('heading', { name: 'Edit Post' })).toBeVisible();
  });

  test('shows posted-edit banner mentioning Reminder can be changed', async ({ page }) => {
    await expect(
      page.getByText(
        /Only.*Staff-in-charge.*Enquiry email.*Due date.*and.*Reminder.*can be changed/,
      ),
    ).toBeVisible();
  });

  test('ONE_TIME is pre-selected with correct reminder date', async ({ page }) => {
    // Posted fixture: addReminderType 'ONE_TIME', reminderDate '2026-06-16'.
    await expect(page.getByText('Remind parents who have not yet responded.')).toBeVisible();
    const oneTimeRadio = page.getByRole('radio', { name: 'One-time' });
    await expect(oneTimeRadio).toBeChecked();
    await expect(page.getByRole('button', { name: '16 Jun 2026' })).toBeVisible();

    await expect(page).toHaveScreenshot('posted-edit-one-time.png', { fullPage: true });
  });

  test('shows default reminder matching the posted due date', async ({ page }) => {
    // Posted fixture: consentByDate '2026-06-18' displayed as "18 Jun 2026".
    await expect(page.getByText('Default reminder will be sent on 18 Jun 2026')).toBeVisible();
  });
});
