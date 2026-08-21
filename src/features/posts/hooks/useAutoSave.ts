import { useCallback, useEffect, useRef, useState } from 'react';

export type AutoSaveStatus = 'idle' | 'saving' | 'saved' | 'error';

export interface UseAutoSaveOptions<TPayload> {
  /** Current payload. Hook serializes with JSON.stringify for change detection. */
  payload: TPayload;
  /** Called to persist. Must accept a signal and respect it. */
  save: (payload: TPayload, opts: { signal: AbortSignal; keepalive?: boolean }) => Promise<void>;
  /**
   * How often to check for unsaved work, in ms. Defaults to 5_000. A tick with
   * no change writes nothing, so this is the longest a teacher's edit can sit
   * unsaved — not a write every 5s regardless.
   */
  intervalMs?: number;
  /** When false, autosave stops scheduling new ticks but doesn't cancel in-flight. */
  enabled?: boolean;
  /**
   * Return true when the payload has enough content to be worth saving.
   * Defaults to `() => true`.
   */
  shouldSave?: (payload: TPayload) => boolean;
}

export interface UseAutoSaveResult {
  status: AutoSaveStatus;
  lastSavedAt: Date | null;
  /** JSON.stringify of the payload at the moment of the last successful save. */
  lastSavedSerialized: string | null;
  /** Force an immediate save; aborts any in-flight autosave first. */
  saveNow: (opts?: { keepalive?: boolean }) => Promise<void>;
  /** True when the payload has changed since the last successful save. */
  hasUnsavedChanges: boolean;
}

export function useAutoSave<TPayload>(options: UseAutoSaveOptions<TPayload>): UseAutoSaveResult {
  const { payload, save, intervalMs = 5_000, enabled = true, shouldSave } = options;

  const [status, setStatus] = useState<AutoSaveStatus>('idle');
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [lastSavedSerialized, setLastSavedSerialized] = useState<string | null>(null);

  const payloadRef = useRef(payload);
  const saveRef = useRef(save);
  const shouldSaveRef = useRef(shouldSave);
  const lastSerializedRef = useRef<string | null>(null);
  const inFlightRef = useRef<AbortController | null>(null);
  /** Payload of the save currently on the wire, if any. */
  const inFlightSerializedRef = useRef<string | null>(null);

  const serialized = JSON.stringify(payload);
  const hasUnsavedChanges = serialized !== lastSerializedRef.current;

  // Keep refs up-to-date without re-running the interval effect.
  useEffect(() => {
    payloadRef.current = payload;
    saveRef.current = save;
    shouldSaveRef.current = shouldSave;
  }, [payload, save, shouldSave]);

  const runSave = useCallback(async (opts?: { keepalive?: boolean }): Promise<void> => {
    const current = payloadRef.current;
    if (shouldSaveRef.current && !shouldSaveRef.current(current)) return;

    const snapshot = JSON.stringify(current);
    if (snapshot === lastSerializedRef.current) return;
    // Already on the wire with exactly this content. Without this, leaving the
    // page a moment after a tick fires sends the same body twice: the tick's
    // save has not landed yet, so the snapshot still looks unsaved.
    if (snapshot === inFlightSerializedRef.current) return;

    // A leaving save must outlive the component: unmount aborts whatever sits
    // in inFlightRef, so a keepalive save is deliberately not tracked there —
    // otherwise the save fired on the way out cancels itself.
    const controller = new AbortController();
    const tracked = !opts?.keepalive;
    if (tracked) {
      inFlightRef.current?.abort();
      inFlightRef.current = controller;
    }
    inFlightSerializedRef.current = snapshot;

    setStatus('saving');
    try {
      await saveRef.current(current, { signal: controller.signal, keepalive: opts?.keepalive });
      // Only mark saved if this is still the latest request.
      if (!tracked || inFlightRef.current === controller) {
        lastSerializedRef.current = snapshot;
        setLastSavedSerialized(snapshot);
        setLastSavedAt(new Date());
        setStatus('saved');
      }
    } catch (err) {
      if (controller.signal.aborted) return; // superseded, don't surface.
      setStatus('error');
      throw err;
    } finally {
      if (inFlightSerializedRef.current === snapshot) {
        inFlightSerializedRef.current = null;
      }
      if (tracked && inFlightRef.current === controller) {
        inFlightRef.current = null;
      }
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;
    const id = window.setInterval(() => {
      void runSave().catch(() => {
        // Errors already surfaced via setStatus('error').
      });
    }, intervalMs);
    return () => window.clearInterval(id);
  }, [enabled, intervalMs, runSave]);

  useEffect(() => {
    return () => {
      inFlightRef.current?.abort();
      inFlightRef.current = null;
    };
  }, []);

  const saveNow = useCallback(
    async (opts?: { keepalive?: boolean }) => {
      await runSave(opts);
    },
    [runSave],
  );

  return { status, lastSavedAt, lastSavedSerialized, saveNow, hasUnsavedChanges };
}
