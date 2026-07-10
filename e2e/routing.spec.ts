import { expect, test } from '@playwright/test';

test.describe.configure({ mode: 'serial' });

test.describe('deep linking', () => {
  test('renders posts list at /posts', async ({ page }) => {
    await page.goto('/posts', { waitUntil: 'networkidle' });
    await expect(page.getByRole('heading', { name: 'Posts', exact: true })).toBeVisible();
  });

  test('renders create post form at /posts/new', async ({ page }) => {
    await page.goto('/posts/new', { waitUntil: 'networkidle' });
    await expect(page.getByRole('heading', { name: 'New Post' })).toBeVisible();
  });

  test('renders post detail at /posts/announcements/1', async ({ page }) => {
    await page.goto('/posts/announcements/1', { waitUntil: 'networkidle' });
    await expect(page.locator('h1')).toBeVisible();
  });

  test('renders groups list at /groups', async ({ page }) => {
    await page.goto('/groups', { waitUntil: 'networkidle' });
    await expect(page.getByRole('heading', { name: 'Groups', exact: true })).toBeVisible();
  });

  test('renders create group form at /groups/new', async ({ page }) => {
    await page.goto('/groups/new', { waitUntil: 'networkidle' });
    await expect(page.getByRole('heading', { name: 'Create new custom group' })).toBeVisible();
  });

  test('renders class detail at /groups/classes/1', async ({ page }) => {
    await page.goto('/groups/classes/1', { waitUntil: 'networkidle' });
    await expect(page.getByText('Assigned Class')).toBeVisible();
  });
});

test.describe('client-side navigation', () => {
  test('navigates from posts list to create', async ({ page }) => {
    await page.goto('/posts', { waitUntil: 'networkidle' });
    await expect(page.getByRole('heading', { name: 'Posts', exact: true })).toBeVisible();

    await page.locator('a[href$="/new"]').first().click();
    await expect(page.getByRole('heading', { name: 'New Post' })).toBeVisible();
    await expect(page).toHaveURL(/\/posts\/new/);
  });

  test('navigates from groups list to create', async ({ page }) => {
    await page.goto('/groups', { waitUntil: 'networkidle' });
    await expect(page.getByRole('heading', { name: 'Groups', exact: true })).toBeVisible();

    await page.getByRole('link', { name: 'Create custom group' }).click();
    await expect(page.getByRole('heading', { name: 'Create new custom group' })).toBeVisible();
    await expect(page).toHaveURL(/\/groups\/new/);
  });
});

test.describe('cross-feature navigation', () => {
  test('navigating between /posts and /groups renders each correctly', async ({ page }) => {
    await page.goto('/posts', { waitUntil: 'networkidle' });
    await expect(page.getByRole('heading', { name: 'Posts', exact: true })).toBeVisible();

    await page.goto('/groups', { waitUntil: 'networkidle' });
    await expect(page.getByRole('heading', { name: 'Groups', exact: true })).toBeVisible();

    await page.goto('/posts/new', { waitUntil: 'networkidle' });
    await expect(page.getByRole('heading', { name: 'New Post' })).toBeVisible();
  });
});
