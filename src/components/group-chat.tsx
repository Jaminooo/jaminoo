'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslations } from '@/providers/use-translations';
import { useAppStore } from '@/store/app-store';
import { JaminoAvatar } from '@/components/jamino-avatar';
import { OnlineDot } from '@/components/online-dot';
import { api } from '@/lib/client-api';
import { toast } from '@/components/toast';
import { connectLive, onLive, emitWhenConnected } from '@/lib/live';
import { loadUnread } from '@/lib/unread';
import { REACTION_EMOJIS } from '@/lib/constants';
import { WorkspaceErrorState, WorkspaceLoadingState } from '@/components/workspace-feedback';
import {
  ArrowLeft, Hash, Plus, Send, Users as UsersIcon, MessageCircle, Globe, Lock,
  Trash2, LogOut, Crown, Shield, User as UserIcon, Settings2, X, Search,
} from 'lucide-react';

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
}

interface ChannelItem { id: string; name: string; description: string }
interface MemberItem { role: string; joinedAt: string; user: PubUser }

interface GroupDetail {
  group: { id: string; name: string; desc: string; avatarId: number; isPrivate: boolean; ownerId: number; createdAt: string; owner: PubUser };
  myRole: string | null;
  channels: ChannelItem[];
  members: MemberItem[];
}

interface GMsg {
  id: string;
  channelId: string;
  userId: number;
  kind: string;
  text: string;
  createdAt: string;
  media: { id: string; url: string } | null;
  user: PubUser;
  reactions: { emoji: string; count: number; me: boolean }[];
}

const ROLE_RANK: Record<string, number> = { OWNER: 3, ADMIN: 2, MEMBER: 1 };

