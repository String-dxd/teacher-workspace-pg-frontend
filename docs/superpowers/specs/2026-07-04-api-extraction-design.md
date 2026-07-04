# API Extraction Design

Decouple all post API requests from frontend UI into a pure data-access layer with no side effects.

## Goals

- The API layer is independently consumable — no toasts, no redirects, no DOM access
- Clear three-layer architecture: `api/` → `services/` → `pages/`
- Each layer has strict dependency rules enforced by CI
- Domain modules split by concern (announcements, consent forms, school, session, uploads)

## Architecture

```
src/features/posts/
├── api/                          # Pure HTTP layer (typed errors, no side effects)
│   ├── http.ts                   # fetch wrappers, envelope unwrap, CSRF retry, timeout
│   ├── errors.ts                 # AppError hierarchy (no toasts/redirects)
│   ├── types.ts                  # Wire-level API types (request/response shapes)
│   ├── announcements.ts          # Atomic announcement endpoints
│   ├── consent-forms.ts          # Atomic consent form endpoints
│   ├── school.ts                 # Staff, classes, students, groups endpoints
│   ├── session.ts                # fetchSession, fetchUserProfile, getConfigs
│   ├── uploads.ts                # 3 atomic upload endpoints + isPresignedUrlTrusted
│   └── index.ts                  # Barrel re-export
├── mappers/                      # Inbound only (API wire types → domain models)
│   ├── announcements.ts          # mapAnnouncementSummary, mapAnnouncementDetail, mapAnnouncementDraftDetail
│   ├── consent-forms.ts          # mapConsentFormSummary, mapConsentFormDetail, mapConsentFormDraftDetail
│   ├── shared.ts                 # mergeAndDedup, mapReminder, rehydrate*, timezone helpers
│   └── index.ts                  # Barrel re-export
├── services/                     # Orchestration + outbound mapping
│   ├── announcements.ts          # loadPostsList, loadPostDetail, buildAnnouncementPayload
│   ├── consent-forms.ts          # loadConsentPostsList, loadConsentPostDetail, buildConsentFormPayload
│   ├── uploads.ts                # uploadAttachment (3-step orchestration + onProgress)
│   └── index.ts                  # Barrel re-export
├── pages/                        # Route-level (error reactions, UI side effects)
│   └── ...
```

## Dependency Rules

```
pages/ → services/ → api/
                  ↘ mappers/
```

- `api/` imports from: its own internal modules only (`http.ts`, `errors.ts`, `types.ts`)
- `mappers/` imports from: `api/types.ts` (wire types), `~/data/posts-registry` (domain types)
- `services/` imports from: `api/`, `mappers/`
- `pages/` imports from: `services/`, `api/errors` (for catch handling), domain types

No upward imports. Enforced by a shell script in lefthook (see Boundary Enforcement below).

## Layer Details

### `api/` — Pure HTTP Layer

#### `http.ts`

Exports:
- `fetchApi<T>(path)` — GET on `/api/web/2/staff` + path, credentials included, redirect manual
- `fetchApiRoot<T>(path)` — GET on `/api` + path (for endpoints outside `/staff`)
- `mutateApi<T>(method, path, body, options?)` — POST/PUT with JSON body, 30s timeout, CSRF retry
- `deleteApi(path)` — DELETE with error handling
- `postMultipart<T>(path, formData, options?)` — multipart POST, 60s timeout, CSRF retry

Internal (not exported):
- `unwrapEnvelope<T>(json)` — PGW `{body, resultCode}` detection and unwrapping
- `handleErrorResponse(res)` — maps resultCode to typed error; **throws only, no side effects**
- `handleRedirectResponse(res)` — throws `RedirectError` with `.location`; **no window.location**
- `refreshCsrfToken()` — fetches fresh CSRF token
- `withTimeout(ms, signal?)` — composes AbortSignal with timeout

CSRF retry stays in `http.ts` — it's a transport-level concern.

#### `errors.ts`

```typescript
AppError (base: message, resultCode, httpStatus)
├── SessionExpiredError   (resultCode -401 / -4012)
├── NotFoundError         (resultCode -404 or bare HTTP 404)
├── TimeoutError          (synthetic: resultCode -999, httpStatus 0)
├── CsrfError             (resultCode -4013) — caught internally by http.ts for retry
├── RedirectError         (resultCode -4031, httpStatus 302; carries .location)
├── RateLimitError        (resultCode -429) — NEW, replaces inline toast
└── ValidationError       (resultCode -400/-4001/-4003/-4004; carries .fieldPath, .subCode)
```

