# Production URL Paths Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace branded-prefix URL scheme with explicit, human-readable route segments for all post types.

**Architecture:** Remove the `AnnouncementDraftId`/`ConsentFormDraftId`/`ConsentFormId` branded types and prefix-parsing utilities. Replace with explicit route definitions that encode type and draft status in the URL path. Each route carries a `handle` object so loaders know what to fetch without parsing ID prefixes.

**Tech Stack:** React Router v7, TypeScript, MSW (mocks), Vitest (tests)

## Global Constraints

- All `:id` route params are bare numeric strings (no prefixes)
- No `?kind=` query parameter on any post URL
- No redirects from old URLs (clean break)
- Backend API paths unchanged (`/api/web/2/staff/announcements/...`, `/api/web/2/staff/consentForms/...`)
- Run `pnpm typecheck`, `pnpm lint`, `pnpm test` after each task — all must pass

---

### Task 1: Refactor `posts-registry.ts` — Remove Branded IDs, Add `numericId`

**Files:**

- Modify: `src/data/posts-registry.ts:221-267`
- Modify: `src/features/posts/api/mappers.test.ts:79,213-234`

**Interfaces:**

- Consumes: Nothing (foundational change)
- Produces:
  - `Post.numericId: number` field on both `AnnouncementPost` and `ConsentFormPost`
  - `Post.id` becomes `string` (bare numeric string, no prefix)
  - `postHref(post: Post, opts?: { edit?: boolean }): string` — constructs clean URLs
  - Removed exports: `AnnouncementDraftId`, `ConsentFormDraftId`, `ConsentFormId`, `PostId`, `parsePostId`, `validatePostRoute`, `postKindFromId`, `isAnnouncementDraftId`, `isConsentFormDraftId`, `isConsentFormId`
  - Retained: `AnnouncementId` simplified to just `string` (bare numeric)

- [ ] **Step 1: Write failing tests for new `postHref`**

Create a new test block in a test file for posts-registry. Since there's no existing test file for posts-registry, add tests inline:

```ts
// src/data/posts-registry.test.ts
import { describe, expect, it } from 'vitest';

import { postHref } from './posts-registry';

describe('postHref', () => {
  it('returns detail path for posted announcement', () => {
    const post = { kind: 'announcement', status: 'posted', numericId: 42 } as any;
    expect(postHref(post)).toBe('/posts/announcements/42');
  });

  it('returns edit path for posted announcement with edit option', () => {
    const post = { kind: 'announcement', status: 'posted', numericId: 42 } as any;
    expect(postHref(post, { edit: true })).toBe('/posts/announcements/42/edit');
  });

  it('returns draft edit path for draft announcement', () => {
    const post = { kind: 'announcement', status: 'draft', numericId: 301 } as any;
    expect(postHref(post)).toBe('/posts/announcements/drafts/301/edit');
  });

  it('returns draft edit path for scheduled announcement', () => {
    const post = { kind: 'announcement', status: 'scheduled', numericId: 301 } as any;
    expect(postHref(post)).toBe('/posts/announcements/drafts/301/edit');
  });

  it('returns detail path for posted consent form', () => {
    const post = { kind: 'form', status: 'open', numericId: 55 } as any;
    expect(postHref(post)).toBe('/posts/consent-forms/55');
  });

  it('returns draft edit path for draft consent form', () => {
    const post = { kind: 'form', status: 'draft', numericId: 501 } as any;
    expect(postHref(post)).toBe('/posts/consent-forms/drafts/501/edit');
  });

  it('returns draft edit path for scheduled consent form', () => {
    const post = { kind: 'form', status: 'scheduled', numericId: 501 } as any;
    expect(postHref(post)).toBe('/posts/consent-forms/drafts/501/edit');
  });

  it('returns edit path for posted consent form with edit option', () => {
    const post = { kind: 'form', status: 'open', numericId: 55 } as any;
    expect(postHref(post, { edit: true })).toBe('/posts/consent-forms/55/edit');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test -- src/data/posts-registry.test.ts`
Expected: FAIL — tests reference the new `numericId` field and new URL patterns

- [ ] **Step 3: Rewrite `posts-registry.ts` types and utilities**

