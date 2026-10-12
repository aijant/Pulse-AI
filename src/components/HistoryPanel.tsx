"use client";

import { getMode } from "@/lib/modes";
import type { HistoryItem } from "@/lib/types";

interface HistoryPanelProps {
  items: HistoryItem[];
  limit: number;
  activeId: string | null;
  onSelect: (item: HistoryItem) => void;
  onRemove: (id: string) => void;
  onClear: () => void;
}

const timeFormat = new Intl.DateTimeFormat("ru-RU", { hour: "2-digit", minute: "2-digit" });

export function HistoryPanel({ items, limit, activeId, onSelect, onRemove, onClear }: HistoryPanelProps) {
  return (
    <section className="rounded-2xl border border-line bg-surface p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-ink">
          История <span className="font-normal text-muted">· последние {limit}</span>
        </h2>
        {items.length > 0 && (
          <button type="button" onClick={onClear} className="text-xs text-muted hover:text-danger">
            Очистить
          </button>
        )}
      </div>

      {items.length === 0 ? (
        <p className="mt-3 text-sm text-muted">Здесь появятся ваши вопросы.</p>
      ) : (
        <ul className="mt-3 space-y-1.5">
          {items.map((item) => {
            const mode = getMode(item.mode);
            const active = item.id === activeId;
            return (
              <li key={item.id} className="group relative">
                <button
                  type="button"
                  onClick={() => onSelect(item)}
                  className={`w-full rounded-xl border px-3 py-2 pr-8 text-left transition ${
                    active ? "border-accent bg-accent-soft" : "border-transparent hover:bg-surface-hover"
                  }`}
                >
                  <span className="line-clamp-2 text-sm text-ink">{item.question}</span>
                  <span className="mt-1 block text-xs text-muted">
                    {mode?.icon} {mode?.label} · {timeFormat.format(item.createdAt)}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => onRemove(item.id)}
                  aria-label="Удалить из истории"
                  className="absolute right-2 top-2 rounded px-1 text-muted transition hover:text-danger focus:opacity-100 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100"
                >
                  ×
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
