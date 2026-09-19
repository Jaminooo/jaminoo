'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '@/lib/client-api';
import { useI18n } from '@/providers/i18n-provider';
import { useAppStore } from '@/store/app-store';
import { onLive } from '@/lib/live';
import { loadUnread } from '@/lib/unread';
import { metaFor, describeNotification, type NotifActor } from '@/lib/notification-meta';
import { JaminoAvatar } from '@/components/jamino-avatar';
import { Bell, Loader2, Check, Trash2, CheckCheck, X } from 'lucide-react';

interface NotifItem {
  id: number;
  kind: string;
  payload: Record<string, unknown>;
  createdAt: string;
  readAt: string | null;
  read: boolean;
  actor: NotifActor | null;
}

interface NotifResponse {
  notifications: NotifItem[];
  nextCursor: string | null;
  hasMore: boolean;
  unread: number;
}

type Filter = 'all' | 'unread';

export function NotificationPopover({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t, locale } = useI18n();
  const notificationCount = useAppStore((s) => s.unread.notifications);
  const [filter, setFilter] = useState<Filter>('all');
  const [items, setItems] = useState<NotifItem[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const load = useCallback(
    (cursor?: string) => {
      const params = new URLSearchParams();
      if (filter === 'unread') params.set('filter', 'unread');
      if (cursor) params.set('cursor', cursor);
      const qs = params.toString();
      return api<NotifResponse>(`/api/notifications${qs ? `?${qs}` : ''}`)
        .then((res) => {
          if (cursor) {
            setItems((prev) => [...prev, ...res.notifications]);
          } else {
            setItems(res.notifications);
          }
          setNextCursor(res.nextCursor);
          setHasMore(res.hasMore);
          useAppStore.getState().setUnread({ notifications: res.unread });
          return res;
        })
        .catch(() => null);
    },
    [filter]
  );

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    load().finally(() => setLoading(false));
  }, [open, reloadKey, filter, load]);

  useEffect(() => {
    if (!open) return;
    return onLive('notif:new', () => {
      load();
      loadUnread();
    });
  }, [open, load]);

  const markAllRead = async () => {
    await api('/api/notifications', { method: 'PATCH', body: JSON.stringify({ all: true }) }).catch(() => {});
    useAppStore.getState().setUnread({ notifications: 0 });
    setReloadKey((k) => k + 1);
  };

  const markOneRead = async (item: NotifItem) => {
    if (item.read) return;
    await api('/api/notifications', { method: 'PATCH', body: JSON.stringify({ id: item.id }) }).catch(() => {});
    setItems((prev) => prev.map((n) => (n.id === item.id ? { ...n, read: true, readAt: new Date().toISOString() } : n)));
    loadUnread();
  };

  const removeOne = async (item: NotifItem) => {
    await api(`/api/notifications?id=${item.id}`, { method: 'DELETE' }).catch(() => {});
    setItems((prev) => prev.filter((n) => n.id !== item.id));
    loadUnread();
  };

  const openTarget = (item: NotifItem) => {
    const store = useAppStore.getState();
    const jamId = Number(item.payload.jamId ?? 0);
    if (Number.isInteger(jamId) && jamId > 0) {
      store.setProduct('community');
      store.setRoomId(String(jamId));
      onClose();
      return;
    }
    if (item.actor?.id) {
      store.setProduct('community');
      store.setProfileUserId(item.actor.id);
      onClose();
    }
  };

  const loadMore = async () => {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    await load(nextCursor);
    setLoadingMore(false);
  };

  const unreadItems = items.filter((n) => !n.read).length;

  return (
    <div className="notification-popover">
      <div className="notification-head">
        <b>{t('notif.title')}</b>
        <div className="notification-head-actions">
          <div className="notification-filters">
            <button type="button" className={`notification-filter ${filter === 'all' ? 'active' : ''}`} onClick={() => setFilter('all')}>
              {t('notif.all')}
            </button>
            <button type="button" className={`notification-filter ${filter === 'unread' ? 'active' : ''}`} onClick={() => setFilter('unread')}>
              {t('notif.unread')}
              {unreadItems > 0 && <span className="notification-filter-count">{unreadItems > 9 ? '9+' : unreadItems}</span>}
            </button>
          </div>
          <button
            type="button"
            className="btn-icon"
            onClick={markAllRead}
            disabled={items.length === 0 || unreadItems === 0}
            title={t('notif.markAllRead')}
            aria-label={t('notif.markAllRead')}
          >
            <CheckCheck size={15} />
          </button>
          <button type="button" className="btn-icon" onClick={onClose} title={t('notif.close')} aria-label={t('notif.close')}>
            <X size={15} />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="notification-state">
          <Loader2 className="spin" size={20} />
        </div>
      ) : items.length === 0 ? (
        <div className="notification-empty">
          <Bell size={22} />
          <span>{filter === 'unread' ? t('notif.noUnread') : t('notif.empty')}</span>
        </div>
      ) : (
        <>
          <div className="notification-list">
            {items.map((item) => {
              const meta = metaFor(item.kind);
              const Icon = meta.icon;
              const { heading, detail } = describeNotification(item, t, locale);
              return (
                <div key={item.id} className={`notification-item ${item.read ? '' : 'unread'}`} onClick={() => openTarget(item)} role="button" tabIndex={0}>
                  {!item.read && <span className="notification-dot" />}
                  <span className={`notification-icon ${meta.tone}`}>
                    <Icon size={14} />
                  </span>
                  <span className="notification-copy">
                    <span className="notification-text">{heading}</span>
                    {detail ? <span className="notification-detail">{detail}</span> : null}
                    <span className="notification-meta">
                      {item.actor ? <JaminoAvatar avatarId={item.actor.avatarId} size={15} photo={item.actor.avatarPhoto} name={item.actor.username} /> : null}
                      {item.actor ? <span className="notification-user">@{item.actor.username}</span> : null}
                      <small>{relTime(item.createdAt, t)}</small>
                    </span>
                  </span>
                  <span className="notification-actions">
                    {!item.read && (
                      <button
                        type="button"
                        className="btn-icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          markOneRead(item);
                        }}
                        title={t('notif.markRead')}
                      >
                        <Check size={13} />
                      </button>
                    )}
                    <button
                      type="button"
                      className="btn-icon danger"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeOne(item);
                      }}
                      title={t('notif.delete')}
                    >
                      <Trash2 size={13} />
                    </button>
                  </span>
                </div>
              );
            })}
          </div>
          {hasMore && (
            <button type="button" className="notification-more" onClick={loadMore} disabled={loadingMore}>
              {loadingMore ? <Loader2 className="spin" size={14} /> : t('notif.more')}
            </button>
          )}
        </>
      )}
    </div>
  );
}

function relTime(iso: string, t: (key: string, vars?: Record<string, string | number>) => string) {
  const s = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 45) return t('notif.now');
  const m = Math.floor(s / 60);
  if (m < 60) return t('notif.minAgo', { n: m });
  const h = Math.floor(m / 60);
  if (h < 24) return t('notif.hourAgo', { n: h });
  const d = Math.floor(h / 24);
  if (d < 7) return t('notif.dayAgo', { n: d });
  return new Date(iso).toLocaleDateString([], { day: 'numeric', month: 'short' });
}