import { useEffect, useRef } from 'react';

export interface UseSaveOnLeaveOptions {
  /** Fires the save. `keepalive` asks the fetch layer to outlive the page. */
  save: (opts?: { keepalive?: boolean }) => Promise<void>;
  /** Skip every trigger when there is nothing to persist. */
  hasUnsavedChanges: boolean;
  /** When false, no listeners are attached and unmount does not save. */
  enabled?: boolean;
}

/**
 * Saves the draft whenever the teacher leaves — instead of asking them whether
 * they meant to. Covers the three ways out of a page:
 *
 * - **In-app navigation** (Back, a link, a redirect) — the unmount cleanup.
 * - **Closing the tab or reloading** — `pagehide`, which unlike `beforeunload`
 *   fires without prompting and is the event bfcache actually guarantees.
 * - **Switching tab or app** — `visibilitychange` to hidden. On mobile Safari
 *   this is frequently the last event a page ever receives, since a backgrounded
 *   tab can be discarded without `pagehide` ever running.
 *
 * The unload path cannot be awaited: the browser will not hold a page open for a
 * promise. It is dispatched with `keepalive` so the request survives the
 * document, which caps the body at 64KB — large drafts can exceed that and fail
 * silently, which is why the 5s debounce carries the real weight and this is the
 * backstop.
 */
export function useSaveOnLeave({
  save,
  hasUnsavedChanges,
  enabled = true,
}: UseSaveOnLeaveOptions): void {
  const saveRef = useRef(save);
  const dirtyRef = useRef(hasUnsavedChanges);
  const enabledRef = useRef(enabled);

  useEffect(() => {
    saveRef.current = save;
    dirtyRef.current = hasUnsavedChanges;
    enabledRef.current = enabled;
  }, [save, hasUnsavedChanges, enabled]);

  useEffect(() => {
    if (!enabled) return;

    function flush() {
      if (!enabledRef.current || !dirtyRef.current) return;
      void saveRef.current({ keepalive: true }).catch(() => {
        // Nothing useful to show: the page is going away.
      });
    }

    function handleVisibility() {
      if (document.visibilityState === 'hidden') flush();
    }

    window.addEventListener('pagehide', flush);
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      window.removeEventListener('pagehide', flush);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [enabled]);

  // Unmount is the in-app exit: any route change lands here, whatever caused it.
  useEffect(() => {
    return () => {
      if (!enabledRef.current || !dirtyRef.current) return;
      void saveRef.current({ keepalive: true }).catch(() => {
        // The page is already gone; there is nowhere to report this.
      });
    };
  }, []);
}
