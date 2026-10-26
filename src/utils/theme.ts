import React from 'react';

export type ThemePreference = 'auto' | 'light' | 'dark';
export type ResolvedTheme = 'light' | 'dark';

// Keep in sync with the inline script in index.html, which applies the theme before the first paint.
export const THEME_STORAGE_KEY = 'loeschzug-wasser:theme';

const DARK_QUERY = '(prefers-color-scheme: dark)';

export function parseThemePreference(value: string | null | undefined): ThemePreference {
  return value === 'light' || value === 'dark' ? value : 'auto';
}

export function resolveTheme(preference: ThemePreference, systemPrefersDark: boolean): ResolvedTheme {
  if (preference === 'auto') return systemPrefersDark ? 'dark' : 'light';
  return preference;
}

export function readThemePreference(): ThemePreference {
  try {
    return parseThemePreference(window.localStorage.getItem(THEME_STORAGE_KEY));
  } catch {
    return 'auto';
  }
}

function saveThemePreference(preference: ThemePreference) {
  try {
    if (preference === 'auto') window.localStorage.removeItem(THEME_STORAGE_KEY);
    else window.localStorage.setItem(THEME_STORAGE_KEY, preference);
  } catch {
    // Storage can be unavailable (private mode); the choice then lasts for this visit only.
  }
}

function applyTheme(theme: ResolvedTheme) {
  document.documentElement.dataset.theme = theme;
}

/** Current theme preference, applied to <html>; "auto" follows the system setting live. */
export function useThemePreference(): [ThemePreference, (preference: ThemePreference) => void] {
  const [preference, setPreference] = React.useState<ThemePreference>(readThemePreference);

  React.useEffect(() => {
    const media = window.matchMedia(DARK_QUERY);
    const update = () => applyTheme(resolveTheme(preference, media.matches));
    update();
    if (preference !== 'auto') return;
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, [preference]);

  const choose = React.useCallback((next: ThemePreference) => {
    saveThemePreference(next);
    setPreference(next);
  }, []);

  return [preference, choose];
}
