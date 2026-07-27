import { expect, test } from '@playwright/test';

// Fixture: consentFormId 401, consentByDate '2026-06-18'.
// Recipients: 5 Yes (3001, 3004, 3005, 3008, 3010), 2 No (3002, 3007),
// 3 Pending (3003 onboarded, 3006 not-onboarded, 3009 cannot-respond).
test.use({
  timezoneId: 'Asia/Singapore',
  locale: 'en-US',
});

test.describe('consent form responses — before due date (open)', () => {
  test.beforeEach(async ({ page }) => {
    await page.clock.install({ time: new Date('2026-06-10T10:00:00+08:00') });
    await page.goto('/posts/consent-forms/401');
    await expect(
      page.getByRole('heading', { name: 'Science Museum Learning Journey', level: 1 }),
    ).toBeVisible();
  });

  test('1. response summary stats are displayed', async ({ page }) => {
    await expect(page.locator('button[aria-pressed]')).toHaveCount(4);
    await expect(page.getByRole('button', { name: /^Total/ })).toContainText('10');
    await expect(page.getByRole('button', { name: /^Yes/ })).toContainText('5');
    await expect(page.getByRole('button', { name: /^No\b/ })).toContainText('2');
    await expect(page.getByRole('button', { name: /^Pending/ })).toContainText('3');
  });

  test('2. guidance banner is shown on an open form', async ({ page }) => {
    await expect(
      page.getByText(
        'Custodians may edit their responses till the due date. Please collate the responses only after the due date.',
      ),
    ).toBeVisible();
  });

  test('3. per-student table is displayed with correct columns', async ({ page }) => {
    for (const header of [
      'Student',
      'Class',
      'Gender',
      'Response',
      'Does your child have any food allergies?',
      'Preferred lunch option',
      'Comments',
      'Last responded by',
      'Last responded on',
      'Onboarding',
    ]) {
      await expect(page.getByRole('columnheader', { name: header })).toBeVisible();
    }

    const ahmadRow = page.getByRole('row', { name: /Ahmad bin Ibrahim/ });
    await expect(ahmadRow.getByText('M', { exact: true })).toBeVisible();
    await expect(ahmadRow.getByText('Yes', { exact: true })).toBeVisible();
    await expect(ahmadRow.getByText('No allergies')).toBeVisible();
    await expect(ahmadRow.getByText('Mrs Ibrahim')).toBeVisible();
  });

  test('4. table columns are configurable, default all selected', async ({ page }) => {
    await page.getByRole('button', { name: 'Show/hide columns' }).click();
    await expect(page.getByRole('checkbox', { name: 'Gender' })).toBeChecked();
    await expect(page.getByRole('checkbox', { name: 'Comments' })).toBeChecked();

    await page.getByRole('checkbox', { name: 'Gender' }).click();
    await page.keyboard.press('Escape');

    await expect(page.getByRole('columnheader', { name: 'Gender' })).not.toBeVisible();
  });

  test('5. response table is filtered by clicking the Pending stat tile', async ({ page }) => {
    await page.getByRole('button', { name: /Pending/ }).click();

    await expect(page.getByText('Priya Nair')).toBeVisible();
    await expect(page.getByText('Siti Aminah')).toBeVisible();
    await expect(page.getByText('Muhammad Irfan')).toBeVisible();
    await expect(page.getByText('Ahmad bin Ibrahim')).not.toBeVisible();
  });

  test('6. response table is filtered by status dropdown (Cannot Respond)', async ({ page }) => {
    await page.getByRole('button', { name: 'Filter recipients' }).click();
    await page.getByRole('radio', { name: 'Cannot Respond' }).click();
    await page.keyboard.press('Escape');

    await expect(page.getByText('Muhammad Irfan')).toBeVisible();
    await expect(page.getByText('Ahmad bin Ibrahim')).not.toBeVisible();
    await expect(page.getByText('Siti Aminah')).not.toBeVisible();
  });

  test('7. response table is filtered by class', async ({ page }) => {
    await page.getByRole('button', { name: 'Filter recipients' }).click();
    await page.getByRole('radio', { name: '4A' }).click();
    await page.keyboard.press('Escape');

    await expect(page.getByText('Ahmad bin Ibrahim')).toBeVisible();
    await expect(page.getByText('Priya Nair')).not.toBeVisible();
  });

  test('8. response is edited on behalf of a parent', async ({ page }) => {
    const sitiRow = page.getByRole('row', { name: /Siti Aminah/ });
    await sitiRow.getByRole('button', { name: 'Edit Response' }).click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();

    await dialog.getByRole('radio', { name: 'Yes' }).click();
    await dialog
      .getByRole('textbox', { name: 'Does your child have any food allergies?' })
      .fill('No allergies');
    await dialog.getByRole('radio', { name: 'Nasi Lemak' }).click();
    await dialog.getByRole('textbox', { name: 'Comments' }).fill('Confirmed by phone.');
    await dialog.getByRole('button', { name: 'Update response' }).click();

    await expect(dialog).not.toBeVisible();
    const updatedRow = page.getByRole('row', { name: /Siti Aminah/ });
    await expect(updatedRow.getByText('Yes')).toBeVisible();
  });

  test('9. edit is blocked when mandatory fields are missing', async ({ page }) => {
    const sitiRow = page.getByRole('row', { name: /Siti Aminah/ });
    await sitiRow.getByRole('button', { name: 'Edit Response' }).click();

    const dialog = page.getByRole('dialog');
    await dialog.getByRole('radio', { name: 'Yes' }).click();
    // Leave both custom questions blank and attempt to save.
    await dialog.getByRole('button', { name: 'Update response' }).click();

    await expect(dialog.getByText('Answer this question before saving.').first()).toBeVisible();
    await expect(dialog).toBeVisible();
  });

  test('10a. editing is restricted for onboarded custodians before the due date', async ({
    page,
  }) => {
    const ahmadRow = page.getByRole('row', { name: /Ahmad bin Ibrahim/ });
    await expect(
      ahmadRow.getByText('Editing restricted until after due date for onboarded custodians'),
    ).toBeVisible();
    await expect(ahmadRow.getByRole('button', { name: 'Edit Response' })).not.toBeVisible();
  });

  test('11. edit response is available for non-onboarded and cannot-respond students', async ({
    page,
  }) => {
    const sitiRow = page.getByRole('row', { name: /Siti Aminah/ });
    await expect(sitiRow.getByRole('button', { name: 'Edit Response' })).toBeVisible();

    const irfanRow = page.getByRole('row', { name: /Muhammad Irfan/ });
    await expect(irfanRow.getByRole('button', { name: 'Edit Response' })).toBeVisible();
  });

  test('12. reply audit history is visible after an edit', async ({ page }) => {
    const irfanRow = page.getByRole('row', { name: /Muhammad Irfan/ });
    await irfanRow.getByRole('button', { name: 'Edit Response' }).click();

    const dialog = page.getByRole('dialog');
    await dialog.getByRole('radio', { name: 'No' }).click();
    await dialog.getByRole('button', { name: 'Update response' }).click();
    await expect(dialog).not.toBeVisible();

    // Exact match distinguishes the history entry ("Response updated") from
    // the success toast ("Response updated.").
    await expect(page.getByText('Response updated', { exact: true })).toBeVisible();
    await expect(page.getByText('Ms Tan Wei Ling')).toBeVisible();
  });
});

test.describe('consent form responses — after due date (closed)', () => {
  test.beforeEach(async ({ page }) => {
    await page.clock.install({ time: new Date('2026-06-20T10:00:00+08:00') });
    await page.goto('/posts/consent-forms/401');
    await expect(
      page.getByRole('heading', { name: 'Science Museum Learning Journey', level: 1 }),
    ).toBeVisible();
  });

  test('2b. guidance banner is absent on a closed form', async ({ page }) => {
    await expect(
      page.getByText(
        'Custodians may edit their responses till the due date. Please collate the responses only after the due date.',
      ),
    ).not.toBeVisible();
  });

  test('10b. editing is available for onboarded custodians after the due date', async ({
    page,
  }) => {
    const ahmadRow = page.getByRole('row', { name: /Ahmad bin Ibrahim/ });
    await expect(ahmadRow.getByRole('button', { name: 'Edit Response' })).toBeVisible();
    await expect(
      ahmadRow.getByText('Editing restricted until after due date for onboarded custodians'),
    ).not.toBeVisible();
  });
});
