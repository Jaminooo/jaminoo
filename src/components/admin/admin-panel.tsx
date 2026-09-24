'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/client-api';
import { connectLive, onLive } from '@/lib/live';
import { useLocale, useTranslations } from '@/providers/use-translations';
import {
  Activity,
  ExternalLink,
  Shield,
  LayoutDashboard,
  Languages,
  Menu,
  Users,
  RadioTower,
  MessageSquare,
  Image,
  KeyRound,
  Music2,
  Flag,
   BadgeCheck,
   ArrowLeft,
 RefreshCw,
   Loader2,
   X,
   ScrollText,
   BellRing,
  Bell,
  Film,
  Crown,
} from 'lucide-react';
import { AdminDashboard } from './admin-dashboard';
import { AdminUsers } from './admin-users';
import { AdminJams } from './admin-jams';
import { AdminMessages } from './admin-messages';
import { AdminMedia } from './admin-media';
import { AdminSessions } from './admin-sessions';
import { AdminMusic } from './music/admin-music';
import { AdminReports } from './admin-reports';
import { AdminCreators } from './admin-creators';
import { AdminCinema } from './admin-cinema';
import { AdminAnime } from './admin-anime';
import { AdminRoles } from './admin-roles';
import { AdminAudit } from './admin-audit';
import { AdminAnnouncements } from './admin-announcements';
import { AdminNotifications } from './admin-notifications';

export interface AdminStats {
  users: number;
  newUsers24h: number;
  jams: number;
  openJams: number;
  jamMsgs: number;
  dmMsgs: number;
  jamMsgs24h: number;
  dmMsgs24h: number;
  media: number;
  sessions: number;
  friends: number;
  pendingInvites: number;
  banned: number;
  online: number;
  countryStats: { country: string; count: number }[];
  signupTrend: { date: string; count: number }[];
}

export interface AdminEvent {
  at: number;
  type: string;
  text: string;
  meta?: Record<string, unknown>;
}

export type AdminTab =
  | 'dashboard'
  | 'users'
  | 'jams'
  | 'messages'
  | 'reports'
  | 'creators'
  | 'media'
  | 'sessions'
  | 'music'
  | 'cinema'
  | 'anime'
  | 'roles'
  | 'audit'
  | 'announcements'
  | 'notifications';

export interface AdminMeta {
  username: string;
  scope: string;
  isSuper: boolean;
  hubScopes: string[];
}

const TABS: { id: AdminTab; icon: typeof Users; key: string }[] = [
  { id: 'dashboard', icon: LayoutDashboard, key: 'admin.dashboard' },
  { id: 'users', icon: Users, key: 'admin.users' },
  { id: 'jams', icon: RadioTower, key: 'admin.jams' },
  { id: 'messages', icon: MessageSquare, key: 'admin.messages' },
  { id: 'reports', icon: Flag, key: 'admin.reports' },
  { id: 'creators', icon: BadgeCheck, key: 'admin.creators' },
  { id: 'media', icon: Image, key: 'admin.media' },
  { id: 'music', icon: Music2, key: 'admin.musicLabel' },
  { id: 'cinema', icon: RadioTower, key: 'admin.cinema' },
  { id: 'anime', icon: Film, key: 'admin.anime' },
  { id: 'roles', icon: Shield, key: 'admin.roles' },
  { id: 'sessions', icon: KeyRound, key: 'admin.sessions' },
  { id: 'audit', icon: ScrollText, key: 'admin.audit' },
  { id: 'announcements', icon: BellRing, key: 'admin.announcements' },
  { id: 'notifications', icon: Bell, key: 'admin.notifications' },
];

const SCOPE_TABS: Partial<Record<AdminTab, string[]>> = {
  dashboard: ['MUSIC', 'VIDEO', 'ANIME', 'CINEMA', 'TWEET', 'COMMUNITY'],
  media: ['MUSIC', 'VIDEO', 'ANIME', 'CINEMA', 'TWEET', 'COMMUNITY'],
  creators: ['MUSIC', 'VIDEO', 'ANIME'],
  music: ['MUSIC'],
  cinema: ['CINEMA'],
  anime: ['ANIME'],
};

