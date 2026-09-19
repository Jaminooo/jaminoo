'use client';

import { api } from '@/lib/client-api';
import { useI18n } from '@/providers/i18n-provider';
import { useThemeCtx } from '@/providers/theme-provider';
import { Languages, Moon, Sun, Monitor, Sparkles, LogOut, Palette } from 'lucide-react';
import { NotificationCenter } from '@/components/notification-center';

export function TopRightControls({ inline = false }: { inline?: boolean }) {
  const { locale, setLocale, t } = useI18n();
  const { theme, setTheme } = useThemeCtx();
  return (
    <div className={`top-right-controls${inline ? ' inline' : ''}`}>
      <div className="theme-switcher">
        <button className={`theme-btn ${theme === 'dark' ? 'active' : ''}`} onClick={() => setTheme('dark')} title={t('theme.dark')} aria-label={t('theme.dark')}><Moon size={15} /></button>
        <button className={`theme-btn ${theme === 'light' ? 'active' : ''}`} onClick={() => setTheme('light')} title={t('theme.light')} aria-label={t('theme.light')}><Sun size={15} /></button>
        <button className={`theme-btn ${theme === 'system' ? 'active' : ''}`} onClick={() => setTheme('system')} title={t('theme.system')} aria-label={t('theme.system')}><Monitor size={15} /></button>
        <button className={`theme-btn ${theme === 'anime' ? 'active' : ''}`} onClick={() => setTheme('anime')} title={t('theme.anime')} aria-label={t('theme.anime')}><Sparkles size={15} /></button>
        <button className={`theme-btn ${theme === 'ocean' ? 'active' : ''}`} onClick={() => setTheme('ocean')} title={t('theme.ocean')} aria-label={t('theme.ocean')}><Palette size={15} /></button>
        <button className={`theme-btn ${theme === 'forest' ? 'active' : ''}`} onClick={() => setTheme('forest')} title={t('theme.forest')} aria-label={t('theme.forest')}><Palette size={15} /></button>
      </div>
      <NotificationCenter />
      <button className="btn btn-ghost pill-sm" onClick={() => setLocale(locale === 'en' ? 'fa' : 'en')} title={locale === 'en' ? 'فارسی' : 'English'}><Languages size={15} /><span className="lang-label" style={{ fontSize: 12 }}>{locale === 'en' ? 'فا' : 'EN'}</span></button>
      <button className="btn btn-ghost pill-sm" onClick={async () => { try { await api('/api/auth', { method: 'POST', body: JSON.stringify({ action: 'logout' }) }); } catch {} window.location.reload(); }} title={t('panel.logout')}><LogOut size={15} /></button>
    </div>
  );
}
