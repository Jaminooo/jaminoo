'use client';

import { useI18n } from '@/providers/i18n-provider';

export function useTranslations() {
  const { t, locale } = useI18n();
  return (key: string, vars?: Record<string, string | number>) => t(key, vars);
}

export function useLocale() {
  const { locale, setLocale, dir } = useI18n();
  return { locale, setLocale, dir };
}