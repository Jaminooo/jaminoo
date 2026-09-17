import type { Metadata, Viewport } from 'next';
import '@/app/globals.css';
import { ThemeProvider } from '@/providers/theme-provider';
import { I18nProvider } from '@/providers/i18n-provider';
import { PwaRegister } from '@/components/pwa-register';

export const metadata: Metadata = {
  title: 'Jamino — Hang out, without the noise',
  description: 'Rooms for your people. Find friends, drop into a jam, and talk.',
  manifest: '/manifest.webmanifest',
};

export const viewport: Viewport = {
  themeColor: '#05060f',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider>
          <I18nProvider><PwaRegister />{children}</I18nProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
