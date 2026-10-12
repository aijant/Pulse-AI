"use client";

import { useCallback } from "react";
import type { HistoryItem } from "@/lib/types";
import { useLocalStorage } from "./useLocalStorage";

const HISTORY_LIMIT = 5;

// crypto.randomUUID exists only in secure contexts (HTTPS/localhost), not on http://192.168.x.x.
function createId(): string {
  return typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

export function useHistory() {
  const [items, setItems] = useLocalStorage<HistoryItem[]>("pulse:history", []);

  const add = useCallback(
    (item: Omit<HistoryItem, "id" | "createdAt">) => {
      const entry: HistoryItem = { ...item, id: createId(), createdAt: Date.now() };
      setItems((previous) => [entry, ...previous].slice(0, HISTORY_LIMIT));
      return entry;
    },
    [setItems],
  );

  const remove = useCallback(
    (id: string) => setItems((previous) => previous.filter((item) => item.id !== id)),
    [setItems],
  );

  const clear = useCallback(() => setItems([]), [setItems]);

  return { items, add, remove, clear, limit: HISTORY_LIMIT };
}
