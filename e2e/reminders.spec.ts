import { expect, test } from '@playwright/test';

/**
 * Pick a future due date via the Due Date calendar popover.
 * The page may have multiple "Pick a date" buttons (Event Start/End, Due Date).
 * The Due Date picker lives inside the "Due Date & Reminder" card, so we scope to it.
 */
async function pickFutureDueDate(page: import('@playwright/test').Page) {
  // The DueDateSection has unique helper text. Find the section containing it,
  // then click its "Pick a date" button (avoids hitting Event date pickers).
  const dueDateHelper = page.getByText('The latest date by which parents must respond.');
  const dueDateContainer = dueDateHelper.locator('..');
  const dueDateTrigger = dueDateContainer.locator('button', { hasText: 'Pick a date' });
  await dueDateTrigger.click();

  const calendar = page.getByRole('grid', { name: 'Date picker' });
  await expect(calendar).toBeVisible();

  // Go to next month to guarantee all days are selectable.
  await calendar.getByRole('button', { name: 'Next month' }).click();

  // Click day 15. The aria-label is from toLocaleDateString(), e.g. "8/15/2026".
  await calendar.getByRole('button', { name: /\/15\// }).click();

  // Close the popover by pressing Escape.
  await page.keyboard.press('Escape');
}

test.describe('reminders — consent form draft edit', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/posts/consent-forms/drafts/501/edit');
    await expect(page.getByRole('heading', { name: 'Edit Post' })).toBeVisible();

    // The fixture consentByDate is in the past, so the page clears it.
    // We need to pick a future due date to enable the reminder section.
    await pickFutureDueDate(page);
    await expect(page.getByText('Remind parents who have not yet responded.')).toBeVisible();
  });

  test('displays reminder section with radios after setting due date', async ({ page }) => {
    // After setting a due date, the reminder section shows radio options.
    await expect(page.getByRole('radio', { name: 'None' })).toBeVisible();
    await expect(page.getByRole('radio', { name: 'One-time' })).toBeVisible();
    await expect(page.getByRole('radio', { name: 'Daily' })).toBeVisible();
  });

  test('ONE_TIME is pre-selected from fixture and shows date trigger', async ({ page }) => {
    // The fixture has addReminderType: 'ONE_TIME' with reminderDate: '2026-06-30'.
    const oneTimeRadio = page.getByRole('radio', { name: 'One-time' });
    await expect(oneTimeRadio).toBeChecked();

    // The date trigger button shows the pre-filled date.
    await expect(page.getByRole('button', { name: '30 Jun 2026' })).toBeVisible();
  });

  test('can switch reminder type to Daily', async ({ page }) => {
    const dailyRadio = page.getByRole('radio', { name: 'Daily' });
    await dailyRadio.click();
    await expect(dailyRadio).toBeChecked();

    // Label changes to "Starting" when in Daily mode.
    await expect(page.getByText('Starting')).toBeVisible();
  });

  test('can switch reminder type to None and date picker hides', async ({ page }) => {
    // Select Daily so "Starting" label appears.
    await page.getByRole('radio', { name: 'Daily' }).click();
    await expect(page.getByText('Starting')).toBeVisible();

    // Now switch to None.
    const noneRadio = page.getByRole('radio', { name: 'None' });
    await noneRadio.click();
    await expect(noneRadio).toBeChecked();

    // "Starting" label should be hidden when None is selected.
    await expect(page.getByText('Starting')).toBeHidden();
  });

  test('shows default reminder info tied to consent-by date', async ({ page }) => {
    await expect(page.getByText(/Default reminder will be sent on/)).toBeVisible();
  });
});

test.describe('reminders — create new consent form', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/posts/new');
    await page.getByText('With responses').click();
    await expect(page.getByRole('heading', { name: 'New Post' })).toBeVisible();
  });

  test('reminder section shows disabled state when no due date is set', async ({ page }) => {
    await expect(page.getByText('Set a due date first.')).toBeVisible();
  });

  test('reminder radios are not visible without a due date', async ({ page }) => {
    await expect(page.getByRole('radio', { name: 'None' })).not.toBeVisible();
    await expect(page.getByRole('radio', { name: 'One-time' })).not.toBeVisible();
    await expect(page.getByRole('radio', { name: 'Daily' })).not.toBeVisible();
  });

  test('reminder section enables after picking a due date', async ({ page }) => {
    await pickFutureDueDate(page);

    // Reminder section should now be active.
    await expect(page.getByText('Remind parents who have not yet responded.')).toBeVisible();
    await expect(page.getByRole('radio', { name: 'None' })).toBeVisible();
    await expect(page.getByRole('radio', { name: 'One-time' })).toBeVisible();
    await expect(page.getByRole('radio', { name: 'Daily' })).toBeVisible();
  });

  test('reminder defaults to None at creation', async ({ page }) => {
    await pickFutureDueDate(page);

    // After setting a due date, the default selection should be None.
    const noneRadio = page.getByRole('radio', { name: 'None' });
    await expect(noneRadio).toBeChecked();
  });

  test('default reminder date is auto-computed from due date', async ({ page }) => {
    await pickFutureDueDate(page);

    // The "Default reminder will be sent on [date]" line should appear,
    // auto-computed from the due date (not directly editable).
    await expect(page.getByText(/Default reminder will be sent on/)).toBeVisible();
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

  test('reminder enables after setting a future due date', async ({ page }) => {
    // The fixture consentByDate (Jun 18) is past, so due date is cleared.
    await pickFutureDueDate(page);

    await expect(page.getByText('Remind parents who have not yet responded.')).toBeVisible();
    await expect(page.getByRole('radio', { name: 'None' })).toBeVisible();
    await expect(page.getByRole('radio', { name: 'One-time' })).toBeVisible();
    await expect(page.getByRole('radio', { name: 'Daily' })).toBeVisible();
  });
});
