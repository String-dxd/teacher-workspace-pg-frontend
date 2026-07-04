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

// Real pgw-web wraps all responses as {body, resultCode, message, metadata};
// mock fixtures are raw. Detect the envelope by requiring both `body` and a
// numeric `resultCode` — no TW inner shape uses resultCode, so false positives
// are effectively impossible.
export function unwrapEnvelope<T>(json: unknown): T {
  if (
    json !== null &&
    typeof json === 'object' &&
    'body' in json &&
    'resultCode' in json &&
    typeof (json as { resultCode: unknown }).resultCode === 'number'
  ) {
    return (json as { body: T }).body;
  }
  return json as T;
}

// Translates pgw's error envelope into a typed `AppError` subclass.
// Pure — no side effects (no window.location, no toasts).
async function handleErrorResponse(res: Response): Promise<never> {
  let resultCode: number | undefined;
  let errorReason: string | undefined;
  let fieldPath: string | undefined;
  let subCode: string | undefined;
  try {
    const body = (await res.clone().json()) as {
      resultCode?: number;
      message?: string;
      error?: { errorReason?: string; fieldPath?: string; subCode?: string };
    };
    resultCode = body.resultCode;
    errorReason = body.error?.errorReason ?? body.message;
    fieldPath = body.error?.fieldPath;
    subCode = body.error?.subCode;
  } catch {
    // Non-JSON body (e.g. HTML error page) — fall through with undefined fields.
  }

  const message = errorReason ?? `Request failed (${res.status}).`;
  const code = resultCode ?? res.status;

  switch (resultCode) {
    case -401:
    case -4012:
      throw new SessionExpiredError(message, code, res.status);
    case -404:
      throw new NotFoundError(message, code, res.status);
    case -4013:
      throw new CsrfError(message, code, res.status);
    case -400:
    case -4001:
    case -4003:
    case -4004:
      throw new ValidationError(message, code, res.status, { fieldPath, subCode });
    case -429:
      throw new RateLimitError(message);
    default:
      // Bare HTTP 404s (no pgw envelope) come from the mock's `http.NotFound`
      // or any upstream that returns 404 without a `resultCode`. Normalise to
      // `NotFoundError` so detail-route boundaries can render a 'Post not
      // found' page instead of a generic error.
      if (res.status === 404) {
        throw new NotFoundError(message, code, res.status);
      }
      throw new AppError(message, code, res.status);
  }
}

/**
 * Opaqueredirect (`type: 'opaqueredirect'`, status 0) or a bare 3xx with
 * `redirect: 'manual'` indicates a PG -4031 session-redirect.
 * Pure — only throws `RedirectError`, no window.location side effects.
 */
function handleRedirectResponse(res: Response): never {
  const location = res.headers.get('location');
  throw new RedirectError(location);
}

function isRedirectResponse(res: Response): boolean {
  return res.type === 'opaqueredirect' || (res.status >= 300 && res.status < 400);
}

/**
 * Compose a caller's `AbortSignal` with a client-side timeout. The returned
 * `signal` aborts when either the caller aborts or the timeout elapses;
 * `didTimeout()` disambiguates so callers can surface a distinct
 * `TimeoutError` vs. re-throwing the caller's `AbortError`. The `dispose`
 * hook clears the timer once the request settles so pending timeouts don't
 * keep the event loop alive after success.
 */
function withTimeout(
  callerSignal: AbortSignal | undefined,
  timeoutMs: number,
): { signal: AbortSignal; dispose: () => void; didTimeout: () => boolean } {
  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);
  const disposeTimer = () => clearTimeout(timer);

  if (callerSignal) {
    if (callerSignal.aborted) {
      disposeTimer();
      controller.abort();
    } else {
      callerSignal.addEventListener(
        'abort',
        () => {
          disposeTimer();
          controller.abort();
        },
        { once: true },
      );
    }
  }

  return {
    signal: controller.signal,
    dispose: disposeTimer,
    didTimeout: () => timedOut,
  };
}

/**
 * Refresh the CSRF token after a -4013 rejection. A lightweight GET to the
 * session endpoint bumps PG's CSRF cookie via Set-Cookie. Swallowed errors
 * keep the retry path functioning: if the refresh itself fails, the replay
 * will resurface a terminal `CsrfError` the caller can handle.
 */
