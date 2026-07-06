# API Extraction Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Decouple all post API requests from frontend UI into a pure data-access layer with typed errors, no side effects, and strict boundary enforcement.

**Architecture:** Three-layer stack (`api/` → `services/` → `pages/`) where the API layer throws typed errors only (no toasts/redirects), the services layer orchestrates multi-call flows and handles outbound mapping, and pages handle error reactions. A separate `mappers/` layer handles inbound wire-to-domain transforms.

**Tech Stack:** TypeScript, Vitest, pnpm, lefthook, oxlint/oxfmt

## Global Constraints

- This work builds on the `refactor-urls` branch — create a new branch from it
- Red-green TDD: every new module gets a failing test before implementation
- No behavior changes — existing tests must pass at every step
- No new dependencies
- `api/` must never import from `services/`, `mappers/`, or `pages/`
- `mappers/` must never import from `services/` or `pages/`
- `services/` must never import from `pages/`
- Use vitest for all tests (`describe`, `it`, `expect`, `vi`)
- GPG signing may be unavailable — use `git -c commit.gpgsign=false commit`

## File Map

### New files to create:

| File                                                 | Responsibility                                                                                                                                    |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/features/posts/api/http.ts`                     | Fetch infrastructure: `fetchApi`, `fetchApiRoot`, `mutateApi`, `deleteApi`, `postMultipart`, envelope unwrap, error handling, CSRF retry, timeout |
| `src/features/posts/api/http.test.ts`                | Tests for error mapping, CSRF retry, timeout, no side effects                                                                                     |
| `src/features/posts/api/announcements.ts`            | Atomic announcement endpoint functions                                                                                                            |
| `src/features/posts/api/announcements.test.ts`       | Tests for announcement endpoint calls                                                                                                             |
| `src/features/posts/api/consent-forms.ts`            | Atomic consent form endpoint functions                                                                                                            |
| `src/features/posts/api/consent-forms.test.ts`       | Tests for consent form endpoint calls                                                                                                             |
| `src/features/posts/api/school.ts`                   | School data + custom groups endpoint functions                                                                                                    |
| `src/features/posts/api/school.test.ts`              | Tests for school endpoints                                                                                                                        |
| `src/features/posts/api/session.ts`                  | Session, user profile, configs endpoints                                                                                                          |
| `src/features/posts/api/session.test.ts`             | Tests for session endpoints                                                                                                                       |
| `src/features/posts/api/uploads.ts`                  | 3 atomic upload endpoints + `isPresignedUrlTrusted`                                                                                               |
| `src/features/posts/api/uploads.test.ts`             | Tests for upload endpoints                                                                                                                        |
| `src/features/posts/api/index.ts`                    | Barrel re-export                                                                                                                                  |
| `src/features/posts/mappers/announcements.ts`        | Inbound announcement mappers                                                                                                                      |
| `src/features/posts/mappers/consent-forms.ts`        | Inbound consent form mappers                                                                                                                      |
| `src/features/posts/mappers/shared.ts`               | Shared mapper helpers (dedup, rehydrate, timezone)                                                                                                |
| `src/features/posts/mappers/index.ts`                | Barrel re-export                                                                                                                                  |
| `src/features/posts/mappers/announcements.test.ts`   | Tests for announcement mappers                                                                                                                    |
| `src/features/posts/mappers/consent-forms.test.ts`   | Tests for consent form mappers                                                                                                                    |
| `src/features/posts/mappers/shared.test.ts`          | Tests for shared helpers                                                                                                                          |
| `src/features/posts/services/announcements.ts`       | Composed loaders + `buildAnnouncementPayload`                                                                                                     |
| `src/features/posts/services/consent-forms.ts`       | Composed loaders + `buildConsentFormPayload`                                                                                                      |
| `src/features/posts/services/uploads.ts`             | `uploadAttachment` orchestration                                                                                                                  |
| `src/features/posts/services/index.ts`               | Barrel re-export                                                                                                                                  |
| `src/features/posts/services/announcements.test.ts`  | Tests for announcement service orchestration                                                                                                      |
| `src/features/posts/services/consent-forms.test.ts`  | Tests for consent form service orchestration                                                                                                      |
| `src/features/posts/services/uploads.test.ts`        | Tests for upload orchestration                                                                                                                    |
| `src/features/posts/pages/handle-post-error.ts`      | Shared error-reaction utility                                                                                                                     |
| `src/features/posts/pages/handle-post-error.test.ts` | Tests for error reactions                                                                                                                         |
| `scripts/check-boundaries.sh`                        | Layer boundary enforcement script                                                                                                                 |

### Files to delete after migration:

| File                                     | Reason                               |
| ---------------------------------------- | ------------------------------------ |
| `src/features/posts/api/client.ts`       | Replaced by domain modules + http.ts |
| `src/features/posts/api/client.test.ts`  | Replaced by per-module tests         |
| `src/features/posts/api/mappers.ts`      | Replaced by `mappers/` directory     |
| `src/features/posts/api/mappers.test.ts` | Replaced by `mappers/*.test.ts`      |

---

### Task 1: Extract `api/errors.ts` — Add `RateLimitError`

**Files:**

- Modify: `src/features/posts/api/errors.ts`
- Test: `src/features/posts/api/http.test.ts` (new file, first test)

**Interfaces:**

- Consumes: nothing (leaf module)
- Produces: `RateLimitError` class (used by `api/http.ts` Task 2, `pages/handle-post-error.ts` Task 9)

- [ ] **Step 1: Write the failing test**

Create `src/features/posts/api/http.test.ts` with:

```typescript
import { describe, it, expect } from 'vitest';
import { RateLimitError, AppError } from './errors';

describe('RateLimitError', () => {
  it('is an instance of AppError with resultCode -429', () => {
    const err = new RateLimitError('Too many requests');
    expect(err).toBeInstanceOf(AppError);
    expect(err.resultCode).toBe(-429);
    expect(err.httpStatus).toBe(429);
    expect(err.name).toBe('RateLimitError');
    expect(err.message).toBe('Too many requests');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test -- src/features/posts/api/http.test.ts`
Expected: FAIL — `RateLimitError` is not exported from `./errors`

- [ ] **Step 3: Implement `RateLimitError`**

Add to `src/features/posts/api/errors.ts`:

```typescript
export class RateLimitError extends AppError {
  constructor(message: string) {
    super(message, -429, 429);
    this.name = 'RateLimitError';
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test -- src/features/posts/api/http.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/features/posts/api/errors.ts src/features/posts/api/http.test.ts
git -c commit.gpgsign=false commit -m "feat(api): add RateLimitError class"
```

---

### Task 2: Extract `api/http.ts` — Fetch infrastructure without side effects

**Files:**

- Create: `src/features/posts/api/http.ts`
- Modify: `src/features/posts/api/http.test.ts` (add tests)

**Interfaces:**

- Consumes: `./errors` (all error classes)
- Produces: `fetchApi<T>(path)`, `fetchApiRoot<T>(path)`, `mutateApi<T>(method, path, body, options?)`, `deleteApi(path)`, `postMultipart<T>(path, formData, options?)`, `unwrapEnvelope<T>(json)` — used by all `api/` domain modules (Tasks 3-7)

- [ ] **Step 1: Write failing tests for error mapping (no side effects)**

Add to `src/features/posts/api/http.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  AppError,
  CsrfError,
  NotFoundError,
  RateLimitError,
  RedirectError,
  SessionExpiredError,
  TimeoutError,
  ValidationError,
} from './errors';

describe('http infrastructure', () => {
  let mockFetchFn: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockFetchFn = vi.fn();
    vi.stubGlobal('fetch', mockFetchFn);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  function pgwError(resultCode: number, message = 'error') {
    return new Response(JSON.stringify({ body: null, resultCode, message }), {
      status: 400,
      headers: { 'content-type': 'application/json' },
    });
  }

  describe('handleErrorResponse — no side effects', () => {
    it('throws SessionExpiredError for -401 without redirecting', async () => {
      const { fetchApi } = await import('./http');
      mockFetchFn.mockResolvedValue(pgwError(-401));

      await expect(fetchApi('/test')).rejects.toThrow(SessionExpiredError);
      expect(window.location.href).not.toBe('/session-expired');
    });

    it('throws RateLimitError for -429 without toasting', async () => {
      const { fetchApi } = await import('./http');
      mockFetchFn.mockResolvedValue(pgwError(-429, 'Too many requests'));

      await expect(fetchApi('/test')).rejects.toThrow(RateLimitError);
    });

    it('throws NotFoundError for -404', async () => {
      const { fetchApi } = await import('./http');
      mockFetchFn.mockResolvedValue(pgwError(-404));

      await expect(fetchApi('/test')).rejects.toThrow(NotFoundError);
    });

    it('throws ValidationError for -400 with fieldPath', async () => {
      const { fetchApi } = await import('./http');
      mockFetchFn.mockResolvedValue(
        new Response(
          JSON.stringify({
            body: null,
            resultCode: -400,
            message: 'Invalid',
            metadata: { fieldPath: 'title', subCode: 'REQUIRED' },
          }),
          { status: 400, headers: { 'content-type': 'application/json' } },
        ),
      );

      const err = await fetchApi('/test').catch((e: unknown) => e);
      expect(err).toBeInstanceOf(ValidationError);
      expect((err as ValidationError).fieldPath).toBe('title');
      expect((err as ValidationError).subCode).toBe('REQUIRED');
    });

    it('throws AppError for unknown codes without toasting', async () => {
      const { fetchApi } = await import('./http');
      mockFetchFn.mockResolvedValue(pgwError(-9999, 'Unknown'));

      await expect(fetchApi('/test')).rejects.toThrow(AppError);
    });
  });

  describe('CSRF retry', () => {
    it('retries once on CsrfError then succeeds', async () => {
      const { mutateApi } = await import('./http');

      mockFetchFn
        .mockResolvedValueOnce(pgwError(-4013, 'CSRF'))
        .mockResolvedValueOnce(new Response(JSON.stringify({ ok: true }), { status: 200 }))
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ body: { id: 1 }, resultCode: 1 }), {
            status: 200,
            headers: { 'content-type': 'application/json' },
          }),
        );

      const result = await mutateApi('POST', '/test', { data: 1 });
      expect(result).toEqual({ id: 1 });
      expect(mockFetchFn).toHaveBeenCalledTimes(3);
    });
  });

  describe('timeout', () => {
    it('throws TimeoutError when request exceeds timeoutMs', async () => {
      const { mutateApi } = await import('./http');
      mockFetchFn.mockImplementation(() => new Promise((resolve) => setTimeout(resolve, 5000)));

      await expect(mutateApi('POST', '/test', {}, { timeoutMs: 10 })).rejects.toThrow(TimeoutError);
    });
  });

  describe('fetchApi', () => {
    it('prepends API_BASE and unwraps envelope', async () => {
      const { fetchApi } = await import('./http');
      mockFetchFn.mockResolvedValue(
        new Response(JSON.stringify({ body: { items: [1, 2] }, resultCode: 1 }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
      );

      const result = await fetchApi('/announcements');
      expect(result).toEqual({ items: [1, 2] });
      expect(mockFetchFn.mock.calls[0][0]).toContain('/api/web/2/staff/announcements');
    });
  });

  describe('fetchApiRoot', () => {
    it('prepends /api without staff path', async () => {
      const { fetchApiRoot } = await import('./http');
      mockFetchFn.mockResolvedValue(
        new Response(JSON.stringify({ body: { flags: {} }, resultCode: 1 }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
      );

      const result = await fetchApiRoot('/configs');
      expect(result).toEqual({ flags: {} });
      expect(mockFetchFn.mock.calls[0][0]).toBe('/api/configs');
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test -- src/features/posts/api/http.test.ts`
Expected: FAIL — `./http` module does not exist

- [ ] **Step 3: Implement `api/http.ts`**

Create `src/features/posts/api/http.ts` — extract from current `client.ts`:

```typescript
import {
  AppError,
  CsrfError,
  NotFoundError,
  RateLimitError,
  RedirectError,
  SessionExpiredError,
  TimeoutError,
  ValidationError,
} from './errors';

const API_BASE = '/api/web/2/staff';
const DEFAULT_WRITE_TIMEOUT_MS = 30_000;
const DEFAULT_UPLOAD_TIMEOUT_MS = 60_000;

export function unwrapEnvelope<T>(json: unknown): T {
  if (
    json !== null &&
    typeof json === 'object' &&
    'body' in json &&
    'resultCode' in json &&
    typeof (json as Record<string, unknown>).resultCode === 'number'
  ) {
    return (json as { body: T }).body;
  }
  return json as T;
}

async function handleErrorResponse(res: Response): Promise<never> {
  let resultCode = 0;
  let message = res.statusText || 'Request failed';
  let metadata: { fieldPath?: string; subCode?: string } | undefined;

  try {
    const json = (await res.json()) as {
      resultCode?: number;
      message?: string;
      metadata?: { fieldPath?: string; subCode?: string };
    };
    resultCode = json.resultCode ?? 0;
    message = json.message ?? message;
    metadata = json.metadata;
  } catch {
    if (res.status === 404) throw new NotFoundError(message, -404, 404);
    throw new AppError(message, 0, res.status);
  }

  switch (resultCode) {
    case -401:
    case -4012:
      throw new SessionExpiredError(message, resultCode, res.status);
    case -404:
      throw new NotFoundError(message, resultCode, res.status);
    case -4013:
      throw new CsrfError(message, resultCode, res.status);
    case -429:
      throw new RateLimitError(message);
    case -400:
    case -4001:
    case -4003:
    case -4004:
      throw new ValidationError(message, resultCode, res.status, metadata);
    default:
      throw new AppError(message, resultCode, res.status);
  }
}

function isRedirectResponse(res: Response): boolean {
  return res.type === 'opaqueredirect' || (res.status >= 300 && res.status < 400);
}

function handleRedirectResponse(res: Response): never {
  const location = res.headers.get('location');
  throw new RedirectError(location);
}

function withTimeout(
  callerSignal: AbortSignal | undefined,
  timeoutMs: number,
): { signal: AbortSignal; dispose: () => void; didTimeout: () => boolean } {
  let timedOut = false;
  const controller = new AbortController();
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);

  if (callerSignal) {
    callerSignal.addEventListener('abort', () => controller.abort(), { once: true });
  }

  return {
    signal: controller.signal,
    dispose: () => clearTimeout(timer),
    didTimeout: () => timedOut,
  };
}

async function refreshCsrfToken(): Promise<void> {
  await fetch(`${API_BASE}/session/current`, { credentials: 'include' });
}

export async function fetchApi<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    redirect: 'manual',
    credentials: 'include',
  });

  if (isRedirectResponse(res)) handleRedirectResponse(res);
  if (!res.ok) await handleErrorResponse(res);

  const json: unknown = await res.json();
  return unwrapEnvelope<T>(json);
}

export async function fetchApiRoot<T>(path: string): Promise<T> {
  const res = await fetch(`/api${path}`, {
    redirect: 'manual',
    credentials: 'include',
  });

  if (isRedirectResponse(res)) handleRedirectResponse(res);
  if (!res.ok) await handleErrorResponse(res);

  const json: unknown = await res.json();
  return unwrapEnvelope<T>(json);
}

export async function mutateApi<T>(
  method: 'POST' | 'PUT',
  path: string,
  body: unknown,
  options: { signal?: AbortSignal; timeoutMs?: number } = {},
): Promise<T> {
  const { signal, dispose, didTimeout } = withTimeout(
    options.signal,
    options.timeoutMs ?? DEFAULT_WRITE_TIMEOUT_MS,
  );

  try {
    const res = await fetch(`${API_BASE}${path}`, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      credentials: 'include',
      redirect: 'manual',
      signal,
    });

    if (isRedirectResponse(res)) handleRedirectResponse(res);
    if (!res.ok) {
      try {
        await handleErrorResponse(res);
      } catch (err) {
        if (err instanceof CsrfError) {
          await refreshCsrfToken();
          return mutateApiInner<T>(method, path, body, options.signal, signal);
        }
        throw err;
      }
    }

    if (res.status === 204) return undefined as T;
    const text = await res.text();
    if (!text) return undefined as T;
    return unwrapEnvelope<T>(JSON.parse(text));
  } catch (err) {
    if (didTimeout()) throw new TimeoutError();
    throw err;
  } finally {
    dispose();
  }
}

async function mutateApiInner<T>(
  method: 'POST' | 'PUT',
  path: string,
  body: unknown,
  callerSignal: AbortSignal | undefined,
  _previousSignal: AbortSignal,
): Promise<T> {
  const { signal, dispose, didTimeout } = withTimeout(callerSignal, DEFAULT_WRITE_TIMEOUT_MS);

  try {
    const res = await fetch(`${API_BASE}${path}`, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      credentials: 'include',
      redirect: 'manual',
      signal,
    });

    if (isRedirectResponse(res)) handleRedirectResponse(res);
    if (!res.ok) await handleErrorResponse(res);

    if (res.status === 204) return undefined as T;
    const text = await res.text();
    if (!text) return undefined as T;
    return unwrapEnvelope<T>(JSON.parse(text));
  } catch (err) {
    if (didTimeout()) throw new TimeoutError();
    throw err;
  } finally {
    dispose();
  }
}

export async function deleteApi(path: string): Promise<void> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'DELETE',
    credentials: 'include',
    redirect: 'manual',
  });

  if (isRedirectResponse(res)) handleRedirectResponse(res);
  if (!res.ok) await handleErrorResponse(res);
}

export async function postMultipart<T>(
  path: string,
  formData: FormData,
  options: { signal?: AbortSignal; timeoutMs?: number } = {},
): Promise<T> {
  const { signal, dispose, didTimeout } = withTimeout(
    options.signal,
    options.timeoutMs ?? DEFAULT_UPLOAD_TIMEOUT_MS,
  );

  try {
    const res = await fetch(`/api${path}`, {
      method: 'POST',
      body: formData,
      credentials: 'include',
      redirect: 'manual',
      signal,
    });

    if (isRedirectResponse(res)) handleRedirectResponse(res);
    if (!res.ok) {
      try {
        await handleErrorResponse(res);
      } catch (err) {
        if (err instanceof CsrfError) {
          await refreshCsrfToken();
          return postMultipartInner<T>(path, formData, options.signal, signal);
        }
        throw err;
      }
    }

    if (res.status === 204) return undefined as T;
    const text = await res.text();
    if (!text) return undefined as T;
    return unwrapEnvelope<T>(JSON.parse(text));
  } catch (err) {
    if (didTimeout()) throw new TimeoutError();
    throw err;
  } finally {
    dispose();
  }
}

async function postMultipartInner<T>(
  path: string,
  formData: FormData,
  callerSignal: AbortSignal | undefined,
  _previousSignal: AbortSignal,
): Promise<T> {
  const { signal, dispose, didTimeout } = withTimeout(callerSignal, DEFAULT_UPLOAD_TIMEOUT_MS);

  try {
    const res = await fetch(`/api${path}`, {
      method: 'POST',
      body: formData,
      credentials: 'include',
      redirect: 'manual',
      signal,
    });

    if (isRedirectResponse(res)) handleRedirectResponse(res);
    if (!res.ok) await handleErrorResponse(res);

    if (res.status === 204) return undefined as T;
    const text = await res.text();
    if (!text) return undefined as T;
    return unwrapEnvelope<T>(JSON.parse(text));
  } catch (err) {
    if (didTimeout()) throw new TimeoutError();
    throw err;
  } finally {
    dispose();
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test -- src/features/posts/api/http.test.ts`
Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/features/posts/api/http.ts src/features/posts/api/http.test.ts
git -c commit.gpgsign=false commit -m "feat(api): extract http.ts with pure error handling"
```

---

### Task 3: Extract `api/announcements.ts` — Atomic endpoint functions

**Files:**

- Create: `src/features/posts/api/announcements.ts`
- Create: `src/features/posts/api/announcements.test.ts`

**Interfaces:**

- Consumes: `./http` (`fetchApi`, `mutateApi`, `deleteApi`), `./types` (all `Api*` types)
- Produces: All announcement endpoint functions — used by `services/announcements.ts` (Task 8)

```typescript
// Exported signatures:
export function fetchAnnouncements(): Promise<ApiAnnouncementList>;
export function fetchSharedAnnouncements(): Promise<ApiAnnouncementList>;
export function fetchAnnouncementDetail(postId: number): Promise<ApiAnnouncementDetail>;
export function fetchAnnouncementDraftDetail(draftId: number): Promise<ApiAnnouncementDraft>;
export function createAnnouncement(
  payload: ApiCreateAnnouncementPayload,
): Promise<{ postId: number }>;
export function createDraft(
  payload: ApiCreateDraftPayload,
  options?: { signal?: AbortSignal; timeoutMs?: number },
): Promise<{ announcementDraftId: number }>;
export function scheduleNewAnnouncementDraft(
  payload: ApiCreateDraftPayload & { scheduledSendAt: string },
  options?: { signal?: AbortSignal },
): Promise<{ announcementDraftId: number; updatedAt: string }>;
export function scheduleExistingAnnouncementDraft(
  draftId: number,
  payload: ApiCreateDraftPayload & { scheduledSendAt: string },
  options?: { signal?: AbortSignal },
): Promise<{ announcementDraftId: number; updatedAt: string }>;
export function rescheduleAnnouncementDraft(
  draftId: number,
  payload: { scheduledSendAt: string },
  options?: { signal?: AbortSignal },
): Promise<void>;
export function cancelAnnouncementSchedule(
  draftId: number,
  options?: { signal?: AbortSignal },
): Promise<void>;
export function updateDraft(
  draftId: number,
  payload: ApiCreateDraftPayload,
  options?: { signal?: AbortSignal },
): Promise<void>;
export function duplicateAnnouncement(
  announcementId: number,
): Promise<ApiDuplicateAnnouncementResponse>;
export function duplicateAnnouncementDraft(
  announcementDraftId: number,
): Promise<ApiDuplicateAnnouncementResponse>;
export function updateAnnouncementEnquiryEmail(
  postId: number,
  payload: { enquiryEmailAddress: string },
): Promise<void>;
export function updateAnnouncementStaffInCharge(postId: number, staffIds: number[]): Promise<void>;
export function deleteAnnouncement(postId: number): Promise<void>;
export function deleteDraft(draftId: number): Promise<void>;
```

- [ ] **Step 1: Write failing tests**

Create `src/features/posts/api/announcements.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('./http', () => ({
  fetchApi: vi.fn(),
  mutateApi: vi.fn(),
  deleteApi: vi.fn(),
}));

import { fetchApi, mutateApi, deleteApi } from './http';
import {
  fetchAnnouncements,
  fetchSharedAnnouncements,
  fetchAnnouncementDetail,
  fetchAnnouncementDraftDetail,
  createAnnouncement,
  createDraft,
  updateDraft,
  scheduleNewAnnouncementDraft,
  scheduleExistingAnnouncementDraft,
  rescheduleAnnouncementDraft,
  cancelAnnouncementSchedule,
  duplicateAnnouncement,
  duplicateAnnouncementDraft,
  updateAnnouncementEnquiryEmail,
  updateAnnouncementStaffInCharge,
  deleteAnnouncement,
  deleteDraft,
} from './announcements';

describe('api/announcements', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('reads', () => {
    it('fetchAnnouncements calls GET /announcements', async () => {
      vi.mocked(fetchApi).mockResolvedValue([]);
      await fetchAnnouncements();
      expect(fetchApi).toHaveBeenCalledWith('/announcements');
    });

    it('fetchSharedAnnouncements calls GET /announcements/shared', async () => {
      vi.mocked(fetchApi).mockResolvedValue([]);
      await fetchSharedAnnouncements();
      expect(fetchApi).toHaveBeenCalledWith('/announcements/shared');
    });

    it('fetchAnnouncementDetail unwraps array response', async () => {
      const detail = { id: 1, title: 'Test' };
      vi.mocked(fetchApi).mockResolvedValue([detail]);
      const result = await fetchAnnouncementDetail(1);
      expect(fetchApi).toHaveBeenCalledWith('/announcements/1');
      expect(result).toEqual(detail);
    });

    it('fetchAnnouncementDraftDetail unwraps array response', async () => {
      const draft = { id: 2, title: 'Draft' };
      vi.mocked(fetchApi).mockResolvedValue([draft]);
      const result = await fetchAnnouncementDraftDetail(2);
      expect(fetchApi).toHaveBeenCalledWith('/announcements/drafts/2');
      expect(result).toEqual(draft);
    });
  });

  describe('writes', () => {
    it('createAnnouncement POSTs to /announcements', async () => {
      const payload = { title: 'New' } as any;
      vi.mocked(mutateApi).mockResolvedValue({ postId: 10 });
      const result = await createAnnouncement(payload);
      expect(mutateApi).toHaveBeenCalledWith('POST', '/announcements', payload, undefined);
      expect(result).toEqual({ postId: 10 });
    });

    it('createDraft POSTs to /announcements/drafts with options', async () => {
      const payload = { title: 'Draft' } as any;
      const options = { signal: new AbortController().signal };
      vi.mocked(mutateApi).mockResolvedValue({ announcementDraftId: 42 });
      await createDraft(payload, options);
      expect(mutateApi).toHaveBeenCalledWith('POST', '/announcements/drafts', payload, options);
    });

    it('updateDraft PUTs to /announcements/drafts/:id', async () => {
      const payload = { title: 'Updated' } as any;
      vi.mocked(mutateApi).mockResolvedValue(undefined);
      await updateDraft(5, payload);
      expect(mutateApi).toHaveBeenCalledWith('PUT', '/announcements/drafts/5', payload, undefined);
    });

    it('rescheduleAnnouncementDraft PUTs to correct path', async () => {
      vi.mocked(mutateApi).mockResolvedValue(undefined);
      await rescheduleAnnouncementDraft(3, { scheduledSendAt: '2026-01-01T00:00:00Z' });
      expect(mutateApi).toHaveBeenCalledWith(
        'PUT',
        '/announcements/drafts/3/rescheduleSchedule',
        { scheduledSendAt: '2026-01-01T00:00:00Z' },
        undefined,
      );
    });

    it('deleteAnnouncement calls DELETE /announcements/:id', async () => {
      vi.mocked(deleteApi).mockResolvedValue(undefined);
      await deleteAnnouncement(7);
      expect(deleteApi).toHaveBeenCalledWith('/announcements/7');
    });

    it('deleteDraft calls DELETE /announcements/drafts/:id', async () => {
      vi.mocked(deleteApi).mockResolvedValue(undefined);
      await deleteDraft(8);
      expect(deleteApi).toHaveBeenCalledWith('/announcements/drafts/8');
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test -- src/features/posts/api/announcements.test.ts`
Expected: FAIL — `./announcements` module does not exist

- [ ] **Step 3: Implement `api/announcements.ts`**

```typescript
import { fetchApi, mutateApi, deleteApi } from './http';
import type {
  ApiAnnouncementDetail,
  ApiAnnouncementDraft,
  ApiAnnouncementList,
  ApiCreateAnnouncementPayload,
  ApiCreateDraftPayload,
  ApiDuplicateAnnouncementResponse,
} from './types';

export function fetchAnnouncements(): Promise<ApiAnnouncementList> {
  return fetchApi('/announcements');
}

export function fetchSharedAnnouncements(): Promise<ApiAnnouncementList> {
  return fetchApi('/announcements/shared');
}

export async function fetchAnnouncementDetail(postId: number): Promise<ApiAnnouncementDetail> {
  const list = await fetchApi<ApiAnnouncementDetail[]>(`/announcements/${postId}`);
  return list[0];
}

export async function fetchAnnouncementDraftDetail(draftId: number): Promise<ApiAnnouncementDraft> {
  const list = await fetchApi<ApiAnnouncementDraft[]>(`/announcements/drafts/${draftId}`);
  return list[0];
}

export function createAnnouncement(
  payload: ApiCreateAnnouncementPayload,
  options?: { signal?: AbortSignal },
): Promise<{ postId: number }> {
  return mutateApi('POST', '/announcements', payload, options);
}

export function createDraft(
  payload: ApiCreateDraftPayload,
  options?: { signal?: AbortSignal; timeoutMs?: number },
): Promise<{ announcementDraftId: number }> {
  return mutateApi('POST', '/announcements/drafts', payload, options);
}

export function scheduleNewAnnouncementDraft(
  payload: ApiCreateDraftPayload & { scheduledSendAt: string },
  options?: { signal?: AbortSignal },
): Promise<{ announcementDraftId: number; updatedAt: string }> {
  return mutateApi('POST', '/announcements/drafts/schedule', payload, options);
}

export function scheduleExistingAnnouncementDraft(
  draftId: number,
  payload: ApiCreateDraftPayload & { scheduledSendAt: string },
  options?: { signal?: AbortSignal },
): Promise<{ announcementDraftId: number; updatedAt: string }> {
  return mutateApi('PUT', `/announcements/drafts/schedule/${draftId}`, payload, options);
}

export function rescheduleAnnouncementDraft(
  draftId: number,
  payload: { scheduledSendAt: string },
  options?: { signal?: AbortSignal },
): Promise<void> {
  return mutateApi('PUT', `/announcements/drafts/${draftId}/rescheduleSchedule`, payload, options);
}

export function cancelAnnouncementSchedule(
  draftId: number,
  options?: { signal?: AbortSignal },
): Promise<void> {
  return mutateApi('POST', `/announcements/drafts/${draftId}/cancelSchedule`, {}, options);
}

export function updateDraft(
  draftId: number,
  payload: ApiCreateDraftPayload,
  options?: { signal?: AbortSignal },
): Promise<void> {
  return mutateApi('PUT', `/announcements/drafts/${draftId}`, payload, options);
}

export function duplicateAnnouncement(
  announcementId: number,
): Promise<ApiDuplicateAnnouncementResponse> {
  return mutateApi('POST', '/announcements/duplicate', { announcementId });
}

export function duplicateAnnouncementDraft(
  announcementDraftId: number,
): Promise<ApiDuplicateAnnouncementResponse> {
  return mutateApi('POST', '/announcements/drafts/duplicate', { announcementDraftId });
}

export function updateAnnouncementEnquiryEmail(
  postId: number,
  payload: { enquiryEmailAddress: string },
): Promise<void> {
  return mutateApi('PUT', `/announcements/${postId}/enquiryEmailAddress`, payload);
}

export function updateAnnouncementStaffInCharge(postId: number, staffIds: number[]): Promise<void> {
  return mutateApi('POST', `/announcements/${postId}/addStaffInCharge`, { staffIds });
}

export function deleteAnnouncement(postId: number): Promise<void> {
  return deleteApi(`/announcements/${postId}`);
}

export function deleteDraft(draftId: number): Promise<void> {
  return deleteApi(`/announcements/drafts/${draftId}`);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test -- src/features/posts/api/announcements.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/features/posts/api/announcements.ts src/features/posts/api/announcements.test.ts
git -c commit.gpgsign=false commit -m "feat(api): extract announcements.ts domain module"
```

---

### Task 4: Extract `api/consent-forms.ts` — Atomic endpoint functions

**Files:**

- Create: `src/features/posts/api/consent-forms.ts`
- Create: `src/features/posts/api/consent-forms.test.ts`

**Interfaces:**

- Consumes: `./http` (`fetchApi`, `mutateApi`, `deleteApi`), `./types`
- Produces: All consent form endpoint functions — used by `services/consent-forms.ts` (Task 8)

```typescript
// Exported signatures:
export function fetchConsentForms(): Promise<ApiConsentFormList>;
export function fetchSharedConsentForms(): Promise<ApiConsentFormList>;
export function fetchConsentFormDetail(formId: number): Promise<ApiConsentFormDetail>;
export function fetchConsentFormDraftDetail(draftId: number): Promise<ApiConsentFormDraft>;
export function createConsentForm(
  payload: ApiCreateConsentFormPayload,
): Promise<{ consentFormId: number }>;
export function createConsentFormDraft(
  payload: ApiCreateConsentFormDraftPayload,
  options?: { signal?: AbortSignal },
): Promise<{ consentFormDraftId: number }>;
export function updateConsentFormDraft(
  draftId: number,
  payload: ApiCreateConsentFormDraftPayload,
  options?: { signal?: AbortSignal },
): Promise<void>;
export function updateConsentFormDueDate(
  formId: number,
  payload: { consentByDate: string },
): Promise<void>;
export function scheduleNewConsentFormDraft(
  payload: ApiCreateConsentFormDraftPayload & { scheduledSendAt: string },
  options?: { signal?: AbortSignal },
): Promise<{ consentFormDraftId: number; updatedAt: string }>;
export function scheduleExistingConsentFormDraft(
  draftId: number,
  payload: ApiCreateConsentFormDraftPayload & { scheduledSendAt: string },
  options?: { signal?: AbortSignal },
): Promise<{ consentFormDraftId: number; updatedAt: string }>;
export function rescheduleConsentFormDraft(
  draftId: number,
  payload: { scheduledSendAt: string },
  options?: { signal?: AbortSignal },
): Promise<void>;
export function cancelConsentFormSchedule(
  draftId: number,
  options?: { signal?: AbortSignal },
): Promise<void>;
export function duplicateConsentForm(
  consentFormId: number,
): Promise<ApiDuplicateConsentFormResponse>;
export function duplicateConsentFormDraft(
  consentFormDraftId: number,
): Promise<ApiDuplicateConsentFormResponse>;
export function deleteConsentForm(formId: number): Promise<void>;
export function deleteConsentFormDraft(draftId: number): Promise<void>;
export function updateConsentFormEnquiryEmail(
  formId: number,
  payload: { enquiryEmailAddress: string },
): Promise<void>;
export function updateConsentFormStaffInCharge(formId: number, staffIds: number[]): Promise<void>;
```

- [ ] **Step 1: Write failing tests**

Create `src/features/posts/api/consent-forms.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('./http', () => ({
  fetchApi: vi.fn(),
  mutateApi: vi.fn(),
  deleteApi: vi.fn(),
}));

import { fetchApi, mutateApi, deleteApi } from './http';
import {
  fetchConsentForms,
  fetchSharedConsentForms,
  fetchConsentFormDetail,
  fetchConsentFormDraftDetail,
  createConsentForm,
  createConsentFormDraft,
  updateConsentFormDraft,
  updateConsentFormDueDate,
  rescheduleConsentFormDraft,
  cancelConsentFormSchedule,
  duplicateConsentForm,
  duplicateConsentFormDraft,
  deleteConsentForm,
  deleteConsentFormDraft,
  updateConsentFormEnquiryEmail,
  updateConsentFormStaffInCharge,
} from './consent-forms';

describe('api/consent-forms', () => {
  beforeEach(() => vi.clearAllMocks());

  describe('reads', () => {
    it('fetchConsentForms calls GET /consentForms', async () => {
      vi.mocked(fetchApi).mockResolvedValue([]);
      await fetchConsentForms();
      expect(fetchApi).toHaveBeenCalledWith('/consentForms');
    });

    it('fetchSharedConsentForms calls GET /consentForms/shared', async () => {
      vi.mocked(fetchApi).mockResolvedValue([]);
      await fetchSharedConsentForms();
      expect(fetchApi).toHaveBeenCalledWith('/consentForms/shared');
    });

    it('fetchConsentFormDetail unwraps array response', async () => {
      const detail = { id: 1, title: 'Form' };
      vi.mocked(fetchApi).mockResolvedValue([detail]);
      const result = await fetchConsentFormDetail(1);
      expect(fetchApi).toHaveBeenCalledWith('/consentForms/1');
      expect(result).toEqual(detail);
    });

    it('fetchConsentFormDraftDetail unwraps array response', async () => {
      const draft = { id: 2, title: 'Draft' };
      vi.mocked(fetchApi).mockResolvedValue([draft]);
      const result = await fetchConsentFormDraftDetail(2);
      expect(fetchApi).toHaveBeenCalledWith('/consentForms/drafts/2');
      expect(result).toEqual(draft);
    });
  });

  describe('writes', () => {
    it('createConsentForm POSTs to /consentForms', async () => {
      vi.mocked(mutateApi).mockResolvedValue({ consentFormId: 5 });
      const result = await createConsentForm({ title: 'CF' } as any);
      expect(mutateApi).toHaveBeenCalledWith('POST', '/consentForms', { title: 'CF' }, undefined);
      expect(result).toEqual({ consentFormId: 5 });
    });

    it('updateConsentFormDueDate PUTs to correct path', async () => {
      vi.mocked(mutateApi).mockResolvedValue(undefined);
      await updateConsentFormDueDate(3, { consentByDate: '2026-12-31' });
      expect(mutateApi).toHaveBeenCalledWith(
        'PUT',
        '/consentForms/3/updateDueDate',
        { consentByDate: '2026-12-31' },
        undefined,
      );
    });

    it('rescheduleConsentFormDraft PUTs to correct path', async () => {
      vi.mocked(mutateApi).mockResolvedValue(undefined);
      await rescheduleConsentFormDraft(4, { scheduledSendAt: '2026-01-01T00:00:00Z' });
      expect(mutateApi).toHaveBeenCalledWith(
        'PUT',
        '/consentForms/drafts/4/rescheduleSchedule',
        { scheduledSendAt: '2026-01-01T00:00:00Z' },
        undefined,
      );
    });

    it('deleteConsentForm calls DELETE /consentForms/:id', async () => {
      vi.mocked(deleteApi).mockResolvedValue(undefined);
      await deleteConsentForm(6);
      expect(deleteApi).toHaveBeenCalledWith('/consentForms/6');
    });

    it('deleteConsentFormDraft calls DELETE /consentForms/drafts/:id', async () => {
      vi.mocked(deleteApi).mockResolvedValue(undefined);
      await deleteConsentFormDraft(7);
      expect(deleteApi).toHaveBeenCalledWith('/consentForms/drafts/7');
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test -- src/features/posts/api/consent-forms.test.ts`
Expected: FAIL — `./consent-forms` module does not exist

- [ ] **Step 3: Implement `api/consent-forms.ts`**

```typescript
import { fetchApi, mutateApi, deleteApi } from './http';
import type {
  ApiConsentFormDetail,
  ApiConsentFormDraft,
  ApiConsentFormList,
  ApiCreateConsentFormDraftPayload,
  ApiCreateConsentFormPayload,
  ApiDuplicateConsentFormResponse,
} from './types';

export function fetchConsentForms(): Promise<ApiConsentFormList> {
  return fetchApi('/consentForms');
}

export function fetchSharedConsentForms(): Promise<ApiConsentFormList> {
  return fetchApi('/consentForms/shared');
}

export async function fetchConsentFormDetail(formId: number): Promise<ApiConsentFormDetail> {
  const list = await fetchApi<ApiConsentFormDetail[]>(`/consentForms/${formId}`);
  return list[0];
}

export async function fetchConsentFormDraftDetail(draftId: number): Promise<ApiConsentFormDraft> {
  const list = await fetchApi<ApiConsentFormDraft[]>(`/consentForms/drafts/${draftId}`);
  return list[0];
}

export function createConsentForm(
  payload: ApiCreateConsentFormPayload,
  options?: { signal?: AbortSignal },
): Promise<{ consentFormId: number }> {
  return mutateApi('POST', '/consentForms', payload, options);
}

export function createConsentFormDraft(
  payload: ApiCreateConsentFormDraftPayload,
  options?: { signal?: AbortSignal },
): Promise<{ consentFormDraftId: number }> {
  return mutateApi('POST', '/consentForms/drafts', payload, options);
}

export function updateConsentFormDraft(
  draftId: number,
  payload: ApiCreateConsentFormDraftPayload,
  options?: { signal?: AbortSignal },
): Promise<void> {
  return mutateApi('PUT', `/consentForms/drafts/${draftId}`, payload, options);
}

export function updateConsentFormDueDate(
  formId: number,
  payload: { consentByDate: string },
): Promise<void> {
  return mutateApi('PUT', `/consentForms/${formId}/updateDueDate`, payload);
}

export function scheduleNewConsentFormDraft(
  payload: ApiCreateConsentFormDraftPayload & { scheduledSendAt: string },
  options?: { signal?: AbortSignal },
): Promise<{ consentFormDraftId: number; updatedAt: string }> {
  return mutateApi('POST', '/consentForms/drafts/schedule', payload, options);
}

export function scheduleExistingConsentFormDraft(
  draftId: number,
  payload: ApiCreateConsentFormDraftPayload & { scheduledSendAt: string },
  options?: { signal?: AbortSignal },
): Promise<{ consentFormDraftId: number; updatedAt: string }> {
  return mutateApi('PUT', `/consentForms/drafts/schedule/${draftId}`, payload, options);
}

export function rescheduleConsentFormDraft(
  draftId: number,
  payload: { scheduledSendAt: string },
  options?: { signal?: AbortSignal },
): Promise<void> {
  return mutateApi('PUT', `/consentForms/drafts/${draftId}/rescheduleSchedule`, payload, options);
}

export function cancelConsentFormSchedule(
  draftId: number,
  options?: { signal?: AbortSignal },
): Promise<void> {
  return mutateApi('POST', `/consentForms/drafts/${draftId}/cancelSchedule`, {}, options);
}

export function duplicateConsentForm(
  consentFormId: number,
): Promise<ApiDuplicateConsentFormResponse> {
  return mutateApi('POST', '/consentForms/duplicate', { consentFormId });
}

export function duplicateConsentFormDraft(
  consentFormDraftId: number,
): Promise<ApiDuplicateConsentFormResponse> {
  return mutateApi('POST', '/consentForms/drafts/duplicate', { consentFormDraftId });
}

export function deleteConsentForm(formId: number): Promise<void> {
  return deleteApi(`/consentForms/${formId}`);
}

export function deleteConsentFormDraft(draftId: number): Promise<void> {
  return deleteApi(`/consentForms/drafts/${draftId}`);
}

export function updateConsentFormEnquiryEmail(
  formId: number,
  payload: { enquiryEmailAddress: string },
): Promise<void> {
  return mutateApi('PUT', `/consentForms/${formId}/updateEnquiryEmail`, payload);
}

export function updateConsentFormStaffInCharge(formId: number, staffIds: number[]): Promise<void> {
  return mutateApi('POST', `/consentForms/${formId}/addStaffInCharge`, { staffIds });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test -- src/features/posts/api/consent-forms.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/features/posts/api/consent-forms.ts src/features/posts/api/consent-forms.test.ts
git -c commit.gpgsign=false commit -m "feat(api): extract consent-forms.ts domain module"
```

---

### Task 5: Extract `api/school.ts` — School data + custom groups

**Files:**

- Create: `src/features/posts/api/school.ts`
- Create: `src/features/posts/api/school.test.ts`

**Interfaces:**

- Consumes: `./http` (`fetchApi`, `mutateApi`, `deleteApi`), `./types`
- Produces: All school data functions — used by page loaders

```typescript
// Exported signatures:
export function fetchSchoolStaff(): Promise<ApiSchoolStaff[]>;
export function fetchSchoolClasses(): Promise<ApiSchoolClass[]>;
export function fetchSchoolStudents(): Promise<ApiSchoolStudent[]>;
export function fetchSchoolStaffGroups(): Promise<ApiStaffGroups>;
export function fetchGroupsAssigned(): Promise<ApiGroupsAssigned>;
export function fetchCustomGroups(): Promise<ApiCustomGroupSummary[]>;
export function fetchCustomGroupDetail(id: number): Promise<ApiCustomGroupDetail>;
export function createCustomGroup(payload: {
  name: string;
  studentIds: number[];
}): Promise<ApiCreateCustomGroupResponse>;
export function updateCustomGroup(
  id: number,
  payload: { name: string; studentIds: number[] },
): Promise<void>;
export function shareCustomGroup(id: number, staffIds: number[]): Promise<void>;
export function removeAccessFromCustomGroup(id: number): Promise<void>;
export function deleteCustomGroup(id: number): Promise<void>;
export function fetchClassDetail(classId: number): Promise<ApiClassDetail>;
export function fetchCcaDetail(ccaId: number): Promise<ApiCcaDetail>;
```

- [ ] **Step 1: Write failing tests**

Create `src/features/posts/api/school.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('./http', () => ({
  fetchApi: vi.fn(),
  mutateApi: vi.fn(),
  deleteApi: vi.fn(),
}));

import { fetchApi, mutateApi, deleteApi } from './http';
import {
  fetchSchoolStaff,
  fetchSchoolClasses,
  fetchSchoolStudents,
  fetchSchoolStaffGroups,
  fetchGroupsAssigned,
  fetchCustomGroups,
  fetchCustomGroupDetail,
  createCustomGroup,
  updateCustomGroup,
  shareCustomGroup,
  removeAccessFromCustomGroup,
  deleteCustomGroup,
  fetchClassDetail,
  fetchCcaDetail,
} from './school';

describe('api/school', () => {
  beforeEach(() => vi.clearAllMocks());

  it('fetchSchoolStaff calls GET /school/staff', async () => {
    vi.mocked(fetchApi).mockResolvedValue([]);
    await fetchSchoolStaff();
    expect(fetchApi).toHaveBeenCalledWith('/school/staff');
  });

  it('fetchSchoolClasses extracts data.class from response', async () => {
    vi.mocked(fetchApi).mockResolvedValue({ data: { class: [{ id: 1 }] } });
    const result = await fetchSchoolClasses();
    expect(fetchApi).toHaveBeenCalledWith('/school/groups');
    expect(result).toEqual([{ id: 1 }]);
  });

  it('fetchSchoolStudents calls GET /school/students', async () => {
    vi.mocked(fetchApi).mockResolvedValue([]);
    await fetchSchoolStudents();
    expect(fetchApi).toHaveBeenCalledWith('/school/students');
  });

  it('fetchSchoolStaffGroups calls GET /school/staffGroups', async () => {
    vi.mocked(fetchApi).mockResolvedValue({ groups: [] });
    await fetchSchoolStaffGroups();
    expect(fetchApi).toHaveBeenCalledWith('/school/staffGroups');
  });

  it('fetchGroupsAssigned calls GET /groups/assigned', async () => {
    vi.mocked(fetchApi).mockResolvedValue({});
    await fetchGroupsAssigned();
    expect(fetchApi).toHaveBeenCalledWith('/groups/assigned');
  });

  it('createCustomGroup POSTs with mapped field names', async () => {
    vi.mocked(mutateApi).mockResolvedValue({ id: 10 });
    await createCustomGroup({ name: 'Group A', studentIds: [1, 2] });
    expect(mutateApi).toHaveBeenCalledWith(
      'POST',
      '/groups/custom',
      { groupName: 'Group A', selectedSchoolStudents: [1, 2] },
      undefined,
    );
  });

  it('deleteCustomGroup calls DELETE /groups/custom/:id', async () => {
    vi.mocked(deleteApi).mockResolvedValue(undefined);
    await deleteCustomGroup(5);
    expect(deleteApi).toHaveBeenCalledWith('/groups/custom/5');
  });

  it('fetchClassDetail calls GET /groups/classes/:id', async () => {
    vi.mocked(fetchApi).mockResolvedValue({ id: 3 });
    await fetchClassDetail(3);
    expect(fetchApi).toHaveBeenCalledWith('/groups/classes/3');
  });

  it('fetchCcaDetail calls GET /groups/ccas/:id', async () => {
    vi.mocked(fetchApi).mockResolvedValue({ id: 4 });
    await fetchCcaDetail(4);
    expect(fetchApi).toHaveBeenCalledWith('/groups/ccas/4');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test -- src/features/posts/api/school.test.ts`
Expected: FAIL — `./school` module does not exist

- [ ] **Step 3: Implement `api/school.ts`**

```typescript
import { fetchApi, mutateApi, deleteApi } from './http';
import type {
  ApiCcaDetail,
  ApiClassDetail,
  ApiCustomGroupDetail,
  ApiCustomGroupSummary,
  ApiGroupsAssigned,
  ApiSchoolClass,
  ApiSchoolStudent,
  ApiStaffGroups,
} from './types';

export function fetchSchoolStaff(): Promise<unknown[]> {
  return fetchApi('/school/staff');
}

export async function fetchSchoolClasses(): Promise<ApiSchoolClass[]> {
  const res = await fetchApi<{ data: { class: ApiSchoolClass[] } }>('/school/groups');
  return res.data.class;
}

export function fetchSchoolStudents(): Promise<ApiSchoolStudent[]> {
  return fetchApi('/school/students');
}

export function fetchSchoolStaffGroups(): Promise<ApiStaffGroups> {
  return fetchApi('/school/staffGroups');
}

export function fetchGroupsAssigned(): Promise<ApiGroupsAssigned> {
  return fetchApi('/groups/assigned');
}

interface PgwRawCustomGroup {
  customGroupId: number;
  customGroupName: string;
  createdByStaffId: number;
  createdByStaffName: string;
  totalStudents: number;
  isShared: boolean;
}

interface PgwRawCustomGroupDetail {
  customGroupId: number;
  customGroupName: string;
  createdByStaffId: number;
  createdByStaffName: string;
  isShared: boolean;
  sharedWith: Array<{ staffId: number; staffName: string }>;
  students: Array<{ schoolStudentId: number; studentName: string; indexNumber: string }>;
}

function mapPgwCustomGroup(raw: PgwRawCustomGroup): ApiCustomGroupSummary {
  return {
    id: raw.customGroupId,
    name: raw.customGroupName,
    createdByStaffId: raw.createdByStaffId,
    createdByStaffName: raw.createdByStaffName,
    totalStudents: raw.totalStudents,
    isShared: raw.isShared,
  };
}

function mapPgwCustomGroupDetail(raw: PgwRawCustomGroupDetail): ApiCustomGroupDetail {
  return {
    id: raw.customGroupId,
    name: raw.customGroupName,
    createdByStaffId: raw.createdByStaffId,
    createdByStaffName: raw.createdByStaffName,
    isShared: raw.isShared,
    sharedWith: raw.sharedWith,
    students: raw.students,
  };
}

export async function fetchCustomGroups(): Promise<ApiCustomGroupSummary[]> {
  const raw = await fetchApi<PgwRawCustomGroup[]>('/groups/custom');
  return raw.map(mapPgwCustomGroup);
}

export async function fetchCustomGroupDetail(id: number): Promise<ApiCustomGroupDetail> {
  const raw = await fetchApi<PgwRawCustomGroupDetail | PgwRawCustomGroupDetail[]>(
    `/groups/custom/${id}`,
  );
  const item = Array.isArray(raw) ? raw[0] : raw;
  return mapPgwCustomGroupDetail(item);
}

export function createCustomGroup(payload: {
  name: string;
  studentIds: number[];
}): Promise<unknown> {
  return mutateApi('POST', '/groups/custom', {
    groupName: payload.name,
    selectedSchoolStudents: payload.studentIds,
  });
}

export function updateCustomGroup(
  id: number,
  payload: { name: string; studentIds: number[] },
): Promise<void> {
  return mutateApi('PUT', `/groups/custom/${id}`, {
    groupName: payload.name,
    selectedSchoolStudents: payload.studentIds,
  });
}

export function shareCustomGroup(id: number, staffIds: number[]): Promise<void> {
  return mutateApi('PUT', `/groups/custom/${id}/share`, { selectedStaff: staffIds });
}

export function removeAccessFromCustomGroup(id: number): Promise<void> {
  return mutateApi('PUT', `/groups/custom/${id}/removeAccess`, {});
}

export function deleteCustomGroup(id: number): Promise<void> {
  return deleteApi(`/groups/custom/${id}`);
}

export function fetchClassDetail(classId: number): Promise<ApiClassDetail> {
  return fetchApi(`/groups/classes/${classId}`);
}

export function fetchCcaDetail(ccaId: number): Promise<ApiCcaDetail> {
  return fetchApi(`/groups/ccas/${ccaId}`);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test -- src/features/posts/api/school.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/features/posts/api/school.ts src/features/posts/api/school.test.ts
git -c commit.gpgsign=false commit -m "feat(api): extract school.ts domain module"
```

---

### Task 6: Extract `api/session.ts` — Session, profile, configs

**Files:**

- Create: `src/features/posts/api/session.ts`
- Create: `src/features/posts/api/session.test.ts`

**Interfaces:**

- Consumes: `./http` (`fetchApi`, `fetchApiRoot`, `mutateApi`), `./types`
- Produces: `fetchSession()`, `fetchUserProfile()`, `getConfigs()`, `updateDisplayName()`, `updateDisplayEmail()`

- [ ] **Step 1: Write failing tests**

Create `src/features/posts/api/session.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('./http', () => ({
  fetchApi: vi.fn(),
  fetchApiRoot: vi.fn(),
  mutateApi: vi.fn(),
}));

import { fetchApi, fetchApiRoot, mutateApi } from './http';
import {
  fetchSession,
  fetchUserProfile,
  getConfigs,
  updateDisplayName,
  updateDisplayEmail,
} from './session';

describe('api/session', () => {
  beforeEach(() => vi.clearAllMocks());

  it('fetchSession calls GET /session/current', async () => {
    vi.mocked(fetchApi).mockResolvedValue({ staffId: 1 });
    const result = await fetchSession();
    expect(fetchApi).toHaveBeenCalledWith('/session/current');
    expect(result).toEqual({ staffId: 1 });
  });

  it('fetchUserProfile calls GET /users/me', async () => {
    vi.mocked(fetchApi).mockResolvedValue({ name: 'Test' });
    await fetchUserProfile();
    expect(fetchApi).toHaveBeenCalledWith('/users/me');
  });

  it('getConfigs calls fetchApiRoot /configs', async () => {
    vi.mocked(fetchApiRoot).mockResolvedValue({ flags: { featureX: true }, configs: {} });
    const result = await getConfigs();
    expect(fetchApiRoot).toHaveBeenCalledWith('/configs');
    expect(result).toEqual({ flags: { featureX: true }, configs: {} });
  });

  it('getConfigs returns cached value within TTL', async () => {
    vi.mocked(fetchApiRoot).mockResolvedValue({ flags: {}, configs: {} });
    await getConfigs();
    await getConfigs();
    expect(fetchApiRoot).toHaveBeenCalledTimes(1);
  });

  it('getConfigs returns fallback on failure', async () => {
    vi.mocked(fetchApiRoot).mockRejectedValue(new Error('network'));
    const result = await getConfigs();
    expect(result).toEqual({ flags: {}, configs: {} });
  });

  it('updateDisplayName PUTs to /:staffId/updateDisplayName', async () => {
    vi.mocked(mutateApi).mockResolvedValue(undefined);
    await updateDisplayName(42, 'New Name');
    expect(mutateApi).toHaveBeenCalledWith(
      'PUT',
      '/42/updateDisplayName',
      { displayName: 'New Name' },
      undefined,
    );
  });

  it('updateDisplayEmail PUTs to /:staffId/updateDisplayEmail', async () => {
    vi.mocked(mutateApi).mockResolvedValue(undefined);
    await updateDisplayEmail(42, 'new@email.com');
    expect(mutateApi).toHaveBeenCalledWith(
      'PUT',
      '/42/updateDisplayEmail',
      { displayEmail: 'new@email.com' },
      undefined,
    );
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test -- src/features/posts/api/session.test.ts`
Expected: FAIL — `./session` module does not exist

- [ ] **Step 3: Implement `api/session.ts`**

```typescript
import { fetchApi, fetchApiRoot, mutateApi } from './http';
import type { ApiConfig, ApiSession, ApiUserProfile } from './types';

const CONFIGS_STALE_MS = 15 * 60 * 1000;
const EMPTY_CONFIG: ApiConfig = { flags: {}, configs: {} };

let cachedConfigs: ApiConfig | null = null;
let cachedAt = 0;

export function fetchSession(): Promise<ApiSession> {
  return fetchApi('/session/current');
}

export function fetchUserProfile(): Promise<ApiUserProfile> {
  return fetchApi('/users/me');
}

export async function getConfigs(): Promise<ApiConfig> {
  if (cachedConfigs && Date.now() - cachedAt < CONFIGS_STALE_MS) {
    return cachedConfigs;
  }
  try {
    const result = await fetchApiRoot<ApiConfig>('/configs');
    cachedConfigs = result;
    cachedAt = Date.now();
    return result;
  } catch {
    return EMPTY_CONFIG;
  }
}

export function updateDisplayName(staffId: number, displayName: string): Promise<void> {
  return mutateApi('PUT', `/${staffId}/updateDisplayName`, { displayName });
}

export function updateDisplayEmail(staffId: number, displayEmail: string): Promise<void> {
  return mutateApi('PUT', `/${staffId}/updateDisplayEmail`, { displayEmail });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test -- src/features/posts/api/session.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/features/posts/api/session.ts src/features/posts/api/session.test.ts
git -c commit.gpgsign=false commit -m "feat(api): extract session.ts domain module"
```

---

### Task 7: Extract `api/uploads.ts` — Atomic upload endpoints

**Files:**

- Create: `src/features/posts/api/uploads.ts`
- Create: `src/features/posts/api/uploads.test.ts`

**Interfaces:**

- Consumes: `./http` (`postMultipart`, `fetchApiRoot`), `./types`
- Produces: `validateAttachmentUpload`, `uploadToPresignedUrl`, `verifyAttachmentUpload`, `isPresignedUrlTrusted`, `AttachmentUploadType`, `PreUploadResponse` — used by `services/uploads.ts` (Task 12)

- [ ] **Step 1: Write failing tests**

Create `src/features/posts/api/uploads.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('./http', () => ({
  postMultipart: vi.fn(),
  fetchApiRoot: vi.fn(),
}));

import { postMultipart, fetchApiRoot } from './http';
import {
  validateAttachmentUpload,
  uploadToPresignedUrl,
  verifyAttachmentUpload,
  isPresignedUrlTrusted,
} from './uploads';

describe('api/uploads', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => vi.restoreAllMocks());

  describe('validateAttachmentUpload', () => {
    it('posts FormData to /files/2/preUploadValidation', async () => {
      vi.mocked(postMultipart).mockResolvedValue({
        attachmentId: 1,
        presignedUrl: 'https://s3.amazonaws.com/bucket',
        fields: { key: 'value' },
      });

      const file = new File(['content'], 'test.pdf', { type: 'application/pdf' });
      const result = await validateAttachmentUpload(file, 'ANNOUNCEMENT');

      expect(postMultipart).toHaveBeenCalledTimes(1);
      const [path, formData] = vi.mocked(postMultipart).mock.calls[0];
      expect(path).toBe('/files/2/preUploadValidation');
      expect(formData).toBeInstanceOf(FormData);
      expect(result.attachmentId).toBe(1);
    });
  });

  describe('uploadToPresignedUrl', () => {
    it('posts FormData to presigned URL with fields before file', async () => {
      const mockFetch = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
      vi.stubGlobal('fetch', mockFetch);

      const file = new File(['content'], 'test.pdf');
      await uploadToPresignedUrl('https://s3.amazonaws.com/bucket', { key: 'val' }, file);

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const [url, init] = mockFetch.mock.calls[0];
      expect(url).toBe('https://s3.amazonaws.com/bucket');
      expect(init.method).toBe('POST');
      expect(init.body).toBeInstanceOf(FormData);
    });

    it('throws if URL is not trusted', async () => {
      const file = new File(['content'], 'test.pdf');
      await expect(uploadToPresignedUrl('https://evil.com/upload', {}, file)).rejects.toThrow(
        'Untrusted upload URL',
      );
    });
  });

  describe('isPresignedUrlTrusted', () => {
    it('trusts s3.amazonaws.com URLs', () => {
      expect(isPresignedUrlTrusted('https://bucket.s3.amazonaws.com/key')).toBe(true);
      expect(isPresignedUrlTrusted('https://bucket.s3.us-east-1.amazonaws.com/key')).toBe(true);
      expect(isPresignedUrlTrusted('https://s3.amazonaws.com/bucket/key')).toBe(true);
    });

    it('rejects non-S3 URLs', () => {
      expect(isPresignedUrlTrusted('https://evil.com/upload')).toBe(false);
      expect(isPresignedUrlTrusted('https://s3.amazonaws.com.evil.com/key')).toBe(false);
    });
  });

  describe('verifyAttachmentUpload', () => {
    it('polls until verified is true', async () => {
      vi.mocked(fetchApiRoot)
        .mockResolvedValueOnce({ verified: false })
        .mockResolvedValueOnce({ verified: true });

      const result = await verifyAttachmentUpload(123, { intervalMs: 10, timeoutMs: 5000 });
      expect(result.verified).toBe(true);
      expect(fetchApiRoot).toHaveBeenCalledTimes(2);
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test -- src/features/posts/api/uploads.test.ts`
Expected: FAIL — `./uploads` module does not exist

- [ ] **Step 3: Implement `api/uploads.ts`**

```typescript
import { fetchApiRoot, postMultipart } from './http';

export type AttachmentUploadType = 'ANNOUNCEMENT' | 'CONSENT_FORM';

export interface PreUploadResponse {
  attachmentId: number;
  presignedUrl: string;
  fields: Record<string, string>;
}

const S3_TRUSTED_PATTERN = /^(.+\.)?s3([.-].+)?\.amazonaws\.com$/;

export function isPresignedUrlTrusted(url: string): boolean {
  try {
    const { hostname } = new URL(url);
    if (S3_TRUSTED_PATTERN.test(hostname)) return true;
    const trustedOrigins = import.meta.env.VITE_TRUSTED_UPLOAD_ORIGINS;
    if (trustedOrigins) {
      return trustedOrigins.split(',').some((origin: string) => hostname === origin.trim());
    }
    return false;
  } catch {
    return false;
  }
}

export async function validateAttachmentUpload(
  file: File,
  type: AttachmentUploadType,
): Promise<PreUploadResponse> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('type', type);
  formData.append('mimeType', file.type);
  formData.append('fileSize', String(file.size));
  return postMultipart('/files/2/preUploadValidation', formData);
}

export async function uploadToPresignedUrl(
  presignedUrl: string,
  fields: Record<string, string>,
  file: File,
): Promise<void> {
  if (!isPresignedUrlTrusted(presignedUrl)) {
    throw new Error('Untrusted upload URL');
  }

  const formData = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    formData.append(key, value);
  }
  formData.append('file', file);

  const res = await fetch(presignedUrl, { method: 'POST', body: formData });
  if (!res.ok) {
    throw new Error(`Upload failed with status ${res.status}`);
  }
}

export async function verifyAttachmentUpload(
  attachmentId: number,
  options: { timeoutMs?: number; intervalMs?: number } = {},
): Promise<{ verified: boolean }> {
  const { timeoutMs = 30_000, intervalMs = 500 } = options;
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const result = await fetchApiRoot<{ verified: boolean }>(
      `/files/2/postUploadVerification?attachmentId=${attachmentId}`,
    );
    if (result.verified) return result;
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }

  return { verified: false };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test -- src/features/posts/api/uploads.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/features/posts/api/uploads.ts src/features/posts/api/uploads.test.ts
git -c commit.gpgsign=false commit -m "feat(api): extract uploads.ts domain module"
```

---

### Task 8: Create `api/index.ts` barrel and extract `mappers/`

**Files:**

- Create: `src/features/posts/api/index.ts`
- Create: `src/features/posts/mappers/announcements.ts`
- Create: `src/features/posts/mappers/consent-forms.ts`
- Create: `src/features/posts/mappers/shared.ts`
- Create: `src/features/posts/mappers/index.ts`
- Create: `src/features/posts/mappers/announcements.test.ts`
- Create: `src/features/posts/mappers/consent-forms.test.ts`
- Create: `src/features/posts/mappers/shared.test.ts`

**Interfaces:**

- Consumes: `../api/types` (wire types), `~/data/posts-registry` (domain types)
- Produces: All inbound mapper functions — used by `services/` (Tasks 10-11)

- [ ] **Step 1: Create `api/index.ts` barrel**

```typescript
export * from './announcements';
export * from './consent-forms';
export * from './school';
export * from './session';
export * from './uploads';
export * from './errors';
export type * from './types';
```

- [ ] **Step 2: Write failing test for `mappers/shared.ts`**

Create `src/features/posts/mappers/shared.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { mergeAndDedup, mapReminder } from './shared';

describe('mappers/shared', () => {
  describe('mergeAndDedup', () => {
    it('deduplicates by id, own takes priority', () => {
      const own = [{ id: 1, title: 'Own', numericId: 1 }];
      const shared = [
        { id: 1, title: 'Shared', numericId: 1 },
        { id: 2, title: 'Other', numericId: 2 },
      ];
      const result = mergeAndDedup(own as any, shared as any);
      expect(result).toHaveLength(2);
      expect(result[0].title).toBe('Own');
      expect(result[1].title).toBe('Other');
    });
  });

  describe('mapReminder', () => {
    it('maps AM_DAY_OF type to morning-of config', () => {
      const result = mapReminder('AM_DAY_OF', '2026-01-15');
      expect(result).toEqual({ type: 'morning-of', date: '2026-01-15' });
    });

    it('maps PM_DAY_BEFORE type to evening-before config', () => {
      const result = mapReminder('PM_DAY_BEFORE', '2026-01-14');
      expect(result).toEqual({ type: 'evening-before', date: '2026-01-14' });
    });
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `pnpm test -- src/features/posts/mappers/shared.test.ts`
Expected: FAIL — `./shared` module does not exist

- [ ] **Step 4: Implement `mappers/shared.ts`**

Move the following functions from current `api/mappers.ts`:

- `mergeAndDedup`
- `mapReminder`
- `rehydrateAttachments`
- `rehydratePhotos`
- `mapReadyAttachments`
- `mapReadyPhotos`
- `selectedToStudentGroups`
- `selectedToStaffGroups`
- `localDateToSgtIso`
- `splitLocalDateTime`

```typescript
import type {
  AnnouncementPost,
  ConsentFormPost,
  ReminderConfig,
  UploadedFile,
} from '~/data/posts-registry';
import type { ApiAttachment, ApiImage } from '../api/types';

type Post = AnnouncementPost | ConsentFormPost;

export function mergeAndDedup<T extends Post>(own: T[], shared: T[]): T[] {
  const seen = new Set(own.map((p) => p.id));
  return [...own, ...shared.filter((p) => !seen.has(p.id))];
}

export function mapReminder(type: string, date: string): ReminderConfig {
  switch (type) {
    case 'AM_DAY_OF':
      return { type: 'morning-of', date };
    case 'PM_DAY_BEFORE':
      return { type: 'evening-before', date };
    default:
      return { type: 'morning-of', date };
  }
}

export function rehydrateAttachments(attachments: ApiAttachment[]): UploadedFile[] {
  return (attachments ?? []).map((a) => ({
    attachmentId: a.attachmentId,
    fileName: a.fileName,
    fileSize: a.fileSize,
    url: a.url,
    status: 'ready' as const,
  }));
}

export function rehydratePhotos(images: ApiImage[]): UploadedFile[] {
  return (images ?? []).map((img, i) => ({
    attachmentId: img.attachmentId,
    fileName: img.fileName ?? `image-${i}`,
    fileSize: img.fileSize ?? 0,
    url: img.url,
    status: 'ready' as const,
    isCover: i === 0,
  }));
}

export function mapReadyAttachments(files: UploadedFile[]): Array<{ attachmentId: number }> {
  return files.filter((f) => f.status === 'ready').map((f) => ({ attachmentId: f.attachmentId }));
}

export function mapReadyPhotos(files: UploadedFile[]): Array<{ attachmentId: number }> {
  return files.filter((f) => f.status === 'ready').map((f) => ({ attachmentId: f.attachmentId }));
}

export function selectedToStudentGroups(
  selected: Array<{ type: string; label: string; value: string | number }>,
): Array<{ type: string; label: string; value: string }> {
  return selected.map((s) => ({ type: s.type, label: s.label, value: String(s.value) }));
}

export function selectedToStaffGroups(
  selected: Array<{ type: string; label: string; value: string | number }>,
): Array<{ type: string; label: string; value: string }> {
  return selected.map((s) => ({ type: s.type, label: s.label, value: String(s.value) }));
}

export function localDateToSgtIso(date: string): string {
  return `${date}T00:00:00+08:00`;
}

export function splitLocalDateTime(isoString: string): { date: string; time: string } {
  const [date, rest] = isoString.split('T');
  const time = rest?.slice(0, 5) ?? '00:00';
  return { date, time };
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm test -- src/features/posts/mappers/shared.test.ts`
Expected: PASS

- [ ] **Step 6: Write failing test for `mappers/announcements.ts`**

Create `src/features/posts/mappers/announcements.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { mapAnnouncementSummary } from './announcements';
import type { ApiAnnouncementSummary } from '../api/types';

const baseSummary: ApiAnnouncementSummary = {
  announcementId: 1,
  title: 'Test',
  status: 'POSTED',
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
  publishedDate: '2026-01-01T00:00:00Z',
  totalStudents: 10,
  readStudents: 5,
  acknowledgedStudents: 0,
  staffOwner: { staffId: 1, staffName: 'Teacher' },
  responseType: 'VIEW_ONLY',
};

describe('mappers/announcements', () => {
  it('maps a posted announcement summary to AnnouncementPost', () => {
    const result = mapAnnouncementSummary(baseSummary, 'own');
    expect(result.kind).toBe('announcement');
    expect(result.numericId).toBe(1);
    expect(result.title).toBe('Test');
    expect(result.status).toBe('posted');
    expect(result.ownership).toBe('own');
  });

  it('maps a draft summary correctly', () => {
    const draft = { ...baseSummary, status: 'DRAFT' as const, publishedDate: null };
    const result = mapAnnouncementSummary(draft, 'shared');
    expect(result.status).toBe('draft');
    expect(result.ownership).toBe('shared');
  });
});
```

- [ ] **Step 7: Implement `mappers/announcements.ts`**

Move `mapAnnouncementSummary`, `mapAnnouncementDetail`, `mapAnnouncementDraftDetail` from current `api/mappers.ts`. Import helpers from `./shared`.

- [ ] **Step 8: Run tests to verify they pass**

Run: `pnpm test -- src/features/posts/mappers/announcements.test.ts`
Expected: PASS

- [ ] **Step 9: Write failing test for `mappers/consent-forms.ts`, implement, verify**

Follow same pattern — move `mapConsentFormSummaryToPost`, `mapConsentFormDetail`, `mapConsentFormDraftDetail`.

- [ ] **Step 10: Create `mappers/index.ts` barrel**

```typescript
export * from './announcements';
export * from './consent-forms';
export * from './shared';
```

- [ ] **Step 11: Commit**

```bash
git add src/features/posts/api/index.ts src/features/posts/mappers/
git -c commit.gpgsign=false commit -m "feat: extract mappers/ and create api barrel"
```

---

### Task 9: Create `pages/handle-post-error.ts` — Shared error reactions

**Files:**

- Create: `src/features/posts/pages/handle-post-error.ts`
- Create: `src/features/posts/pages/handle-post-error.test.ts`

**Interfaces:**

- Consumes: `../api/errors` (all error classes), `~/lib/notify`
- Produces: `handlePostError(err: unknown): void` — used by all page event handlers

- [ ] **Step 1: Write failing test**

Create `src/features/posts/pages/handle-post-error.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('~/lib/notify', () => ({
  notify: { error: vi.fn() },
}));

import { notify } from '~/lib/notify';
import {
  AppError,
  RateLimitError,
  RedirectError,
  SessionExpiredError,
  ValidationError,
} from '../api/errors';
import { handlePostError } from './handle-post-error';

describe('handlePostError', () => {
  const originalLocation = window.location.href;

  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(window, 'location', {
      value: { href: originalLocation },
      writable: true,
    });
  });

  it('redirects to /session-expired on SessionExpiredError', () => {
    handlePostError(new SessionExpiredError('expired', -401, 401));
    expect(window.location.href).toBe('/session-expired');
  });

  it('shows toast on RateLimitError', () => {
    handlePostError(new RateLimitError('Too many'));
    expect(notify.error).toHaveBeenCalledWith('Too many requests. Please try again later.');
  });

  it('redirects on RedirectError with location', () => {
    handlePostError(new RedirectError('/some-page'));
    expect(window.location.href).toBe('/some-page');
  });

  it('shows toast on generic AppError', () => {
    handlePostError(new AppError('Something failed', -999, 500));
    expect(notify.error).toHaveBeenCalledWith('Something failed');
  });

  it('does nothing for ValidationError (handled by callers)', () => {
    handlePostError(new ValidationError('bad', -400, 400));
    expect(notify.error).not.toHaveBeenCalled();
    expect(window.location.href).toBe(originalLocation);
  });

  it('does nothing for non-AppError', () => {
    handlePostError(new Error('random'));
    expect(notify.error).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test -- src/features/posts/pages/handle-post-error.test.ts`
Expected: FAIL — `./handle-post-error` module does not exist

- [ ] **Step 3: Implement `handle-post-error.ts`**

```typescript
import { notify } from '~/lib/notify';
import {
  AppError,
  RateLimitError,
  RedirectError,
  SessionExpiredError,
  ValidationError,
} from '../api/errors';

export function handlePostError(err: unknown): void {
  if (err instanceof SessionExpiredError) {
    window.location.href = '/session-expired';
    return;
  }
  if (err instanceof RateLimitError) {
    notify.error('Too many requests. Please try again later.');
    return;
  }
  if (err instanceof RedirectError && err.location) {
    window.location.href = err.location;
    return;
  }
  if (err instanceof ValidationError) {
    return;
  }
  if (err instanceof AppError) {
    notify.error(err.message);
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test -- src/features/posts/pages/handle-post-error.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/features/posts/pages/handle-post-error.ts src/features/posts/pages/handle-post-error.test.ts
git -c commit.gpgsign=false commit -m "feat(pages): add handlePostError utility for error reactions"
```

---

### Task 10: Create `services/announcements.ts` — Composed loaders + outbound mapping

**Files:**

- Create: `src/features/posts/services/announcements.ts`
- Create: `src/features/posts/services/announcements.test.ts`

**Interfaces:**

- Consumes: `../api/announcements` (fetch functions), `../mappers/announcements` (inbound mappers), `../mappers/shared` (mergeAndDedup, helpers)
- Produces: `loadPostsList()`, `loadPostDetail(id)`, `loadAnnouncementDraftDetail(id)`, `buildAnnouncementPayload(state)` — used by page loaders and event handlers

- [ ] **Step 1: Write failing tests**

Create `src/features/posts/services/announcements.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../api/announcements', () => ({
  fetchAnnouncements: vi.fn(),
  fetchSharedAnnouncements: vi.fn(),
  fetchAnnouncementDetail: vi.fn(),
  fetchAnnouncementDraftDetail: vi.fn(),
}));

vi.mock('../mappers/announcements', () => ({
  mapAnnouncementSummary: vi.fn((api: any, ownership: string) => ({
    id: `ann_${api.announcementId}`,
    numericId: api.announcementId,
    title: api.title,
    ownership,
  })),
  mapAnnouncementDetail: vi.fn((d: any) => ({
    id: `ann_${d.announcementId}`,
    numericId: d.announcementId,
  })),
  mapAnnouncementDraftDetail: vi.fn((d: any) => ({
    id: `draft_${d.announcementDraftId}`,
    numericId: d.announcementDraftId,
  })),
}));

vi.mock('../mappers/shared', () => ({
  mergeAndDedup: vi.fn((own: any[], shared: any[]) => [...own, ...shared]),
}));

import {
  fetchAnnouncements,
  fetchSharedAnnouncements,
  fetchAnnouncementDetail,
  fetchAnnouncementDraftDetail,
} from '../api/announcements';
import {
  loadPostsList,
  loadPostDetail,
  loadAnnouncementDraftDetail as loadDraftDetail,
} from './announcements';

describe('services/announcements', () => {
  beforeEach(() => vi.clearAllMocks());

  describe('loadPostsList', () => {
    it('fetches own + shared, maps, and merges', async () => {
      vi.mocked(fetchAnnouncements).mockResolvedValue([{ announcementId: 1, title: 'Own' }] as any);
      vi.mocked(fetchSharedAnnouncements).mockResolvedValue([
        { announcementId: 2, title: 'Shared' },
      ] as any);

      const result = await loadPostsList();
      expect(fetchAnnouncements).toHaveBeenCalled();
      expect(fetchSharedAnnouncements).toHaveBeenCalled();
      expect(result).toHaveLength(2);
      expect(result[0].ownership).toBe('own');
      expect(result[1].ownership).toBe('shared');
    });
  });

  describe('loadPostDetail', () => {
    it('fetches detail and maps to domain model', async () => {
      vi.mocked(fetchAnnouncementDetail).mockResolvedValue({ announcementId: 5 } as any);
      const result = await loadPostDetail(5);
      expect(fetchAnnouncementDetail).toHaveBeenCalledWith(5);
      expect(result.numericId).toBe(5);
    });
  });

  describe('loadAnnouncementDraftDetail', () => {
    it('fetches draft and maps to domain model', async () => {
      vi.mocked(fetchAnnouncementDraftDetail).mockResolvedValue({ announcementDraftId: 3 } as any);
      const result = await loadDraftDetail(3);
      expect(fetchAnnouncementDraftDetail).toHaveBeenCalledWith(3);
      expect(result.numericId).toBe(3);
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test -- src/features/posts/services/announcements.test.ts`
Expected: FAIL — `./announcements` module does not exist

- [ ] **Step 3: Implement `services/announcements.ts`**

```typescript
import {
  fetchAnnouncements,
  fetchSharedAnnouncements,
  fetchAnnouncementDetail as fetchDetail,
  fetchAnnouncementDraftDetail as fetchDraftDetail,
} from '../api/announcements';
import {
  mapAnnouncementSummary,
  mapAnnouncementDetail,
  mapAnnouncementDraftDetail,
} from '../mappers/announcements';
import { mergeAndDedup } from '../mappers/shared';
import type { AnnouncementPost } from '~/data/posts-registry';
import type { BuildPostPayloadInput } from './types';
import type { ApiCreateAnnouncementPayload } from '../api/types';

export async function loadPostsList(): Promise<AnnouncementPost[]> {
  const [own, shared] = await Promise.all([fetchAnnouncements(), fetchSharedAnnouncements()]);
  const ownMapped = own.map((a) => mapAnnouncementSummary(a, 'own'));
  const sharedMapped = shared.map((a) => mapAnnouncementSummary(a, 'shared'));
  return mergeAndDedup(ownMapped, sharedMapped);
}

export async function loadPostDetail(postId: number): Promise<AnnouncementPost> {
  const detail = await fetchDetail(postId);
  return mapAnnouncementDetail(detail);
}

export async function loadAnnouncementDraftDetail(draftId: number): Promise<AnnouncementPost> {
  const draft = await fetchDraftDetail(draftId);
  return mapAnnouncementDraftDetail(draft);
}

export function buildAnnouncementPayload(
  state: BuildPostPayloadInput,
): ApiCreateAnnouncementPayload {
  return toPGCreatePayload(state);
}

function toPGCreatePayload(state: BuildPostPayloadInput): ApiCreateAnnouncementPayload {
  // Move the full implementation from current api/mappers.ts
  // Maps websiteLinks → urls [{webLink, linkDescription}]
  // Maps shortcutLink → shortcuts
  // Maps recipients, attachments, photos, etc.
  throw new Error('TODO: move from api/mappers.ts during implementation');
}
```

Note: The `toPGCreatePayload` implementation will be moved verbatim from the existing `api/mappers.ts` during implementation. The test above validates the orchestration layer; the payload-building logic is already tested in `mappers.test.ts` and those tests move here.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test -- src/features/posts/services/announcements.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/features/posts/services/announcements.ts src/features/posts/services/announcements.test.ts
git -c commit.gpgsign=false commit -m "feat(services): add announcements service with loaders + payload builder"
```

---

### Task 11: Create `services/consent-forms.ts` — Composed loaders + outbound mapping

**Files:**

- Create: `src/features/posts/services/consent-forms.ts`
- Create: `src/features/posts/services/consent-forms.test.ts`

**Interfaces:**

- Consumes: `../api/consent-forms`, `../mappers/consent-forms`, `../mappers/shared`
- Produces: `loadConsentPostsList()`, `loadConsentPostDetail(id)`, `loadConsentFormDraftDetail(id)`, `buildConsentFormPayload(state)`

- [ ] **Step 1: Write failing tests**

Create `src/features/posts/services/consent-forms.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../api/consent-forms', () => ({
  fetchConsentForms: vi.fn(),
  fetchSharedConsentForms: vi.fn(),
  fetchConsentFormDetail: vi.fn(),
  fetchConsentFormDraftDetail: vi.fn(),
}));

vi.mock('../mappers/consent-forms', () => ({
  mapConsentFormSummaryToPost: vi.fn((api: any, ownership: string) => ({
    id: `cf_${api.consentFormId}`,
    numericId: api.consentFormId,
    title: api.title,
    ownership,
  })),
  mapConsentFormDetail: vi.fn((d: any) => ({
    id: `cf_${d.consentFormId}`,
    numericId: d.consentFormId,
  })),
  mapConsentFormDraftDetail: vi.fn((d: any) => ({
    id: `cfd_${d.consentFormDraftId}`,
    numericId: d.consentFormDraftId,
  })),
}));

vi.mock('../mappers/shared', () => ({
  mergeAndDedup: vi.fn((own: any[], shared: any[]) => [...own, ...shared]),
}));

import {
  fetchConsentForms,
  fetchSharedConsentForms,
  fetchConsentFormDetail,
  fetchConsentFormDraftDetail,
} from '../api/consent-forms';
import {
  loadConsentPostsList,
  loadConsentPostDetail,
  loadConsentFormDraftDetail as loadDraftDetail,
} from './consent-forms';

describe('services/consent-forms', () => {
  beforeEach(() => vi.clearAllMocks());

  describe('loadConsentPostsList', () => {
    it('fetches own + shared, maps, and merges', async () => {
      vi.mocked(fetchConsentForms).mockResolvedValue([{ consentFormId: 1, title: 'Own' }] as any);
      vi.mocked(fetchSharedConsentForms).mockResolvedValue([
        { consentFormId: 2, title: 'Shared' },
      ] as any);

      const result = await loadConsentPostsList();
      expect(result).toHaveLength(2);
      expect(result[0].ownership).toBe('own');
      expect(result[1].ownership).toBe('shared');
    });
  });

  describe('loadConsentPostDetail', () => {
    it('fetches detail and maps to domain model', async () => {
      vi.mocked(fetchConsentFormDetail).mockResolvedValue({ consentFormId: 5 } as any);
      const result = await loadConsentPostDetail(5);
      expect(fetchConsentFormDetail).toHaveBeenCalledWith(5);
      expect(result.numericId).toBe(5);
    });
  });

  describe('loadConsentFormDraftDetail', () => {
    it('fetches draft and maps to domain model', async () => {
      vi.mocked(fetchConsentFormDraftDetail).mockResolvedValue({ consentFormDraftId: 3 } as any);
      const result = await loadDraftDetail(3);
      expect(fetchConsentFormDraftDetail).toHaveBeenCalledWith(3);
      expect(result.numericId).toBe(3);
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test -- src/features/posts/services/consent-forms.test.ts`
Expected: FAIL — `./consent-forms` module does not exist

- [ ] **Step 3: Implement `services/consent-forms.ts`**

```typescript
import {
  fetchConsentForms,
  fetchSharedConsentForms,
  fetchConsentFormDetail as fetchDetail,
  fetchConsentFormDraftDetail as fetchDraftDetail,
} from '../api/consent-forms';
import {
  mapConsentFormSummaryToPost,
  mapConsentFormDetail,
  mapConsentFormDraftDetail,
} from '../mappers/consent-forms';
import { mergeAndDedup } from '../mappers/shared';
import type { ConsentFormPost } from '~/data/posts-registry';
import type { BuildPostPayloadInput } from './types';
import type { ApiCreateConsentFormPayload } from '../api/types';

export async function loadConsentPostsList(): Promise<ConsentFormPost[]> {
  const [own, shared] = await Promise.all([fetchConsentForms(), fetchSharedConsentForms()]);
  const ownMapped = own.map((f) => mapConsentFormSummaryToPost(f, 'own'));
  const sharedMapped = shared.map((f) => mapConsentFormSummaryToPost(f, 'shared'));
  return mergeAndDedup(ownMapped, sharedMapped);
}

export async function loadConsentPostDetail(formId: number): Promise<ConsentFormPost> {
  const detail = await fetchDetail(formId);
  return mapConsentFormDetail(detail);
}

export async function loadConsentFormDraftDetail(draftId: number): Promise<ConsentFormPost> {
  const draft = await fetchDraftDetail(draftId);
  return mapConsentFormDraftDetail(draft);
}

export function buildConsentFormPayload(state: BuildPostPayloadInput): ApiCreateConsentFormPayload {
  return toPGConsentFormCreatePayload(state);
}

function toPGConsentFormCreatePayload(state: BuildPostPayloadInput): ApiCreateConsentFormPayload {
  // Move full implementation from current api/mappers.ts
  throw new Error('TODO: move from api/mappers.ts during implementation');
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test -- src/features/posts/services/consent-forms.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/features/posts/services/consent-forms.ts src/features/posts/services/consent-forms.test.ts
git -c commit.gpgsign=false commit -m "feat(services): add consent-forms service with loaders + payload builder"
```

---

### Task 12: Create `services/uploads.ts` — Upload orchestration

**Files:**

- Create: `src/features/posts/services/uploads.ts`
- Create: `src/features/posts/services/uploads.test.ts`

**Interfaces:**

- Consumes: `../api/uploads` (`validateAttachmentUpload`, `uploadToPresignedUrl`, `verifyAttachmentUpload`)
- Produces: `uploadAttachment(file, type, onProgress?)` — used by page event handlers

- [ ] **Step 1: Write failing tests**

Create `src/features/posts/services/uploads.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../api/uploads', () => ({
  validateAttachmentUpload: vi.fn(),
  uploadToPresignedUrl: vi.fn(),
  verifyAttachmentUpload: vi.fn(),
}));

import {
  validateAttachmentUpload,
  uploadToPresignedUrl,
  verifyAttachmentUpload,
} from '../api/uploads';
import { uploadAttachment } from './uploads';

describe('services/uploads', () => {
  beforeEach(() => vi.clearAllMocks());

  it('orchestrates validate → upload → verify', async () => {
    vi.mocked(validateAttachmentUpload).mockResolvedValue({
      attachmentId: 42,
      presignedUrl: 'https://s3.amazonaws.com/bucket',
      fields: { key: 'val' },
    });
    vi.mocked(uploadToPresignedUrl).mockResolvedValue(undefined);
    vi.mocked(verifyAttachmentUpload).mockResolvedValue({ verified: true });

    const file = new File(['data'], 'test.pdf');
    const result = await uploadAttachment(file, 'ANNOUNCEMENT');

    expect(validateAttachmentUpload).toHaveBeenCalledWith(file, 'ANNOUNCEMENT');
    expect(uploadToPresignedUrl).toHaveBeenCalledWith(
      'https://s3.amazonaws.com/bucket',
      { key: 'val' },
      file,
    );
    expect(verifyAttachmentUpload).toHaveBeenCalledWith(42);
    expect(result).toEqual({
      attachmentId: 42,
      url: '/api/files/2/handleDownloadAttachment?attachmentId=42',
    });
  });

  it('calls onProgress with stage updates', async () => {
    vi.mocked(validateAttachmentUpload).mockResolvedValue({
      attachmentId: 1,
      presignedUrl: 'https://s3.amazonaws.com/b',
      fields: {},
    });
    vi.mocked(uploadToPresignedUrl).mockResolvedValue(undefined);
    vi.mocked(verifyAttachmentUpload).mockResolvedValue({ verified: true });

    const onProgress = vi.fn();
    const file = new File(['data'], 'test.pdf');
    await uploadAttachment(file, 'ANNOUNCEMENT', onProgress);

    expect(onProgress).toHaveBeenCalledWith('uploading');
    expect(onProgress).toHaveBeenCalledWith('verifying');
    expect(onProgress).toHaveBeenCalledWith('ready');
  });

  it('throws when verification fails', async () => {
    vi.mocked(validateAttachmentUpload).mockResolvedValue({
      attachmentId: 1,
      presignedUrl: 'https://s3.amazonaws.com/b',
      fields: {},
    });
    vi.mocked(uploadToPresignedUrl).mockResolvedValue(undefined);
    vi.mocked(verifyAttachmentUpload).mockResolvedValue({ verified: false });

    const file = new File(['data'], 'test.pdf');
    await expect(uploadAttachment(file, 'ANNOUNCEMENT')).rejects.toThrow('verification');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test -- src/features/posts/services/uploads.test.ts`
Expected: FAIL — `./uploads` module does not exist

- [ ] **Step 3: Implement `services/uploads.ts`**

```typescript
import {
  validateAttachmentUpload,
  uploadToPresignedUrl,
  verifyAttachmentUpload,
} from '../api/uploads';
import type { AttachmentUploadType } from '../api/uploads';

export type UploadStage = 'uploading' | 'verifying' | 'ready';

export async function uploadAttachment(
  file: File,
  type: AttachmentUploadType,
  onProgress?: (stage: UploadStage) => void,
): Promise<{ attachmentId: number; url: string }> {
  onProgress?.('uploading');
  const { attachmentId, presignedUrl, fields } = await validateAttachmentUpload(file, type);

  await uploadToPresignedUrl(presignedUrl, fields, file);

  onProgress?.('verifying');
  const { verified } = await verifyAttachmentUpload(attachmentId);

  if (!verified) {
    throw new Error('File verification failed');
  }

  onProgress?.('ready');
  return {
    attachmentId,
    url: `/api/files/2/handleDownloadAttachment?attachmentId=${attachmentId}`,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test -- src/features/posts/services/uploads.test.ts`
Expected: PASS

- [ ] **Step 5: Create `services/index.ts` barrel**

```typescript
export * from './announcements';
export * from './consent-forms';
export * from './uploads';
```

- [ ] **Step 6: Commit**

```bash
git add src/features/posts/services/
git -c commit.gpgsign=false commit -m "feat(services): add uploads orchestration + barrel"
```

---

### Task 13: Rewire pages to import from `services/` and add boundary enforcement

**Files:**

- Modify: `src/features/posts/pages/PostsListPage.tsx`
- Modify: `src/features/posts/pages/PostDetailPage.tsx`
- Modify: `src/features/posts/pages/CreatePostPage.tsx`
- Create: `scripts/check-boundaries.sh`
- Modify: `lefthook.yml`

**Interfaces:**

- Consumes: `../services/` (all composed loaders + payload builders), `../api/errors` (for catch blocks), `./handle-post-error`
- Produces: Working application with same behavior, new architecture

- [ ] **Step 1: Write failing boundary enforcement test**

Create `scripts/check-boundaries.sh`:

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

- [ ] **Step 2: Run the boundary script to verify current state passes**

Run: `bash scripts/check-boundaries.sh`
Expected: Exit 0 (no violations in new modules)

- [ ] **Step 3: Update page imports**

Replace all imports from `../api/client` in page files with imports from `../services/`:

In `PostsListPage.tsx`:

```typescript
// Before:
import { loadPostsList, loadConsentPostsList, duplicateAnnouncement, ... } from '../api/client';

// After:
import { loadPostsList } from '../services/announcements';
import { loadConsentPostsList } from '../services/consent-forms';
import { duplicateAnnouncement, duplicateAnnouncementDraft, deleteAnnouncement, deleteDraft } from '../api/announcements';
import { duplicateConsentForm, duplicateConsentFormDraft, deleteConsentForm, deleteConsentFormDraft } from '../api/consent-forms';
import { getConfigs } from '../api/session';
import { NotFoundError } from '../api/errors';
import { handlePostError } from './handle-post-error';
```

In `PostDetailPage.tsx`:

```typescript
// After:
import { loadPostDetail } from '../services/announcements';
import { loadConsentPostDetail } from '../services/consent-forms';
import {
  rescheduleAnnouncementDraft,
  cancelAnnouncementSchedule,
  updateAnnouncementEnquiryEmail,
  updateAnnouncementStaffInCharge,
  deleteAnnouncement,
} from '../api/announcements';
import {
  rescheduleConsentFormDraft,
  cancelConsentFormSchedule,
  updateConsentFormEnquiryEmail,
  updateConsentFormStaffInCharge,
  updateConsentFormDueDate,
  deleteConsentForm,
} from '../api/consent-forms';
import { getConfigs, fetchSession } from '../api/session';
import { fetchSchoolStaff } from '../api/school';
import { AppError, NotFoundError } from '../api/errors';
import { handlePostError } from './handle-post-error';
```

In `CreatePostPage.tsx`:

```typescript
// After:
import {
  loadAnnouncementDraftDetail,
  loadPostDetail,
  buildAnnouncementPayload,
} from '../services/announcements';
import {
  loadConsentFormDraftDetail,
  loadConsentPostDetail,
  buildConsentFormPayload,
} from '../services/consent-forms';
import {
  createAnnouncement,
  createDraft,
  updateDraft,
  scheduleNewAnnouncementDraft,
  scheduleExistingAnnouncementDraft,
} from '../api/announcements';
import {
  createConsentForm,
  createConsentFormDraft,
  updateConsentFormDraft,
  scheduleNewConsentFormDraft,
  scheduleExistingConsentFormDraft,
  updateConsentFormEnquiryEmail,
  updateConsentFormStaffInCharge,
  updateConsentFormDueDate,
} from '../api/consent-forms';
import {
  fetchSchoolClasses,
  fetchSchoolStaff,
  fetchSchoolStaffGroups,
  fetchSchoolStudents,
} from '../api/school';
import { fetchSession, getConfigs } from '../api/session';
import { AppError, ValidationError } from '../api/errors';
import { handlePostError } from './handle-post-error';
```

- [ ] **Step 4: Replace inline error handling with `handlePostError`**

In event handlers where errors are caught:

```typescript
// Before:
} catch (err) {
  if (err instanceof AppError) {
    // silently swallow — PGW already toasted
  }
}

// After:
} catch (err) {
  if (err instanceof ValidationError) {
    dispatch(stampValidationError(err));
  } else {
    handlePostError(err);
  }
}
```

- [ ] **Step 5: Run typecheck and all tests**

Run: `pnpm typecheck && pnpm test`
Expected: All pass

- [ ] **Step 6: Run boundary script**

Run: `bash scripts/check-boundaries.sh`
Expected: Exit 0

- [ ] **Step 7: Add boundary check to lefthook**

Add to `lefthook.yml` under `pre-commit`:

```yaml
boundary-check:
  run: bash scripts/check-boundaries.sh
```

- [ ] **Step 8: Commit**

```bash
git add src/features/posts/pages/ scripts/check-boundaries.sh lefthook.yml
git -c commit.gpgsign=false commit -m "refactor(pages): rewire imports to services layer, add boundary enforcement"
```

---

### Task 14: Delete old files and final verification

**Files:**

- Delete: `src/features/posts/api/client.ts`
- Delete: `src/features/posts/api/client.test.ts`
- Delete: `src/features/posts/api/mappers.ts`
- Delete: `src/features/posts/api/mappers.test.ts`

**Interfaces:**

- Consumes: All new modules must be wired up and working
- Produces: Clean codebase with no dead code

- [ ] **Step 1: Verify no remaining imports from old files**

Run:

```bash
grep -rE "from ['\"].*/api/client['\"]" src/features/posts/ && echo "STILL REFERENCED" || echo "SAFE TO DELETE"
grep -rE "from ['\"].*/api/mappers['\"]" src/features/posts/ && echo "STILL REFERENCED" || echo "SAFE TO DELETE"
```

Expected: Both print "SAFE TO DELETE"

- [ ] **Step 2: Delete old files**

```bash
rm src/features/posts/api/client.ts
rm src/features/posts/api/client.test.ts
rm src/features/posts/api/mappers.ts
rm src/features/posts/api/mappers.test.ts
```

- [ ] **Step 3: Run full verification**

```bash
pnpm typecheck
pnpm test
pnpm lint
bash scripts/check-boundaries.sh
```

Expected: All pass with no errors

- [ ] **Step 4: Run dev server and verify app loads**

```bash
pnpm dev
```

Open browser, navigate through posts list → post detail → create post flow. Verify no console errors and all API calls succeed (MSW mocks).

- [ ] **Step 5: Final commit**

```bash
git add -A
git -c commit.gpgsign=false commit -m "refactor(api): remove old client.ts and mappers.ts, extraction complete"
```
