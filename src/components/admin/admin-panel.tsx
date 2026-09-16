'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/client-api';
import { connectLive, onLive } from '@/lib/live';
import { useTranslations } from '@/providers/use-translations';
import {
  Shield,
  LayoutDashboard,
  Users,
  RadioTower,
  MessageSquare,
  Image,
  KeyRound,
  ArrowLeft,
  RefreshCw,
  Loader2,
} from 'lucide-react';
import { AdminDashboard } from './admin-dashboard';
import { AdminUsers } from './admin-users';
import { AdminJams } from './admin-jams';
import { AdminMessages } from './admin-messages';
import { AdminMedia } from './admin-media';
import { AdminSessions } from './admin-sessions';

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
}

export interface AdminEvent {
  at: number;
  type: string;
  text: string;
  meta?: Record<string, unknown>;
}

type Tab = 'dashboard' | 'users' | 'jams' | 'messages' | 'media' | 'sessions';

const TABS: { id: Tab; icon: typeof Users; key: string }[] = [
  { id: 'dashboard', icon: LayoutDashboard, key: 'admin.dashboard' },
  { id: 'users', icon: Users, key: 'admin.users' },
  { id: 'jams', icon: RadioTower, key: 'admin.jams' },
  { id: 'messages', icon: MessageSquare, key: 'admin.messages' },
  { id: 'media', icon: Image, key: 'admin.media' },
  { id: 'sessions', icon: KeyRound, key: 'admin.sessions' },
];

export function AdminPanel() {
  const t = useTranslations();
  const [tab, setTab] = useState<Tab>('dashboard');
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

  return (
    <div className="admin-root">
      <aside className="admin-side">
        <div className="admin-brand">
          <span className="wordmark-mark">
            <RadioTower size={17} />
          </span>
          <span className="admin-brand-text">
            <b>Jamino</b>
            <em>{t('admin.title')}</em>
          </span>
        </div>
        <nav className="admin-nav">
          {TABS.map(({ id, icon: Icon, key }) => (
            <button
              key={id}
              className={`admin-nav-item ${tab === id ? 'active' : ''}`}
              onClick={() => setTab(id)}
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
          <div>
            <h1>{t(`admin.${tab}`)}</h1>
            <p>{t('admin.tagline')}</p>
          </div>
          <button className="btn btn-ghost btn-icon-label" onClick={reload} title="refresh">
            <RefreshCw size={15} />
          </button>
        </header>

        <div className="admin-content">
          {tab === 'dashboard' && <AdminDashboard stats={stats} events={events} />}
          {tab === 'users' && <AdminUsers />}
          {tab === 'jams' && <AdminJams />}
          {tab === 'messages' && <AdminMessages />}
          {tab === 'media' && <AdminMedia />}
          {tab === 'sessions' && <AdminSessions />}
        </div>
      </main>
    </div>
  );
}