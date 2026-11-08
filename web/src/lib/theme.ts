import { useEffect } from 'react';
import { viewPrefs, type Theme } from './store';

const dark = () => window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;

export const resolveTheme = (t: Theme): 'light' | 'dark' => (t === 'system' ? (dark() ? 'dark' : 'light') : t);

function apply(t: Theme) {
  document.documentElement.dataset.theme = resolveTheme(t);
}

/** Keeps <html data-theme> in line with the setting and, for "system", with the OS (index.html sets it before paint). */
export function useThemeSync() {
  const { theme } = viewPrefs.use();
  useEffect(() => {
    apply(theme);
    if (theme !== 'system') return;
    const mq = window.matchMedia?.('(prefers-color-scheme: dark)');
    const on = () => apply('system');
    mq?.addEventListener('change', on);
    return () => mq?.removeEventListener('change', on);
  }, [theme]);
}

export const THEMES: { id: Theme; label: string }[] = [
  { id: 'system', label: 'Theo hệ thống' },
  { id: 'light', label: 'Sáng' },
  { id: 'dark', label: 'Tối' },
];

export const nextTheme = (t: Theme): Theme => (t === 'system' ? 'light' : t === 'light' ? 'dark' : 'system');
