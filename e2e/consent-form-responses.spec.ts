import { expect, test } from '@playwright/test';

import { checkA11y } from './fixtures';

// Fixture form 401: consentByDate '2026-06-18'. Freezing before/after that
// date flips its computed status between 'open' and 'closed', mirroring the
// pattern already established in reminders.spec.ts.
test.use({
  timezoneId: 'Asia/Singapore',
  locale: 'en-US',
});

test.describe('consent form responses — before due date (open)', () => {
  test.beforeEach(async ({ page }) => {
    await page.clock.install({ time: new Date('2026-06-10T10:00:00+08:00') });
    await page.goto('/posts/consent-forms/401');
    await expect(
      page.getByRole('heading', { level: 1, name: 'Science Museum Learning Journey' }),
    ).toBeVisible();
  });

  test('response summary stats show Total/Yes/No/Pending counts', async ({ page }) => {
    await expect(page.getByRole('button').filter({ hasText: 'Total' })).toContainText('10');
    await expect(page.getByRole('button').filter({ hasText: 'Yes' })).toContainText('5');
    await expect(page.getByRole('button').filter({ hasText: 'No' })).toContainText('2');
    await expect(page.getByRole('button').filter({ hasText: 'Pending' })).toContainText('3');
  });

  test('guidance banner is shown for an open form', async ({ page }) => {
    await expect(
      page.getByText(
        'Custodians may edit their responses till the due date. Please collate the responses only after the due date.',
      ),
    ).toBeVisible();
  });

  test('per-student table shows the required columns', async ({ page }) => {
    await expect(page.getByRole('columnheader', { name: 'Student' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Class' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Gender' })).toBeVisible();
    await expect(
      page.getByRole('columnheader', { name: 'Does your child have any food allergies?' }),
    ).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Comments' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Last responded on' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Last responded by' })).toBeVisible();

    const row = page.getByRole('row').filter({ hasText: 'Chen Wei Jie' });
    await expect(row.getByText('M', { exact: true })).toBeVisible();
    await expect(row.getByText('Family event on that day')).toBeVisible();
  });

  test('Show Columns toggles a column off', async ({ page }) => {
    await expect(page.getByRole('columnheader', { name: 'Gender' })).toBeVisible();
    await page.getByRole('button', { name: 'Show/hide columns' }).click();
    await page.getByRole('checkbox', { name: 'Gender' }).click();
    await expect(page.getByRole('columnheader', { name: 'Gender' })).not.toBeVisible();
  });

  test('clicking the Pending stat tile filters the table', async ({ page }) => {
    await page.getByRole('button').filter({ hasText: 'Pending' }).click();
    await expect(page.getByRole('row').filter({ hasText: 'Priya Nair' })).toBeVisible();
    await expect(page.getByRole('row').filter({ hasText: 'Ahmad bin Ibrahim' })).not.toBeVisible();
  });

  test('Status dropdown filters to Cannot Respond', async ({ page }) => {
    await page.getByRole('button', { name: 'Filter recipients' }).click();
    await page.getByRole('radio', { name: 'Cannot Respond' }).click();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('row').filter({ hasText: 'Muhammad Irfan' })).toBeVisible();
    await expect(page.getByRole('row').filter({ hasText: 'Ahmad bin Ibrahim' })).not.toBeVisible();
  });

  test('Class dropdown filters the table', async ({ page }) => {
    await page.getByRole('button', { name: 'Filter recipients' }).click();
    await page.getByRole('radio', { name: '4B', exact: true }).click();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('row').filter({ hasText: 'Priya Nair' })).toBeVisible();
    await expect(page.getByRole('row').filter({ hasText: 'Ahmad bin Ibrahim' })).not.toBeVisible();
  });

  test('editing is restricted for an onboarded custodian before the due date', async ({ page }) => {
    const row = page.getByRole('row').filter({ hasText: 'Ahmad bin Ibrahim' });
    await expect(
      row.getByText('Editing restricted until after due date for onboarded custodians'),
    ).toBeVisible();
    await expect(row.getByRole('button', { name: 'Edit Response' })).not.toBeVisible();
  });

  test('Edit Response is available for not-onboarded and cannot-respond students', async ({
    page,
  }) => {
    await expect(
      page
        .getByRole('row')
        .filter({ hasText: 'Siti Aminah' })
        .getByRole('button', { name: 'Edit Response' }),
    ).toBeVisible();
    await expect(
      page
        .getByRole('row')
        .filter({ hasText: 'Muhammad Irfan' })
        .getByRole('button', { name: 'Edit Response' }),
    ).toBeVisible();
  });

  test('edits a response on behalf of a parent and records it in history', async ({ page }) => {
    await page
      .getByRole('row')
      .filter({ hasText: 'Siti Aminah' })
      .getByRole('button', { name: 'Edit Response' })
      .click();

    const dialog = page.getByRole('dialog');
    await expect(
      dialog.getByRole('heading', { name: 'Edit response — Siti Aminah' }),
    ).toBeVisible();
    await checkA11y(page, '[role="dialog"]');

    await dialog.getByRole('radio', { name: 'Yes' }).click();
    await dialog.getByLabel(/Does your child have any food allergies/).fill('No allergies');
    await dialog.getByRole('radio', { name: 'Nasi Lemak' }).click();
    await dialog.getByLabel('Comments').fill('Confirmed by phone.');
    await dialog.getByRole('button', { name: 'Update response' }).click();

    await expect(dialog).not.toBeVisible();
    const row = page.getByRole('row').filter({ hasText: 'Siti Aminah' });
    await expect(row.getByText('Yes', { exact: true })).toBeVisible();
    await expect(page.getByText('Response updated', { exact: true })).toBeVisible();
  });

  test('blocks saving a Yes response with missing mandatory answers', async ({ page }) => {
    await page
      .getByRole('row')
      .filter({ hasText: 'Muhammad Irfan' })
      .getByRole('button', { name: 'Edit Response' })
      .click();

    const dialog = page.getByRole('dialog');
    await dialog.getByRole('radio', { name: 'Yes' }).click();
    await dialog.getByRole('button', { name: 'Update response' }).click();

    await expect(dialog.getByRole('alert').first()).toHaveText(
      'Answer this question before saving.',
    );
    await expect(dialog).toBeVisible();
  });
});

test.describe('consent form responses — after due date (closed)', () => {
  test.beforeEach(async ({ page }) => {
    await page.clock.install({ time: new Date('2026-06-20T10:00:00+08:00') });
    await page.goto('/posts/consent-forms/401');
    await expect(
      page.getByRole('heading', { level: 1, name: 'Science Museum Learning Journey' }),
    ).toBeVisible();
  });

  test('guidance banner is not shown once the form has closed', async ({ page }) => {
    await expect(
      page.getByText('Custodians may edit their responses till the due date.'),
    ).not.toBeVisible();
  });

  test('editing becomes available for onboarded custodians after the due date', async ({
    page,
  }) => {
    const row = page.getByRole('row').filter({ hasText: 'Ahmad bin Ibrahim' });
    await expect(row.getByRole('button', { name: 'Edit Response' })).toBeVisible();
    await expect(
      row.getByText('Editing restricted until after due date for onboarded custodians'),
    ).not.toBeVisible();
  });
});