async function refreshCsrfToken(): Promise<void> {
  try {
    await fetch(`${API_BASE}/session/current`, { method: 'GET', credentials: 'include' });
  } catch {
    // Ignore — the replay below will surface a terminal failure if the token
    // truly can't be refreshed.
  }
}

export async function fetchApi<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, { redirect: 'manual', credentials: 'include' });
  if (isRedirectResponse(res)) handleRedirectResponse(res);
  if (!res.ok) await handleErrorResponse(res);
  return unwrapEnvelope<T>(await res.json());
}

/**
 * Root-level fetch that bypasses the `/api/web/2/staff` base. Used for
 * endpoints PG exposes at `/api/*` (currently just `/api/configs`). Kept
 * separate from `fetchApi` so the prefix remains the single source of truth
 * for the staff-scoped surface.
 */
export async function fetchApiRoot<T>(path: string): Promise<T> {
  const res = await fetch(`/api${path}`, { redirect: 'manual', credentials: 'include' });
  if (isRedirectResponse(res)) handleRedirectResponse(res);
  if (!res.ok) await handleErrorResponse(res);
  return unwrapEnvelope<T>(await res.json());
}

export async function mutateApi<T>(
  method: 'POST' | 'PUT',
  path: string,
  body: unknown,
  options: { signal?: AbortSignal; timeoutMs?: number } = {},
): Promise<T> {
  const timeout = withTimeout(options.signal, options.timeoutMs ?? DEFAULT_WRITE_TIMEOUT_MS);
  const attempt = async (): Promise<T> => {
    const res = await fetch(`${API_BASE}${path}`, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: timeout.signal,
      redirect: 'manual',
      credentials: 'include',
    });
    if (isRedirectResponse(res)) handleRedirectResponse(res);
    if (!res.ok) await handleErrorResponse(res);
    // Handle empty responses (204 No Content or empty body)
    if (res.status === 204) return undefined as T;
    const text = await res.text();
    if (!text) return undefined as T;
    return unwrapEnvelope<T>(JSON.parse(text));
  };
  try {
    try {
      return await attempt();
    } catch (err) {
      // One-shot CSRF retry. A second consecutive -4013 rethrows the
      // original `CsrfError` so callers can surface a terminal "please
      // refresh" state instead of looping forever.
      if (err instanceof CsrfError) {
        await refreshCsrfToken();
        return await attempt();
      }
      throw err;
    }
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError' && timeout.didTimeout()) {
      throw new TimeoutError(
        `Request to ${path} timed out after ${options.timeoutMs ?? DEFAULT_WRITE_TIMEOUT_MS}ms.`,
      );
    }
    throw err;
  } finally {
    timeout.dispose();
  }
}

export async function deleteApi(path: string): Promise<void> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'DELETE',
    redirect: 'manual',
    credentials: 'include',
  });
  if (isRedirectResponse(res)) handleRedirectResponse(res);
  if (!res.ok) await handleErrorResponse(res);
}

/**
 * POST a `multipart/form-data` body to a root-prefixed path. Used for
 * `/api/files/*` where the payload is the raw file plus a few text fields,
 * not JSON. Shares `handleErrorResponse` and `unwrapEnvelope` with the JSON
 * helpers so errors surface the same way.
 */
export async function postMultipart<T>(
  path: string,
  formData: FormData,
  options: { signal?: AbortSignal; timeoutMs?: number } = {},
): Promise<T> {
  const timeout = withTimeout(options.signal, options.timeoutMs ?? DEFAULT_UPLOAD_TIMEOUT_MS);
  const attempt = async (): Promise<T> => {
    const res = await fetch(`/api${path}`, {
      method: 'POST',
      body: formData,
      signal: timeout.signal,
      redirect: 'manual',
      credentials: 'include',
    });
    if (isRedirectResponse(res)) handleRedirectResponse(res);
    if (!res.ok) await handleErrorResponse(res);
    if (res.status === 204) return undefined as T;
    const text = await res.text();
    if (!text) return undefined as T;
    return unwrapEnvelope<T>(JSON.parse(text));
  };
  try {
    try {
      return await attempt();
    } catch (err) {
      if (err instanceof CsrfError) {
        await refreshCsrfToken();
        return await attempt();
      }
      throw err;
    }
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError' && timeout.didTimeout()) {
      throw new TimeoutError(
        `Upload to ${path} timed out after ${options.timeoutMs ?? DEFAULT_UPLOAD_TIMEOUT_MS}ms.`,
      );
    }
    throw err;
  } finally {
    timeout.dispose();
  }
}
