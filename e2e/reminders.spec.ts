import { expect, test } from '@playwright/test';

// Freeze time to June 10, 2026 so all fixture dates are in the future.
// Draft fixture: consentByDate '2026-07-01', reminderDate '2026-06-30'
// Posted fixture: consentByDate '2026-06-18', reminderDate '2026-06-16'
test.use({
  timezoneId: 'Asia/Singapore',
  locale: 'en-US',
});

test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: new Date('2026-06-10T10:00:00+08:00') });
});

test.describe('reminders — consent form draft edit', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/posts/consent-forms/drafts/501/edit');
    await expect(page.getByRole('heading', { name: 'Edit Post' })).toBeVisible();
    await expect(page.getByText('Send more reminders to parents')).toBeVisible();
  });

  test('displays all three reminder radio options', async ({ page }) => {
    await expect(page.getByRole('radio', { name: 'None' })).toBeVisible();
    await expect(page.getByRole('radio', { name: 'One time' })).toBeVisible();
    await expect(page.getByRole('radio', { name: 'Daily' })).toBeVisible();
  });

  test('ONE_TIME is pre-selected from fixture with correct date', async ({ page }) => {
    const oneTimeRadio = page.getByRole('radio', { name: 'One time' });
    await expect(oneTimeRadio).toBeChecked();

    // Fixture reminderDate: '2026-06-30' displayed as "30 Jun 2026".
    await expect(page.getByRole('button', { name: '30 Jun 2026' })).toBeVisible();

    await expect(page).toHaveScreenshot('draft-edit-one-time.png', { fullPage: true });
  });

  test('shows default reminder date matching the due date', async ({ page }) => {
    // The default-reminder line now lives in the Due Date section:
    // "We'll send a default reminder on <due date>." Fixture consentByDate
    // '2026-07-01' displays as "1 Jul 2026". Scope to that paragraph — the
    // date also appears in the due-date trigger button and the preview pane.
    await expect(page.getByText(/We’ll send a default reminder on\s*1 Jul 2026/)).toBeVisible();
  });

  test('switching to Daily shows "From" label with same date', async ({ page }) => {
    const dailyRadio = page.getByRole('radio', { name: 'Daily' });
    await dailyRadio.click();
    await expect(dailyRadio).toBeChecked();

    // The reminder picker's label flips to "From" for daily reminders.
    await expect(page.getByText('From', { exact: true })).toBeVisible();
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

    // The reminder picker (and its "On" label) disappears on None.
    await expect(page.getByRole('button', { name: '30 Jun 2026' })).toBeHidden();

    await expect(page).toHaveScreenshot('draft-edit-none.png', { fullPage: true });
  });
});

test.describe('reminders — create new consent form', () => {
  test.beforeEach(async ({ page }) => {
    // /posts/new now opens on the PostTypePicker gate; choosing
    // "Response Required" reveals the form (and pre-selects the Acknowledge
    // response type, which renders the Settings card with due date + reminder).
    await page.goto('/posts/new');
    await page.getByRole('button', { name: /Response Required/ }).click();
    await expect(page.getByRole('heading', { name: 'New Post' })).toBeVisible();
  });

  test('reminder section is disabled when no due date is set', async ({ page }) => {
    await expect(page.getByText('Set a due date first.')).toBeVisible();
    await expect(page.getByRole('radio', { name: 'None' })).not.toBeVisible();
    await expect(page.getByRole('radio', { name: 'One time' })).not.toBeVisible();
    await expect(page.getByRole('radio', { name: 'Daily' })).not.toBeVisible();

    await expect(page).toHaveScreenshot('create-new-disabled.png', { fullPage: true });
  });

  test('reminder enables and defaults to None after setting due date', async ({ page }) => {
    // Pick a due date (Jun 25) via the "Respond by" calendar. Scope to the
    // Settings card's due-date trigger — the Content card also has date pickers.
    const dueDateSection = page.getByText('Respond by', { exact: false }).locator('..');
    const dueDateTrigger = dueDateSection.getByRole('button', { name: 'Pick a date' });
    await dueDateTrigger.click();

    const calendar = page.getByRole('grid', { name: 'Date picker' });
    await expect(calendar).toBeVisible();
    // With clock frozen at Jun 10, day 25 is selectable in the current month.
    await calendar.getByRole('button', { name: /\/25\// }).click();
    await page.keyboard.press('Escape');

    // Reminder section should now be active with None selected.
    await expect(page.getByText('Send more reminders to parents')).toBeVisible();
    const noneRadio = page.getByRole('radio', { name: 'None' });
    await expect(noneRadio).toBeChecked();

    // The default-reminder line (in the Due Date section) shows the due date.
    await expect(page.getByText(/We’ll send a default reminder on\s*25 Jun 2026/)).toBeVisible();

    await expect(page).toHaveScreenshot('create-new-enabled.png', { fullPage: true });
  });
});

test.describe('reminders — view-only posts have no reminders', () => {
  test('reminder section does not appear for view-only announcements', async ({ page }) => {
    await page.goto('/posts/new');
    await page.getByRole('button', { name: /Read Only/ }).click();
    await expect(page.getByRole('heading', { name: 'New Post' })).toBeVisible();

    // The Settings card (due date + reminder) should not exist for view-only posts.
    await expect(page.getByText('Send more reminders to parents')).not.toBeVisible();
    await expect(page.getByText('Set a due date first.')).not.toBeVisible();
    await expect(page.getByText('Respond by')).not.toBeVisible();
  });

  test('reminder section does not appear when editing an announcement draft', async ({ page }) => {
    await page.goto('/posts/announcements/drafts/301/edit');
    await expect(page.getByRole('heading', { name: 'Edit Post' })).toBeVisible();

    await expect(page.getByText('Send more reminders to parents')).not.toBeVisible();
    await expect(page.getByText('Respond by')).not.toBeVisible();
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
    await expect(page.getByText('Send more reminders to parents')).toBeVisible();
    const oneTimeRadio = page.getByRole('radio', { name: 'One time' });
    await expect(oneTimeRadio).toBeChecked();
    await expect(page.getByRole('button', { name: '16 Jun 2026' })).toBeVisible();

    await expect(page).toHaveScreenshot('posted-edit-one-time.png', { fullPage: true });
  });

  test('shows default reminder matching the posted due date', async ({ page }) => {
    // Posted fixture: consentByDate '2026-06-18' displayed as "18 Jun 2026".
    await expect(page.getByText(/We’ll send a default reminder on\s*18 Jun 2026/)).toBeVisible();
  });
});
