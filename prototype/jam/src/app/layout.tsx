import '@/styles/globals.css';
import { ThemeProvider } from '@/providers/theme-provider';
import { IntlProvider } from '@/providers/intl-provider';

export const metadata = {
  title: 'Jam — Hang out, without the noise',
  description: 'Rooms for your people. Find friends, drop into a jam, and talk.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
      </head>
      <body>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
          <IntlProvider>
            {children}
          </IntlProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
