"use client";

import { useLocalStorage } from "@/hooks/useLocalStorage";
import { applyTheme, THEME_STORAGE_KEY, type Theme } from "@/lib/theme";

const OPTIONS: { value: Theme; icon: string; label: string }[] = [
  { value: "light", icon: "☀️", label: "Светлая тема" },
  { value: "system", icon: "🖥️", label: "Как в системе" },
  { value: "dark", icon: "🌙", label: "Тёмная тема" },
];

export function ThemeToggle() {
  const [theme, setTheme] = useLocalStorage<Theme>(THEME_STORAGE_KEY, "system");

  // The saved theme is applied before paint by themeInitScript; here we only react to clicks.
  const select = (next: Theme) => {
    setTheme(next);
    applyTheme(next);
  };

  return (
    <div role="radiogroup" aria-label="Тема" className="flex rounded-full border border-line bg-surface p-0.5">
      {OPTIONS.map((option) => {
        const active = option.value === theme;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={option.label}
            title={option.label}
            onClick={() => select(option.value)}
            className={`rounded-full px-2.5 py-1 text-sm transition ${
              active ? "bg-accent-soft shadow-sm" : "opacity-60 hover:opacity-100"
            }`}
          >
            <span aria-hidden>{option.icon}</span>
          </button>
        );
      })}
    </div>
  );
}
