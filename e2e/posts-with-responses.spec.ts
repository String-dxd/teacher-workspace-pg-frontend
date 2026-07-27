import { expect, test, type Page } from '@playwright/test';

test.use({
  timezoneId: 'Asia/Singapore',
  locale: 'en-US',
});

test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: new Date('2026-07-27T10:00:00+08:00') });
});

/** Open /posts/new and select the "Response Required" (with-responses) post kind. */
async function goToNewResponsePost(page: Page) {
  await page.goto('/posts/new', { waitUntil: 'networkidle' });
  await page.getByText('Response Required', { exact: true }).click();
  await expect(page.getByRole('radiogroup', { name: 'Response type' })).toBeVisible();
}

/** Switch response type to Yes/No and add a question, returning the question row. */
async function addQuestion(page: Page) {
  await page.getByRole('radio', { name: 'Yes / No' }).click();
  await page.getByRole('button', { name: 'Add a Question' }).click();
  return page.getByPlaceholder('Question 1');
}

test.describe('posts with responses — response type selection', () => {
  test('creates a consent form with Acknowledge response type', async ({ page }) => {
    await goToNewResponsePost(page);

    const acknowledge = page.getByRole('radio', { name: 'Acknowledge' });
    await expect(acknowledge).toBeChecked();

    // `data-section="response"` is the preview's parent-facing response bar
    // (stable code-level marker — the "Yes"/"No" text also appears in the
    // ResponseTypeSelector's own option-card mockup, so plain text matches
    // would be ambiguous).
    const responseBar = page.locator('[data-section="response"]').first();
    await expect(responseBar.getByText('Please acknowledge by')).toBeVisible();
    await expect(responseBar.getByText('Acknowledge', { exact: true })).toBeVisible();
  });

  test('creates a consent form with Yes/No response type', async ({ page }) => {
    await goToNewResponsePost(page);

    const yesNo = page.getByRole('radio', { name: 'Yes / No' });
    await yesNo.click();
    await expect(yesNo).toBeChecked();

    const responseBar = page.locator('[data-section="response"]').first();
    await expect(responseBar.getByText('Yes', { exact: true })).toBeVisible();
    await expect(responseBar.getByText('No', { exact: true })).toBeVisible();
  });
});

test.describe('posts with responses — custom questions', () => {
  test('adds a custom free-text question', async ({ page }) => {
    await goToNewResponsePost(page);

    const questionInput = await addQuestion(page);
    await questionInput.fill('Does your child have any food allergies?');
    await expect(questionInput).toHaveValue('Does your child have any food allergies?');

    // Free-text is the default type — no MCQ option fields should be rendered.
    await expect(page.getByPlaceholder('Option 1')).not.toBeVisible();
    await expect(page.getByRole('button', { name: 'Open-ended' })).toBeVisible();
  });

  test('adds a custom MCQ question with options', async ({ page }) => {
    await goToNewResponsePost(page);

    const questionInput = await addQuestion(page);
    await questionInput.fill('Preferred lunch option');

    await page.getByRole('button', { name: 'MCQ' }).click();
    await expect(page.getByPlaceholder('Option 1')).toBeVisible();
    await expect(page.getByPlaceholder('Option 2')).toBeVisible();

    await page.getByText('Add option').click();
    await expect(page.getByPlaceholder('Option 3')).toBeVisible();

    await page.getByPlaceholder('Option 1').fill('Chicken Rice');
    await page.getByPlaceholder('Option 2').fill('Vegetarian');
    await expect(page.getByPlaceholder('Option 1')).toHaveValue('Chicken Rice');
    await expect(page.getByPlaceholder('Option 2')).toHaveValue('Vegetarian');
  });

  test('reorders questions with Move up / Move down', async ({ page }) => {
    await goToNewResponsePost(page);

    await page.getByRole('radio', { name: 'Yes / No' }).click();
    const addButton = page.getByRole('button', { name: 'Add a Question' });
    await addButton.click();
    await page.getByPlaceholder('Question 1').fill('First question');
    await addButton.click();
    await page.getByPlaceholder('Question 2').fill('Second question');

    // Move the second question up — it should now occupy the "Question 1" slot.
    const moveUpButtons = page.getByRole('button', { name: 'Move up' });
    await moveUpButtons.nth(1).click();

    await expect(page.getByPlaceholder('Question 1')).toHaveValue('Second question');
    await expect(page.getByPlaceholder('Question 2')).toHaveValue('First question');

    // Move it back down to restore the original order.
    await page.getByRole('button', { name: 'Move down' }).first().click();
    await expect(page.getByPlaceholder('Question 1')).toHaveValue('First question');
    await expect(page.getByPlaceholder('Question 2')).toHaveValue('Second question');
  });

  test('deletes a question', async ({ page }) => {
    await goToNewResponsePost(page);

    const questionInput = await addQuestion(page);
    await questionInput.fill('Temporary question');
    await expect(page.getByPlaceholder('Question 1')).toBeVisible();

    await page.getByRole('button', { name: 'Delete question' }).click();

    await expect(page.getByPlaceholder('Question 1')).not.toBeVisible();
    await expect(page.getByText('No questions added yet.')).toBeVisible();
  });

  test('disables "Add a Question" once 5 questions are added', async ({ page }) => {
    await goToNewResponsePost(page);

    await page.getByRole('radio', { name: 'Yes / No' }).click();
    const addButton = page.getByRole('button', { name: 'Add a Question' });

    for (let i = 0; i < 5; i++) {
      await addButton.click();
    }

    await expect(page.getByPlaceholder(/^Question [1-5]$/)).toHaveCount(5);
    await expect(addButton).toBeDisabled();
  });
});
