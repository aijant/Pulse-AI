"use client";

import { useEffect, useRef, type FormEvent, type KeyboardEvent } from "react";
import type { Mode } from "@/lib/modes";
import { MAX_QUESTION_LENGTH } from "@/lib/types";
import { useVoiceRecorder } from "@/hooks/useVoiceRecorder";

interface QuestionFormProps {
  mode: Mode;
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onStop: () => void;
  busy: boolean;
}

export function QuestionForm({ mode, value, onChange, onSubmit, onStop, busy }: QuestionFormProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const tooLong = value.length > MAX_QUESTION_LENGTH;
  // Recognized speech is appended to whatever is already typed.
  const voice = useVoiceRecorder((spoken) => {
    const typed = value.trimEnd();
    onChange(typed ? `${typed} ${spoken}` : spoken);
    textareaRef.current?.focus();
  });
  const recording = voice.status === "recording";
  const transcribing = voice.status === "transcribing";

  const canSubmit = value.trim().length > 0 && !tooLong && !busy && voice.status === "idle";
  const toggleVoice = () => (recording ? voice.stop() : voice.start());

  useEffect(() => {
    textareaRef.current?.focus();
  }, [mode.id]);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (canSubmit) onSubmit();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) handleSubmit(event);
  };

  return (
    <form onSubmit={handleSubmit} className="rounded-2xl border border-line bg-surface p-4 shadow-sm">
      <label htmlFor="question" className="sr-only">
        Ваш вопрос
      </label>
      <textarea
        id="question"
        ref={textareaRef}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={mode.placeholder}
        rows={mode.id === "summary" ? 6 : 3}
        className="w-full resize-y bg-transparent text-base sm:text-[15px] leading-relaxed text-ink outline-none placeholder:text-muted"
      />

      <div className="mt-3 flex flex-wrap gap-2">
        {mode.examples.map((example) => (
          <button
            key={example}
            type="button"
            onClick={() => onChange(example)}
            className="max-w-full truncate rounded-full border border-line px-3 py-1 text-xs text-muted transition hover:border-accent/50 hover:text-ink"
            title={example}
          >
            {example.length > 60 ? `${example.slice(0, 60)}…` : example}
          </button>
        ))}
      </div>

      <div className="mt-4 flex items-center justify-between gap-3 border-t border-line pt-3">
        <span className={`text-xs ${tooLong || voice.error ? "font-medium text-danger" : "text-muted"}`}>
          {tooLong ? (
            `Слишком длинно: ${value.length} / ${MAX_QUESTION_LENGTH}`
          ) : voice.error ? (
            voice.error
          ) : recording ? (
            <span className="text-danger">
              ● Запись 0:{String(voice.seconds).padStart(2, "0")} — нажмите ещё раз, чтобы закончить
            </span>
          ) : transcribing ? (
            <span className="flex items-center gap-2 text-accent">
              <span className="pulse-dot" /> Распознаю речь…
            </span>
          ) : (
            <span className="hidden sm:inline">
              <kbd className="kbd">⌘</kbd> + <kbd className="kbd">Enter</kbd> — отправить
            </span>
          )}
        </span>

        <div className="flex shrink-0 items-center gap-2">
          {voice.supported && (
            <button
              type="button"
              onClick={toggleVoice}
              disabled={busy || transcribing}
              aria-pressed={recording}
              aria-label={recording ? "Остановить запись" : "Задать вопрос голосом"}
              title={recording ? "Остановить запись" : "Задать вопрос голосом"}
              className={`flex h-10 w-10 items-center justify-center rounded-xl border transition disabled:cursor-not-allowed disabled:opacity-40 ${
                recording
                  ? "mic-recording border-danger bg-danger text-white"
                  : "border-line text-ink hover:bg-surface-hover"
              }`}
            >
              <MicIcon />
            </button>
          )}
          {busy ? (
            <button
              type="button"
              onClick={onStop}
              className="rounded-xl border border-line px-5 py-2.5 text-sm font-semibold text-ink transition hover:bg-surface-hover"
            >
              ■ Остановить
            </button>
          ) : (
            <button
              type="submit"
              disabled={!canSubmit}
              className="rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Спросить AI
            </button>
          )}
        </div>
      </div>
    </form>
  );
}

function MicIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <rect x="9" y="2" width="6" height="12" rx="3" />
      <path d="M5 10a7 7 0 0 0 14 0M12 17v5M8 22h8" />
    </svg>
  );
}
