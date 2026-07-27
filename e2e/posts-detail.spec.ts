import { expect, test } from '@playwright/test';

test.describe('post tracking', () => {
  test('shows announcement read metrics and recipient states', async ({ page }) => {
    await page.goto('/posts/announcements/101');

    await expect(page.locator('h1', { hasText: 'End-of-Year Concert Reminder' })).toBeVisible();
    await expect(page.getByText('Read by parents')).toBeVisible();
    await expect(page.getByLabel('Read by parents progress')).toBeVisible();
    await expect(page.getByText('5 unread')).toBeVisible();

    const statusTable = page.getByText('Status', { exact: true }).locator('..');
    const ahmad = statusTable.getByRole('row', { name: /Ahmad bin Ibrahim/ });
    const raj = statusTable.getByRole('row', { name: /Raj Kumar/ });
    await expect(ahmad.getByText('Read', { exact: true })).toBeVisible();
    await expect(raj.getByText('Unread', { exact: true })).toBeVisible();
  });

  test('shows consent response metrics and individual replies', async ({ page }) => {
    await page.goto('/posts/consent-forms/401');

    await expect(page.locator('h1', { hasText: 'Science Museum Learning Journey' })).toBeVisible();
    await expect(page.getByText('Post responses')).toBeVisible();
    await expect(page.getByLabel('Post responses progress')).toBeVisible();
    await expect(page.getByText('3 pending')).toBeVisible();

    const statusTable = page.getByText('Status', { exact: true }).locator('..');
    const ahmad = statusTable.getByRole('row', { name: /Ahmad bin Ibrahim/ });
    const chen = statusTable.getByRole('row', { name: /Chen Wei Jie/ });
    const priya = statusTable.getByRole('row', { name: /Priya Nair/ });
    await expect(ahmad.getByText('Yes', { exact: true })).toBeVisible();
    await expect(chen.getByText('No', { exact: true })).toBeVisible();
    await expect(priya.getByText('No Response', { exact: true })).toBeVisible();
  });
});
