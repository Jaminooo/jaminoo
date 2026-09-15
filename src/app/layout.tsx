import type { Metadata, Viewport } from 'next';
import '@/app/globals.css';
import { ThemeProvider } from '@/providers/theme-provider';
import { I18nProvider } from '@/providers/i18n-provider';

export const metadata: Metadata = {
  title: 'Jamino — Hang out, without the noise',
  description: 'Rooms for your people. Find friends, drop into a jam, and talk.',
};

export const viewport: Viewport = {
  themeColor: '#05060f',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider>
          <I18nProvider>{children}</I18nProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}