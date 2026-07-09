import { expect, test } from '@playwright/test';

test.describe('posts dashboard', () => {
  test('renders posts list with MSW fixture data', async ({ page }) => {
    await page.goto('/posts');

    await expect(page.getByRole('heading', { name: 'Posts' })).toBeVisible();

    // Default tab is "With responses", which lists the consent-form fixtures.
    await expect(page.getByText('Science Museum Learning Journey')).toBeVisible();

    // Announcements live under the "View only" tab.
    await page.getByRole('tab', { name: 'View only' }).click();
    await expect(page.getByText('End-of-Year Concert Reminder')).toBeVisible();
  });
});
