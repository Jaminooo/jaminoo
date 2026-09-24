'use client';
import { api } from '@/lib/client-api';
import { useI18n } from '@/providers/i18n-provider';
import { useThemeCtx } from '@/providers/theme-provider';
import { Languages, Moon, Sun, LogOut, Bell } from 'lucide-react';
import { useAppStore } from '@/store/app-store';
import { useEffect, useRef, useState } from 'react';
import { connectLive, onLive } from '@/lib/live';
import { loadUnread } from '@/lib/unread';
import { NotificationPopover } from '@/components/notification-panel';

export function TopRightControls({ inline = false }: { inline?: boolean }) {
  const { locale, setLocale, t } = useI18n();
  const { theme, setTheme } = useThemeCtx();
  const notificationCount = useAppStore((s) => s.unread.notifications);
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    connectLive();
    const off = onLive('notif:new', loadUnread);
    return off;
  }, []);

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: globalThis.MouseEvent | globalThis.PointerEvent) => {
      const el = wrapperRef.current;
      if (el && !el.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    window.addEventListener('pointerdown', onPointer);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('pointerdown', onPointer);
      window.removeEventListener('keydown', onKey);
    };
  }, [open, setOpen]);

  return (
    <div className={`top-right-controls${inline ? ' inline' : ''}`} ref={wrapperRef}>
      <div className="theme-switcher">
        <button type="button" className={`theme-btn ${theme === 'dark' ? 'active' : ''}`} onClick={() => setTheme('dark')} title={t('theme.dark')} aria-label={t('theme.dark')} aria-pressed={theme === 'dark'}>
          <Moon size={15} />
        </button>
        <button type="button" className={`theme-btn ${theme === 'light' ? 'active' : ''}`} onClick={() => setTheme('light')} title={t('theme.light')} aria-label={t('theme.light')} aria-pressed={theme === 'light'}>
          <Sun size={15} />
        </button>
      </div>

      <button
        type="button"
        className="btn btn-ghost pill-sm notification-btn"
        onClick={() => setOpen((o) => !o)}
        title={t('panel.notifications')}
        aria-label={t('panel.notifications')}
        aria-expanded={open}
        aria-haspopup="dialog"
      >
        <Bell size={15} />
        {notificationCount > 0 && <span className="top-notification-badge">{notificationCount > 9 ? '9+' : notificationCount}</span>}
      </button>
      {open && <NotificationPopover open={open} onClose={() => setOpen(false)} />}

      <button
        type="button"
        className="btn btn-ghost pill-sm"
        onClick={() => setLocale(locale === 'en' ? 'fa' : 'en')}
        title={locale === 'en' ? 'فارسی' : 'English'}
      >
        <Languages size={15} />
        <span className="lang-label" style={{ fontSize: 12 }}>{locale === 'en' ? 'فا' : 'EN'}</span>
      </button>

      <button
        type="button"
        className="btn btn-ghost pill-sm"
        onClick={async () => {
          try {
            await api('/api/auth', { method: 'POST', body: JSON.stringify({ action: 'logout' }) });
          } catch {}
          window.location.reload();
        }}
        title={t('panel.logout')}
        aria-label={t('panel.logout')}
      >
        <LogOut size={15} />
      </button>
    </div>
  );
}