export function AdminPanel() {
  const t = useTranslations();
  const { locale, setLocale } = useLocale();
  const [tab, setTab] = useState<AdminTab>('dashboard');
  const [mobileOpen, setMobileOpen] = useState(false);
  const mobileMenuRef = useRef<HTMLElement>(null);
  const mobileMenuTriggerRef = useRef<HTMLButtonElement>(null);
  const [state, setState] = useState<'loading' | 'forbidden' | 'ready'>('loading');
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [events, setEvents] = useState<AdminEvent[]>([]);
  const [meta, setMeta] = useState<AdminMeta | null>(null);

  const reload = useCallback(() => {
    api<{ stats: AdminStats; events: AdminEvent[]; admin: AdminMeta }>('/api/admin')
      .then((d) => {
        setStats(d.stats);
        setEvents(d.events);
        setMeta(d.admin);
        setState('ready');
      })
      .catch(() => setState('forbidden'));
  }, []);

  useEffect(() => {
    reload();
    connectLive();
    const tick = setInterval(reload, 30000);
    return () => clearInterval(tick);
  }, [reload]);

  useEffect(
    () =>
      onLive('admin:event', (ev: AdminEvent) => {
        setEvents((prev) => [ev, ...prev].slice(0, 80));
        reload();
      }),
    [reload]
  );

  useEffect(() => {
    if (!mobileOpen) return;
    const menu = mobileMenuRef.current;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const getFocusable = () => Array.from(menu?.querySelectorAll<HTMLElement>('button:not(:disabled), a[href]') ?? []);
    requestAnimationFrame(() => getFocusable()[0]?.focus());
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setMobileOpen(false);
        return;
      }
      if (event.key !== 'Tab') return;
      const focusable = getFocusable();
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!first || !last) return;
      if (event.shiftKey && (document.activeElement === first || !menu?.contains(document.activeElement))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (document.activeElement === last || !menu?.contains(document.activeElement))) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
      if (previousFocus?.isConnected) previousFocus.focus();
      else mobileMenuTriggerRef.current?.focus();
    };
  }, [mobileOpen]);

  const visibleTabs = useMemo(() => {
    if (!meta) return TABS;
    if (meta.isSuper) return TABS;
    const scopes = new Set(meta.hubScopes);
    return TABS.filter((t) => {
      if (t.id === 'roles') return false;
      const allowed = SCOPE_TABS[t.id];
      if (!allowed) return true;
      return allowed.some((s) => scopes.has(s));
    });
  }, [meta]);

  useEffect(() => {
    if (visibleTabs.length > 0 && !visibleTabs.some((t) => t.id === tab)) setTab(visibleTabs[0].id);
  }, [visibleTabs, tab]);

  if (state === 'loading') {
    return (
      <div className="admin-gate">
        <Loader2 className="spin" size={28} />
      </div>
    );
  }

  if (state === 'forbidden') {
    return (
      <div className="admin-gate admin-gate-card">
        <div className="admin-gate-icon">
          <Shield size={26} />
        </div>
        <h2>{t('admin.notAdminTitle')}</h2>
        <p>{t('admin.notAdminText')}</p>
        <Link className="btn btn-violet" href="/">
          {t('admin.backToApp')}
        </Link>
      </div>
    );
  }

  const selectTab = (nextTab: AdminTab) => {
    setTab(nextTab);
    setMobileOpen(false);
  };

  return (
    <div className="admin-root">
      {mobileOpen ? <button type="button" className="admin-side-overlay" aria-label={t('admin.closeMenu')} onClick={() => setMobileOpen(false)} /> : null}
      <aside
        ref={mobileMenuRef}
        id="admin-navigation"
        className={`admin-side ${mobileOpen ? 'open' : ''}`}
        role={mobileOpen ? 'dialog' : undefined}
        aria-modal={mobileOpen ? true : undefined}
        aria-label={t('admin.workspace')}
      >
        <div className="admin-brand">
          <span className="wordmark-mark">
            <RadioTower size={17} />
          </span>
          <span className="admin-brand-text">
            <b>Jamino</b>
            <em>{t('admin.title')}</em>
          </span>
          <button type="button" className="admin-mobile-close" onClick={() => setMobileOpen(false)} aria-label={t('admin.closeMenu')}>
            <X size={18} />
          </button>
        </div>
        {meta?.isSuper && (
          <div className="admin-root-badge">
            <Crown size={14} />
            <span><b>ROOT CONTROL</b><small>Full site access</small></span>
          </div>
        )}
        <div className="admin-nav-caption">
          <Activity size={13} />
          {t('admin.workspace')}
        </div>
        <nav className="admin-nav">
          {visibleTabs.map(({ id, icon: Icon, key }) => (
            <button
              key={id}
              className={`admin-nav-item ${tab === id ? 'active' : ''}`}
              onClick={() => selectTab(id)}
              aria-current={tab === id ? 'page' : undefined}
            >
              <Icon size={17} />
              <span>{t(key)}</span>
            </button>
          ))}
        </nav>
        <div className="admin-side-foot">
          <Link className="admin-back" href="/">
            <ArrowLeft size={16} />
            {t('admin.backToApp')}
          </Link>
        </div>
      </aside>

      <main className="admin-main">
        <header className="admin-top">
          <div className="admin-top-copy">
            <button ref={mobileMenuTriggerRef} type="button" className="admin-mobile-menu btn-icon" onClick={() => setMobileOpen(true)} aria-label={t('admin.menu')} aria-expanded={mobileOpen} aria-controls="admin-navigation">
              <Menu size={18} />
            </button>
            <div>
              <div className="admin-eyebrow">{t('admin.controlRoom')}</div>
              <h1>{t(`admin.${tab}`)}</h1>
              <p>{t('admin.tagline')}</p>
            </div>
          </div>
          <div className="admin-top-actions">
            {meta?.isSuper ? <span className="admin-access-chip admin-access-root"><Crown size={13} /> Owner access</span> : <span className="admin-access-chip"><Shield size={13} /> {meta?.scope || 'Scoped admin'}</span>}
            <span className="admin-status-chip"><span className="admin-live-dot" />{t('admin.live')}</span>
            <button className="admin-language btn-icon-label" onClick={() => setLocale(locale === 'fa' ? 'en' : 'fa')} title={t('admin.language')}>
              <Languages size={15} />
              {locale === 'fa' ? 'EN' : 'FA'}
            </button>
            <Link className="btn-icon-label admin-open-app" href="/" title={t('admin.openApp')}>
              <ExternalLink size={15} />
              <span>{t('admin.openApp')}</span>
            </Link>
            <button className="btn btn-ghost btn-icon-label" onClick={reload} title={t('admin.refresh')}>
              <RefreshCw size={15} />
              <span className="admin-refresh-label">{t('admin.refresh')}</span>
            </button>
            <button className="admin-close-mobile btn-icon" onClick={() => setMobileOpen(false)} aria-label={t('admin.closeMenu')}>
              <X size={18} />
            </button>
          </div>
        </header>

        <div className="admin-content">
          {tab === 'dashboard' && <AdminDashboard stats={stats} events={events} onNavigate={selectTab} />}
          {tab === 'users' && <AdminUsers />}
          {tab === 'jams' && <AdminJams />}
          {tab === 'messages' && <AdminMessages />}
          {tab === 'reports' && <AdminReports />}
          {tab === 'creators' && <AdminCreators />}
          {tab === 'media' && <AdminMedia />}
          {tab === 'music' && <AdminMusic />}
          {tab === 'cinema' && <AdminCinema />}
          {tab === 'anime' && <AdminAnime />}
          {tab === 'roles' && <AdminRoles />}
          {tab === 'sessions' && <AdminSessions />}
{tab === 'audit' && <AdminAudit events={events} />}
          {tab === 'announcements' && <AdminAnnouncements />}
          {tab === 'notifications' && <AdminNotifications />}
        </div>
      </main>
    </div>
  );
}
