'use client';

import { useEffect, useMemo, useState } from 'react';
import { Bell, Check, CheckCheck, Heart, MessageCircle, UserPlus, Video, Music2, ShieldCheck, Inbox, X } from 'lucide-react';
import { api } from '@/lib/client-api';
import { useTranslations } from '@/providers/use-translations';
import { useAppStore } from '@/store/app-store';

type NotificationItem = { id: number; kind: string; payload: Record<string, unknown>; createdAt: string; readAt: string | null };
type Filter = 'ALL' | 'SOCIAL' | 'CONTENT' | 'SYSTEM';

function groupFor(kind: string): Exclude<Filter, 'ALL'> {
  if (kind.includes('LIKE') || kind.includes('COMMENT') || kind.includes('FOLLOW') || kind.includes('FRIEND')) return 'SOCIAL';
  if (kind.includes('VIDEO') || kind.includes('MUSIC') || kind.includes('COLLAB')) return 'CONTENT';
  return 'SYSTEM';
}
function iconFor(kind: string) {
  if (kind.includes('LIKE')) return <Heart size={16} />;
  if (kind.includes('COMMENT')) return <MessageCircle size={16} />;
  if (kind.includes('FOLLOW') || kind.includes('FRIEND')) return <UserPlus size={16} />;
  if (kind.includes('VIDEO') || kind.includes('COLLAB')) return <Video size={16} />;
  if (kind.includes('MUSIC')) return <Music2 size={16} />;
  if (kind.includes('CREATOR') || kind.includes('ADMIN')) return <ShieldCheck size={16} />;
  return <Bell size={16} />;
}
function readable(item: NotificationItem, t: (key: string, vars?: Record<string, string | number>) => string) {
  const p = item.payload;
  const user = typeof p.username === 'string' ? `@${p.username}` : t('notifications.someone');
  if (item.kind.includes('LIKE')) return t('notifications.like', { user });
  if (item.kind.includes('COMMENT')) return t('notifications.comment', { user });
  if (item.kind.includes('FOLLOW')) return t('notifications.follow', { user });
  if (item.kind.includes('FRIEND')) return t('notifications.friend', { user });
  if (item.kind.includes('COLLAB')) return t('notifications.collab', { user });
  if (typeof p.message === 'string') return p.message;
  if (typeof p.text === 'string') return p.text;
  return t('notifications.update');
}

export function NotificationCenter() {
  const t = useTranslations();
  const unread = useAppStore((s) => s.unread.notifications);
  const setUnread = useAppStore((s) => s.setUnread);
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<Filter>('ALL');
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const load = async () => {
    setLoading(true);
    try { const data = await api<{ notifications: NotificationItem[] }>('/api/notifications'); setItems(data.notifications); }
    catch {} finally { setLoading(false); }
  };
  useEffect(() => { void load(); const timer = window.setInterval(() => { if (document.visibilityState === 'visible') void load(); }, 20000); return () => window.clearInterval(timer); }, []);
  const visible = useMemo(() => filter === 'ALL' ? items : items.filter((item) => groupFor(item.kind) === filter), [filter, items]);
  const markOne = async (id: number) => { await api('/api/notifications', { method: 'PATCH', body: JSON.stringify({ id }) }).catch(() => {}); setItems((current) => current.map((item) => item.id === id ? { ...item, readAt: new Date().toISOString() } : item)); setUnread({ notifications: Math.max(0, unread - 1) }); };
  const markAll = async () => { await api('/api/notifications', { method: 'PATCH', body: JSON.stringify({ all: true }) }).catch(() => {}); setItems((current) => current.map((item) => ({ ...item, readAt: item.readAt ?? new Date().toISOString() }))); setUnread({ notifications: 0 }); };
  return <div className="notification-center">
    <button className={`btn btn-ghost pill-sm notification-btn ${open ? 'is-open' : ''}`} onClick={() => { setOpen((value) => !value); if (!open) void load(); }} title={t('notifications.title')} aria-label={t('notifications.title')}><Bell size={15} />{unread > 0 && <span className="top-notification-badge">{unread > 9 ? '9+' : unread}</span>}</button>
    {open && <div className="notification-panel" role="dialog" aria-label={t('notifications.title')}>
      <div className="notification-panel-head"><div><b>{t('notifications.title')}</b><small>{unread > 0 ? t('notifications.unreadCount', { n: unread }) : t('notifications.allCaughtUp')}</small></div><div className="notification-panel-actions"><button className="btn-icon" onClick={() => void markAll()} title={t('notifications.markAll')}><CheckCheck size={15} /></button><button className="btn-icon" onClick={() => setOpen(false)} title={t('notifications.close')}><X size={15} /></button></div></div>
      <div className="notification-filters">{(['ALL', 'SOCIAL', 'CONTENT', 'SYSTEM'] as Filter[]).map((value) => <button key={value} className={filter === value ? 'active' : ''} onClick={() => setFilter(value)}>{t(`notifications.filter${value[0]}${value.slice(1).toLowerCase()}`)}</button>)}</div>
      <div className="notification-list">{loading && <div className="notification-state"><span className="admin-loader" />{t('notifications.loading')}</div>}{!loading && visible.length === 0 && <div className="notification-state"><Inbox size={22} /><span>{t('notifications.empty')}</span></div>}{!loading && visible.map((item) => <button key={item.id} className={`notification-row ${item.readAt ? '' : 'unread'}`} onClick={() => void markOne(item.id)}><span className={`notification-icon notification-icon-${groupFor(item.kind).toLowerCase()}`}>{iconFor(item.kind)}</span><span className="notification-copy"><b>{readable(item, t)}</b><small>{new Date(item.createdAt).toLocaleString()}</small></span>{!item.readAt && <span className="notification-new"><Check size={11} /></span>}</button>)}</div>
    </div>}
  </div>;
}
