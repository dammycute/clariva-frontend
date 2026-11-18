export type ThemeChoice = 'light' | 'dark' | 'system';

export const THEME_KEY = 'clariva-theme';

/**
 * Runs in <head> before the page paints, so there is no light flash for dark users.
 * Keep it small and self-contained: it is injected as a string.
 */
export const THEME_INIT_SCRIPT = `(function(){try{var c=localStorage.getItem('${THEME_KEY}')||'system';var d=c==='dark'||(c==='system'&&window.matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.setAttribute('data-theme',d?'dark':'light');}catch(e){}})();`;

export function readThemeChoice(): ThemeChoice {
  try {
    const v = localStorage.getItem(THEME_KEY);
    return v === 'light' || v === 'dark' ? v : 'system';
  } catch {
    return 'system';
  }
}

/** Saves the choice and sets data-theme on <html>. */
export function applyTheme(choice: ThemeChoice) {
  try {
    if (choice === 'system') localStorage.removeItem(THEME_KEY);
    else localStorage.setItem(THEME_KEY, choice);
  } catch { /* storage blocked: the choice still applies for this visit */ }
  const dark = choice === 'dark' || (choice === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
}
