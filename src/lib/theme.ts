export type Theme = "light" | "system" | "dark";

export const THEME_STORAGE_KEY = "pulse:theme";

// "system" removes the attribute so the prefers-color-scheme media query decides.
export function applyTheme(theme: Theme) {
  const root = document.documentElement;
  if (theme === "system") delete root.dataset.theme;
  else root.dataset.theme = theme;
}

// Runs inline in <head> before first paint so a saved theme never flashes the wrong colors.
export const themeInitScript = `try{var t=JSON.parse(localStorage.getItem("${THEME_STORAGE_KEY}"));if(t==="light"||t==="dark")document.documentElement.dataset.theme=t}catch(e){}`;
