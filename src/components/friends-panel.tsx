'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from '@/providers/use-translations';
import { useAppStore } from '@/store/app-store';
import { JaminoAvatar } from '@/components/jamino-avatar';
import { OnlineDot } from '@/components/online-dot';
import { connectLive, onLive } from '@/lib/live';
import { api } from '@/lib/client-api';
import { toast } from '@/components/toast';
import { Search, UserPlus, Check, X, Trash2, UserMinus, MessageCircle, User, Users } from 'lucide-react';
import { WorkspaceErrorState, WorkspaceLoadingState } from '@/components/workspace-feedback';

interface PubUser {
  id: number;
  username: string;
  uid: string;
  avatarId: number;
  bio: string;
  github: boolean;
  status: string;
  statusText: string;
  avatarPhoto: string | null;
  friend?: boolean;
}

interface FriendsData {
  friends: PubUser[];
  incoming: { id: number; user: PubUser }[];
  outgoing: { id: number; user: PubUser }[];
}

export function FriendsPanel() {
  const t = useTranslations();
  const setDmWith = useAppStore((s) => s.setDmWith);
  const setProfileUserId = useAppStore((s) => s.setProfileUserId);
  const [data, setData] = useState<FriendsData | null>(null);
  const [q, setQ] = useState('');
  const [results, setResults] = useState<PubUser[]>([]);
  const [searching, setSearching] = useState(false);
  const [statuses, setStatuses] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  const load = () => {
    api<FriendsData>('/api/friends').then((next) => { setData(next); setLoadError(false); }).catch(() => setLoadError(true)).finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    connectLive();
    const off = onLive('friends:update', () => load());
    const offStatus = onLive('status:update', (d: { userId: number; status: string }) => {
      setStatuses((p) => ({ ...p, [d.userId]: d.status }));
    });
    return () => {
      off();
      offStatus();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (q.trim().length < 2) {
      setResults([]);
      setSearching(false);
      return;
    }
    let cancelled = false;
    setSearching(true);
    const id = setTimeout(() => {
      api<{ users: PubUser[] }>(`/api/users/search?q=${encodeURIComponent(q.trim())}`)
        .then((d) => { if (!cancelled) setResults(d.users); })
        .catch(() => { if (!cancelled) setResults([]); })
        .finally(() => { if (!cancelled) setSearching(false); });
    }, 250);
    return () => { cancelled = true; clearTimeout(id); };
  }, [q]);

  const addFriend = async (id: number) => {
    try {
      const r = await api<{ uid: string }>('/api/friends', { method: 'POST', body: JSON.stringify({ target: String(id) }) });
      toast(t('toast.requestSent', { name: r.uid }));
      load();
    } catch (err) {
      toast(err instanceof Error ? err.message : t('toast.unknownError'), 'error');
    }
  };

  const respond = async (requestId: number, action: 'accept' | 'decline' | 'cancel') => {
    try {
      await api('/api/friends/respond', { method: 'POST', body: JSON.stringify({ requestId, action }) });
      load();
    } catch (err) {
      toast(err instanceof Error ? err.message : t('toast.unknownError'), 'error');
    }
  };

  const remove = async (friendId: number) => {
    try {
      await api('/api/friends/remove', { method: 'POST', body: JSON.stringify({ friendId }) });
      load();
    } catch (err) {
      toast(err instanceof Error ? err.message : t('toast.unknownError'), 'error');
    }
  };

  const FriendRow = ({ u, actions, canDm = false, canProfile = false }: { u: PubUser; actions?: React.ReactNode; canDm?: boolean; canProfile?: boolean }) => {
    const [view, setView] = useState(false);
    const st = statuses[u.id] ?? u.status ?? 'ONLINE';
    return (
      <div className="friend-row">
        <div className="avatar-stack">
          <JaminoAvatar avatarId={u.avatarId} size={40} photo={u.avatarPhoto} name={u.username} />
          <OnlineDot userId={u.id} status={st} />
        </div>
        <div className="friend-meta">
          <div className="friend-name">
            {u.username} {u.github && <span title="GitHub" style={{ fontSize: 12 }}>gh</span>}
            <button type="button" className="link-btn" onClick={() => setView((v) => !v)} style={{ fontSize: 12 }}>
              {view ? '−' : '＋'}
            </button>
          </div>
          <div className="friend-id">{u.uid}</div>
          {(u.statusText || u.bio) && <div className="friend-sub">{u.statusText || u.bio}</div>}
        </div>
        <div className="friend-actions">
          {canProfile && (
            <button type="button" className="btn-icon" onClick={() => setProfileUserId(u.id)} title={t('profile.title')}>
              <User size={16} />
            </button>
          )}
          {canDm && (
            <button type="button" className="btn-icon violet" onClick={() => setDmWith(u.id)} title={t('dm.title')}>
              <MessageCircle size={16} />
            </button>
          )}
          {actions}
        </div>
        {view && (
          <div style={{ gridColumn: '1 / -1', paddingTop: 8, fontSize: 13, color: 'var(--color-fog)' }}>
            {u.bio || t('modal.noBio')}
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      <header className="pane-head pane-head-search">
        <div>
          <h2 className="pane-title">{t('panel.friends')}</h2>
          <p className="pane-sub">{t('panel.friendsSub')}</p>
        </div>
        <div className="search-box">
          <Search size={15} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('friends.search')} />
        </div>
      </header>

      {loading && !data ? <WorkspaceLoadingState label={t('admin.loading')} rows={4} /> : null}
      {!loading && loadError && !data ? <WorkspaceErrorState message={t('toast.unknownError')} retryLabel={t('admin.refresh')} onRetry={load} /> : null}
      {loadError && data ? <WorkspaceErrorState message={t('toast.unknownError')} retryLabel={t('admin.refresh')} onRetry={load} /> : null}

      {(!loading || data) && data && data.friends.length > 0 && (
        <div className="ch-presence-bar">
          <span className="ch-presence-total">
            <Users size={14} /> {data.friends.length}
          </span>
          <span className="ch-presence-dot on" />
          <span>{data.friends.filter((f) => (statuses[f.id] ?? f.status ?? 'ONLINE') === 'ONLINE').length} {t('status.online').toLowerCase()}</span>
          <span className="ch-presence-dot idle" />
          <span>{data.friends.filter((f) => (statuses[f.id] ?? f.status ?? 'ONLINE') === 'IDLE').length} {t('status.idle').toLowerCase()}</span>
          <span className="ch-presence-dot busy" />
          <span>{data.friends.filter((f) => (statuses[f.id] ?? f.status ?? 'ONLINE') === 'BUSY').length} {t('status.busy').toLowerCase()}</span>
        </div>
      )}

      {(!loading || data) && q.trim().length >= 2 && (
        <div className="list" style={{ marginBottom: 24 }}>
          {searching ? <WorkspaceLoadingState label={t('admin.loading')} rows={2} /> : results.length === 0 ? (
            <div className="empty-state">{t('friends.noMatches')}</div>
          ) : (
            results.map((u) => (
              <FriendRow
                key={u.id}
                u={u}
                canProfile
                actions={
                  u.friend ? (
                    <button type="button" className="btn-icon" onClick={() => remove(u.id)} title={t('friends.remove')}>
                      <UserMinus size={16} />
                    </button>
                  ) : (
                    <button type="button" className="btn-icon violet" onClick={() => addFriend(u.id)} title={t('friends.addFriend')}>
                      <UserPlus size={16} />
                    </button>
                  )
                }
              />
            ))
          )}
        </div>
      )}

      {data && <div className="friends-cols">
        <div>
          <div className="pane-sub" style={{ marginBottom: 12 }}>{t('friends.friendsCount')}</div>
          <div className="list">
            {!data ? null : data.friends.length === 0 ? (
              <div className="empty-state">{t('friends.noFriendsYet')}</div>
            ) : (
              data.friends.map((u) => (
                <FriendRow key={u.id} u={u} actions={null} canDm canProfile />
              ))
            )}
          </div>
        </div>

        <div>
          <div className="pane-sub" style={{ marginBottom: 12 }}>{t('friends.incomingCount')}</div>
          <div className="list">
            {!data ? null : data.incoming.length === 0 ? (
              <div className="empty-state">{t('friends.noIncoming')}</div>
            ) : (
              data.incoming.map(({ id, user }) => (
                <FriendRow
                  key={id}
                  u={user}
                  canProfile
                  actions={
                    <>
                      <button type="button" className="btn-icon violet" onClick={() => respond(id, 'accept')} title={t('friends.accept')}>
                        <Check size={16} />
                      </button>
                      <button type="button" className="btn-icon danger" onClick={() => respond(id, 'decline')} title={t('friends.decline')}>
                        <X size={16} />
                      </button>
                    </>
                  }
                />
              ))
            )}
          </div>
        </div>

        <div>
          <div className="pane-sub" style={{ marginBottom: 12 }}>{t('friends.sentCount')}</div>
          <div className="list">
            {!data ? null : data.outgoing.length === 0 ? (
              <div className="empty-state">{t('friends.noOutgoing')}</div>
            ) : (
              data.outgoing.map(({ id, user }) => (
                <FriendRow
                  key={id}
                  u={user}
                  canProfile
                  actions={
                    <button type="button" className="btn-icon" onClick={() => respond(id, 'cancel')}>
                      <X size={16} />
                    </button>
                  }
                />
              ))
            )}
          </div>
        </div>
      </div>}
    </>
  );
}
