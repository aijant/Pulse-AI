"use client";

import { useCallback, useEffect, useState } from "react";

// useState that persists to localStorage. Storage can be unavailable (private mode),
// so every access is guarded and the hook still works in memory.
export function useLocalStorage<T>(key: string, initialValue: T) {
  const [value, setValue] = useState<T>(initialValue);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(key);
      if (stored !== null) setValue(JSON.parse(stored) as T);
    } catch {
      // ignore corrupted or inaccessible storage
    }
  }, [key]);

  const update = useCallback(
    (next: T | ((previous: T) => T)) => {
      setValue((previous) => {
        const resolved = next instanceof Function ? next(previous) : next;
        try {
          window.localStorage.setItem(key, JSON.stringify(resolved));
        } catch {
          // storage full or blocked: keep the in-memory value
        }
        return resolved;
      });
    },
    [key],
  );

  return [value, update] as const;
}