Replace lines 221-267 of `src/data/posts-registry.ts` with:

```ts
// ─── Post IDs ─────────────────────────────────────────────────────────────────

export function postHref(
  post: Pick<Post, 'kind' | 'status' | 'numericId'>,
  opts?: { edit?: boolean },
): string {
  const kind = post.kind === 'announcement' ? 'announcements' : 'consent-forms';
  const isDraft = post.status === 'draft' || post.status === 'scheduled';

  if (isDraft) return `/posts/${kind}/drafts/${post.numericId}/edit`;
  if (opts?.edit) return `/posts/${kind}/${post.numericId}/edit`;
  return `/posts/${kind}/${post.numericId}`;
}
```

Update the `AnnouncementPost` interface (around line 136):

- Change `id: AnnouncementId | AnnouncementDraftId` → `id: string`
- Add `numericId: number;` after `id`

Update the `ConsentFormPost` interface (around line 165):

- Change `id: ConsentFormId | ConsentFormDraftId` → `id: string`
- Add `numericId: number;` after `id`

Remove these type definitions and functions entirely:

- `AnnouncementId` type (line 223)
- `AnnouncementDraftId` type (lines 224-226)
- `ConsentFormId` type (line 227)
- `ConsentFormDraftId` type (line 228)
- `PostId` type (line 229)
- `isConsentFormId` function (lines 231-233)
- `isAnnouncementDraftId` function (lines 235-237)
- `isConsentFormDraftId` function (lines 239-241)
- `parsePostId` function (lines 243-249)
- `postKindFromId` function (lines 251-253)
- `postHref` old implementation (lines 255-258)
- `validatePostRoute` function (lines 260-267)

- [ ] **Step 4: Update mapper tests**

In `src/features/posts/api/mappers.test.ts`, update the ID assertions:

- Line 79: change `id: 'cf_42'` → `id: '42', numericId: 42`
- Line 215: change `expect(out.id).toBe('cf_42')` → `expect(out.id).toBe('42'); expect(out.numericId).toBe(42)`
- Line 222: change `expect(out.id).toBe('cfDraft_42')` → `expect(out.id).toBe('42'); expect(out.numericId).toBe(42)`
- Line 232: change `expect(out.id).toBe('cfDraft_42')` → `expect(out.id).toBe('42'); expect(out.numericId).toBe(42)`

- [ ] **Step 5: Run tests to verify `postHref` passes**

Run: `pnpm test -- src/data/posts-registry.test.ts`
Expected: PASS

- [ ] **Step 6: Run typecheck — expect errors in consumers**

Run: `pnpm typecheck`
Expected: FAIL with errors in mappers.ts, client.ts, and page files referencing removed types. This confirms the types are correctly removed and will be fixed in subsequent tasks.

- [ ] **Step 7: Commit**

```bash
git add src/data/posts-registry.ts src/data/posts-registry.test.ts src/features/posts/api/mappers.test.ts
git commit -m "refactor(posts): remove branded ID types, add numericId and clean postHref"
```

---

### Task 2: Update API Mappers — Stop Prepending Prefixes

**Files:**

- Modify: `src/features/posts/api/mappers.ts:73-76,268,360,438-441,562`
- Modify: `src/features/posts/api/mappers.test.ts` (if not already done in Task 1)

**Interfaces:**

- Consumes: `Post.numericId: number` and `Post.id: string` (from Task 1)
- Produces: Mapper functions return `id: String(numericApiId)` and `numericId: numericApiId` instead of prefixed strings

- [ ] **Step 1: Update `mapAnnouncementSummary`**

In `src/features/posts/api/mappers.ts`, replace lines 69-76:

```ts
  // Both draft and scheduled announcements live in the draft API table.
  // The route structure handles the distinction — no prefix needed.
  const id = String(api.postId);

  return {
    kind: 'announcement',
    id,
    numericId: api.postId,
```

Remove the `AnnouncementDraftId` and `AnnouncementId` imports from the file's import block (line 3-4).

- [ ] **Step 2: Update `mapAnnouncementDraftDetail`**

Replace line 268:

```ts
    id: String(draft.announcementDraftId),
    numericId: draft.announcementDraftId,
```

- [ ] **Step 3: Update `mapConsentFormDraftDetail`**

