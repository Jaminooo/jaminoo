'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from '@/providers/use-translations';
import { useAppStore } from '@/store/app-store';
import { JaminoAvatar } from '@/components/jamino-avatar';
import { api } from '@/lib/client-api';
import { toast } from '@/components/toast';
import { ArrowLeft, Radio, Globe, Lock, Users as UsersIcon, Music2, Send, UserPlus } from 'lucide-react';

interface ChatUser {
  id: number;
  username: string;
  avatarId: number;
  github: boolean;
  avatarPhoto?: string | null;
}

interface ChatMsg {
  id: number;
  userId: number;
  text: string;
  createdAt: string;
  user: ChatUser;
}

interface JamDetail {
  id: string;
  name: string;
  desc: string;
  type: 'PUBLIC' | 'PRIVATE';
  ownerId: number;
  members: (ChatUser & { uid: string })[];
  messages: ChatMsg[];
}

export function RoomPanel({ jamId, onBack }: { jamId: string; onBack: () => void }) {
  const t = useTranslations();
  const me = useAppStore((s) => s.me);
  const [jam, setJam] = useState<JamDetail | null>(null);
  const [text, setText] = useState('');
  const [showInvite, setShowInvite] = useState(false);
  const [friends, setFriends] = useState<ChatUser[]>([]);
  const bodyRef = useRef<HTMLDivElement>(null);

  const load = () => api<{ jam: JamDetail }>(`/api/jams/${jamId}`).then((d) => setJam(d.jam)).catch(() => {});

  useEffect(() => {
    load();
    const poll = setInterval(() => {
      const lastId = jam?.messages.at(-1)?.id;
      const q = lastId ? `?afterId=${lastId}` : '';
      api<{ messages: ChatMsg[] }>(`/api/jams/${jamId}/messages${q}`)
        .then((d) => {
          if (d.messages.length) {
            setJam((prev) => {
              if (!prev) return prev;
              const seen = new Set(prev.messages.map((m) => m.id));
              const fresh = d.messages.filter((m) => !seen.has(m.id));
              return fresh.length ? { ...prev, messages: [...prev.messages, ...fresh] } : prev;
            });
          }
        })
        .catch(() => {});
    }, 2500);
    return () => clearInterval(poll);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jamId]);

  useEffect(() => {
    bodyRef.current?.scrollTo({ top: bodyRef.current.scrollHeight, behavior: 'smooth' });
  }, [jam?.messages.length]);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    const clean = text.trim();
    setText('');
    try {
      await api(`/api/jams/${jamId}/messages`, { method: 'POST', body: JSON.stringify({ text: clean }) });
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
      await api(`/api/jams/${jamId}/invite`, { method: 'POST', body: JSON.stringify({ userId }) });
      toast(t('toast.joined', { name: friends.find((f) => f.id === userId)?.username ?? '', jam: jam?.name ?? '' }));
      setShowInvite(false);
      load();
    } catch (err) {
      toast(err instanceof Error ? err.message : t('toast.unknownError'), 'error');
    }
  };

  if (!jam) return <div className="empty-state" style={{ padding: 48 }}>…</div>;

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
              <UsersIcon size={13} /> {jam.members.length} · {t('jams.lastActive')}
            </div>
          </div>
        </div>
        <button type="button" className="btn-ghost pill-sm" onClick={openInvite} style={{ marginInlineStart: 'auto' }}>
          <UserPlus size={15} /> {t('jams.inviteFriends')}
        </button>
      </div>

      {showInvite && (
        <div className="room-foot-actions" style={{ paddingTop: 16, flexWrap: 'wrap' }}>
          {friends.length === 0 ? (
            <span style={{ fontSize: 13, color: 'var(--color-fog)' }}>{t('friends.noFriendsYet')}</span>
          ) : (
            friends.map((f) => (
              <button key={f.id} type="button" className="friend-row" style={{ cursor: 'pointer', padding: '8px 12px' }} onClick={() => invite(f.id)}>
                <JaminoAvatar avatarId={f.avatarId} size={28} photo={f.avatarPhoto} />
                <span className="friend-name" style={{ fontSize: 13 }}>{f.username}</span>
              </button>
            ))
          )}
        </div>
      )}

      <div className="music-strip">
        <span className="music-strip-icon">♪</span>
        <span>{t('room.musicComing')}</span>
      </div>

      <div className="room-body" ref={bodyRef}>
        {jam.messages.map((m) => (
          <div key={m.id} className={`msg ${m.userId === me?.id ? 'me' : ''}`}>
            <JaminoAvatar avatarId={m.user.avatarId} size={32} photo={m.user.avatarPhoto} />
            <div>
              <div className="msg-bubble">
                <div className="msg-name">{m.user.username}</div>
                <div className="msg-text">{m.text}</div>
              </div>
              <div className="msg-time">
                {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          </div>
        ))}
      </div>

      <form className="composer-row" onSubmit={send}>
        <input className="auth-input" value={text} onChange={(e) => setText(e.target.value)} placeholder={t('room.messagePlaceholder')} />
        <button type="submit" className="btn btn-violet send-btn">
          <Send size={15} />
        </button>
      </form>
    </div>
  );
}