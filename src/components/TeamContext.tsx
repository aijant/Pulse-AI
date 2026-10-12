"use client";

import { MAX_CONTEXT_LENGTH } from "@/lib/types";

interface TeamContextProps {
  value: string;
  onChange: (value: string) => void;
}

export function TeamContext({ value, onChange }: TeamContextProps) {
  return (
    <details className="group rounded-2xl border border-line bg-surface p-4 shadow-sm">
      <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-semibold text-ink">
        <span>
          Контекст команды {value.trim() && <span className="ml-1 text-xs font-normal text-success">● активен</span>}
        </span>
        <span className="text-muted transition group-open:rotate-180">▾</span>
      </summary>
      <p className="mt-2 text-xs text-muted">AI учтёт это в каждом ответе: стек, процессы, названия продуктов.</p>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value.slice(0, MAX_CONTEXT_LENGTH))}
        rows={4}
        placeholder="Например: мы — команда из 6 человек, делаем B2B CRM на Next.js + Go, спринты по 2 недели, задачи в Jira."
        className="mt-3 w-full resize-y rounded-xl border border-line bg-transparent p-3 text-base text-ink sm:text-sm outline-none placeholder:text-muted focus:border-accent"
      />
      <p className="mt-1 text-right text-xs text-muted">
        {value.length} / {MAX_CONTEXT_LENGTH}
      </p>
    </details>
  );
}
