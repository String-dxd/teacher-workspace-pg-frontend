import { expect, test } from '@playwright/test';
import ExcelJS from 'exceljs';

const { Workbook } = ExcelJS;

test.describe('post tracking', () => {
  test('shows announcement read metrics and recipient states', async ({ page }) => {
    await page.goto('/posts/announcements/101');

    await expect(page.locator('h1', { hasText: 'End-of-Year Concert Reminder' })).toBeVisible();
    await expect(page.getByText('Read by parents')).toBeVisible();
    await expect(page.getByLabel('Read by parents progress')).toBeVisible();
    await expect(page.getByText('7 / 12', { exact: true })).toBeVisible();
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
    await expect(page.getByText('7 / 10', { exact: true })).toBeVisible();
    await expect(page.getByText('3 pending')).toBeVisible();

    const statusTable = page.getByText('Status', { exact: true }).locator('..');
    const ahmad = statusTable.getByRole('row', { name: /Ahmad bin Ibrahim/ });
    const chen = statusTable.getByRole('row', { name: /Chen Wei Jie/ });
    const priya = statusTable.getByRole('row', { name: /Priya Nair/ });
    await expect(ahmad.getByText('Yes', { exact: true })).toBeVisible();
    await expect(chen.getByText('No', { exact: true })).toBeVisible();
    await expect(priya.getByText('No Response', { exact: true })).toBeVisible();
  });

  test('exports announcement recipient statuses to Excel', async ({ page }) => {
    await page.goto('/posts/announcements/101');

    await expect(page.getByRole('button', { name: 'Export to Excel' })).toBeVisible();
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Export to Excel' }).click();
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toMatch(/^recipients-101-\d{4}-\d{2}-\d{2}\.xlsx$/);

    const stream = await download.createReadStream();
    expect(stream).not.toBeNull();
    const chunks: BlobPart[] = [];
    for await (const chunk of stream!) chunks.push(chunk as unknown as BlobPart);

    const workbook = new Workbook();
    await workbook.xlsx.load(await new Blob(chunks).arrayBuffer());
    const worksheet = workbook.worksheets[0];

    // Testing for header row of the worksheet
    expect([1, 2, 3, 4, 5].map((column) => worksheet.getRow(1).getCell(column).value)).toEqual([
      'Student',
      'Class',
      'Status',
      'Read At',
      'Parent / Guardian',
    ]);
    expect(worksheet.rowCount).toBe(13);

    // Testing for first 2 rows of the worksheet
    const rows = Array.from({ length: worksheet.rowCount - 1 }, (_, index) =>
      [1, 2, 3].map((column) => String(worksheet.getRow(index + 2).getCell(column).value ?? '')),
    );
    expect(rows).toContainEqual(['Ahmad bin Ibrahim', '3A', 'Read']);
    expect(rows).toContainEqual(['Raj Kumar', '3B', 'Unread']);
  });
});