Key change: `RateLimitError` is a new typed error replacing the current inline toast.

#### Domain Modules (`announcements.ts`, `consent-forms.ts`, `school.ts`, `session.ts`, `uploads.ts`)

Thin wrappers calling `fetchApi`/`mutateApi`/`deleteApi` with correct paths.

- Write functions accept **wire payload types** (`ApiCreateAnnouncementPayload`, etc.)
- Read functions return **raw wire types** (`ApiAnnouncementDetail`, etc.)
- No mapping, no orchestration, no side effects
- `session.ts`: `getConfigs()` retains its 15-minute memoization cache (pure caching, not a UI side effect)

Example signatures:
```typescript
// api/announcements.ts
export function createAnnouncement(payload: ApiCreateAnnouncementPayload): Promise<unknown>
export function fetchAnnouncementDetail(id: number): Promise<ApiAnnouncementDetail>
export function deleteDraft(draftId: number): Promise<void>
```

#### `uploads.ts`

Three atomic endpoints:
```typescript
export function validateAttachmentUpload(file: File, type: string): Promise<PreUploadResult>
export function uploadToPresignedUrl(url: string, fields: Record<string, string>, file: File): Promise<void>
export function verifyAttachmentUpload(attachmentId: string): Promise<VerificationResult>
export function isPresignedUrlTrusted(url: string): boolean
```

### `mappers/` — Inbound Transforms

Converts API wire types to domain models. Pure functions, no I/O.

#### `mappers/announcements.ts`
- `mapAnnouncementSummary(api: ApiAnnouncementSummary, ownership: string)` → `AnnouncementPost`
- `mapAnnouncementDetail(detail: ApiAnnouncementDetail)` → `AnnouncementPost`
- `mapAnnouncementDraftDetail(draft: ApiAnnouncementDraft)` → `AnnouncementPost`

#### `mappers/consent-forms.ts`
- `mapConsentFormSummary(api: ApiConsentFormSummary, ownership: string)` → `ConsentFormPost`
- `mapConsentFormDetail(detail: ApiConsentFormDetail)` → `ConsentFormPost`
- `mapConsentFormDraftDetail(draft: ApiConsentFormDraft)` → `ConsentFormPost`

#### `mappers/shared.ts`
- `mergeAndDedup(own, shared)` — dedup by ID, own takes priority
- `mapReminder(type, date)` → `ReminderConfig`
- `rehydrateAttachments(apiAttachments)` → `UploadedFile[]`
- `rehydratePhotos(apiPhotos)` → `UploadedFile[]`
- `mapReadyAttachments(files)` / `mapReadyPhotos(files)` — ready-file projection
- `selectedToStudentGroups(selected)` / `selectedToStaffGroups(selected)` — recipient mapping
- `localDateToSgtIso(date)` / `splitLocalDateTime(isoString)` — timezone helpers

### `services/` — Orchestration + Outbound Mapping

#### `services/announcements.ts`

Composed reads (fetch + map + merge):
```typescript
export function loadPostsList(): Promise<AnnouncementPost[]>
export function loadPostDetail(id: number): Promise<AnnouncementPost>
export function loadAnnouncementDraftDetail(id: number): Promise<AnnouncementPost>
```

Outbound mapping (form state → wire payload):
```typescript
export function buildAnnouncementPayload(state: BuildPostPayloadInput): ApiCreateAnnouncementPayload
```

Internal helpers: `toPGCreatePayload` (field renaming: `websiteLinks` → `urls`, `shortcutLink` → `shortcuts`).

#### `services/consent-forms.ts`

```typescript
export function loadConsentPostsList(): Promise<ConsentFormPost[]>
export function loadConsentPostDetail(id: number): Promise<ConsentFormPost>
export function loadConsentFormDraftDetail(id: number): Promise<ConsentFormPost>

export function buildConsentFormPayload(state: BuildPostPayloadInput): ApiCreateConsentFormPayload
```

Internal helpers: `toPGConsentFormCreatePayload`, `toPGConsentFormDraftPayload`.

#### `services/uploads.ts`

```typescript
export function uploadAttachment(
  file: File,
  type: string,
  onProgress?: (stage: UploadStage) => void
): Promise<UploadResult>
```

