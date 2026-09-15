import { hasLocale } from 'next-intl';
import { notFound } from 'next/navigation';
import { locales } from '@/providers/intl-config';

export function generateStaticParams() {
  return locales.map(locale => ({ locale }));
}

export default function LocaleLayout({ children, params }: { children: React.ReactNode; params: { locale: string } }) {
  if (!hasLocale(locales, params.locale)) {
    notFound();
  }
  return <html lang={params.locale} dir={params.locale === 'fa' ? 'rtl' : 'ltr'}>{children}</html>;
}
