'use client';

import { api } from '@/lib/client-api';
import { useI18n } from '@/providers/i18n-provider';
import { useThemeCtx } from '@/providers/theme-provider';
import { Languages, Moon, Sun, Monitor, Sparkles, LogOut, Bell, Check } from 'lucide-react';
import { useAppStore } from '@/store/app-store';
import { useEffect, useState } from 'react';

export function TopRightControls({ inline = false }: { inline?: boolean }) {
  const { locale, setLocale, t } = useI18n();
  const { theme, setTheme } = useThemeCtx();
  const notificationCount = useAppStore((s) => s.unread.notifications);
  const setUnread = useAppStore((s) => s.setUnread);
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<{ id: number; kind: string; payload: Record<string, unknown>; createdAt: string }[]>([]);

  useEffect(() => {
    api<{ notifications: typeof items }>('/api/notifications').then((data) => setItems(data.notifications)).catch(() => {});
  }, [notificationCount]);

  const markRead = async () => {
    await api('/api/notifications', { method: 'PATCH', body: JSON.stringify({ all: true }) }).catch(() => {});
    setUnread({ notifications: 0 });
    setItems((current) => current);
  };

  return (
    <div className={`top-right-controls${inline ? ' inline' : ''}`}>
      <div className="theme-switcher">
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
        className="btn btn-ghost pill-sm notification-btn"
        onClick={() => setOpen((value) => !value)}
        title="Notifications"
        aria-label="Notifications"
      >
        <Bell size={15} />
        {notificationCount > 0 && <span className="top-notification-badge">{notificationCount > 9 ? '9+' : notificationCount}</span>}
      </button>
      {open && <div className="notification-popover">
        <div className="notification-head"><b>Notifications</b><button type="button" className="btn-icon" onClick={markRead} title="Mark all as read"><Check size={14} /></button></div>
        {items.length === 0 ? <div className="notification-empty">No notifications yet.</div> : items.map((item) => <div className="notification-item" key={item.id}><b>{item.kind.replaceAll('_', ' ')}</b><span>{String(item.payload?.message ?? item.payload?.text ?? 'You have a new update.')}</span><small>{new Date(item.createdAt).toLocaleString()}</small></div>)}
      </div>}

      <button
        className="btn btn-ghost pill-sm"
        onClick={() => setLocale(locale === 'en' ? 'fa' : 'en')}
        title={locale === 'en' ? 'فارسی' : 'English'}
      >
        <Languages size={15} />
        <span style={{ fontSize: 12 }}>{locale === 'en' ? 'فا' : 'EN'}</span>
      </button>

      <button
        className="btn btn-ghost pill-sm"
        onClick={async () => {
          try {
            await api('/api/auth', { method: 'POST', body: JSON.stringify({ action: 'logout' }) });
          } catch {}
          window.location.reload();
        }}
        title={t('panel.logout')}
      >
        <LogOut size={15} />
      </button>
    </div>
  );
}