Composes: `validateAttachmentUpload` → `uploadToPresignedUrl` → poll `verifyAttachmentUpload`.

### Pages — Error Handling

Pages catch typed errors and react with UI side effects. Shared utility:

```typescript
// pages/handle-post-error.ts
export function handlePostError(err: unknown): void {
  if (err instanceof SessionExpiredError) {
    window.location.href = '/session-expired'
  } else if (err instanceof RateLimitError) {
    notify.error('Too many requests. Please try again later.')
  } else if (err instanceof RedirectError && err.location) {
    window.location.href = err.location
  } else if (err instanceof AppError) {
    notify.error(err.message)
  }
  // ValidationError: not handled here — pages handle inline per field
}
```

Pages use this in event handlers:
```typescript
try {
  await saveDraft(...)
} catch (err) {
  if (err instanceof ValidationError) {
    dispatch(stampValidationError(err))
  } else {
    handlePostError(err)
  }
}
```

## Boundary Enforcement

A shell script runs in lefthook pre-commit to enforce dependency rules:

```bash
#!/bin/bash
set -euo pipefail

POSTS="src/features/posts"
ERRORS=0

# api/ must not import from services/, mappers/, or pages/
if grep -rE "from ['\"].*/(services|mappers|pages)/" "$POSTS/api/" 2>/dev/null; then
  echo "ERROR: api/ must not import from services/, mappers/, or pages/"
  ERRORS=1
fi

# mappers/ must not import from services/ or pages/
if grep -rE "from ['\"].*/(services|pages)/" "$POSTS/mappers/" 2>/dev/null; then
  echo "ERROR: mappers/ must not import from services/ or pages/"
  ERRORS=1
fi

# services/ must not import from pages/
if grep -rE "from ['\"].*/pages/" "$POSTS/services/" 2>/dev/null; then
  echo "ERROR: services/ must not import from pages/"
  ERRORS=1
fi

exit $ERRORS
```

Added to `lefthook.yml` as a `boundary-check` step that runs alongside lint, format, and typecheck.

## Migration Strategy

This is a refactor — no behavior changes, no new features. Every step follows **red-green testing**:

1. **Red** — write a failing test for the new module/function before implementing it
2. **Green** — implement just enough to make the test pass
3. **Refactor** — clean up, then move on

This ensures each extracted module has test coverage from the start, not retrofitted after the fact. Existing tests must also continue to pass at every step (no regressions).

### Testing Approach Per Layer

**`api/http.ts`** — test error mapping (resultCode → typed error), CSRF retry logic, timeout behavior. These tests assert that NO side effects occur (no toast, no redirect).

**`api/` domain modules** — test that each function calls the correct HTTP method + path with correct payload shape. Mock `http.ts` internals.

**`mappers/`** — test each mapper with fixture data: wire input → expected domain output. Pure function tests, no mocking needed.

**`services/`** — test orchestration: correct API calls made in order, mappers applied, results merged. Mock `api/` and `mappers/` imports.

**`services/` outbound** — test `buildAnnouncementPayload` / `buildConsentFormPayload` with form state fixtures → expected wire payload output.

**`pages/handle-post-error.ts`** — test that each error type triggers the correct side effect (mock `window.location`, `notify`).

**Boundary enforcement script** — test it catches violations (create a temp file with a bad import, assert script exits non-zero).

### Order of Operations

1. Create `api/http.ts` — RED: tests for error mapping + CSRF retry (no side effects). GREEN: extract fetch infrastructure.
2. Create `api/errors.ts` — RED: test `RateLimitError` construction. GREEN: add it, remove side-effect code.
3. Split `api/client.ts` into domain modules — RED: test each module calls correct path/method. GREEN: extract.
4. Create `mappers/` — RED: test each mapper with fixtures. GREEN: move mapper functions.
5. Create `services/` — RED: test orchestration (fetch + map + merge). GREEN: move loaders + outbound mappers.
6. Update `pages/` — RED: test `handlePostError` reactions. GREEN: implement, rewire imports.
7. Delete old `api/client.ts` and `api/mappers.ts`
8. Add boundary enforcement script to lefthook — RED: test it catches bad imports. GREEN: implement.
9. Verify: typecheck, full test suite, dev server

## Non-Goals

- No new features or endpoints
- No changes to domain types in `posts-registry.ts`
- No changes to the React Router route structure
- No changes to MSW mock handlers (they mock at the HTTP level, unaffected)
- No extraction into a separate package (future consideration)
