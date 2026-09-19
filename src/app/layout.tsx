import type { Metadata, Viewport } from 'next';
import '@/app/globals.css';
import { ThemeProvider } from '@/providers/theme-provider';
import { I18nProvider } from '@/providers/i18n-provider';
import { PwaRegister } from '@/components/pwa-register';
import { SiteGuard } from '@/components/site-guard';
import { ContextMenuHost } from '@/components/context-menu';

export const metadata: Metadata = {
  title: 'Jamino — Social rooms, music, video and cinema together',
  description: 'Jamino brings private rooms, synced music, creator channels and watch-together moments into one connected workspace.',
  keywords: ['Jamino', 'social rooms', 'listen together', 'creator studio', 'video hub', 'music hub', 'watch together'],
  openGraph: {
    title: 'Jamino — Hang out, without the noise',
    description: 'A connected workspace for your people, sounds and stories.',
    type: 'website',
  },
  manifest: '/manifest.webmanifest',
};

export const viewport: Viewport = {
  themeColor: '#000000',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider>
          <I18nProvider>
            <PwaRegister />
            <SiteGuard />
            <ContextMenuHost />
            {children}
          </I18nProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
