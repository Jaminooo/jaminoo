'use client';

import type { ReactNode } from 'react';
import { useTranslations } from '@/providers/use-translations';
import {
  Users,
  UserPlus,
  RadioTower,
  DoorOpen,
  MessageSquare,
  MessagesSquare,
  ImageIcon,
  KeyRound,
  Heart,
  MailPlus,
  Ban,
  Wifi,
} from 'lucide-react';
import { StatCard, timeAgo } from './admin-ui';
import type { AdminStats, AdminEvent } from './admin-panel';
import type { Tone } from './admin-ui';

const EVENT_TONE: Record<string, Tone> = {
  admin: 'violet',
  warn: 'amber',
  error: 'red',
  ok: 'green',
  steel: 'steel',
};

export function AdminDashboard({ stats, events }: { stats: AdminStats | null; events: AdminEvent[] }) {
  const t = useTranslations();
  if (!stats) return null;
  const cards: { icon: ReactNode; label: string; value: number; tone: Tone }[] = [
    { icon: <Wifi size={18} />, label: t('admin.usersOnline'), value: stats.online, tone: 'green' },
    { icon: <Users size={18} />, label: t('admin.totalUsers'), value: stats.users, tone: 'violet' },
    { icon: <UserPlus size={18} />, label: t('admin.newUsers24h'), value: stats.newUsers24h, tone: 'steel' },
    { icon: <RadioTower size={18} />, label: t('admin.totalJams'), value: stats.jams, tone: 'violet' },
    { icon: <DoorOpen size={18} />, label: t('admin.openJams'), value: stats.openJams, tone: 'green' },
    { icon: <MessageSquare size={18} />, label: t('admin.jamMessages'), value: stats.jamMsgs, tone: 'steel' },
    { icon: <MessagesSquare size={18} />, label: t('admin.dmMessages'), value: stats.dmMsgs, tone: 'steel' },
    { icon: <Heart size={18} />, label: t('admin.msgs24h'), value: stats.jamMsgs24h + stats.dmMsgs24h, tone: 'green' },
    { icon: <ImageIcon size={18} />, label: t('admin.mediaFiles'), value: stats.media, tone: 'steel' },
    { icon: <KeyRound size={18} />, label: t('admin.sessionsCount'), value: stats.sessions, tone: 'steel' },
    { icon: <MessageSquare size={18} />, label: t('admin.friendConnections'), value: stats.friends, tone: 'amber' },
    { icon: <MailPlus size={18} />, label: t('admin.pendingInvites'), value: stats.pendingInvites, tone: 'amber' },
    { icon: <Ban size={18} />, label: t('admin.bannedUsers'), value: stats.banned, tone: 'red' },
  ];

  return (
    <div className="admin-dashboard">
      <section className="admin-card admin-stats-grid">
        {cards.map((c, i) => (
          <StatCard key={i} {...c} />
        ))}
      </section>

      <section className="admin-card admin-feed-card">
        <header className="admin-card-head">
          <h2>{t('admin.activity')}</h2>
          <span className="admin-live-dot" />
        </header>
        {events.length === 0 ? (
          <div className="admin-empty-pad">{t('admin.actEmpty')}</div>
        ) : (
          <ul className="admin-feed">
            {events.map((ev, i) => (
              <li key={i} className="admin-feed-row">
                <span className={`admin-feed-dot ${EVENT_TONE[ev.type] ?? 'steel'}`} />
                <div>
                  <p>{ev.text}</p>
                  <time>{timeAgo(ev.at)}</time>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}