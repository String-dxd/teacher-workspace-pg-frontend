# Production URL Paths for Posts

## Summary

Replace the branded-prefix URL scheme (`annDraft_301`, `cfDraft_501`, `cf_42`) with explicit, human-readable path segments. Remove the `?kind=` query parameter. Clean break — no redirects from old URLs.

## New Route Structure

| Route                                  | Page           | Context                     |
| -------------------------------------- | -------------- | --------------------------- |
| `/posts`                               | PostsListPage  | List all posts              |
| `/posts/new`                           | CreatePostPage | Create new post             |
| `/posts/announcements/:id`             | PostDetailPage | Published announcement      |
| `/posts/announcements/:id/edit`        | CreatePostPage | Edit published announcement |
| `/posts/announcements/drafts/:id/edit` | CreatePostPage | Edit announcement draft     |
| `/posts/consent-forms/:id`             | PostDetailPage | Published consent form      |
| `/posts/consent-forms/:id/edit`        | CreatePostPage | Edit published consent form |
| `/posts/consent-forms/drafts/:id/edit` | CreatePostPage | Edit consent form draft     |

All `:id` params are bare numeric strings. The route path encodes type and draft status.

## Removing Branded IDs

### What's removed

- `AnnouncementDraftId` (`annDraft_${string}`) branded type
- `ConsentFormDraftId` (`cfDraft_${string}`) branded type
- `ConsentFormId` (`cf_${string}`) branded type
- `parsePostId` — prefix-based parser
- `validatePostRoute` — cross-validates `?kind=` against prefix
- `postKindFromId` — derives kind from prefix
- `isAnnouncementDraftId`, `isConsentFormDraftId`, `isConsentFormId` — type guards

### What replaces them

The `Post` interface gains a `numericId: number` field (raw ID from API). The `id` field becomes a plain `string` (the numeric ID as string, no prefix).

A new `postHref` constructs URLs from `Post.kind` + `Post.status` + `Post.numericId`:

```ts
function postHref(post: Post, opts?: { edit?: boolean }): string {
  const kind = post.kind === 'announcement' ? 'announcements' : 'consent-forms';
  const isDraft = post.status === 'draft' || post.status === 'scheduled';
  const numericId = post.numericId;

  if (isDraft) return `/posts/${kind}/drafts/${numericId}/edit`;
  if (opts?.edit) return `/posts/${kind}/${numericId}/edit`;
  return `/posts/${kind}/${numericId}`;
}
```

## Route Metadata via `handle`

Each route definition includes a `handle` object to tell loaders what context they're in:

```ts
{ path: '/posts/announcements/:id', handle: { postKind: 'announcement', draft: false }, ... }
{ path: '/posts/announcements/drafts/:id/edit', handle: { postKind: 'announcement', draft: true }, ... }
{ path: '/posts/consent-forms/:id', handle: { postKind: 'form', draft: false }, ... }
{ path: '/posts/consent-forms/drafts/:id/edit', handle: { postKind: 'form', draft: true }, ... }
```

Loaders read `handle` from the route match to determine which API endpoint to call.

## Loader Simplifications

**PostDetailPage** — no more draft-rejection guard (drafts have their own routes). Knows the post type from route `handle`.

**CreatePostPage** — no more prefix parsing in `draftIdRef`. Reads bare `:id` param directly. Knows kind and draft status from route `handle`.

**PostsListPage** — `duplicateDraftHref` produces `/posts/announcements/drafts/${id}/edit` or `/posts/consent-forms/drafts/${id}/edit`.

## API Layer

Client functions receive bare numeric IDs directly — no prefix stripping. Function signatures remain the same conceptually; the change is that callers pass numbers instead of branded strings.

Mappers stop prepending `annDraft_`/`cfDraft_`/`cf_` to IDs. They store the raw numeric ID and set `kind`/`status` as before.

No backend API endpoint changes.

## No Route Conflicts

- Frontend routes (`/posts/...`) and API calls (`/api/web/2/staff/...`) are on different prefixes.
- React Router v7 ranked routing ensures `/posts/announcements/drafts/:id/edit` (static `drafts` segment) always beats `/posts/announcements/:id` for paths starting with `drafts/`.

## Files Changed

- `src/App.tsx` — route definitions
- `src/data/posts-registry.ts` — remove branded types, simplify `postHref`, add `numericId`
- `src/features/posts/pages/PostsListPage.tsx` — update `duplicateDraftHref`, remove `?kind=`
- `src/features/posts/pages/PostDetailPage.tsx` — simplify loader
- `src/features/posts/pages/CreatePostPage.tsx` — simplify loader, remove prefix parsing
- `src/features/posts/api/client.ts` — remove prefix stripping
- `src/features/posts/api/mappers.ts` — stop prepending prefixes to IDs
- `src/mocks/handlers.ts` — update if matching on old prefixed paths
- Tests referencing branded IDs or old URL patterns

## Files Unchanged

- Backend API endpoints
- Reducer / state management (`src/features/posts/state/`)
- Upload flow
- Component layer (presentational, receives props)

## Validation

- `pnpm typecheck` — catches broken references to removed types
- `pnpm test` — verifies loader and navigation logic
- Manual dev server check: list → detail, list → draft edit, create → save → navigate
