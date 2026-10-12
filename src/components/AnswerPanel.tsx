"use client";

import type { AskStatus } from "@/hooks/useAsk";
import type { Mode } from "@/lib/modes";
import { CopyButton } from "./CopyButton";
import { Markdown } from "./Markdown";

interface AnswerPanelProps {
  status: AskStatus;
  answer: string;
  error: string | null;
  mode: Mode;
  meta: { durationMs: number; model?: string } | null;
  onRetry: () => void;
}

export function AnswerPanel({ status, answer, error, mode, meta, onRetry }: AnswerPanelProps) {
  if (status === "idle") {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-line px-6 py-14 text-center">
        <span className="text-3xl" aria-hidden>
          {mode.icon}
        </span>
        <p className="mt-3 font-medium text-ink">Режим «{mode.label}»</p>
        <p className="mt-1 max-w-sm text-sm text-muted">
          Задайте вопрос или выберите пример выше — ответ появится здесь.
        </p>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div role="alert" className="rounded-2xl border border-danger/30 bg-danger/5 p-5">
        <p className="font-semibold text-danger">Не получилось получить ответ</p>
        <p className="mt-1 text-sm text-ink">{error}</p>
        <button
          type="button"
          onClick={onRetry}
          className="mt-4 rounded-lg border border-line bg-surface px-3 py-1.5 text-sm font-medium text-ink transition hover:bg-surface-hover"
        >
          ↻ Повторить
        </button>
      </div>
    );
  }

  if (status === "loading") {
    return (
      <div className="rounded-2xl border border-line bg-surface p-6" aria-busy>
        <p className="flex items-center gap-2 text-sm text-muted">
          <span className="pulse-dot" /> Пульс думает…
        </p>
        <div className="mt-5 space-y-3">
          <div className="skeleton h-4 w-3/4" />
          <div className="skeleton h-4 w-full" />
          <div className="skeleton h-4 w-5/6" />
        </div>
      </div>
    );
  }

  const streaming = status === "streaming";

  return (
    <article className="rounded-2xl border border-line bg-surface shadow-sm" aria-busy={streaming}>
      <header className="flex items-center justify-between gap-3 border-b border-line px-5 py-3">
        <span className="flex min-w-0 items-center gap-2 whitespace-nowrap text-sm font-medium text-muted">
          <span aria-hidden>{mode.icon}</span>
          <span className="truncate">{mode.label}</span>
          {streaming ? (
            <span className="flex items-center gap-1.5 text-accent">
              <span className="pulse-dot" /> печатает…
            </span>
          ) : (
            meta && (
              <>
                <span>· {(meta.durationMs / 1000).toFixed(1)} с</span>
                {meta.model && <span className="hidden text-xs sm:inline">· {meta.model}</span>}
              </>
            )
          )}
        </span>
        {!streaming && (
          <div className="shrink-0">
            <CopyButton text={answer} />
          </div>
        )}
      </header>
      <div className={`px-5 py-4 ${streaming ? "streaming" : ""}`}>
        <Markdown>{answer}</Markdown>
      </div>
    </article>
  );
}
