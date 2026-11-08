"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Persisted state for user-owned settings (alert areas, layer choices, locale).
 * Everything stays in the browser — RiskSense does not upload personal data.
 */
export function useLocalStorage<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(initial);
  const hydrated = useRef(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(key);
      if (raw !== null) setValue(JSON.parse(raw) as T);
    } catch {
      // Corrupt or unavailable storage: fall back to the default silently.
    } finally {
      hydrated.current = true;
    }
  }, [key]);

  useEffect(() => {
    if (!hydrated.current) return;
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Quota or private-mode failures are non-fatal.
    }
  }, [key, value]);

  const reset = useCallback(() => setValue(initial), [initial]);

  return [value, setValue, reset] as const;
}
