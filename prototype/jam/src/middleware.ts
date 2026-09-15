import createMiddleware from 'next-intl/middleware';
import { locales } from '@/providers/intl-config';

export default createMiddleware({
  locales,
  defaultLocale: 'en',
});

export const config = {
  // 인아
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
};
