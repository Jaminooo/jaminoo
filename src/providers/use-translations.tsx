'use client';

import { useI18n } from '@/providers/i18n-provider';

export function useTranslations() {
  const { t } = useI18n();
  return t;
}

export function useLocale() {
  const { locale, setLocale, dir } = useI18n();
  return { locale, setLocale, dir };
}