Replace line 360:

```ts
    id: String(draft.consentFormDraftId),
    numericId: draft.consentFormDraftId,
```

- [ ] **Step 4: Update `mapConsentFormSummaryToPost`**

Replace lines 436-441:

```ts
  // Both draft and scheduled forms live in the draft API table.
  const id = String(api.postId);

  return {
    kind: 'form',
    id,
    numericId: api.postId,
```

Remove `ConsentFormDraftId` and `ConsentFormId` from the import block.

- [ ] **Step 5: Update `mapConsentFormDetail`**

Replace line 562:

```ts
    id: String(detail.consentFormId),
    numericId: detail.consentFormId,
```

- [ ] **Step 6: Remove unused branded type imports**

At the top of `src/features/posts/api/mappers.ts`, remove from the import:
`AnnouncementDraftId`, `AnnouncementId`, `ConsentFormDraftId`, `ConsentFormId`

Keep the remaining domain type imports (`AnnouncementPost`, `AnnouncementTarget`, etc.).

- [ ] **Step 7: Run mapper tests**

Run: `pnpm test -- src/features/posts/api/mappers.test.ts`
Expected: PASS

- [ ] **Step 8: Commit**

```bash
git add src/features/posts/api/mappers.ts src/features/posts/api/mappers.test.ts
git commit -m "refactor(mappers): return bare numeric IDs instead of prefixed strings"
```

---

### Task 3: Update API Client — Accept Bare Numeric IDs

**Files:**

- Modify: `src/features/posts/api/client.ts:1-8,420-433,612-617,775-794`

**Interfaces:**

- Consumes: Nothing from other tasks — only changes function signatures
- Produces:
  - `loadPostDetail(postId: number): Promise<AnnouncementPost>`
  - `loadAnnouncementDraftDetail(draftId: number): Promise<AnnouncementPost>`
  - `loadConsentPostDetail(formId: number): Promise<ConsentFormPost>`
  - `loadConsentFormDraftDetail(draftId: number): Promise<ConsentFormPost>`
  - `fetchConsentFormDetail(formId: number): Promise<ApiConsentFormDetail>`
  - `fetchAnnouncementDraftDetail(draftId: number): Promise<ApiAnnouncementDraft>`

- [ ] **Step 1: Update announcement read functions**

In `src/features/posts/api/client.ts`, replace lines 420-433:

```ts
async function fetchAnnouncementDetail(postId: number): Promise<ApiAnnouncementDetail> {
  const arr = await fetchApi<ApiAnnouncementDetail[]>(`/announcements/${postId}`);
  return arr[0];
}

async function fetchAnnouncementDraftDetail(draftId: number): Promise<ApiAnnouncementDraft> {
  const arr = await fetchApi<ApiAnnouncementDraft[]>(`/announcements/drafts/${draftId}`);
  return arr[0];
}
```

- [ ] **Step 2: Update consent form read functions**

Replace lines 612-617:

```ts
export async function fetchConsentFormDetail(formId: number): Promise<ApiConsentFormDetail> {
  const arr = await fetchApi<ApiConsentFormDetail[]>(`/consentForms/${formId}`);
  return arr[0];
}
```

Replace lines 780-788:

```ts
async function fetchConsentFormDraftDetail(draftId: number): Promise<ApiConsentFormDraft> {
  const arr = await fetchApi<ApiConsentFormDraft[]>(`/consentForms/drafts/${draftId}`);
  return arr[0];
}
```

- [ ] **Step 3: Update the public loader wrappers**

Find `loadPostDetail` (around line 416-418) and update:

```ts
export async function loadPostDetail(postId: number): Promise<AnnouncementPost> {
  const detail = await fetchAnnouncementDetail(postId);
  return mapAnnouncementDetail(detail);
}
```

Find `loadAnnouncementDraftDetail` (around line 434-437) and update:

```ts
export async function loadAnnouncementDraftDetail(draftId: number): Promise<AnnouncementPost> {
  const draft = await fetchAnnouncementDraftDetail(draftId);
  return mapAnnouncementDraftDetail(draft);
}
```

Find `loadConsentPostDetail` (around line 775-778) and update:

