# Split PG MFE Into Two Federation Exports

## Problem

The host mounts PG at `/posts/*` and `/groups/*` separately, stripping the prefix before passing to PG. But PG's internal routes include the prefix (`posts/...`, `groups/...`), causing route mismatches and blank pages.

## Solution

Expose two independent federation entries — `./Posts` and `./Groups` — each with prefix-free route trees. The current `./App` export becomes a dev-only shell.

## Federation Config

```ts
// rsbuild.config.ts
exposes: {
  './Posts': './src/features/posts/App.tsx',
  './Groups': './src/features/groups/App.tsx',
}
```

## Feature Entry Points

Each feature gets its own `App.tsx` with:

1. A `RouterGuard` — uses `useInRouterContext()` to skip wrapping when inside the host's router
2. An `AppErrorBoundary` wrapper
3. A `Routes` block with prefix-free paths
4. CSS import (`~/index.css`)
5. Toaster (sonner) instance

### Posts Routes (src/features/posts/App.tsx)

| Path                             | Component                                |
| -------------------------------- | ---------------------------------------- |
| `/`                              | PostsListPage                            |
| `/new`                           | CreatePostPage (announcement, not draft) |
| `/announcements/:id`             | PostDetailPage (announcement)            |
| `/announcements/:id/edit`        | CreatePostPage (announcement, not draft) |
| `/announcements/drafts/:id/edit` | CreatePostPage (announcement, draft)     |
| `/consent-forms/:id`             | PostDetailPage (form)                    |
| `/consent-forms/:id/edit`        | CreatePostPage (form, not draft)         |
| `/consent-forms/drafts/:id/edit` | CreatePostPage (form, draft)             |

### Groups Routes (src/features/groups/App.tsx)

| Path                     | Component       |
| ------------------------ | --------------- |
| `/`                      | GroupsListPage  |
| `/new`                   | CreateGroupPage |
| `/new/add-students`      | AddStudentsPage |
| `/classes/:classId`      | ClassDetailPage |
| `/cca/details/:ccaId`    | CcaDetailPage   |
| `/:id`                   | GroupDetailPage |
| `/:id/edit`              | CreateGroupPage |
| `/:id/edit/add-students` | AddStudentsPage |

## Dev Shell (src/App.tsx)

Used only via `bootstrap.tsx` in dev. Provides a `BrowserRouter` with both features mounted under their prefixed paths so dev mirrors the production URL structure:

```tsx
<BrowserRouter>
  <Routes>
    <Route path="/posts/*" element={<PostsApp />} />
    <Route path="/groups/*" element={<GroupsApp />} />
  </Routes>
</BrowserRouter>
```

The dev shell does NOT use `RouterGuard` — it always provides the router. The feature Apps detect they're already inside a router context and skip their own BrowserRouter.

## bootstrap.tsx

No changes needed. Continues to dynamically import `./App` (the dev shell) and render it after MSW starts.

## Shared Code

`~/components`, `~/hooks`, `~/helpers`, `~/lib` remain unchanged. Both feature entries import from these paths.

## Host Integration

```tsx
// Host router
const PGPosts = lazy(() => import('pg/Posts'));
const PGGroups = lazy(() => import('pg/Groups'));

<Routes>
  <Route path="/posts/*" element={<PGPosts />} />
  <Route path="/groups/*" element={<PGGroups />} />
</Routes>;
```

Host federation config references the same remote:

```js
remotes: {
  pg: 'pg@<url>/mf-manifest.json',
}
```

## Files Changed

| File                           | Action               |
| ------------------------------ | -------------------- |
| `src/features/posts/App.tsx`   | Create               |
| `src/features/groups/App.tsx`  | Create               |
| `src/App.tsx`                  | Rewrite as dev shell |
| `rsbuild.config.ts`            | Update `exposes`     |
| `src/features/posts/index.ts`  | Add App export       |
| `src/features/groups/index.ts` | Add App export       |
