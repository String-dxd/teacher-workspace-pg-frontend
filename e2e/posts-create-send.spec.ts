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

// ─── Auto-save ─────────────────────────────────────────────────────────────────

test.describe('auto-save', () => {
  test('auto-saves a dirty draft after the interval fires', async ({ page }) => {
    // Fake the clock so the 30s useAutoSave interval can be fast-forwarded.
    // install() (not the shared setFixedTime) is required to advance timers.
    await page.clock.install({ time: new Date('2026-06-10T10:00:00+08:00') });

    const draftRequest = page.waitForRequest(
      (req) =>
        req.method() === 'POST' && new URL(req.url()).pathname.endsWith('/announcements/drafts'),
    );

    await openCreateForm(page, 'Read Only');
    // Drive the (un-debounced) title so the payload is dirty without depending on
    // the editor's 150ms debounce, which the faked clock would also freeze.
    await page.locator('#post-title').fill('Draft in progress');

    await page.clock.fastForward('00:30');

    await draftRequest;
    // The status ticker carries a timestamp ("Saved 9:15 AM") — never a bare
    // "Saved" — so match the prefix on the aria-live region.
    await expect(page.getByText(/^Saved\s+\d{1,2}:\d{2}/)).toBeVisible();
  });
});

// ─── File attachment (3-step upload) ─────────────────────────────────────────

test.describe('file upload', () => {
  test('runs the 3-step upload flow to a Ready state', async ({ page }) => {
    // Each step of the flow, asserted in sequence against the MSW mocks.
    const preUpload = page.waitForRequest(
      (req) =>
        req.method() === 'POST' &&
        new URL(req.url()).pathname.endsWith('/files/2/preUploadValidation'),
    );
    const s3Upload = page.waitForRequest(
      (req) => req.method() === 'POST' && req.url().includes('amazonaws.com/uploads/mock'),
    );
    const verify = page.waitForRequest(
      (req) =>
        req.method() === 'GET' &&
        new URL(req.url()).pathname.endsWith('/files/2/postUploadVerification'),
    );

    await openCreateForm(page, 'Read Only');

    // Target the hidden Files input (disambiguated from Photos by accept type).
    // The fixture is a tiny on-disk PDF (Playwright infers the MIME from the
    // extension) — under the 5 MB cap and an allowed file type.
    await page
      .locator('input[type="file"][accept*="pdf"]')
      .setInputFiles('e2e/fixtures/notice.pdf');

    await preUpload;
    await s3Upload;
    await verify;

    // The file row settles on the "Ready" badge once verification returns.
    // `.first()` guards a Playwright slowMo-only artifact where one setInputFiles
    // can register the same file more than once; at real speed there's one row.
    await expect(page.getByText('notice.pdf').first()).toBeVisible();
    await expect(page.getByText('Ready').first()).toBeVisible();
  });
});

// ─── Photo upload (with cover selection) ─────────────────────────────────────

test.describe('photo upload', () => {
  test('uploads a photo and exposes a cover toggle', async ({ page }) => {
    await openCreateForm(page, 'Read Only');

    // A tiny on-disk 1x1 PNG fixture — allowed image MIME, well under 5 MB.
    await page
      .locator('input[type="file"][accept*="image"]')
      .setInputFiles('e2e/fixtures/photo.png');

    // The cover toggle mounts only once the photo reaches the ready state. The
    // first uploaded photo is auto-marked as cover by the reducer, so it starts
    // as "Unmark as cover"; toggling flips it to "Mark as cover".
    const unmarkCover = page.getByRole('button', { name: 'Unmark as cover' });
    await expect(unmarkCover).toBeVisible();

    await unmarkCover.click();
    await expect(page.getByRole('button', { name: 'Mark as cover' })).toBeVisible();
  });
});

// ─── Rich-text toolbar ───────────────────────────────────────────────────────