```ts
export async function loadConsentPostDetail(formId: number): Promise<ConsentFormPost> {
  const detail = await fetchConsentFormDetail(formId);
  return mapConsentFormDetail(detail);
}
```

Find `loadConsentFormDraftDetail` (around line 790-794) and update:

```ts
export async function loadConsentFormDraftDetail(draftId: number): Promise<ConsentFormPost> {
  const draft = await fetchConsentFormDraftDetail(draftId);
  return mapConsentFormDraftDetail(draft);
}
```

- [ ] **Step 4: Remove branded type imports**

At the top of `src/features/posts/api/client.ts` (lines 1-8), remove imports of:
`AnnouncementDraftId`, `AnnouncementId`, `ConsentFormDraftId`, `ConsentFormId`

Keep: `AnnouncementPost`, `ConsentFormPost`

- [ ] **Step 5: Run typecheck — expect errors only in page files**

Run: `pnpm typecheck`
Expected: Errors should be confined to the page files (`PostDetailPage.tsx`, `CreatePostPage.tsx`, `PostsListPage.tsx`) which still call these functions with old arguments. The client and mappers should be internally consistent.

- [ ] **Step 6: Commit**

```bash
git add src/features/posts/api/client.ts
git commit -m "refactor(api): accept bare numeric IDs instead of branded strings"
```

---

### Task 4: Update Route Definitions and Page Loaders

**Files:**

- Modify: `src/App.tsx:69-88`
- Modify: `src/features/posts/pages/PostDetailPage.tsx:73-103,132-141,350-357`
- Modify: `src/features/posts/pages/CreatePostPage.tsx:128-154,428-436,521-541,555-564`
- Modify: `src/features/posts/pages/PostsListPage.tsx:21-24,77-81,194-261,420-426`
- Modify: `src/features/posts/index.ts`

**Interfaces:**

- Consumes: `loadPostDetail(number)`, `loadAnnouncementDraftDetail(number)`, `loadConsentPostDetail(number)`, `loadConsentFormDraftDetail(number)` from Task 3; `postHref(post)` from Task 1
- Produces: Working app with new URL structure

- [ ] **Step 1: Define route handle type and update `App.tsx`**

Add a route handle type at the top of `src/App.tsx` (after imports):

```ts
export interface PostRouteHandle {
  postKind: 'announcement' | 'form';
  draft: boolean;
}
```

Replace lines 69-88 with:

```ts
  {
    path: '/posts',
    element: <PostsListPage />,
    loader: postsListLoader,
  },
  {
    path: '/posts/new',
    element: <CreatePostPage />,
    loader: createPostLoader,
    handle: { postKind: 'announcement', draft: false } satisfies PostRouteHandle,
  },
  {
    path: '/posts/announcements/:id',
    element: <PostDetailPage />,
    loader: postDetailLoader,
    handle: { postKind: 'announcement', draft: false } satisfies PostRouteHandle,
  },
  {
    path: '/posts/announcements/:id/edit',
    element: <CreatePostPage />,
    loader: createPostLoader,
    handle: { postKind: 'announcement', draft: false } satisfies PostRouteHandle,
  },
  {
    path: '/posts/announcements/drafts/:id/edit',
    element: <CreatePostPage />,
    loader: createPostLoader,
    handle: { postKind: 'announcement', draft: true } satisfies PostRouteHandle,
  },
  {
    path: '/posts/consent-forms/:id',
    element: <PostDetailPage />,
    loader: postDetailLoader,
    handle: { postKind: 'form', draft: false } satisfies PostRouteHandle,
  },
  {
    path: '/posts/consent-forms/:id/edit',
    element: <CreatePostPage />,
    loader: createPostLoader,
    handle: { postKind: 'form', draft: false } satisfies PostRouteHandle,
  },
  {
    path: '/posts/consent-forms/drafts/:id/edit',
    element: <CreatePostPage />,
    loader: createPostLoader,
    handle: { postKind: 'form', draft: true } satisfies PostRouteHandle,
  },
```

Export `PostRouteHandle` so page files can import it.

- [ ] **Step 2: Rewrite `PostDetailPage` loader**

In `src/features/posts/pages/PostDetailPage.tsx`, replace the loader (lines 75-103):

