'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

export type ThemeName = 'dark' | 'light';
const STORAGE_KEY = 'jam_theme';
interface ThemeContextValue { theme: ThemeName; resolved: ThemeName; setTheme: (t: ThemeName) => void; }
const ThemeContext = createContext<ThemeContextValue | null>(null);
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeName>('dark');
  const [resolved, setResolved] = useState<ThemeName>('dark');
  const applyTheme = useCallback((next: ThemeName) => { document.documentElement.dataset.theme = next; document.documentElement.dataset.resolved = next; setResolved(next); try { localStorage.setItem(STORAGE_KEY, next); } catch {} }, []);
  useEffect(() => { try { const saved = localStorage.getItem(STORAGE_KEY); if (saved === 'light' || saved === 'dark') setThemeState(saved); } catch {} }, []);
  useEffect(() => { applyTheme(theme); }, [applyTheme, theme]);
  const setTheme = useCallback((next: ThemeName) => { setThemeState(next); applyTheme(next); }, [applyTheme]);
  const value = useMemo(() => ({ theme, resolved, setTheme }), [theme, resolved, setTheme]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
export function useThemeCtx() { const ctx = useContext(ThemeContext); if (!ctx) throw new Error('useThemeCtx must be used within ThemeProvider'); return ctx; }
