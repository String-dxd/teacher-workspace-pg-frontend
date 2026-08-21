import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useSaveOnLeave } from './useSaveOnLeave';

function setVisibility(state: 'hidden' | 'visible') {
  Object.defineProperty(document, 'visibilityState', { value: state, configurable: true });
  document.dispatchEvent(new Event('visibilitychange'));
}

describe('useSaveOnLeave', () => {
  it('saves when the tab is closed or reloaded', () => {
    const save = vi.fn().mockResolvedValue(undefined);
    renderHook(() => useSaveOnLeave({ save, hasUnsavedChanges: true }));

    window.dispatchEvent(new Event('pagehide'));

    expect(save).toHaveBeenCalledWith({ keepalive: true });
  });

  it('saves when the page is backgrounded', () => {
    const save = vi.fn().mockResolvedValue(undefined);
    renderHook(() => useSaveOnLeave({ save, hasUnsavedChanges: true }));

    setVisibility('hidden');

    expect(save).toHaveBeenCalledWith({ keepalive: true });
    setVisibility('visible');
  });

  it('ignores the page becoming visible again', () => {
    const save = vi.fn().mockResolvedValue(undefined);
    renderHook(() => useSaveOnLeave({ save, hasUnsavedChanges: true }));

    setVisibility('visible');

    expect(save).not.toHaveBeenCalled();
  });

  it('saves on unmount, which is how in-app navigation exits', () => {
    const save = vi.fn().mockResolvedValue(undefined);
    const { unmount } = renderHook(() => useSaveOnLeave({ save, hasUnsavedChanges: true }));

    unmount();

    expect(save).toHaveBeenCalledWith({ keepalive: true });
  });

  it('writes nothing when there is nothing unsaved', () => {
    const save = vi.fn().mockResolvedValue(undefined);
    const { unmount } = renderHook(() => useSaveOnLeave({ save, hasUnsavedChanges: false }));

    window.dispatchEvent(new Event('pagehide'));
    setVisibility('hidden');
    unmount();

    expect(save).not.toHaveBeenCalled();
    setVisibility('visible');
  });

  it('stays out of the way while disabled', () => {
    const save = vi.fn().mockResolvedValue(undefined);
    const { unmount } = renderHook(() =>
      useSaveOnLeave({ save, hasUnsavedChanges: true, enabled: false }),
    );

    window.dispatchEvent(new Event('pagehide'));
    unmount();

    expect(save).not.toHaveBeenCalled();
  });

  it('never prompts — no beforeunload handler is registered', () => {
    const addSpy = vi.spyOn(window, 'addEventListener');
    const save = vi.fn().mockResolvedValue(undefined);
    renderHook(() => useSaveOnLeave({ save, hasUnsavedChanges: true }));

    // The whole point of the change: leaving saves instead of asking.
    expect(addSpy.mock.calls.map((c) => c[0])).not.toContain('beforeunload');
    addSpy.mockRestore();
  });

  it('swallows a failed save rather than throwing as the page unloads', () => {
    const save = vi.fn().mockRejectedValue(new Error('offline'));
    const { unmount } = renderHook(() => useSaveOnLeave({ save, hasUnsavedChanges: true }));

    expect(() => unmount()).not.toThrow();
  });
});
