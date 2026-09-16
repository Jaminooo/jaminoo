'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from '@/providers/use-translations';
import { useAppStore } from '@/store/app-store';
import { JaminoAvatar } from '@/components/jamino-avatar';
import { EmojiText } from '@/components/emoji-text';
import { VoicePlayer } from '@/components/voice-player';
import { MessageComposer } from '@/components/message-composer';
import { MessageReactions, aggReactions, type ReactionAgg } from '@/components/message-reactions';
import { useContextMenu, ContextMenu, type CmItem } from '@/components/context-menu';
import { MusicPlayer } from '@/components/music-player';
import { api } from '@/lib/client-api';
import { connectLive, emitLive, onLive, liveConnected, liveSocketId } from '@/lib/live';
import { toast } from '@/components/toast';
import { ArrowLeft, Globe, Lock, Users as UsersIcon, UserPlus, LogOut, LockOpen, Ban, Copy, User, Music2, Film, Hammer } from 'lucide-react';

interface ChatUser {
  id: number;
  username: string;
  avatarId: number;
  github: boolean;
  status?: string;
  statusText?: string;
  avatarPhoto?: string | null;
}

interface ChatMsg {
  id: number;
  userId: number;
  kind?: string;
  text: string;
  media: { id: string; url: string } | null;
  createdAt: string;
  user: ChatUser;
  reactions?: ReactionAgg[];
}

interface LiveMsg extends ChatMsg {
  jamId: string;
}

interface JamDetail {
  id: string;
  name: string;
  desc: string;
  type: 'PUBLIC' | 'PRIVATE';
  kind: string;
  ownerId: number;
  closed: boolean;
  members: (ChatUser & { uid: string })[];
  messages: ChatMsg[];
}

const KIND_ICON: Record<string, React.ReactNode> = {
  CHAT: <Hammer size={13} />,
  MOVIE: <Film size={13} />,
  MUSIC: <Music2 size={13} />,
  HANGOUT: <UsersIcon size={13} />,
};