test.describe('rich-text toolbar', () => {
  // Open the create form and put a real, selected range into the editor. Bold /
  // italic / underline / list / alignment commands all key off the current
  // selection, so selecting a concrete range makes editor.isActive() (and thus
  // each button's aria-pressed) deterministic — versus the flakier
  // collapsed-cursor stored-mark path. Buttons also enable only once the Tiptap
  // editor has mounted, so callers await enablement before asserting.
  async function openEditorWithSelection(page: Page) {
    await openCreateForm(page, 'Read Only');
    const editor = page.locator('[aria-labelledby="post-description-label"]');
    await editor.click();
    await editor.pressSequentially('Sample');
    await page.keyboard.press('ControlOrMeta+a');
  }

  test('bold, italic, and underline toggle their pressed state', async ({ page }) => {
    await openEditorWithSelection(page);

    const bold = page.getByRole('button', { name: 'Bold', exact: true });
    await expect(bold).toBeEnabled();

    await bold.click();
    await expect(bold).toHaveAttribute('aria-pressed', 'true');
    await bold.click();
    await expect(bold).toHaveAttribute('aria-pressed', 'false');

    const italic = page.getByRole('button', { name: 'Italic', exact: true });
    await italic.click();
    await expect(italic).toHaveAttribute('aria-pressed', 'true');
    await italic.click();
    await expect(italic).toHaveAttribute('aria-pressed', 'false');

    const underline = page.getByRole('button', { name: 'Underline', exact: true });
    await underline.click();
    await expect(underline).toHaveAttribute('aria-pressed', 'true');
    await underline.click();
    await expect(underline).toHaveAttribute('aria-pressed', 'false');
  });

  test('bullet and numbered lists toggle their pressed state', async ({ page }) => {
    // Lists key off the block the cursor sits in, so — unlike the marks/alignment
    // tests — do NOT select-all: Ctrl+A extends the range into the trailing empty
    // paragraph after the list, and isActive('bulletList') then reads false even
    // though the list applied. A collapsed cursor inside the typed text keeps
    // isActive() (and aria-pressed) reporting the block the caret is actually in.
    await openCreateForm(page, 'Read Only');
    const editor = page.locator('[aria-labelledby="post-description-label"]');
    await editor.click();
    await editor.pressSequentially('Sample');

    const bulletList = page.getByRole('button', { name: 'Bullet list', exact: true });
    await expect(bulletList).toBeEnabled();

    await bulletList.click();
    await expect(bulletList).toHaveAttribute('aria-pressed', 'true');
    await bulletList.click();
    await expect(bulletList).toHaveAttribute('aria-pressed', 'false');

    // Switching to an ordered list activates it; toggling off clears it.
    const numberedList = page.getByRole('button', { name: 'Numbered list', exact: true });
    await numberedList.click();
    await expect(numberedList).toHaveAttribute('aria-pressed', 'true');
    await numberedList.click();
    await expect(numberedList).toHaveAttribute('aria-pressed', 'false');
  });

  test('alignment buttons switch the active option', async ({ page }) => {
    await openEditorWithSelection(page);

    // Alignment is radio-like (setTextAlign), not an on/off toggle: selecting one
    // option deactivates the previously-active one. Assert that mutual exclusivity
    // rather than a click-twice-to-clear pattern, so the check never depends on
    // the editor's default alignment.
    const alignCenter = page.getByRole('button', { name: 'Align center', exact: true });
    await expect(alignCenter).toBeEnabled();

    await alignCenter.click();
    await expect(alignCenter).toHaveAttribute('aria-pressed', 'true');

    const alignRight = page.getByRole('button', { name: 'Align right', exact: true });
    await alignRight.click();
    await expect(alignRight).toHaveAttribute('aria-pressed', 'true');
    // Selecting right must have cleared center.
    await expect(alignCenter).toHaveAttribute('aria-pressed', 'false');
  });
});

// ─── Deferred coverage ────────────────────────────────────────────────────────
//
// All 12 of #96's acceptance criteria are now covered above. One adjacent,
// non-AC scenario remains a follow-up:
//   - Enquiry-email update on an already-posted post (PUT .../enquiryEmailAddress):
//     the PostDetailPage edit interaction is out of scope for the create/send
//     flows, so both its test and its MSW handler are deferred to the post-detail
//     coverage PR.
