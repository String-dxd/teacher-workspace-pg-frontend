import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useAutoSave } from './useAutoSave';

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
});

afterEach(() => {
  vi.useRealTimers();
});

describe('useAutoSave', () => {
  it('calls save once the interval elapses after a change', async () => {
    const save = vi.fn().mockResolvedValue(undefined);
    const { rerender } = renderHook(
      ({ payload }: { payload: { a: number } }) => useAutoSave({ payload, save, intervalMs: 1000 }),
      { initialProps: { payload: { a: 1 } } },
    );

    rerender({ payload: { a: 2 } });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });

    expect(save).toHaveBeenCalledTimes(1);
    expect(save.mock.calls[0][0]).toEqual({ a: 2 });
  });

  it('skips the save when the serialized payload is unchanged', async () => {
    const save = vi.fn().mockResolvedValue(undefined);
    const { rerender } = renderHook(
      ({ payload }: { payload: { a: number } }) => useAutoSave({ payload, save, intervalMs: 1000 }),
      { initialProps: { payload: { a: 1 } } },
    );

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });
    expect(save).toHaveBeenCalledTimes(1);

    // Same payload again: nothing new to persist, so no second write.
    rerender({ payload: { a: 1 } });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000);
    });
    expect(save).toHaveBeenCalledTimes(1);
  });

  it('reports unsaved changes until the save lands', async () => {
    const save = vi.fn().mockResolvedValue(undefined);
    const { result, rerender } = renderHook(
      ({ payload }: { payload: { a: number } }) => useAutoSave({ payload, save, intervalMs: 1000 }),
      { initialProps: { payload: { a: 1 } } },
    );

    expect(result.current.hasUnsavedChanges).toBe(true);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });

    await waitFor(() => expect(result.current.hasUnsavedChanges).toBe(false));

    rerender({ payload: { a: 2 } });
    expect(result.current.hasUnsavedChanges).toBe(true);
  });

  it('does not let unmount abort a keepalive save', async () => {
    let seen: AbortSignal | null = null;
    const save = vi
      .fn()
      .mockImplementation(async (_p: unknown, { signal }: { signal: AbortSignal }) => {
        seen = signal;
      });

    const { result, unmount } = renderHook(() =>
      useAutoSave({ payload: { a: 1 }, save, intervalMs: 1000 }),
    );

    await act(async () => {
      await result.current.saveNow({ keepalive: true });
    });
    unmount();

    // A leaving save is untracked, so the unmount cleanup cannot cancel it.
    expect(save).toHaveBeenCalledTimes(1);
    expect(seen!.aborted).toBe(false);
  });

  it('defaults to a five second cadence', async () => {
    const save = vi.fn().mockResolvedValue(undefined);
    renderHook(() => useAutoSave({ payload: { a: 1 }, save }));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(4_900);
    });
    expect(save).not.toHaveBeenCalled();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(200);
    });
    expect(save).toHaveBeenCalledTimes(1);
  });

  it('keeps saving on later ticks as the content keeps changing', async () => {
    const save = vi.fn().mockResolvedValue(undefined);
    const { rerender } = renderHook(
      ({ payload }: { payload: { a: number } }) => useAutoSave({ payload, save, intervalMs: 1000 }),
      { initialProps: { payload: { a: 1 } } },
    );

    for (const a of [2, 3, 4]) {
      rerender({ payload: { a } });
      await act(async () => {
        await vi.advanceTimersByTimeAsync(1000);
      });
    }

    // One write per tick that had something new — never a duplicate of the same
    // payload, which is what keeps repeat ticks from creating extra drafts.
    expect(save).toHaveBeenCalledTimes(3);
    expect(save.mock.calls.at(-1)?.[0]).toEqual({ a: 4 });
  });

  it('does not send the same payload twice while one is still on the wire', async () => {
    let release!: () => void;
    const save = vi.fn().mockImplementation(
      () =>
        new Promise<void>((r) => {
          release = r;
        }),
    );

    const { result } = renderHook(() => useAutoSave({ payload: { a: 1 }, save, intervalMs: 1000 }));

    // A tick puts a save on the wire and it has not landed yet.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });
    expect(save).toHaveBeenCalledTimes(1);

    // Leaving now would otherwise repeat the identical body.
    await act(async () => {
      await result.current.saveNow({ keepalive: true });
    });
    expect(save).toHaveBeenCalledTimes(1);

    await act(async () => {
      release();
      await Promise.resolve();
    });
  });

  it('does not save when shouldSave returns false', async () => {
    const save = vi.fn().mockResolvedValue(undefined);
    renderHook(() =>
      useAutoSave({
        payload: { title: '' },
        save,
        intervalMs: 1000,
        shouldSave: (p: { title: string }) => p.title.length > 0,
      }),
    );

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });

    expect(save).not.toHaveBeenCalled();
  });

  it('exposes status transitions idle → saving → saved on successful save', async () => {
    let resolveSave!: () => void;
    const save = vi.fn().mockImplementation(
      () =>
        new Promise<void>((r) => {
          resolveSave = r;
        }),
    );

    const { result } = renderHook(() => useAutoSave({ payload: { a: 1 }, save, intervalMs: 1000 }));

    expect(result.current.status).toBe('idle');

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });
    expect(result.current.status).toBe('saving');

    await act(async () => {
      resolveSave();
      await Promise.resolve();
    });

    await waitFor(() => expect(result.current.status).toBe('saved'));
    expect(result.current.lastSavedAt).toBeInstanceOf(Date);
    expect(result.current.lastSavedSerialized).toBe(JSON.stringify({ a: 1 }));
  });

  it('saveNow aborts an in-flight save and runs a fresh one', async () => {
    const signalsSeen: AbortSignal[] = [];
    let callCount = 0;
    const save = vi
      .fn()
      .mockImplementation(async (_p: unknown, { signal }: { signal: AbortSignal }) => {
        signalsSeen.push(signal);
        callCount++;
        // First call hangs until aborted; second call resolves immediately.
        if (callCount === 1) {
          return new Promise<void>((_, reject) => {
            signal.addEventListener('abort', () =>
              reject(new DOMException('Aborted', 'AbortError')),
            );
          });
        }
      });

    const { result, rerender } = renderHook(
      ({ payload }: { payload: { a: number } }) => useAutoSave({ payload, save, intervalMs: 1000 }),
      { initialProps: { payload: { a: 1 } } },
    );

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });
    expect(save).toHaveBeenCalledTimes(1);

    rerender({ payload: { a: 2 } });

    await act(async () => {
      await result.current.saveNow();
    });

    expect(save).toHaveBeenCalledTimes(2);
    expect(signalsSeen[0].aborted).toBe(true);
  });
});
