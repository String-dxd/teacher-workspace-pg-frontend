import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  AppError,
  CsrfError,
  NotFoundError,
  RateLimitError,
  SessionExpiredError,
  TimeoutError,
  ValidationError,
} from './errors';

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
            error: { fieldPath: 'title', subCode: 'REQUIRED' },
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
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ ok: true }), { status: 200 }),
        )
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
      vi.useFakeTimers();
      const { mutateApi } = await import('./http');

      // Mock fetch that respects the AbortSignal so the abort actually rejects
      mockFetchFn.mockImplementation((_url: string, opts?: RequestInit) => {
        return new Promise<Response>((_resolve, reject) => {
          const signal = opts?.signal;
          if (signal) {
            signal.addEventListener('abort', () => {
              reject(new DOMException('The operation was aborted.', 'AbortError'));
            });
          }
        });
      });

      const promise = mutateApi('POST', '/test', {}, { timeoutMs: 50 });
      vi.advanceTimersByTime(100);

      await expect(promise).rejects.toThrow(TimeoutError);
      vi.useRealTimers();
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
