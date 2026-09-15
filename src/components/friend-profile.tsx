'use client';

import { useCallback, useEffect, useState } from 'react';
import { useTranslations } from '@/providers/use-translations';
import { useAppStore } from '@/store/app-store';
import { JaminoAvatar } from '@/components/jamino-avatar';
import { EmojiText } from '@/components/emoji-text';
import { api } from '@/lib/client-api';
import { toast } from '@/components/toast';
import { loadUnread } from '@/lib/unread';
import { ArrowLeft, MessageCircle, UserPlus, UserMinus, Check, X, Clock, Users, Radio, MessageSquare, Github } from 'lucide-react';

interface ProfileData {
  user: {
    id: number;
    username: string;
    uid: string;
    avatarId: number;
    bio: string;
    github: boolean;
    status: string;
    statusText: string;
    createdAt: string;
    avatarPhoto: string | null;
  };
  relationship: 'me' | 'friends' | 'sent' | 'received' | 'none';
  requestId: number | null;
  ownedJams: number;
  friendsCount: number;
  jamMsgCount: number;
}

export function FriendProfilePanel({ userId, onBack }: { userId: number; onBack: () => void }) {
  const t = useTranslations();
  const setDmWith = useAppStore((s) => s.setDmWith);
  const [data, setData] = useState<ProfileData | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    api<ProfileData>(`/api/users/${userId}/profile`).then(setData).catch(() => {});
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  const act = async (fn: () => Promise<unknown>, okMsg?: string) => {
    setBusy(true);
    try {
      await fn();
      if (okMsg) toast(okMsg, 'ok');
      load();
      loadUnread();
    } catch (err) {
      toast(err instanceof Error ? err.message : t('toast.unknownError'), 'error');
    } finally {
      setBusy(false);
    }
  };

  if (!data) return <div className="empty-state" style={{ padding: 64 }}>…</div>;
  const u = data.user;

  const statusTextMain = u.statusText || ({ ONLINE: t('status.online'), BUSY: t('status.busy'), IDLE: t('status.idle'), OFFLINE: t('status.offline') } as Record<string, string>)[u.status] || u.status;

  return (
    <div className="friend-profile">
      <div className="room-head">
        <button type="button" className="btn-icon" onClick={onBack} title={t('modal.close')}>
          <ArrowLeft size={16} />
        </button>
        <div className="room-title-wrap">
          <div className="room-title">{u.username}</div>
          <div className="room-members">{u.uid}</div>
        </div>
      </div>

      <div className="fp-hero">
        <div className="fp-avatar">
          <JaminoAvatar avatarId={u.avatarId} size={96} photo={u.avatarPhoto} name={u.username} />
        </div>
        <h2 className="fp-name">{u.username}</h2>
        <div className="fp-status">
          <span className={`online-dot st-${u.status ? u.status.toLowerCase() : 'offline'}`} />
          {statusTextMain}
        </div>
        <div className="fp-bio">
          {u.bio ? <EmojiText text={u.bio} /> : <span className="fp-nobio">{t('modal.noBio')}</span>}
        </div>
        <div className="fp-meta">
          <span><Clock size={13} /> {t('fp.joined')} {new Date(u.createdAt).toLocaleDateString([], { year: 'numeric', month: 'short' })}</span>
          {u.github && <span><Github size={13} /> GitHub</span>}
        </div>
      </div>

      <div className="fp-stats">
        <div className="fp-stat"><Users size={15} /><b>{data.friendsCount}</b><span>{t('fp.statFriends')}</span></div>
        <div className="fp-stat"><Radio size={15} /><b>{data.ownedJams}</b><span>{t('fp.statJams')}</span></div>
        <div className="fp-stat"><MessageSquare size={15} /><b>{data.jamMsgCount}</b><span>{t('fp.statMessages')}</span></div>
      </div>

      <div className="fp-actions">
        {data.relationship === 'friends' && (
          <>
            <button type="button" className="btn btn-violet" onClick={() => setDmWith(u.id)}>
              <MessageCircle size={15} /> {t('fp.chat')}
            </button>
            <button type="button" className="btn btn-ghost" disabled={busy} onClick={() => act(() => api(`/api/friends`, { method: 'DELETE', body: JSON.stringify({ target: u.uid }) }), t('fp.removed'))}>
              <UserMinus size={15} /> {t('fp.removeFriend')}
            </button>
          </>
        )}
        {data.relationship === 'none' && (
          <button type="button" className="btn btn-violet" disabled={busy} onClick={() => act(() => api(`/api/friends`, { method: 'POST', body: JSON.stringify({ target: u.uid }) }), t('fp.requestSent'))}>
            <UserPlus size={15} /> {t('fp.addFriend')}
          </button>
        )}
        {data.relationship === 'sent' && (
          <button type="button" className="btn btn-ghost" disabled={busy} onClick={() => act(() => api(`/api/friends`, { method: 'DELETE', body: JSON.stringify({ target: u.uid }) }))}>
            <X size={15} /> {t('fp.cancelRequest')}
          </button>
        )}
        {data.relationship === 'received' && data.requestId != null && (
          <>
            <button type="button" className="btn btn-violet" disabled={busy} onClick={() => act(() => api(`/api/friends/respond`, { method: 'POST', body: JSON.stringify({ requestId: data.requestId, action: 'accept' }) }), t('fp.nowFriends'))}>
              <Check size={15} /> {t('fp.acceptRequest')}
            </button>
            <button type="button" className="btn btn-ghost" disabled={busy} onClick={() => act(() => api(`/api/friends/respond`, { method: 'POST', body: JSON.stringify({ requestId: data.requestId, action: 'decline' }) }))}>
              <X size={15} /> {t('fp.decline')}
            </button>
          </>
        )}
        {data.relationship === 'me' && <span className="fp-meta" style={{ padding: 12 }}>{t('fp.thisIsYou')}</span>}
      </div>
    </div>
  );
}