```ts
export async function loader({
  params,
  context,
}: LoaderFunctionArgs): Promise<PostDetailLoaderData> {
  const id = params.id;
  if (!id || !/^\d+$/.test(id)) throw new Response('Not Found', { status: 404 });

  const numericId = Number(id);
  const handle = (context as any)?.handle as PostRouteHandle | undefined;
  const postKind = handle?.postKind;

  const { loadConsentPostDetail, loadPostDetail } = await import('~/features/posts/api/client');

  const [post, configs, staff, session] = await Promise.all([
    postKind === 'form' ? loadConsentPostDetail(numericId) : loadPostDetail(numericId),
    getConfigs(),
    fetchSchoolStaff().catch(() => [] as ApiSchoolStaff[]),
    fetchSession(),
  ]);
  return { post, configs, staff, session };
}
```

Note: React Router v7 passes `handle` via `context` in loader functions — verify the exact access pattern. If `context` doesn't carry handle, use `useMatches()` in the component instead. An alternative approach is to have separate loader functions per route that close over the kind:

```ts
export function makePostDetailLoader(postKind: 'announcement' | 'form') {
  return async function loader({ params }: LoaderFunctionArgs): Promise<PostDetailLoaderData> {
    const id = params.id;
    if (!id || !/^\d+$/.test(id)) throw new Response('Not Found', { status: 404 });
    const numericId = Number(id);

    const { loadConsentPostDetail, loadPostDetail } = await import('~/features/posts/api/client');

    const [post, configs, staff, session] = await Promise.all([
      postKind === 'form' ? loadConsentPostDetail(numericId) : loadPostDetail(numericId),
      getConfigs(),
      fetchSchoolStaff().catch(() => [] as ApiSchoolStaff[]),
      fetchSession(),
    ]);
    return { post, configs, staff, session };
  };
}
```

Then in `App.tsx`:

```ts
{ path: '/posts/announcements/:id', loader: makePostDetailLoader('announcement'), ... }
{ path: '/posts/consent-forms/:id', loader: makePostDetailLoader('form'), ... }
```

**Choose whichever approach works with this project's React Router version.** The factory approach is more reliable across RR versions.

Remove imports of: `isAnnouncementDraftId`, `isConsentFormDraftId`, `isConsentFormId`, `validatePostRoute` from this file.

- [ ] **Step 3: Simplify `PostDetailPage` helper `extractDraftNumericId`**

Replace lines 132-141:

```ts
function extractDraftNumericId(id: string): number | null {
  const n = Number(id);
  return Number.isFinite(n) && n > 0 ? n : null;
}
```

Since `id` is now always a bare numeric string, just parse it directly.

- [ ] **Step 4: Update `PostDetailPage` inline editing save handler**

At line 350-357, replace:

```ts
      } else {
        const numericId = post.numericId;
        const initialDate = isoToSgtDate(post.consentByDate);
        const calls: Promise<unknown>[] = [
          updateConsentFormEnquiryEmail(post.numericId, { enquiryEmailAddress: editState.enquiryEmail }),
          updateConsentFormStaffInCharge(post.numericId, editState.staffOwnerIds),
        ];
```

Update `updateAnnouncementEnquiryEmail` and `updateAnnouncementStaffInCharge` calls to use `post.numericId` instead of casting `post.id as AnnouncementId`.

- [ ] **Step 5: Rewrite `CreatePostPage` loader**

Replace the `loadPostByKind` function and loader (lines 129-154) with:

```ts
export function makeCreatePostLoader(postKind?: 'announcement' | 'form', draft?: boolean) {
  return async function loader({
    params,
    request,
  }: LoaderFunctionArgs): Promise<CreatePostLoaderData> {
    let detail: Post | null = null;
    if (params.id && /^\d+$/.test(params.id)) {
      const numericId = Number(params.id);
      if (postKind === 'form') {
        detail = draft
          ? await loadConsentFormDraftDetail(numericId)
          : await loadConsentPostDetail(numericId);
      } else if (postKind === 'announcement') {
        detail = draft
          ? await loadAnnouncementDraftDetail(numericId)
          : await loadPostDetail(numericId);
      }
    }

    const [classes, staff, staffGroups, students, session, configs] = await Promise.all([
      fetchSchoolClasses(),
      fetchSchoolStaff(),
      fetchSchoolStaffGroups().catch(() => ({ level: [], school: [] }) as ApiStaffGroups),
      fetchSchoolStudents(),
      fetchSession(),
      getConfigs(),
    ]);
    return { detail, classes, staff, staffGroups, students, session, configs };
  };
}

export const loader = makeCreatePostLoader();
```

