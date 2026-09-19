'use client';

import { useCallback, useEffect, useState } from 'react';
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
import { AdminAudit } from './admin-audit';
import { AdminAnnouncements } from './admin-announcements';

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

export type AdminTab = 'dashboard' | 'users' | 'jams' | 'messages' | 'reports' | 'creators' | 'media' | 'sessions' | 'music' | 'cinema' | 'audit' | 'announcements';

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
  { id: 'sessions', icon: KeyRound, key: 'admin.sessions' },
  { id: 'audit', icon: ScrollText, key: 'admin.audit' },
  { id: 'announcements', icon: BellRing, key: 'admin.announcements' },
];

export function AdminPanel() {
  const t = useTranslations();
  const { locale, setLocale } = useLocale();
  const [tab, setTab] = useState<AdminTab>('dashboard');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [state, setState] = useState<'loading' | 'forbidden' | 'ready'>('loading');
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [events, setEvents] = useState<AdminEvent[]>([]);

  const reload = useCallback(() => {
    api<{ stats: AdminStats; events: AdminEvent[] }>('/api/admin')
      .then((d) => {
        setStats(d.stats);
        setEvents(d.events);
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
      {mobileOpen ? <button className="admin-side-overlay" aria-label={t('admin.closeMenu')} onClick={() => setMobileOpen(false)} /> : null}
      <aside className={`admin-side ${mobileOpen ? 'open' : ''}`}>
        <div className="admin-brand">
          <span className="wordmark-mark">
            <RadioTower size={17} />
          </span>
          <span className="admin-brand-text">
            <b>Jamino</b>
            <em>{t('admin.title')}</em>
          </span>
        </div>
        <div className="admin-nav-caption">
          <Activity size={13} />
          {t('admin.workspace')}
        </div>
        <nav className="admin-nav">
          {TABS.map(({ id, icon: Icon, key }) => (
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
            <button className="admin-mobile-menu btn-icon" onClick={() => setMobileOpen(true)} aria-label={t('admin.menu')}>
              <Menu size={18} />
            </button>
            <div>
              <div className="admin-eyebrow">{t('admin.controlRoom')}</div>
              <h1>{t(`admin.${tab}`)}</h1>
              <p>{t('admin.tagline')}</p>
            </div>
          </div>
          <div className="admin-top-actions">
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
          {tab === 'sessions' && <AdminSessions />}
          {tab === 'audit' && <AdminAudit events={events} />}
          {tab === 'announcements' && <AdminAnnouncements />}
        </div>
      </main>
    </div>
  );
}
