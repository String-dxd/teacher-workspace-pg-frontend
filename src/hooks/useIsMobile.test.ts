// src/hooks/useIsMobile.test.ts
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useIsMobile } from './useIsMobile';

describe('useIsMobile', () => {
  let listeners: Array<(e: { matches: boolean }) => void>;
  let matchesMock: boolean;

  beforeEach(() => {
    listeners = [];
    matchesMock = false;
    vi.stubGlobal(
      'matchMedia',
      vi.fn((query: string) => ({
        matches: matchesMock,
        media: query,
        addEventListener: (_event: string, cb: (e: { matches: boolean }) => void) => {
          listeners.push(cb);
        },
        removeEventListener: (_event: string, cb: (e: { matches: boolean }) => void) => {
          listeners = listeners.filter((l) => l !== cb);
        },
      })),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns false on desktop viewport', () => {
    matchesMock = false;
    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(false);
  });

  it('returns true on mobile viewport', () => {
    matchesMock = true;
    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(true);
  });

  it('reacts to viewport changes', () => {
    matchesMock = false;
    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(false);

    act(() => {
      for (const cb of listeners) cb({ matches: true });
    });
    expect(result.current).toBe(true);
  });

  it('cleans up listener on unmount', () => {
    matchesMock = false;
    const { unmount } = renderHook(() => useIsMobile());
    expect(listeners.length).toBe(1);
    unmount();
    expect(listeners.length).toBe(0);
  });
});
