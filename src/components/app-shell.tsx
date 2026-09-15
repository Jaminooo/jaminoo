'use client';

import { useEffect } from 'react';
import { api } from '@/lib/client-api';
import { useAppStore } from '@/store/app-store';
import { AuthScreen } from '@/components/auth-screen';
import { PanelShell } from '@/components/panel-shell';
import { JaminoAvatar } from '@/components/jamino-avatar';
import { useI18n } from '@/providers/i18n-provider';
import { useThemeCtx } from '@/providers/theme-provider';
import { ToastHost } from '@/components/toast-host';
import { motion, AnimatePresence } from 'framer-motion';
import { Languages, Moon, Sun, Monitor, Sparkles, LogOut } from 'lucide-react';
import { useTranslations } from '@/providers/use-translations';

export function AppShell() {
  const { me, booted, setMe, setBooted, tab, authView, setTab } = useAppStore();

  useEffect(() => {
    (async () => {
      try {
        const res = await api<{ user: import('@/store/app-store').Me }>('/api/auth');
        setMe(res.user);
      } catch {
        setMe(null);
      } finally {
        setBooted(true);
      }
    })();
  }, [setMe, setBooted]);

  if (!booted) {
    return (
      <div className="screen screen-auth" style={{ display: 'grid', placeItems: 'center', minHeight: '100vh' }}>
        <div className="wordmark" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span className="wordmark-mark">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 3 5 21" />
              <path d="M22 17a2 2 0 1 0-4-1.5L16 21a2 2 0 1 0 4 0Z" />
            </svg>
          </span>
          <span style={{ fontSize: 15, fontWeight: 600 }}>Jamino</span>
        </div>
      </div>
    );
  }

  return (
    <>
      <TopRightControls />
      <ToastHost />
      <AnimatePresence mode="wait">
        {me ? (
          <motion.div key="panel" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
            <PanelShell />
          </motion.div>
        ) : (
          <motion.div key="auth" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
            <div className="screen screen-auth">
              <div className="bg-grid" />
              <div className="bg-halo" />
              <AuthScreen />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function TopRightControls() {
  const { locale, setLocale, t } = useI18n();
  const { theme, setTheme, resolved } = useThemeCtx();
  const user = useAppStore((s) => s.me);

  return (
    <div className="top-right-controls">
      <div className="theme-switcher" style={{ position: 'static', display: 'flex', gap: 4 }}>
        <button className={`theme-btn ${theme === 'dark' ? 'active' : ''}`} onClick={() => setTheme('dark')} title={t('theme.dark')} aria-label={t('theme.dark')}>
          <Moon size={15} />
        </button>
        <button className={`theme-btn ${theme === 'light' ? 'active' : ''}`} onClick={() => setTheme('light')} title={t('theme.light')} aria-label={t('theme.light')}>
          <Sun size={15} />
        </button>
        <button className={`theme-btn ${theme === 'system' ? 'active' : ''}`} onClick={() => setTheme('system')} title={t('theme.system')} aria-label={t('theme.system')}>
          <Monitor size={15} />
        </button>
        <button className={`theme-btn ${theme === 'anime' ? 'active' : ''}`} onClick={() => setTheme('anime')} title={t('theme.anime')} aria-label={t('theme.anime')}>
          <Sparkles size={15} />
        </button>
      </div>

      <button
        className="btn btn-ghost pill-sm"
        style={{ marginInlineStart: 8 }}
        onClick={() => setLocale(locale === 'en' ? 'fa' : 'en')}
        title={locale === 'en' ? 'فارسی' : 'English'}
      >
        <Languages size={15} />
        <span style={{ fontSize: 12 }}>{locale === 'en' ? 'فا' : 'EN'}</span>
      </button>

      {user && (
        <button
          className="btn btn-ghost pill-sm"
          style={{ marginInlineStart: 8 }}
          onClick={async () => {
            try {
              await api('/api/auth', { method: 'POST', body: JSON.stringify({ action: 'logout' }) });
            } catch {}
            window.location.reload();
          }}
        >
          <LogOut size={15} />
        </button>
      )}
    </div>
  );
}