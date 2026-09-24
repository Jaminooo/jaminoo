'use client';

import { useCallback, useEffect, useState } from 'react';
import { useTranslations } from '@/providers/use-translations';
import { useAppStore } from '@/store/app-store';
import { JaminoAvatar } from '@/components/jamino-avatar';
import { EmojiText } from '@/components/emoji-text';
import { api } from '@/lib/client-api';
import { toast } from '@/components/toast';
import { loadUnread } from '@/lib/unread';
import { onLive } from '@/lib/live';
import { WorkspaceErrorState, WorkspaceLoadingState } from '@/components/workspace-feedback';
import { ArrowLeft, MessageCircle, UserPlus, UserMinus, Check, X, Users, Radio, MessageSquare, Github, CalendarDays, UserCheck, Video, ListVideo, Compass } from 'lucide-react';

interface JamChip {
  id: string;
  name: string;
  kind: string;
  type: string;
  createdAt: string;
}

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
  mutual: number;
  videoPostCount: number;
  tweetCount: number;
  playlistCount: number;
  jamMemberships: number;
  jamList: JamChip[];
}

export function FriendProfilePanel({ userId, onBack }: { userId: number; onBack: () => void }) {
  const t = useTranslations();
  const setDmWith = useAppStore((s) => s.setDmWith);
  const online = useAppStore((s) => s.online);
  const presenceMap = useAppStore((s) => s.presenceMap);
  const [data, setData] = useState<ProfileData | null>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      setData(await api<ProfileData>(`/api/users/${userId}/profile`));
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    load();
    const offFriends = onLive('friends:update', () => load());
    return () => { offFriends(); };
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

  if (loading && !data) return <WorkspaceLoadingState label={t('admin.loading')} rows={3} />;
  if (loadError && !data) return <WorkspaceErrorState message={t('toast.unknownError')} retryLabel={t('admin.refresh')} onRetry={() => void load()} />;
  if (!data) return null;
  const u = data.user;
  const isOnline = online.includes(u.id);
  const livePresence = presenceMap[u.id];
  const status = (isOnline && livePresence?.status) || u.status;
  const statusTextRaw = livePresence?.statusText || u.statusText;
  const statusTextMain = statusTextRaw || ({ ONLINE: t('status.online'), BUSY: t('status.busy'), IDLE: t('status.idle'), OFFLINE: t('status.offline') } as Record<string, string>)[status] || status;

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
      {loadError && <WorkspaceErrorState message={t('toast.unknownError')} retryLabel={t('admin.refresh')} onRetry={() => void load()} />}

      <div className="fp-hero" style={{ position: 'relative', overflow: 'hidden' }}>
        <div className="fp-banner" aria-hidden="true" />
        <div className="fp-avatar">
          <JaminoAvatar avatarId={u.avatarId} size={104} photo={u.avatarPhoto} name={u.username} />
          <span className={`online-dot fp-presence ${isOnline ? `on st-${status ? status.toLowerCase() : 'offline'}` : ''}`} />
        </div>
        <h2 className="fp-name">{u.username}</h2>
        <div className="fp-uid">{u.uid}</div>
        <div className="fp-status">
          <span className={`online-dot ${isOnline ? `on st-${status ? status.toLowerCase() : 'offline'}` : ''}`} />
          {statusTextMain}
        </div>
        <div className="fp-bio">
          {u.bio ? <EmojiText text={u.bio} /> : <span className="fp-nobio">{t('modal.noBio')}</span>}
        </div>
        <div className="fp-meta">
          <span><CalendarDays size={13} /> {t('fp.joined')} {new Date(u.createdAt).toLocaleDateString([], { year: 'numeric', month: 'long' })}</span>
          {u.github && <span className="fp-gh"><Github size={13} /> GitHub</span>}
        </div>
      </div>

      <div className="fp-stats">
        <div className="fp-stat"><Users size={15} /><b>{data.friendsCount}</b><span>{t('fp.statFriends')}</span></div>
        <div className="fp-stat"><UserCheck size={15} /><b>{data.mutual}</b><span>{t('fp.statMutual')}</span></div>
        <div className="fp-stat"><Radio size={15} /><b>{data.ownedJams}</b><span>{t('fp.statJams')}</span></div>
        <div className="fp-stat"><MessageSquare size={15} /><b>{data.jamMsgCount}</b><span>{t('fp.statMessages')}</span></div>
        <div className="fp-stat"><Video size={15} /><b>{data.videoPostCount}</b><span>{t('fp.statVideos')}</span></div>
        <div className="fp-stat"><MessageCircle size={15} /><b>{data.tweetCount}</b><span>{t('fp.statTweets')}</span></div>
        <div className="fp-stat"><ListVideo size={15} /><b>{data.playlistCount}</b><span>{t('fp.statPlaylists')}</span></div>
        <div className="fp-stat"><Compass size={15} /><b>{data.jamMemberships}</b><span>{t('fp.statMember')}</span></div>
      </div>

      {data.jamList.length > 0 && (
        <div className="fp-worlds">
          <div className="fp-worlds-title"><Compass size={13} /> {t('fp.worldsHosted')}</div>
          <div className="fp-worlds-grid">
            {data.jamList.map((j) => (
              <span key={j.id} className="fp-world-chip">
                <b className={`fp-world-kind kind-${(j.kind || 'room').toLowerCase()}`}>{j.kind || 'ROOM'}</b>
                <span className="fp-world-name">{j.name}</span>
              </span>
            ))}
          </div>
        </div>
      )}
      {data.jamList.length === 0 && (
        <div className="fp-worlds is-empty">
          <div className="fp-worlds-title"><Compass size={13} /> {t('fp.worldsHosted')}</div>
          <span className="fp-nobio">{t('fp.noWorlds')}</span>
        </div>
      )}

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
