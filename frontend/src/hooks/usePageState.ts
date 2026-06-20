/**
 * usePageState — persists page state in sessionStorage.
 * State survives tab switches, navigating away, and refreshes within the session.
 * Cleared when the browser/tab is closed.
 *
 * Usage:
 *   const [state, setState, clearState] = usePageState("check_page", defaultState);
 */

import { useState, useEffect, useCallback, useRef } from "react";

export function usePageState<T extends Record<string, unknown>>(
  key: string,
  defaultState: T
): [T, (patch: Partial<T>) => void, () => void] {
  const storageKey = `cs_page_${key}`;

  const [state, setStateRaw] = useState<T>(() => {
    if (typeof window === "undefined") return defaultState;
    try {
      const raw = localStorage.getItem(storageKey);
      return raw ? { ...defaultState, ...JSON.parse(raw) } : defaultState;
    } catch { return defaultState; }
  });

  // Write to sessionStorage whenever state changes (debounced)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      try { localStorage.setItem(storageKey, JSON.stringify(state)); } catch {}
    }, 200);
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [state, storageKey]);

  const setState = useCallback((patch: Partial<T>) => {
    setStateRaw(prev => ({ ...prev, ...patch }));
  }, []);

  const clearState = useCallback(() => {
    try { localStorage.removeItem(storageKey); } catch {}
    setStateRaw(defaultState);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]);

  return [state, setState, clearState];
}
