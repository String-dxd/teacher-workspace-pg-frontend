import { expect, type Page, test } from '@playwright/test';

// E2E coverage for the Posts Create & Send flows (issue #96). Runs against the
// MSW-mocked dev server (see src/mocks/handlers.ts) — no real backend. Request
// assertions match on the `/api/web/2/staff` path suffix (BASE in handlers.ts).

// Pin "today" so date pickers land on stable, in-range days (June 10, 2026 —
// day 20 is then a valid future date within the schedule window). We use
// setFixedTime rather than clock.install so real timers keep running: the
// description editor commits through a ~150ms debounce that install() would
// freeze, leaving the form perpetually invalid.
test.use({ timezoneId: 'Asia/Singapore', locale: 'en-US' });

test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-06-10T10:00:00+08:00'));
});

// ─── Helpers ──────────────────────────────────────────────────────────────

/** Enter the create form through the PostTypePicker gate. */
async function openCreateForm(page: Page, kind: 'Read Only' | 'Response Required') {
  await page.goto('/posts/new');
  await page.getByRole('button', { name: new RegExp(kind) }).click();
  await expect(page.getByRole('heading', { name: 'New Post', exact: true })).toBeVisible();
}

/** Select a recipient class via the Students EntitySelector combobox. */
async function selectRecipientClass(page: Page, className: string) {
  const combobox = page.getByRole('combobox').first();
  await combobox.click();
  await page.getByPlaceholder('Search students, classes, CCAs…').fill(className);
  // Result rows are <button aria-pressed> carrying the class label.
  await page
    .getByRole('button', { name: new RegExp(`^${className}\\b`) })
    .first()
    .click();
  // Close the dropdown by clicking outside (mousedown-outside handler) so its
  // option panel stops intercepting pointer events on fields below.
  await page.getByText('Recipients', { exact: true }).click();
}

/** Pick a preset enquiry email from the EnquiryEmailSelector popover. */
async function selectEnquiryEmail(page: Page, email: string) {
  await page.getByText('Select an email…').click();
  await page.getByRole('button', { name: email, exact: true }).click();
}

/** Type into the Tiptap description editor (contenteditable). */
async function fillDescription(page: Page, text: string) {
  const editor = page.locator('[aria-labelledby="post-description-label"]');
  await editor.click();
  await editor.pressSequentially(text);
  // The editor's onChange into the form reducer is debounced ~150ms. Wait on an
  // observable signal that it committed — the description char counter — rather
  // than on a timer, so the form-validity gate is up to date before we post.
  await expect(page.getByText(`${text.length}/2000`)).toBeVisible();
}

// ─── Form shell: create & publish ───────────────────────────────────────────

test.describe('create & send — view-only announcement', () => {
  test('publishes a fully-populated view-only post', async ({ page }) => {
    // Capture the publish request to assert MSW received it.
    const publishRequest = page.waitForRequest(
      (req) => req.method() === 'POST' && new URL(req.url()).pathname.endsWith('/announcements'),
    );

    await openCreateForm(page, 'Read Only');

    await page.locator('#post-title').fill('Term 3 Briefing');
    await fillDescription(page, 'Please note the briefing details below.');
    await selectRecipientClass(page, '3A');
    await selectEnquiryEmail(page, 'general_office@greendale.edu.sg');

    // Post now → confirmation dialog → Send post.
    await page.getByRole('button', { name: 'Post now' }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByText('Send post?')).toBeVisible();
    await dialog.getByRole('button', { name: 'Send post' }).click();

    await publishRequest;
    // On success the app navigates back to the list.
    await expect(page).toHaveURL(/\/posts$/);
    await expect(page.getByText('Post sent.')).toBeVisible();
  });

  test('blocks posting until required fields are filled', async ({ page }) => {
    await openCreateForm(page, 'Read Only');

    // With an empty form, "Post now" opens the validation popover instead of
    // the send dialog.
    await page.getByRole('button', { name: 'Post now' }).click();
    await expect(page.getByText('Complete these fields before posting')).toBeVisible();
    await expect(page.getByText('Add a title')).toBeVisible();
    await expect(page.getByText('Select an enquiry email', { exact: true })).toBeVisible();
    // The send confirmation dialog must not have opened.
    await expect(page.getByText('Send post?')).toBeHidden();
  });
});

// ─── Recipients ──────────────────────────────────────────────────────────────

test.describe('recipients', () => {
  test('selected class appears as a recipient chip', async ({ page }) => {
    await openCreateForm(page, 'Read Only');
    await selectRecipientClass(page, '4A');

    // The chosen class becomes a removable chip.
    await expect(page.getByRole('button', { name: 'Remove 4A', exact: true })).toBeVisible();
  });
});

// ─── Editor constraints ──────────────────────────────────────────────────────

test.describe('editor constraints', () => {
  test('title counter reflects input against the 120-char limit', async ({ page }) => {
    await openCreateForm(page, 'Read Only');

    const title = page.locator('#post-title');
    await title.fill('Hello');
    await expect(page.getByText('5/120')).toBeVisible();
  });

  test('title flags input that exceeds the 120-character limit', async ({ page }) => {
    await openCreateForm(page, 'Read Only');

    const title = page.locator('#post-title');
    await title.fill('x'.repeat(125));
    // The title field does not hard-clamp — it surfaces an over-limit alert and
    // marks the input invalid, which the form-validity gate then blocks on.
    await expect(page.getByText('Exceeded by 5 characters.')).toBeVisible();
    await expect(title).toHaveJSProperty('ariaInvalid', 'true');
  });
});

// ─── Website links (max 3) ────────────────────────────────────────────────────