Remove imports: `validatePostRoute`, `parsePostId` from this file.

- [ ] **Step 6: Simplify `CreatePostPage` `draftIdRef` initialization**

Replace lines 428-436:

```ts
const draftIdRef = useRef<{ kind: 'announcement' | 'form'; id: number } | null>(
  editId && detail
    ? { kind: detail.kind === 'form' ? 'form' : 'announcement', id: detail.numericId }
    : null,
);
```

- [ ] **Step 7: Update `CreatePostPage` `handleSavePostedEdit`**

Replace lines 527-541 area — anywhere that does `detail.id as AnnouncementId` or `Number(id.slice(3))`:

```ts
if (detail.kind === 'announcement') {
  await Promise.all([
    updateAnnouncementEnquiryEmail(detail.numericId, { enquiryEmailAddress: email }),
    updateAnnouncementStaffInCharge(detail.numericId, staffIds),
  ]);
} else {
  const consentByDate = state.dueDate.trim() ? `${state.dueDate}T23:59:59+08:00` : '';
  await Promise.all([
    updateConsentFormEnquiryEmail(detail.numericId, { enquiryEmailAddress: email }),
    updateConsentFormStaffInCharge(detail.numericId, staffIds),
    ...(consentByDate ? [updateConsentFormDueDate(detail.numericId, { consentByDate })] : []),
  ]);
}
```

- [ ] **Step 8: Update `CreatePostPage` schedule handler**

At line 560, replace `editId?.startsWith('cf_')` check:

```ts
if (isEditing && detail?.kind === 'form' && detail.numericId) {
  await scheduleExistingConsentFormDraft(detail.numericId, draftPayload);
} else {
  await scheduleNewConsentFormDraft(draftPayload);
}
```

- [ ] **Step 9: Rewrite `PostsListPage` helpers and handlers**

Replace `duplicateDraftHref` (lines 77-81):

```ts
function duplicateDraftHref(kind: 'announcement' | 'form', draftId: number): string {
  return kind === 'announcement'
    ? `/posts/announcements/drafts/${draftId}/edit`
    : `/posts/consent-forms/drafts/${draftId}/edit`;
}
```

Replace `handleDuplicate` (lines 194-221) — remove all `isAnnouncementDraftId`/`isConsentFormDraftId` calls:

```ts
const handleDuplicate = useCallback(
  (row: PostRowData) => {
    const isDraft = row.status === 'draft' || row.status === 'scheduled';
    const promise: Promise<number> =
      row.kind === 'announcement'
        ? (isDraft
            ? duplicateAnnouncementDraft(row.numericId)
            : duplicateAnnouncement(row.numericId)
          ).then((r) => r.announcementDraftId)
        : (isDraft
            ? duplicateConsentFormDraft(row.numericId)
            : duplicateConsentForm(row.numericId)
          ).then((r) => r.consentFormDraftId);

    promise
      .then((draftId) => {
        revalidator.revalidate();
        const href = duplicateDraftHref(row.kind, draftId);
        toast.success(`'${row.title}' has been duplicated.`, {
          action: { label: 'View draft', onClick: () => navigate(href) },
        });
      })
      .catch(() => {
        notify.error('Failed to duplicate post.');
      });
  },
  [revalidator, navigate],
);
```

Replace `confirmDelete` (lines 230-254):

```ts
const confirmDelete = useCallback(async () => {
  const row = pendingDelete;
  if (!row) return;
  setDeleting(true);
  try {
    const isDraft = row.status === 'draft' || row.status === 'scheduled';
    if (row.kind === 'form') {
      if (isDraft) {
        await deleteConsentFormDraft(row.numericId);
      } else {
        await deleteConsentForm(row.numericId);
      }
    } else {
      if (isDraft) {
        await deleteDraft(row.numericId);
      } else {
        await deleteAnnouncement(row.numericId);
      }
    }
    revalidator.revalidate();
    notify.success('Post deleted.');
    setPendingDelete(null);
  } catch (err) {
    if (!(err instanceof NotFoundError)) {
      notify.error('Failed to delete post.');
    }
  } finally {
    setDeleting(false);
  }
}, [pendingDelete, revalidator]);
```

