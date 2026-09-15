import React from 'react';
import { NextIntlClientProvider, useLocale } from 'next-intl';
import en from '@/messages/en.json';
import fa from '@/messages/fa.json';

const messages = { en, fa };

export function IntlProvider({ children }: { children: React.ReactNode }) {
  const locale = useLocale();
  return (
    <NextIntlClientProvider messages={messages}>
      {children}
    </NextIntlClientProvider>
  );
}
