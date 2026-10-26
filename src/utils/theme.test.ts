import { describe, expect, it } from 'vitest';
import { parseThemePreference, resolveTheme } from './theme';

describe('theme', () => {
  it('falls back to auto for missing or invalid stored values', () => {
    expect(parseThemePreference(null)).toBe('auto');
    expect(parseThemePreference('purple')).toBe('auto');
    expect(parseThemePreference('dark')).toBe('dark');
    expect(parseThemePreference('light')).toBe('light');
  });

  it('follows the system setting only in auto mode', () => {
    expect(resolveTheme('auto', true)).toBe('dark');
    expect(resolveTheme('auto', false)).toBe('light');
    expect(resolveTheme('light', true)).toBe('light');
    expect(resolveTheme('dark', false)).toBe('dark');
  });
});