Replace `deleteMode` logic (lines 256-262):

```ts
const deleteMode: 'draft' | 'posted' | null = !pendingDelete
  ? null
  : pendingDelete.status === 'draft' || pendingDelete.status === 'scheduled'
    ? 'draft'
    : 'posted';
```

Replace row click (line 426) — `postHref` already produces the correct URL, no change needed here (just confirm it still works with the new `postHref` signature).

Remove imports: `isAnnouncementDraftId`, `isConsentFormDraftId` from this file. Remove `type AnnouncementId` import if present.

- [ ] **Step 10: Update `features/posts/index.ts` barrel exports**

If using the factory pattern for loaders, update the barrel:

```ts
export { PostsListPage, loader as postsListLoader } from './pages/PostsListPage';
export { PostDetailPage, makePostDetailLoader } from './pages/PostDetailPage';
export { CreatePostPage, makeCreatePostLoader } from './pages/CreatePostPage';
```

Then update `App.tsx` imports accordingly.

- [ ] **Step 11: Update API client function signatures for delete/update**

Check that `deleteConsentForm`, `deleteAnnouncement`, `deleteDraft`, `deleteConsentFormDraft`, `updateAnnouncementEnquiryEmail`, `updateAnnouncementStaffInCharge`, `updateConsentFormEnquiryEmail`, `updateConsentFormStaffInCharge`, `updateConsentFormDueDate` accept `number` (or `number | string`) for their ID parameter. Update their signatures in `client.ts` if they still expect branded types.

- [ ] **Step 12: Run typecheck**

Run: `pnpm typecheck`
Expected: PASS — all branded type references should be resolved

- [ ] **Step 13: Run all tests**

Run: `pnpm test`
Expected: PASS

- [ ] **Step 14: Commit**

```bash
git add src/App.tsx src/features/posts/
git commit -m "feat(routes): implement production URL paths for all post types"
```

---

### Task 5: Update MSW Handlers and Manual Verification

**Files:**

- Modify: `src/mocks/handlers.ts` (if needed)
- Modify: `src/mocks/fixtures/` (if any reference branded IDs)

**Interfaces:**

- Consumes: All prior tasks
- Produces: Working dev server with correct navigation

- [ ] **Step 1: Check MSW handlers for branded ID references**

Search `src/mocks/handlers.ts` for any `annDraft_`, `cfDraft_`, `cf_` references. MSW handlers mock the backend API (`/api/web/2/staff/announcements/...`) — these should NOT contain branded prefixes (they use bare numeric IDs on the API path). Verify and fix if needed.

- [ ] **Step 2: Check mock fixtures**

Search `src/mocks/fixtures/` for `annDraft_`, `cfDraft_`, `cf_` references. If any fixtures use these as IDs in response bodies, update them to bare numeric strings.

- [ ] **Step 3: Run lint and format**

Run: `pnpm lint && pnpm format`
Expected: PASS

- [ ] **Step 4: Run full test suite**

Run: `pnpm test`
Expected: PASS

- [ ] **Step 5: Start dev server and manually verify**

Run: `pnpm dev`

Test these flows:

1. Navigate to `/posts` — list loads
2. Click a posted announcement → URL is `/posts/announcements/<id>`
3. Click a draft announcement → URL is `/posts/announcements/drafts/<id>/edit`
4. Click a posted consent form → URL is `/posts/consent-forms/<id>`
5. Click a draft consent form → URL is `/posts/consent-forms/drafts/<id>/edit`
6. Create new post → save as draft → URL updates to draft path
7. Duplicate a post → navigates to new draft URL

- [ ] **Step 6: Commit any remaining fixes**

```bash
git add .
git commit -m "fix(mocks): update MSW handlers for new URL paths"
```

- [ ] **Step 7: Final validation**

Run: `pnpm typecheck && pnpm lint && pnpm test`
Expected: All PASS
