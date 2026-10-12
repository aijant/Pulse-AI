"use client";

import { MODES, type ModeId } from "@/lib/modes";

interface ModeSelectorProps {
  value: ModeId;
  onChange: (mode: ModeId) => void;
  disabled?: boolean;
}

export function ModeSelector({ value, onChange, disabled }: ModeSelectorProps) {
  return (
    <div role="radiogroup" aria-label="Режим ассистента" className="grid grid-cols-2 gap-2 sm:grid-cols-5">
      {MODES.map((mode) => {
        const active = mode.id === value;
        return (
          <button
            key={mode.id}
            type="button"
            role="radio"
            aria-checked={active}
            disabled={disabled}
            onClick={() => onChange(mode.id)}
            className={`group rounded-xl border px-3 last:col-span-2 sm:last:col-span-1 py-2.5 text-left transition disabled:cursor-not-allowed disabled:opacity-60 ${
              active
                ? "border-accent bg-accent-soft shadow-sm"
                : "border-line bg-surface hover:border-accent/50 hover:bg-surface-hover"
            }`}
          >
            <span className="flex items-center gap-1.5 text-sm font-semibold text-ink">
              <span aria-hidden>{mode.icon}</span>
              {mode.label}
            </span>
            <span className="mt-0.5 block text-xs text-muted">{mode.tagline}</span>
          </button>
        );
      })}
    </div>
  );
}