export function GroupChat({ groupId, onBack }: { groupId: string; onBack: () => void }) {
  const t = useTranslations();
  const me = useAppStore((s) => s.me);
  const [detail, setDetail] = useState<GroupDetail | null>(null);
  const [channelId, setChannelId] = useState<string | null>(null);
  const [msgs, setMsgs] = useState<GMsg[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(true);
  const [messagesError, setMessagesError] = useState(false);
  const [newText, setNewText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [showAddChannel, setShowAddChannel] = useState(false);
  const [newChannel, setNewChannel] = useState('');
  const [manageOpen, setManageOpen] = useState(false);
  const [memberQ, setMemberQ] = useState('');
  const [busy, setBusy] = useState(false);
  const listRef = useRef<HTMLDivElement | null>(null);
  const messagesRequestRef = useRef(0);

  const myRole = detail?.myRole ?? null;
  const canMod = myRole === 'OWNER' || myRole === 'ADMIN';

  const loadDetail = useCallback(async () => {
    try {
      const d = await api<GroupDetail>(`/api/groups/${groupId}`);
      setDetail(d);
      setChannelId((cur) => cur && d.channels.some((c) => c.id === cur) ? cur : (d.channels[0]?.id ?? null));
      if (!d.myRole) emitWhenConnected('group:leave', groupId);
    } catch {
      onBack();
    }
  }, [groupId, onBack]);

  const loadMsgs = useCallback(async (ch: string | null) => {
    const request = ++messagesRequestRef.current;
    if (!ch) {
      setMessagesLoading(false);
      return;
    }
    setMessagesLoading(true);
    setMessagesError(false);
    try {
      const d = await api<{ messages: GMsg[] }>(`/api/groups/${groupId}/messages?channelId=${encodeURIComponent(ch)}`);
      if (request === messagesRequestRef.current) setMsgs(d.messages);
    } catch {
      if (request === messagesRequestRef.current) setMessagesError(true);
    } finally {
      if (request === messagesRequestRef.current) setMessagesLoading(false);
    }
  }, [groupId]);

  useEffect(() => {
    connectLive();
    setMsgs([]);
    messagesRequestRef.current += 1;
    setMessagesLoading(true);
    setMessagesError(false);
    setDetail(null);
    setChannelId(null);
    setLoading(true);
    loadDetail().then(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupId]);

  // join the socket room once we know we are a member
  useEffect(() => {
    if (!detail?.myRole) return;
    emitWhenConnected('group:join', groupId);
    return () => emitWhenConnected('group:leave', groupId);
  }, [groupId, detail?.myRole]);

  useEffect(() => {
    setMsgs([]);
    void loadMsgs(channelId);
  }, [channelId, loadMsgs]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [msgs.length]);

  useEffect(() => {
    if (!me || !detail?.myRole || !channelId) return;
    api(`/api/groups/${groupId}/read`, { method: 'POST' }).then(() => loadUnread()).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupId, channelId]);

  useEffect(() => {
    const offMsg = onLive('group:message', (d: GMsg & { groupId: string }) => {
      if (d.groupId !== groupId) return;
      setMsgs((prev) => (prev.some((m) => m.id === d.id) ? prev : [...prev, d]));
      if (me && d.userId !== me.id) {
        api(`/api/groups/${groupId}/read`, { method: 'POST' }).then(() => loadUnread()).catch(() => {});
      }
    });
    const offReact = onLive('group:react', (d: { groupId: string; msgId: string; reactions: GMsg['reactions'] }) => {
      if (d.groupId !== groupId) return;
      setMsgs((prev) => prev.map((m) => (m.id === d.msgId ? { ...m, reactions: d.reactions } : m)));
    });
    const offUpdate = onLive('group:update', (d: { groupId: string }) => {
      if (d.groupId !== groupId) return;
      loadDetail();
      loadUnread();
    });
    const offDeleted = onLive('group:deleted', (d: { groupId: string }) => {
      if (d.groupId === groupId) {
        toast(t('groups.deleted'), 'ok');
        onBack();
      }
    });
    return () => {
      offMsg();
      offReact();
      offUpdate();
      offDeleted();
    };
  }, [groupId, me, t, onBack, loadDetail]);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newText.trim() || !channelId) return;
    setSending(true);
    try {
      const d = await api<{ msg: GMsg }>(`/api/groups/${groupId}/messages`, {
        method: 'POST',
        body: JSON.stringify({ channelId, text: newText }),
      });
      setMsgs((prev) => (prev.some((m) => m.id === d.msg.id) ? prev : [...prev, d.msg]));
      setNewText('');
      api(`/api/groups/${groupId}/read`, { method: 'POST' }).then(() => loadUnread()).catch(() => {});
    } catch (err) {
      toast(err instanceof Error ? err.message : t('toast.unknownError'), 'error');
    } finally {
      setSending(false);
    }
  };

  const react = async (msgId: string, emoji: string) => {
    try {
      setMsgs((prev) =>
        prev.map((m) => {
          if (m.id !== msgId) return m;
          const cur = m.reactions.find((r) => r.emoji === emoji);
          let next;
          if (cur && cur.me) {
            next = cur.count === 1 ? m.reactions.filter((r) => r.emoji !== emoji) : m.reactions.map((r) => (r.emoji === emoji ? { ...r, count: r.count - 1, me: false } : r));
          } else if (cur) {
            next = m.reactions.map((r) => (r.emoji === emoji ? { ...r, count: r.count + 1, me: true } : r));
          } else {
            next = [...m.reactions, { emoji, count: 1, me: true }];
          }
          return { ...m, reactions: next };
        })
      );
      const d = await api<{ reactions: GMsg['reactions'] }>(`/api/groups/${groupId}/messages/${msgId}/react`, {
        method: 'POST',
        body: JSON.stringify({ emoji }),
      });
      setMsgs((prev) => prev.map((m) => (m.id === msgId ? { ...m, reactions: d.reactions } : m)));
    } catch (err) {
      toast(err instanceof Error ? err.message : t('toast.unknownError'), 'error');
    }
  };

  const addChannel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChannel.trim()) return;
    setBusy(true);
    try {
      await api(`/api/groups/${groupId}/channels`, { method: 'POST', body: JSON.stringify({ name: newChannel.trim() }) });
      setNewChannel('');
      setShowAddChannel(false);
      toast(t('groups.channelCreated'), 'ok');
      loadDetail();
    } catch (err) {
      toast(err instanceof Error ? err.message : t('toast.unknownError'), 'error');
    } finally {
      setBusy(false);
    }
  };

  const setRole = async (userId: number, role: 'ADMIN' | 'MEMBER') => {
    try {
      await api(`/api/groups/${groupId}/members/${userId}`, { method: 'PATCH', body: JSON.stringify({ role }) });
      loadDetail();
    } catch (err) {
      toast(err instanceof Error ? err.message : t('toast.unknownError'), 'error');
    }
  };

  const removeMember = async (userId: number) => {
    try {
      await api(`/api/groups/${groupId}/members/${userId}`, { method: 'DELETE' });
      loadDetail();
    } catch (err) {
      toast(err instanceof Error ? err.message : t('toast.unknownError'), 'error');
    }
  };

  const leave = async () => {
    try {
      await api(`/api/groups/${groupId}/leave`, { method: 'POST' });
      toast(t('groups.left'), 'ok');
      onBack();
    } catch (err) {
      toast(err instanceof Error ? err.message : t('toast.unknownError'), 'error');
    }
  };

  const deleteGroup = async () => {
    if (!window.confirm(t('groups.deleteConfirm'))) return;
    try {
      await api(`/api/groups/${groupId}`, { method: 'DELETE' });
      toast(t('groups.deleted'), 'ok');
      onBack();
    } catch (err) {
      toast(err instanceof Error ? err.message : t('toast.unknownError'), 'error');
    }
  };

  const displayMembers = useMemo(() => {
    const q = memberQ.trim().toLowerCase();
    const list = detail?.members ?? [];
    if (!q) return list;
    return list.filter((m) => m.user.username.toLowerCase().includes(q));
  }, [detail?.members, memberQ]);

  const time = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const activeChannel = detail?.channels.find((c) => c.id === channelId);

  return (
    <div className="ch-group">
      <header className="ch-group-head">
        <button type="button" className="btn-icon" onClick={onBack} title={t('groups.backToGroups')}>
          <ArrowLeft size={18} />
        </button>
        <div className="avatar-stack">
          <JaminoAvatar avatarId={detail?.group.avatarId ?? 0} size={36} name={detail?.group.name} />
        </div>
        <div className="ch-group-title">
          <strong>{detail?.group.name ?? '…'}</strong>
          <span>
            {detail?.group.isPrivate ? <Lock size={11} /> : <Globe size={11} />}
            {t('groups.members', { count: detail?.members.length ?? 0 })} · #{activeChannel?.name ?? ''}
          </span>
        </div>
        {detail?.channels && detail.channels.length > 1 && (
          <select className="ch-mobile-channel" aria-label={t('groups.channels')} value={channelId ?? ''} onChange={(event) => setChannelId(event.target.value)}>
            {detail.channels.map((channel) => <option key={channel.id} value={channel.id}># {channel.name}</option>)}
          </select>
        )}
        <div className="ch-group-actions">
          <button type="button" className={`btn-icon${manageOpen ? ' violet' : ''}`} onClick={() => setManageOpen((v) => !v)} title={t('groups.manageMembers')} aria-label={t('groups.manageMembers')} aria-expanded={manageOpen} aria-haspopup="dialog">
            <UsersIcon size={17} />
          </button>
          {myRole === 'OWNER' ? (
            <button type="button" className="btn-icon danger" onClick={deleteGroup} title={t('groups.delete')}>
              <Trash2 size={16} />
            </button>
          ) : (
            <button type="button" className="btn-icon" onClick={leave} title={t('groups.leave')}>
              <LogOut size={16} />
            </button>
          )}
        </div>
      </header>

      <div className="ch-group-body">
        <aside className="ch-channels">
          <div className="ch-side-label">
            <span>{t('groups.channels')}</span>
            {canMod && (
              <button type="button" className="btn-icon" onClick={() => setShowAddChannel((v) => !v)} title={t('groups.addChannel')}>
                <Plus size={14} />
              </button>
            )}
          </div>
          {showAddChannel && (
            <form onSubmit={addChannel} className="ch-add-channel">
              <input className="auth-input" value={newChannel} onChange={(e) => setNewChannel(e.target.value)} placeholder={t('groups.channelName')} maxLength={24} />
              <button type="submit" className="btn btn-violet pill-sm" disabled={busy || !newChannel.trim()}>
                <Plus size={13} />
              </button>
            </form>
          )}
          <div className="ch-channel-list">
            {detail?.channels.map((c) => (
              <button key={c.id} type="button" className={`ch-channel${channelId === c.id ? ' active' : ''}`} onClick={() => setChannelId(c.id)}>
                <Hash size={14} />
                <span>{c.name}</span>
              </button>
            ))}
          </div>
          <div className="ch-side-about">
            <div className="ch-side-label"><span>{t('groups.about')}</span></div>
            <p>{detail?.group.desc || '·'}</p>
            <div className="ch-owner-row">
              <Crown size={13} />
              <span>
                {t('groups.owner')}: <b>{detail?.group.owner.username}</b>
              </span>
            </div>
          </div>
        </aside>

        <main className="ch-chat">
          {loading ? null : !detail?.myRole ? (
            <div className="ch-empty">
              <MessageCircle size={22} />
              <p>{t('groups.privateHint')}</p>
              <button type="button" className="btn btn-violet pill-sm" onClick={onBack}>
                {t('groups.backToGroups')}
              </button>
            </div>
          ) : (
            <>
              <div ref={listRef} className="ch-msgs" aria-busy={messagesLoading}>
                {messagesLoading ? (
                  <WorkspaceLoadingState label={t('admin.loading')} rows={3} />
                ) : messagesError ? (
                  <WorkspaceErrorState message={t('toast.unknownError')} retryLabel={t('admin.refresh')} onRetry={() => void loadMsgs(channelId)} />
                ) : msgs.length === 0 ? (
                  <div className="ch-empty ch-empty-sm">
                    <p>{t('groups.noMessages')}</p>
                  </div>
                ) : (
                  msgs.map((m) => (
                    <div key={m.id} className={`ch-msg${m.userId === me?.id ? ' mine' : ''}`}>
                      <div className="ch-msg-avatar">
                        <JaminoAvatar avatarId={m.user.avatarId} size={30} photo={m.user.avatarPhoto} name={m.user.username} />
                      </div>
                      <div className="ch-msg-main">
                        <div className="ch-msg-head">
                          <span className="ch-msg-name">{m.user.username}</span>
                          <span className="ch-msg-time">{time(m.createdAt)}</span>
                        </div>
                        {m.kind === 'TEXT' && <div className="ch-msg-text">{m.text}</div>}
                        {m.reactions.length > 0 && (
                          <div className="ch-msg-reacts">
                            {m.reactions.map((r) => (
                              <button key={r.emoji} type="button" className={r.me ? 'me' : ''} onClick={() => react(m.id, r.emoji)}>
                                {r.emoji} {r.count}
                              </button>
                            ))}
                          </div>
                        )}
                        <div className="ch-msg-reactbar">
                          {REACTION_EMOJIS.map((e) => (
                            <button key={e} type="button" onClick={() => react(m.id, e)} title={t('groups.react')}>
                              {e}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
              <form className="composer-row ch-composer" onSubmit={send}>
                <input
                  className="auth-input"
                  value={newText}
                  onChange={(e) => setNewText(e.target.value)}
                  placeholder={t('groups.messagePlaceholder', { channel: activeChannel?.name ?? '' })}
                  maxLength={1000}
                />
                <button type="submit" className="send-btn" disabled={sending || !newText.trim() || !channelId}>
                  <Send size={17} />
                </button>
              </form>
            </>
          )}
        </main>

        <aside className="ch-members">
          <div className="ch-side-label">
            <span>{t('groups.members', { count: detail?.members.length ?? 0 })}</span>
          </div>
          <div className="ch-member-list">
            {detail?.members
              .slice()
              .sort((a, b) => (ROLE_RANK[b.role] ?? 0) - (ROLE_RANK[a.role] ?? 0) || a.user.username.localeCompare(b.user.username))
              .map((m) => (
                <button key={m.user.id} type="button" className="ch-member">
                  <div className="avatar-stack">
                    <JaminoAvatar avatarId={m.user.avatarId} size={30} photo={m.user.avatarPhoto} name={m.user.username} />
                    <OnlineDot userId={m.user.id} status={m.user.status} />
                  </div>
                  <span className="ch-member-name">{m.user.username}</span>
                  {m.role === 'OWNER' && <Crown size={12} className="ch-role-ic" />}
                  {m.role === 'ADMIN' && <Shield size={12} className="ch-role-ic" />}
                </button>
              ))}
          </div>
        </aside>
      </div>

      {manageOpen && detail && (
        <div className="modal-backdrop" onClick={() => setManageOpen(false)}>
          <div className="modal ch-manage-modal" role="dialog" aria-modal="true" aria-labelledby="ch-manage-title" onClick={(e) => e.stopPropagation()}>
            <div className="ch-modal-head">
              <h3 id="ch-manage-title">{t('groups.manageMembers')}</h3>
              <button type="button" className="btn-icon" onClick={() => setManageOpen(false)} aria-label={t('modal.close')}>
                <X size={16} />
              </button>
            </div>
            <div className="search-box">
              <Search size={14} />
              <input value={memberQ} onChange={(e) => setMemberQ(e.target.value)} placeholder={t('groups.memberSearch')} />
            </div>
            <div className="ch-manage-list">
              {displayMembers.map((m) => (
                <div key={m.user.id} className="ch-manage-row">
                  <div className="avatar-stack">
                    <JaminoAvatar avatarId={m.user.avatarId} size={30} photo={m.user.avatarPhoto} name={m.user.username} />
                    <OnlineDot userId={m.user.id} status={m.user.status} />
                  </div>
                  <div className="ch-manage-meta">
                    <span>{m.user.username}</span>
                    <small>{t(`groups.role${m.role === 'OWNER' ? 'Owner' : m.role === 'ADMIN' ? 'Admin' : 'Member'}`)}</small>
                  </div>
                  {canMod && m.role !== 'OWNER' && m.user.id !== me?.id && (
                    <div className="ch-manage-actions">
                      {myRole === 'OWNER' && (
                        m.role === 'ADMIN' ? (
                          <button type="button" className="btn btn-ghost pill-sm" onClick={() => setRole(m.user.id, 'MEMBER')} title={t('groups.demote')}>
                            <UserIcon size={13} />
                          </button>
                        ) : (
                          <button type="button" className="btn btn-ghost pill-sm" onClick={() => setRole(m.user.id, 'ADMIN')} title={t('groups.promote')}>
                            <Shield size={13} />
                          </button>
                        )
                      )}
                      <button type="button" className="btn btn-ghost pill-sm danger" onClick={() => removeMember(m.user.id)} title={t('groups.removeMember')}>
                        <X size={13} />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