export function RoomPanel({ jamId, onBack }: { jamId: string; onBack: () => void }) {
  const t = useTranslations();
  const me = useAppStore((s) => s.me);
  const setProfileUserId = useAppStore((s) => s.setProfileUserId);
  const [jam, setJam] = useState<JamDetail | null>(null);
  const [showInvite, setShowInvite] = useState(false);
  const [friends, setFriends] = useState<ChatUser[]>([]);
  const [live, setLive] = useState(false);
  const [sendingVoice, setSendingVoice] = useState(false);
  const [typingUser, setTypingUser] = useState<string | null>(null);
  const typingTimer = useRef<number | null>(null);
  const membersRef = useRef<ChatUser[]>([]);
  const bodyRef = useRef<HTMLDivElement>(null);
  const { menu, closeCm, onContextMenu } = useContextMenu();

  const load = () => api<{ jam: JamDetail }>(`/api/jams/${jamId}`).then((d) => setJam(d.jam)).catch(() => {});

  useEffect(() => {
    load();
    const socket = connectLive();
    emitLive('jam:join', jamId);

    const offChat = onLive('chat:new', (m: LiveMsg) => {
      if (m.jamId !== jamId) return;
      setJam((prev) => {
        if (!prev) return prev;
        if (prev.messages.some((x) => x.id === m.id)) return prev;
        return { ...prev, messages: [...prev.messages, m] };
      });
    });
    const offUpdate = onLive('jam:update', (id: string) => {
      if (id === jamId) load();
    });
    const offReact = onLive('reaction:update', (d: { messageId: number; reactions: { emoji: string; userId: number }[] }) => {
      setJam((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          messages: prev.messages.map((m) => (m.id === d.messageId ? { ...m, reactions: aggReactions(d.reactions, me?.id ?? null) } : m)),
        };
      });
    });
    const offTyping = onLive('typing:update', (d: { jam?: string; user: number; from?: string }) => {
      if (d.jam !== jamId) return;
      if (d.from && d.from === liveSocketId()) return;
      if (d.user === me?.id) return;
      const u = membersRef.current.find((m) => m.id === d.user);
      if (typingTimer.current) clearTimeout(typingTimer.current);
      setTypingUser(u?.username ?? '');
      typingTimer.current = window.setTimeout(() => setTypingUser(null), 2000);
    });
    const onConn = () => setLive(true);
    const onDisc = () => setLive(false);
    socket?.on('connect', onConn);
    socket?.on('disconnect', onDisc);
    setLive(liveConnected());

    const poll = setInterval(() => {
      if (liveConnected()) return;
      const lastId = jam?.messages.at(-1)?.id;
      api<{ messages: ChatMsg[] }>(`/api/jams/${jamId}/messages${lastId ? `?afterId=${lastId}` : ''}`)
        .then((d) => {
          if (d.messages.length) {
            setJam((p) => {
              if (!p) return p;
              const seen = new Set(p.messages.map((m) => m.id));
              const fresh = d.messages.filter((m) => !seen.has(m.id));
              return fresh.length ? { ...p, messages: [...p.messages, ...fresh] } : p;
            });
          }
        })
        .catch(() => {});
    }, 5000);

    return () => {
      offChat();
      offUpdate();
      offReact();
      offTyping();
      socket?.off('connect', onConn);
      socket?.off('disconnect', onDisc);
      if (typingTimer.current) clearTimeout(typingTimer.current);
      emitLive('jam:leave', jamId);
      clearInterval(poll);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jamId]);

  useEffect(() => {
    bodyRef.current?.scrollTo({ top: bodyRef.current.scrollHeight, behavior: 'smooth' });
  }, [jam?.messages.length]);

  useEffect(() => {
    membersRef.current = jam?.members ?? [];
  }, [jam]);

  const sendText = async (text: string) => {
    try {
      await api(`/api/jams/${jamId}/messages`, { method: 'POST', body: JSON.stringify({ text }) });
    } catch (err) {
      toast(err instanceof Error ? err.message : t('toast.unknownError'), 'error');
    }
  };

  const sendVoice = async (blob: Blob) => {
    const fd = new FormData();
    fd.append('voice', blob, 'voice.webm');
    setSendingVoice(true);
    try {
      await api(`/api/jams/${jamId}/voice`, { method: 'POST', body: fd });
    } catch (err) {
      toast(err instanceof Error ? err.message : t('toast.unknownError'), 'error');
    } finally {
      setSendingVoice(false);
    }
  };

  const onTyping = () => emitLive('typing', { jam: jamId });

  const react = async (msgId: number, emoji: string) => {
    try {
      await api(`/api/jams/${jamId}/messages/${msgId}/react`, { method: 'POST', body: JSON.stringify({ emoji }) });
      // optimistic mirror of the toggle
      setJam((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          messages: prev.messages.map((m) => {
            if (m.id !== msgId) return m;
            const had = m.reactions ?? [];
            const meRest = had.filter((r) => (r.me ? r.emoji !== emoji : true));
            const myCount = had.filter((r) => r.me && r.emoji === emoji)[0]?.count ?? 0;
            const newMe = myCount > 0;
            const selfEmoji = meRest.find((r) => r.emoji === emoji);
            let next = meRest;
            if (!newMe && selfEmoji) next = next.map((r) => (r.emoji === emoji ? { ...r, count: r.count + 1, me: true } : r));
            else if (!newMe) next = [...next, { emoji, count: 1, me: true }];
            else if (selfEmoji) next = next.map((r) => (r.emoji === emoji ? { ...r, count: r.count - 1, me: false } : r));
            return { ...m, reactions: next.filter((r) => r.count > 0) };
          }),
        };
      });
    } catch (err) {
      toast(err instanceof Error ? err.message : t('toast.unknownError'), 'error');
    }
  };

  const openInvite = async () => {
    setShowInvite((v) => !v);
    if (!showInvite) {
      const f = await api<{ friends: ChatUser[] }>('/api/friends').catch(() => null);
      const inJam = new Set(jam?.members.map((m) => m.id) ?? []);
      setFriends((f?.friends ?? []).filter((u) => !inJam.has(u.id)));
    }
  };

  const invite = async (userId: number) => {
    try {
      const fname = friends.find((f) => f.id === userId)?.username ?? '';
      await api(`/api/jams/${jamId}/invite`, { method: 'POST', body: JSON.stringify({ userId }) });
      toast(t('room.inviteSent', { name: fname }));
      setFriends((p) => p.filter((f) => f.id !== userId));
    } catch (err) {
      toast(err instanceof Error ? err.message : t('toast.unknownError'), 'error');
    }
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/join/${jamId}`);
      toast(t('toast.copiedLink'), 'ok');
    } catch {}
  };

  const toggleClose = async () => {
    if (!jam || jam.ownerId !== me?.id) return;
    try {
      await api(`/api/jams/${jamId}/close`, { method: 'POST', body: JSON.stringify({ closed: !jam.closed }) });
      load();
    } catch (err) {
      toast(err instanceof Error ? err.message : t('toast.unknownError'), 'error');
    }
  };

  const leave = async () => {
    try {
      await api(`/api/jams/${jamId}/leave`, { method: 'POST' });
      toast(t('room.left'));
      onBack();
    } catch (err) {
      toast(err instanceof Error ? err.message : t('toast.unknownError'), 'error');
    }
  };

  const msgMenu = (m: ChatMsg): CmItem[] => {
    const items: CmItem[] = [];
    if (m.text) {
      items.push({
        icon: <Copy size={14} />,
        label: t('room.copy'),
        onClick: () => navigator.clipboard?.writeText(m.text).catch(() => {}),
      });
    }
    if (m.user.id !== me?.id) {
      items.push({
        icon: <User size={14} />,
        label: t('room.profile'),
        onClick: () => setProfileUserId(m.user.id),
      });
    }
    return items;
  };

  if (!jam) return <div className="empty-state" style={{ padding: 48 }}>…</div>;
  const isOwner = jam.ownerId === me?.id;

  return (
    <div className="room" style={{ marginTop: 24 }}>
      <div className="room-head">
        <button type="button" className="btn-icon" onClick={onBack} title={t('modal.close')}>
          <ArrowLeft size={16} />
        </button>
        <div className="room-title-wrap">
          <div className="jam-icon" style={{ width: 36, height: 36, marginInlineEnd: 4 }}>
            {jam.type === 'PRIVATE' ? <Lock size={16} /> : <Globe size={16} />}
          </div>
          <div style={{ minWidth: 0 }}>
            <div className="room-title">{jam.name}</div>
            <div className="room-members">
              <UsersIcon size={13} /> {jam.members.length} · <span className="jam-kind-badge">{KIND_ICON[jam.kind]} {t(`jams.kind${jam.kind}` as any)}</span>
              {jam.closed && <span className="closed-tag" style={{ marginInlineStart: 6 }}>{t('room.closed')}</span>}
              {live && <span className="live-tag"><span className="live-dot" /> Live</span>}
            </div>
          </div>
        </div>
        {!jam.closed && (
          <button type="button" className="btn-ghost pill-sm" onClick={openInvite} style={{ marginInlineStart: 'auto' }}>
            <UserPlus size={15} /> {t('jams.inviteFriends')}
          </button>
        )}
      </div>

      <div className="room-actions-row">
        {isOwner ? (
          <button type="button" className="btn btn-ghost pill-sm" onClick={toggleClose}>
            {jam.closed ? <LockOpen size={14} /> : <Ban size={14} />} {jam.closed ? t('room.reopen') : t('room.close')}
          </button>
        ) : (
          <button type="button" className="btn btn-ghost pill-sm" onClick={leave}>
            <LogOut size={14} /> {t('room.leave')}
          </button>
        )}
        <button type="button" className="btn btn-ghost pill-sm" onClick={copyLink}>
          <Copy size={14} /> {t('jams.copyLink')}
        </button>
        <span className="room-desc">{jam.desc || ' '}</span>
      </div>

      {showInvite && (
        <div className="room-foot-actions" style={{ paddingTop: 16, flexWrap: 'wrap' }}>
          {friends.length === 0 ? (
            <span style={{ fontSize: 13, color: 'var(--color-fog)' }}>{t('friends.noFriendsYet')}</span>
          ) : (
            friends.map((f) => (
              <button key={f.id} type="button" className="friend-row" style={{ cursor: 'pointer', padding: '8px 12px' }} onClick={() => invite(f.id)}>
                <JaminoAvatar avatarId={f.avatarId} size={28} photo={f.avatarPhoto} name={f.username} />
                <span className="friend-name" style={{ fontSize: 13 }}>{f.username}</span>
              </button>
            ))
          )}
        </div>
      )}

      <div className="room-members-list">
        {jam.members.map((mb) => (
          <button key={mb.uid} type="button" className="member-chip" onClick={() => mb.id !== me?.id && setProfileUserId(mb.id)}>
            <JaminoAvatar avatarId={mb.avatarId} size={26} photo={mb.avatarPhoto} name={mb.username} />
            <span>{mb.username}</span>
          </button>
        ))}
      </div>

      {jam.kind === 'MUSIC' && <MusicPlayer jamId={jam.id} canOwner={isOwner} />}

      <div className="room-body" ref={bodyRef}>
        {jam.messages.length === 0 && <div className="empty-state" style={{ padding: 40 }}>{t('room.noMessages')}</div>}
        {jam.messages.map((m) => (
          <div
            key={m.id}
            className={`msg ${m.userId === me?.id ? 'me' : ''}`}
            onContextMenu={(e) => onContextMenu(e, msgMenu(m), 'room')}
          >
            <button type="button" className="msg-avatar-btn" onClick={() => m.user.id !== me?.id && setProfileUserId(m.user.id)}>
              <JaminoAvatar avatarId={m.user.avatarId} size={32} photo={m.user.avatarPhoto} name={m.user.username} />
            </button>
            <div>
              <div className="msg-bubble">
                <div className="msg-name">{m.user.username}</div>
                {m.kind === 'VOICE' && m.media ? (
                  <VoicePlayer src={m.media.url} />
                ) : (
                  <div className="msg-text">
                    <EmojiText text={m.text} />
                  </div>
                )}
              </div>
              <div className="msg-time">
                {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
              {m.reactions && m.reactions.length > 0 && (
                <MessageReactions reactions={m.reactions} onReact={(em) => react(m.id, em)} myReaction={m.reactions?.find((r) => r.me)?.emoji ?? null} />
              )}
            </div>
          </div>
        ))}
      </div>

      {typingUser && <div className="typing-hint">{t('room.typing', { name: typingUser })}</div>}

      <MessageComposer
        placeholder={t('room.messagePlaceholder')}
        onSendText={sendText}
        onSendVoice={sendVoice}
        onTyping={onTyping}
        busy={sendingVoice}
      />

      {menu && <ContextMenu menu={menu} onClose={closeCm} />}
    </div>
  );
}