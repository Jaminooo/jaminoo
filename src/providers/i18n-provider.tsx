'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import en from '@/messages/en.json';
import fa from '@/messages/fa.json';

export type Locale = 'en' | 'fa';

const dictionaries: Record<Locale, typeof en> = { en, fa };

export function dirFor(locale: Locale) {
  return locale === 'fa' ? 'rtl' : 'ltr';
}

// flat lookup: "panel.friends" => nested value
function flat(dict: Record<string, unknown>, key: string): string | null {
  const parts = key.split('.');
  let cur: unknown = dict;
  for (const p of parts) {
    if (cur && typeof cur === 'object' && p in (cur as Record<string, unknown>)) {
      cur = (cur as Record<string, unknown>)[p];
    } else {
      return null;
    }
  }
  return typeof cur === 'string' ? cur : null;
}

function interpolate(template: string, vars?: Record<string, string | number>) {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (_, k) => (k in vars ? String(vars[k]) : `{${k}}`));
}

interface I18nContextValue {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
  dir: 'ltr' | 'rtl';
}

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('en');

  useEffect(() => {
    try {
      const saved = localStorage.getItem('jam_locale') as Locale | null;
      if (saved === 'en' || saved === 'fa') setLocaleState(saved);
    } catch {}
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = dirFor(locale);
    try {
      localStorage.setItem('jam_locale', locale);
    } catch {}
  }, [locale]);

  const setLocale = useCallback((l: Locale) => setLocaleState(l), []);
  const t = useCallback(
    (key: string, vars?: Record<string, string | number>) => {
      const template = flat(dictionaries[locale], key) ?? flat(dictionaries.en, key) ?? key;
      return interpolate(template, vars);
    },
    [locale]
  );

  const value = useMemo(
    () => ({ locale, setLocale, t, dir: dirFor(locale) as 'ltr' | 'rtl' }),
    [locale, setLocale, t]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used within I18nProvider');
  return ctx;
}