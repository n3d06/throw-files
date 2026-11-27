// Light/dark theme choice.
//
// With no saved choice the page follows the OS/browser (prefers-color-scheme).
// The header toggle saves an explicit choice, applied as html[data-theme],
// which App.less checks before the media query. public/index.html runs the
// same lookup inline before first paint so a saved choice never flashes.

export type Theme = "light" | "dark";

export const THEME_STORAGE_KEY = "throwmyfile-theme";

/** Browser chrome colour per theme; matches --md-surface in App.less. */
const THEME_COLOR: Record<Theme, string> = {
  dark: "#1f1f23",
  light: "#f8f8fa",
};

const darkQuery = () => window.matchMedia("(prefers-color-scheme: dark)");

export function systemTheme(): Theme {
  return darkQuery().matches ? "dark" : "light";
}

export function savedTheme(): Theme | null {
  try {
    const value = localStorage.getItem(THEME_STORAGE_KEY);
    return value === "light" || value === "dark" ? value : null;
  } catch {
    return null; // storage blocked (private mode, sandboxed frame)
  }
}

export function currentTheme(): Theme {
  return savedTheme() ?? systemTheme();
}

/** Force `theme`, remember it, and recolour the browser chrome to match. */
export function setTheme(theme: Theme): void {
  document.documentElement.dataset.theme = theme;
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    /* choice still applies for this visit */
  }
  // Both media-scoped theme-color tags must carry the forced colour, or the
  // one matching the OS scheme would keep painting the old one.
  document
    .querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]')
    .forEach((meta) => {
      meta.content = THEME_COLOR[theme];
    });
}

/** Call `onChange` when the OS scheme flips; returns an unsubscribe. */
export function onSystemThemeChange(onChange: (theme: Theme) => void): () => void {
  const query = darkQuery();
  const handler = () => onChange(query.matches ? "dark" : "light");
  query.addEventListener("change", handler);
  return () => query.removeEventListener("change", handler);
}
