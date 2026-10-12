"use client";

import { useEffect, useState } from "react";

type CopyState = "idle" | "copied" | "failed";

const LABELS: Record<CopyState, string> = {
  idle: "Копировать ответ",
  copied: "✓ Скопировано",
  failed: "Не удалось скопировать",
};

export function CopyButton({ text }: { text: string }) {
  const [state, setState] = useState<CopyState>("idle");

  useEffect(() => {
    if (state === "idle") return;
    const timer = setTimeout(() => setState("idle"), 2000);
    return () => clearTimeout(timer);
  }, [state]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setState("copied");
    } catch {
      setState("failed");
    }
  };

  return (
    <button
      type="button"
      onClick={copy}
      aria-live="polite"
      className={`whitespace-nowrap rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
        state === "copied"
          ? "border-success/40 bg-success/10 text-success"
          : state === "failed"
            ? "border-danger/40 text-danger"
            : "border-line text-ink hover:bg-surface-hover"
      }`}
    >
      {LABELS[state]}
    </button>
  );
}
