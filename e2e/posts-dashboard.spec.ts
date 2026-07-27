import { expect, test } from '@playwright/test';

test.describe('posts dashboard', () => {
  test('renders posts list with MSW fixture data', async ({ page }) => {
    await page.goto('/posts');

    await expect(page.getByRole('button', { name: 'My Posts' })).toBeVisible();

    // The response-required tab is active by default and lists consent forms.
    await expect(page.getByRole('tab', { name: 'Response Required' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    await expect(page.getByText('Science Museum Learning Journey')).toBeVisible();

    // Announcements live under the read-only tab.
    await page.getByRole('tab', { name: 'Read Only' }).click();
    await expect(page.getByText('End-of-Year Concert Reminder')).toBeVisible();
  });

  test('filters the active tab by search text', async ({ page }) => {
    await page.goto('/posts');
    await expect(page.getByText('Science Museum Learning Journey')).toBeVisible();

    await page.getByRole('textbox', { name: 'Search posts' }).fill('Swimming');

    await expect(page.getByText('Swimming Lessons Term 3')).toBeVisible();
    await expect(page.getByText('Science Museum Learning Journey')).toBeHidden();
  });

  test('filters the active tab by post status', async ({ page }) => {
    await page.goto('/posts');
    await expect(page.getByText('Science Museum Learning Journey')).toBeVisible();

    await page.getByRole('button', { name: 'Filter posts' }).click();
    await page.getByRole('button', { name: 'Draft', exact: true }).click();

    await expect(page.getByText('Photography Club Outdoor Shoot')).toBeVisible();
    await expect(page.getByText('Science Museum Learning Journey')).toBeHidden();
  });

  test('matches visual baseline', async ({ page }) => {
    await page.goto('/posts');

    // Wait for loader data to render before screenshotting.
    await expect(page.getByText('Science Museum Learning Journey')).toBeVisible();

    await expect(page).toHaveScreenshot('posts-dashboard.png', { fullPage: true });
  });
});
