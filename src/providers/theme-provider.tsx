'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

export type ThemeName = 'dark' | 'light' | 'system' | 'anime' | 'ocean' | 'forest';

const STORAGE_KEY = 'jam_theme';

interface ThemeContextValue {
  theme: ThemeName;
  resolved: 'dark' | 'light';
  setTheme: (t: ThemeName) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function systemDark() {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeName>('dark');
  const [resolved, setResolved] = useState<'dark' | 'light'>('dark');

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY) as ThemeName | null;
      if (saved === 'dark' || saved === 'light' || saved === 'system' || saved === 'anime' || saved === 'ocean' || saved === 'forest') {
        setThemeState(saved);
      }
    } catch {}
  }, []);

  useEffect(() => {
    applyTheme(theme);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [theme]);

  const applyTheme = useCallback((t: ThemeName) => {
    const root = document.documentElement;
    if (t === 'system') {
      const dark = systemDark();
      root.dataset.theme = dark ? 'dark' : 'light';
      setResolved(dark ? 'dark' : 'light');
    } else if (t === 'anime') {
      root.dataset.theme = 'anime';
      root.dataset.resolved = 'dark';
      setResolved('dark');
    } else if (t === 'ocean' || t === 'forest') {
      root.dataset.theme = t;
      root.dataset.resolved = 'dark';
      setResolved('dark');
    } else {
      root.dataset.theme = t;
      setResolved(t);
    }
    try {
      localStorage.setItem(STORAGE_KEY, t);
    } catch {}
  }, []);

  const setTheme = useCallback(
    (t: ThemeName) => {
      setThemeState(t);
      applyTheme(t);
    },
    [applyTheme]
  );

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const on = () => {
      if (theme === 'system') applyTheme('system');
    };
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, [theme, applyTheme]);

  const value = useMemo(() => ({ theme, resolved, setTheme }), [theme, resolved, setTheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useThemeCtx() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useThemeCtx must be used within ThemeProvider');
  return ctx;
}
