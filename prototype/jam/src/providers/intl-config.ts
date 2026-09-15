import { getRequestConfig } from 'next-intl/server';

export const locales = ['en', 'fa'] as const;
export type Locale = (typeof locales)[number];

export default getRequestConfig(async ({ locale }) => {
  return {
    messages: (await import(`@/messages/${locale}.json`)).default,
  };
});