test.describe('website links', () => {
  test('adds links up to a maximum of three', async ({ page }) => {
    await openCreateForm(page, 'Read Only');

    const addLink = page.getByRole('button', { name: 'Add website link' });
    await addLink.click();
    await expect(page.locator('#website-link-url-0')).toBeVisible();

    await page.locator('#website-link-url-0').fill('https://example.com');
    await addLink.click();
    await addLink.click();

    // Three rows now exist; the add button is disabled.
    await expect(page.locator('#website-link-url-2')).toBeVisible();
    await expect(addLink).toBeDisabled();
  });
});

// ─── Scheduling ────────────────────────────────────────────────────────────────

test.describe('scheduling', () => {
  test('schedules a valid post for a future date', async ({ page }) => {
    const scheduleRequest = page.waitForRequest(
      (req) =>
        req.method() === 'POST' &&
        new URL(req.url()).pathname.endsWith('/announcements/drafts/schedule'),
    );

    await openCreateForm(page, 'Read Only');
    await page.locator('#post-title').fill('Field Trip Notice');
    await fillDescription(page, 'Details about the upcoming field trip.');
    await selectRecipientClass(page, '3A');
    await selectEnquiryEmail(page, 'general_office@greendale.edu.sg');

    // Open the schedule picker (step 1).
    await page.getByRole('button', { name: 'Schedule' }).click();
    const scheduleDialog = page.getByRole('dialog');
    await expect(scheduleDialog.getByText('Schedule post')).toBeVisible();

    // Pick a send date (Jun 20, in the frozen month, within the 21-day window).
    // The time defaults to a valid in-window slot (09:00), so Continue enables
    // without touching the Send-at select.
    await scheduleDialog.getByRole('button', { name: 'Pick a date' }).click();
    const calendar = page.getByRole('grid', { name: 'Date picker' });
    await calendar.getByRole('button', { name: /\/20\// }).click();

    await scheduleDialog.getByRole('button', { name: 'Continue' }).click();

    // Step 2 — the send confirmation dialog flips to the scheduled variant.
    const confirmDialog = page.getByRole('dialog');
    await expect(confirmDialog.getByText('Schedule post?')).toBeVisible();
    await confirmDialog.getByRole('button', { name: 'Schedule post' }).click();

    await scheduleRequest;
    await expect(page).toHaveURL(/\/posts$/);
    await expect(page.getByText('Post scheduled.')).toBeVisible();
  });
});

// ─── Scheduled-post management (reschedule / cancel) ─────────────────────────

test.describe('scheduled post management', () => {
  // Announcement postId 201 is the SCHEDULED detail fixture.
  test('reschedules a scheduled post', async ({ page }) => {
    const rescheduleRequest = page.waitForRequest(
      (req) =>
        req.method() === 'PUT' && new URL(req.url()).pathname.endsWith('/rescheduleSchedule'),
    );

    await page.goto('/posts/announcements/201');
    const reschedule = page.getByRole('button', { name: 'Reschedule' });
    await expect(reschedule).toBeVisible();
    await reschedule.click();

    const dialog = page.getByRole('dialog');
    await dialog.getByRole('button', { name: 'Pick a date' }).click();
    const calendar = page.getByRole('grid', { name: 'Date picker' });
    await calendar.getByRole('button', { name: /\/20\// }).click();
    await dialog.getByRole('button', { name: 'Continue' }).click();

    await rescheduleRequest;
    await expect(page.getByText('Post rescheduled.')).toBeVisible();
  });

  test('cancels a scheduled send', async ({ page }) => {
    const cancelRequest = page.waitForRequest(
      (req) => req.method() === 'POST' && new URL(req.url()).pathname.endsWith('/cancelSchedule'),
    );
    // The cancel flow uses window.confirm — auto-accept it.
    page.on('dialog', (d) => d.accept());

    await page.goto('/posts/announcements/201');
    await page.getByRole('button', { name: 'Cancel schedule' }).click();

    await cancelRequest;
    await expect(page.getByText('Scheduled send cancelled.')).toBeVisible();
  });
});

// ─── Duplicate ────────────────────────────────────────────────────────────────

test.describe('duplicate', () => {
  test('duplicates a post from the list dot-menu', async ({ page }) => {
    const duplicateRequest = page.waitForRequest(
      (req) => req.method() === 'POST' && new URL(req.url()).pathname.endsWith('/duplicate'),
    );

    await page.goto('/posts');
    await expect(page.getByText('My Posts', { exact: true })).toBeVisible();

    // Open the first row's actions menu and duplicate it.
    await page.getByRole('button', { name: 'More actions' }).first().click();
    await page.getByRole('menuitem', { name: 'Duplicate' }).click();

    await duplicateRequest;
    await expect(page.getByText(/has been duplicated\./)).toBeVisible();
  });
});

// ─── Deferred coverage ────────────────────────────────────────────────────────
//
// The following acceptance-criteria scenarios from #96 are intentionally NOT
// covered here, to keep the suite deterministic and screenshot-free:
//   - Auto-save "Saved" indicator: the 30s useAutoSave interval interacts with
//     page.clock in a way that needs a dedicated timing harness (#96 sizing).
//   - File / photo 3-step upload: requires a real File on the hidden input plus
//     S3 + verification polling; add once a fixture upload asset is in place.
//   - Rich-text toolbar toggles (bold/italic/lists/alignment): editor-internal
//     behaviour better suited to a component test than an e2e flow.
//   - Enquiry-email update on a posted post (PUT .../enquiryEmailAddress): the
//     MSW handler now exists; the PostDetailPage interaction is a follow-up.
