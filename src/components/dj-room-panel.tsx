'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslations } from '@/providers/use-translations';
import { useAppStore } from '@/store/app-store';
import { JaminoAvatar } from '@/components/jamino-avatar';
import { EmojiText } from '@/components/emoji-text';
import { VoicePlayer } from '@/components/voice-player';
import { MessageComposer } from '@/components/message-composer';
import { MessageReactions, aggReactions, type ReactionAgg } from '@/components/message-reactions';
import { useContextMenu, type CmItem } from '@/components/context-menu';
import { ReportMessageModal } from '@/components/report-message-modal';
import { SyncedLyrics, type LyricActive } from '@/components/music/synced-lyrics';
import { activeLineIndex, activeWordIndex, parseLyrics, type LyricLine } from '@/lib/audio/lyrics';
import { api } from '@/lib/client-api';
import { connectLive, emitLive, emitWhenConnected, onLive, onLiveConnect, liveConnected, liveSocketId } from '@/lib/live';
import { toast } from '@/components/toast';
import { fallbackCover } from '@/lib/music-catalog';
import {
  ArrowLeft,
  Ban,
  Check,
  Copy,
  Flag,
  Globe,
  Loader2,
  Lock,
  LogOut,
  MessageCircle,
  Mic2,
  Music2,
  Pause,
  Play,
  Plus,
  Radio,
  Search,
  SkipForward,
  Trash2,
  User,
  UserPlus,
  Users as UsersIcon,
  Volume1,
  Volume2,
  VolumeX,
  X,
  ThumbsUp,
} from 'lucide-react';

interface ChatUser {
  id: number;
  username: string;
  avatarId: number;
  github: boolean;
  status?: string;
  statusText?: string;
  avatarPhoto?: string | null;
  role?: string;
  isGuest?: boolean;
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

interface SongPreview {
  id: number;
  title: string;
  artist: { id: number; name: string; coverFile?: string } | null;
  coverUrl: string | null;
  durationSec: number;
  lyrics?: string;
  lrc?: string;
}

interface QueueRow {
  id: number;
  pos: number;
  song: SongPreview;
  addedBy: { username: string; isGuest?: boolean };
  votes: number;
  createdAt: string;
}

interface SearchSong {
  id: number;
  title: string;
  artist: { id: number; name: string } | null;
  durationSec: number;
  coverUrl: string | null;
  hasAudio?: boolean;
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
  now: SongPreview | null;
  playing: boolean;
  positionMs: number;
  startMs: number | null;
  durationSec: number;
  skipCount: number;
  skipMine: boolean;
  queue: QueueRow[];
}

const fmtTime = (ms: number) => {
  const s = Math.floor(Math.max(0, ms) / 1000);
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, '0')}`;
};

export function DJRoomPanel({ jamId, onBack }: { jamId: string; onBack: () => void }) {
  const t = useTranslations();
  const me = useAppStore((s) => s.me);
  const setProfileUserId = useAppStore((s) => s.setProfileUserId);
  const [jam, setJam] = useState<JamDetail | null>(null);
  const [live, setLive] = useState(false);
  const [sendingText, setSendingText] = useState(false);
  const [sendingVoice, setSendingVoice] = useState(false);
  const [typingUser, setTypingUser] = useState<string | null>(null);
  const [reportMessageId, setReportMessageId] = useState<number | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [friends, setFriends] = useState<ChatUser[]>([]);
  const [searchQ, setSearchQ] = useState('');
  const [results, setResults] = useState<SearchSong[]>([]);
  const [searching, setSearching] = useState(false);
  const [online, setOnline] = useState<number[]>([]);
  const [skipMine, setSkipMine] = useState(false);
  const [skipVotes, setSkipVotes] = useState(0);
  const [skipRequired, setSkipRequired] = useState(0);
  const [votedSongId, setVotedSongId] = useState<number | null>(null);
  const [pane, setPane] = useState<'chat' | 'queue' | 'members'>('chat');
  const [sideTab, setSideTab] = useState<'queue' | 'members'>('queue');
  const [nowMs, setNowMs] = useState(0);
  const [audioTimeMs, setAudioTimeMs] = useState(0);
  const [audioDurMs, setAudioDurMs] = useState(0);
  const [audioLive, setAudioLive] = useState(false);
  const [buffering, setBuffering] = useState(false);
  const [showLyrics, setShowLyrics] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [volume, setVolume] = useState(0.8);
  const [muted, setMuted] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const bodyRef = useRef<HTMLDivElement>(null);
  const typingTimer = useRef<number | null>(null);
  const membersRef = useRef<ChatUser[]>([]);
  const playingRef = useRef(false);
  const seekingRef = useRef(false);
  const seekTimerRef = useRef<number | null>(null);
  const pendingSeekRef = useRef<number | null>(null);
  const { onContextMenu } = useContextMenu();

  const lrcDoc = useMemo(() => parseLyrics(jam?.now?.lrc ?? ''), [jam?.now?.lrc]);
  const hasLyrics = !!jam?.now && ((jam.now.lrc ?? '').length > 0 || !!jam.now.lyrics);

  const isOwner = jam?.ownerId === me?.id;
  const isCo = jam?.members.some((m) => m.id === me?.id && m.role === 'MINI_HOST');
  const canControl = isOwner || isCo;

  const load = useCallback(() => {
    setLoadError(null);
    return api<{ jam: JamDetail }>(`/api/jams/${jamId}`)
      .then((d) => {
        if (!d?.jam) throw new Error('empty jam payload');
        setJam(d.jam);
        setSkipMine(d.jam.skipMine);
        setSkipVotes(d.jam.skipCount);
        setVotedSongId(d.jam.now?.id ?? null);
        if (d.jam.now && !d.jam.now.lrc && !d.jam.now.lyrics) setShowLyrics(false);
        setNowMs(d.jam.now ? d.jam.positionMs : 0);
        playingRef.current = d.jam.playing;
      })
      .catch((e) => {
        console.error('jam load error', e);
        setJam(null);
        setLoadError(e instanceof Error ? e.message : 'Load failed');
      });
  }, [jamId]);

  useEffect(() => {
    load();
    const socket = connectLive();
    const off = onLiveConnect(() => emitLive('jam:join', jamId));
    emitWhenConnected('jam:join', jamId);
    onLive('music:state', (d: { jamId: string; now: SongPreview | null; playing: boolean; positionMs: number; atMs: number; durationSec: number; skipVotes: number; skipRequired: number }) => {
      if (d.jamId !== jamId) return;
      setJam((prev) => (prev ? { ...prev, now: d.now, playing: d.playing, durationSec: d.durationSec } : prev));
      playingRef.current = d.playing;
      if (d.now && d.now.id !== votedSongId) {
        setVotedSongId(d.now.id);
        setSkipMine(false);
        if (!d.now.lrc && !d.now.lyrics) setShowLyrics(false);
      }
      setSkipVotes(d.skipVotes);
      setSkipRequired(d.skipRequired);
      setNowMs(d.playing ? d.positionMs : Math.min(d.positionMs, (d.durationSec || 0) * 1000));
    });
    onLive('music:skips', (d: { jamId: string; songId: number; votes: number; required: number }) => {
      if (d.jamId !== jamId) return;
      setSkipVotes(d.votes);
      setSkipRequired(d.required);
    });
    onLive('music:queue', (d: { jamId: string; queue: QueueRow[] }) => {
      if (d.jamId !== jamId) return;
      setJam((prev) => (prev ? { ...prev, queue: d.queue } : prev));
    });
    onLive('jam:presence', (d: { jamId: string; online: number[] }) => {
      if (d.jamId === jamId) setOnline(d.online);
    });
    onLive('jam:update', (id: string) => {
      if (id === jamId) {
        load();
        emitWhenConnected('music:sync', jamId);
      }
    });
    onLive('jam:deleted', (id: string) => {
      if (id === jamId) {
        toast(t('room.deleted'));
        onBack();
      }
    });
    onLive('chat:new', (m: ChatMsg & { jamId: string }) => {
      if (m.jamId !== jamId) return;
      setJam((prev) => {
        if (!prev || prev.messages.some((x) => x.id === m.id)) return prev;
        return { ...prev, messages: [...prev.messages, m] };
      });
    });
    onLive('reaction:update', (d: { messageId: number; reactions: { emoji: string; userId: number }[] }) => {
      setJam((prev) =>
        prev
          ? { ...prev, messages: prev.messages.map((m) => (m.id === d.messageId ? { ...m, reactions: aggReactions(d.reactions, me?.id ?? null) } : m)) }
          : prev,
      );
    });
    onLive('typing:update', (d: { jam?: string; user: number; from?: string }) => {
      if (d.jam !== jamId) return;
      if (d.from && d.from === liveSocketId()) return;
      if (d.user === me?.id) return;
      const u = membersRef.current.find((m) => m.id === d.user);
      if (typingTimer.current) clearTimeout(typingTimer.current);
      setTypingUser(u?.username ?? '');
      typingTimer.current = window.setTimeout(() => setTypingUser(null), 2000);
    });
    const onConn = () => {
      setLive(true);
      emitLive('jam:join', jamId);
    };
    const onDisc = () => setLive(false);
    socket?.on('connect', onConn);
    socket?.on('disconnect', onDisc);
    setLive(liveConnected());

    const tick = setInterval(() => {
      setNowMs((p) => (playingRef.current ? p + 1000 : p));
    }, 1000);

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
      off();
      socket?.off('connect', onConn);
      socket?.off('disconnect', onDisc);
      if (typingTimer.current) clearTimeout(typingTimer.current);
      emitLive('jam:leave', jamId);
      clearInterval(tick);
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

  useEffect(() => { emitWhenConnected('music:sync', jamId); }, [jamId]);

  // Play the room's stream locally, synced to the server's authoritative state.
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const now = jam?.now;
    if (!now) {
      audio.pause();
      audio.removeAttribute('src');
      audio.load();
      setAudioDurMs(0);
      setAudioTimeMs(0);
      return;
    }
    if (audio.dataset.songId !== String(now.id)) {
      audio.dataset.songId = String(now.id);
      audio.src = `/api/music/stream/${now.id}`;
      audio.load();
      // New song: drop stale duration/position from the previous track.
      setAudioDurMs(0);
      setAudioTimeMs(Math.max(0, Math.round(nowMs / 1000) * 1000));
    }
    audio.volume = muted ? 0 : volume;
    if (jam?.playing) {
      if (!seekingRef.current) {
        // Authoritative seek from the server state; only correct when drift is big.
        const target = Math.max(0, nowMs / 1000);
        const drift = Math.abs((audio.currentTime || 0) - target);
        if (drift > 4 || audio.paused) {
          try {
            audio.currentTime = target;
          } catch {}
        }
      }
      audio.play().then(() => setBlocked(false)).catch(() => setBlocked(true));
    } else {
      audio.pause();
    }
  }, [jam?.now?.id, jam?.playing, nowMs, muted, volume]);

  // Smooth progress while the local element actually plays (throttled to ~10fps).
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !jam?.now || !jam.playing) return;
    let raf = 0;
    let last = -1;
    let lastUpdate = 0;
    const loop = (ts: number) => {
      raf = requestAnimationFrame(loop);
      if (audio.paused) return;
      const t = Math.round((audio.currentTime || 0) * 1000);
      if (t !== last && ts - lastUpdate >= 100) {
        last = t;
        lastUpdate = ts;
        setAudioTimeMs(t);
      }
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [jam?.now?.id, jam?.playing]);

  const sendText = async (text: string) => {
    if (sendingText) return;
    setSendingText(true);
    try {
      await api(`/api/jams/${jamId}/messages`, { method: 'POST', body: JSON.stringify({ text }) });
    } catch (err) {
      toast(err instanceof Error ? err.message : t('toast.unknownError'), 'error');
    } finally {
      setSendingText(false);
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

  const voteSkip = () => {
    const cur = jam?.now;
    if (!cur || !live) return;
    if (skipMine && votedSongId === cur.id) return;
    setSkipMine(true);
    setVotedSongId(cur.id);
    setSkipVotes((v) => v + 1);
    emitLive('music:skip-vote', jamId);
  };

  const control = (action: string, extra?: Record<string, number>) => emitWhenConnected('music:control', { jamId, action, ...extra });
  const sendPendingSeek = () => {
    if (seekTimerRef.current !== null) {
      window.clearTimeout(seekTimerRef.current);
      seekTimerRef.current = null;
    }
    const position = pendingSeekRef.current;
    pendingSeekRef.current = null;
    if (position === null || position <= 0 || position > maxMs) {
      seekingRef.current = false;
      return;
    }
    control('seek', { position });
    seekingRef.current = false;
  };

  const seekFromPointer = (clientX: number, el: HTMLDivElement) => {
    if (!canControl || !jam?.now || maxMs <= 0) return;
    const rect = el.getBoundingClientRect();
    if (!rect.width) return;
    let ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    if (document.documentElement.dir === 'rtl') ratio = 1 - ratio;
    const position = Math.round(ratio * maxMs);
    seekingRef.current = true;
    pendingSeekRef.current = position;
    setNowMs(position);
    setAudioTimeMs(position);
    const audio = audioRef.current;
    if (audio) {
      try {
        audio.currentTime = position / 1000;
      } catch {}
    }
    if (seekTimerRef.current !== null) window.clearTimeout(seekTimerRef.current);
    seekTimerRef.current = window.setTimeout(sendPendingSeek, 220);
  };

  const endSeek = () => {
    if (seekTimerRef.current !== null) {
      window.clearTimeout(seekTimerRef.current);
      seekTimerRef.current = null;
    }
    sendPendingSeek();
  };

  const doSearch = async () => {
    if (!searchQ.trim()) return;
    setSearching(true);
    try {
      const d = await api<{ songs: SearchSong[] }>(`/api/music/search?q=${encodeURIComponent(searchQ.trim())}`);
      setResults(d.songs);
    } catch {
      setResults([]);
    } finally {
      setSearching(false);
    }
  };

  const addToQueue = (songId: number) => {
    emitWhenConnected('music:control', { jamId, action: 'queue-add', songId });
    toast(t('room.addedToQueue'), 'ok');
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
    if (!jam) return;
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

  const deleteJam = async () => {
    try {
      await api(`/api/jams/${jamId}/delete`, { method: 'POST' });
      toast(t('room.deleted'));
      onBack();
    } catch (err) {
      toast(err instanceof Error ? err.message : t('toast.unknownError'), 'error');
    }
  };

  const makeMini = async (userId: number, on: boolean) => {
    try {
      await api(`/api/jams/${jamId}/assign-role`, { method: 'POST', body: JSON.stringify({ userId, role: on ? 'MINI_HOST' : 'MEMBER' }) });
      load();
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
      items.push({
        icon: <Flag size={14} />,
        label: t('room.reportMessage'),
        onClick: () => setReportMessageId(m.id),
      });
    }
    return items;
  };

  if (loadError) {
    return (
      <div className="dj-room" style={{ marginTop: 24 }}>
        <div className="empty-state" style={{ padding: 40, maxWidth: 520, marginInline: 'auto' }}>
          <Loader2 size={20} />
          <p style={{ margin: '12px 0' }}>{t('room.loadFailed')}</p>
          <pre style={{ fontSize: 12, opacity: 0.8, whiteSpace: 'pre-wrap', maxHeight: 120, overflow: 'auto' }}>{loadError}</pre>
          <div style={{ display: 'flex', gap: 8, marginTop: 16, justifyContent: 'center' }}>
            <button type="button" className="btn btn-violet pill" onClick={() => { setLoadError(null); load(); }}>{t('room.retry')}</button>
            <button type="button" className="btn btn-ghost pill" onClick={onBack}>{t('room.back')}</button>
          </div>
        </div>
      </div>
    );
  }

  if (!jam) return <div className="empty-state" style={{ padding: 48 }}><Loader2 className="spin" size={20} /></div>;

  const maxMs = audioDurMs > 0 ? audioDurMs : (jam.durationSec || 0) * 1000;
  const shownMs = audioLive && audioDurMs > 0 ? audioTimeMs : nowMs;
  const pct = maxMs > 0 ? Math.min(100, Math.max(0, (shownMs / maxMs) * 100)) : 0;
  const coverUrl = jam.now?.coverUrl || fallbackCover(isNaN(jam.ownerId) ? 1 : jam.ownerId + 5);

  const lrcLines: LyricLine[] = lrcDoc.lines;
  const hasWordTiming = lrcDoc.hasWordTiming;
  const plainLyrics = jam.now?.lyrics && !jam.now?.lrc ? jam.now.lyrics : null;
  const lyricActive: LyricActive | null = (() => {
    if (lrcLines.length === 0) return null;
    const idx = activeLineIndex(lrcLines, shownMs);
    if (idx < 0) return null;
    let word = 0;
    const words = lrcLines[idx].words;
    if (words.some((w) => w.time !== null)) word = Math.max(0, activeWordIndex(lrcLines[idx], shownMs));
    return { line: idx, word };
  })();

  const chatPane = (
    <div className="dj-chat">
      <div className="dj-chat-body" ref={bodyRef}>
        {jam.messages.length === 0 && <div className="empty-state" style={{ padding: 32 }}>{t('room.noMessages')}</div>}
        {jam.messages.map((m) => (
          <div key={m.id} className={`msg ${m.userId === me?.id ? 'me' : ''}`} onContextMenu={(e) => onContextMenu(e, msgMenu(m), 'room')}>
            <div className="msg-bubble">
              <div className="msg-name">
                {m.user.username}
                {m.user.isGuest && <span className="guest-tag">{t('panel.guestTag') ?? 'guest'}</span>}
              </div>
              {m.kind === 'VOICE' && m.media ? <VoicePlayer src={m.media.url} /> : <div className="msg-text"><EmojiText text={m.text} /></div>}
              <MessageReactions reactions={m.reactions ?? []} onReact={(em) => react(m.id, em)} myReaction={m.reactions?.find((r) => r.me)?.emoji ?? null} />
            </div>
            <div className="msg-time">{new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
          </div>
        ))}
      </div>
      {typingUser && <div className="dj-typing">{t('room.typing', { name: typingUser })}</div>}
      <MessageComposer placeholder={t('room.messagePlaceholder')} onSendText={sendText} onSendVoice={sendVoice} onTyping={onTyping} busy={sendingText || sendingVoice} />
    </div>
  );

  const queuePane = (
    <div>
      <div className="dj-col-title">{t('room.tabQueue')} · {jam.queue.length}</div>
      {canControl && (
        <div className="dj-search">
          <div className="dj-search-head">
            <input
              className="auth-input"
              value={searchQ}
              onChange={(e) => setSearchQ(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && doSearch()}
              placeholder={t('room.searchPlaceholder')}
              maxLength={60}
            />
            <button type="button" className="btn btn-violet pill-sm" onClick={doSearch} disabled={searching || !searchQ.trim()}>
              {searching ? <Loader2 className="spin" size={13} /> : <Search size={13} />} {t('room.search')}
            </button>
          </div>
          {results.length > 0 && (
            <div className="dj-search-results">
              {results.map((r) => (
                <button key={r.id} type="button" className="dj-search-row" onClick={() => addToQueue(r.id)}>
                  <div className="jamset-cover" style={{ width: 34, height: 34, borderRadius: 8 }}>
                    <img src={r.coverUrl || fallbackCover(r.id)} alt="" loading="lazy" />
                  </div>
                  <span className="dj-search-meta">
                    <b>{r.title}</b>
                    <span>{r.artist?.name ?? ''}</span>
                  </span>
                  <Plus size={14} />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
      {jam.queue.length === 0 && <div className="empty-state" style={{ padding: 28 }}><p>{t('room.queueEmpty')}</p></div>}
      <div className="dj-queue-list">
        {jam.queue.map((q) => (
          <div key={q.id} className="dj-queue-row">
            <div className="jamset-cover" style={{ width: 38, height: 38, borderRadius: 8 }}>
              <img src={q.song.coverUrl || fallbackCover(q.song.id)} alt="" loading="lazy" />
            </div>
            <div className="dj-queue-meta">
              <b>{q.song.title}</b>
              <span>{q.song.artist?.name ?? ''}</span>
              <span className="dj-queue-added">{t('room.addedBy', { name: q.addedBy.username })}</span>
            </div>
            <div className="dj-queue-actions">
              {canControl && (
                <button type="button" className="btn-icon" title={t('modal.close')} onClick={() => control('queue-remove', { qi: q.id })}>
                  <X size={13} />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const membersPane = (
    <div>
      <div className="dj-col-title">{t('room.onlineCount', { online: online.length, total: jam.members.length })}</div>
      <div className="dj-members-list">
        {jam.members.map((mb) => {
          const isHost = mb.id === jam.ownerId;
          const isMini = mb.role === 'MINI_HOST';
          return (
            <div key={mb.uid} className="dj-member-row">
              <button type="button" className="dj-member-main" onClick={() => mb.id !== me?.id && setProfileUserId(mb.id)}>
                <JaminoAvatar avatarId={mb.avatarId} size={30} photo={mb.avatarPhoto} name={mb.username} />
                <span className="dj-member-name">
                  {mb.username}
                  {mb.isGuest && <span className="guest-tag">{t('panel.guestTag') ?? 'guest'}</span>}
                </span>
                {online.includes(mb.id) && <i className="dj-online-dot" />}
              </button>
              <span className={`jamset-role-tag ${isHost ? 'host' : isMini ? 'mini' : ''}`}>
                {isHost ? t('room.roleHost') : isMini ? t('room.roleMiniHost') : t('jams.roleMember')}
              </span>
              {isOwner && mb.id !== me?.id && (
                <button type="button" className="btn-icon" title={isMini ? t('room.removeMiniHost') : t('room.makeMiniHost')} onClick={() => makeMini(mb.id, !isMini)}>
                  {isMini ? <X size={13} /> : <Check size={13} />}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="dj-room" style={{ marginTop: 24 }}>
      <audio ref={audioRef} preload="auto" onEnded={() => { setAudioLive(false); emitWhenConnected('music:ended', jamId); }} onPlay={() => { setAudioLive(true); setBlocked(false); setBuffering(false); }} onPause={() => setAudioLive(false)} onError={() => setBlocked(true)} onWaiting={() => setBuffering(true)} onPlaying={() => { setAudioLive(true); setBuffering(false); }} onCanPlay={() => setBuffering(false)} onStalled={() => setBuffering(true)} onTimeUpdate={(e) => setAudioTimeMs(Math.round((e.currentTarget.currentTime || 0) * 1000))} onLoadedMetadata={(e) => { const d = e.currentTarget.duration; if (Number.isFinite(d) && d > 0) setAudioDurMs(Math.round(d * 1000)); }} />
      <div className="dj-head">
        <button type="button" className="btn-icon" onClick={onBack} title={t('modal.close')}>
          <ArrowLeft size={16} />
        </button>
        <div className="jam-icon" style={{ width: 36, height: 36 }}>
          {jam.type === 'PRIVATE' ? <Lock size={15} /> : <Globe size={15} />}
        </div>
        <div className="dj-head-title">
          <div className="room-title">{jam.name}</div>
          <div className="room-members">
            <UsersIcon size={13} /> {t('room.onlineCount', { online: online.length, total: jam.members.length })}
            {live && <span className="live-tag"><span className="live-dot" /> {t('room.live')}</span>}
            {jam.closed && <span className="closed-tag">{t('room.closed')}</span>}
          </div>
        </div>
        <div className="dj-head-actions">
          {!jam.closed && (
            <button type="button" className="btn-ghost pill-sm" onClick={openInvite}>
              <UserPlus size={15} /> {t('jams.inviteFriends')}
            </button>
          )}
          {isOwner ? (
            <button type="button" className="btn btn-ghost pill-sm" onClick={toggleClose}>
              {jam.closed ? <Check size={14} /> : <Ban size={14} />} {jam.closed ? t('room.reopen') : t('room.close')}
            </button>
          ) : (
            <button type="button" className="btn btn-ghost pill-sm" onClick={leave}>
              <LogOut size={14} /> {t('room.leave')}
            </button>
          )}
          <button type="button" className="btn btn-ghost pill-sm" onClick={copyLink}>
            <Copy size={14} /> {t('jams.copyLink')}
          </button>
          {isOwner &&
            (confirmDelete ? (
              <span className="room-confirm">
                <span className="room-confirm-text">{t('room.deleteConfirm')}</span>
                <button type="button" className="btn btn-danger pill-sm" onClick={deleteJam}><Trash2 size={14} /> {t('room.deleteYes')}</button>
              </span>
            ) : (
              <button type="button" className="btn btn-ghost pill-sm danger" onClick={() => setConfirmDelete(true)}><Trash2 size={14} /> {t('room.delete')}</button>
            ))}
        </div>
      </div>

      <div className="dj-player">
        <div className="jamset-cover" style={{ width: 62, height: 62, borderRadius: 13 }}>
          <img src={coverUrl} alt="" loading="lazy" />
        </div>
        <div className="dj-player-now">
          <span className="jamset-now-label"><Radio size={11} /> {t('jams.nowPlaying')}</span>
          <b className="dj-song-title">{jam.now?.title ?? t('jams.waitingForDJ')}</b>
          <span className="dj-song-artist">{jam.now?.artist?.name ?? ''}</span>
          <div className="dj-progress">
            <div
              className={`dj-progress-bar${canControl && jam.now && maxMs > 0 ? ' seekable' : ''}`}
              onPointerDown={(e) => {
                if (!canControl || !jam.now || maxMs <= 0) return;
                e.currentTarget.setPointerCapture?.(e.pointerId);
                seekFromPointer(e.clientX, e.currentTarget);
              }}
              onPointerMove={(e) => {
                if (!seekingRef.current || !canControl) return;
                seekFromPointer(e.clientX, e.currentTarget);
              }}
              onPointerUp={(e) => {
                e.currentTarget.releasePointerCapture?.(e.pointerId);
                endSeek();
              }}
              onPointerCancel={(e) => {
                e.currentTarget.releasePointerCapture?.(e.pointerId);
                endSeek();
              }}
            >
              <div style={{ width: `${pct}%` }} />
            </div>
            <span className="dj-progress-time">
              {buffering && jam.playing && jam.now && <Loader2 className="spin" size={11} style={{ verticalAlign: -1, marginRight: 4 }} />}
              {shownMs ? fmtTime(shownMs) : '0:00'} / {fmtTime(maxMs)}
            </span>
          </div>
        </div>
        {jam.now && (
          <>
            {canControl && (
              <button type="button" className="btn-icon dj-btn-big" title={jam.playing ? 'pause' : 'play'} onClick={() => control(jam.playing ? 'pause' : 'resume')}>
                {jam.playing ? <Pause size={18} /> : <Play size={18} />}
              </button>
            )}
            <button type="button" className="btn-icon dj-btn-big" title={t('room.skipSong')} onClick={() => (canControl ? control('skip') : voteSkip())}>
              <SkipForward size={18} />
            </button>
            {hasLyrics && (
              <button
                type="button"
                className={`btn-icon dj-btn-big${showLyrics ? ' active' : ''}`}
                title={t('music.lyrics')}
                aria-pressed={showLyrics}
                onClick={() => setShowLyrics((v) => !v)}
              >
                <Mic2 size={18} />
              </button>
            )}
            {!canControl && (
              <button type="button" className={`dj-skip-vote ${skipMine && votedSongId === jam.now.id ? 'voted' : ''}`} onClick={voteSkip} disabled={skipMine && votedSongId === jam.now.id}>
                <ThumbsUp size={14} /> {t('room.skipSong')}
                {skipVotes > 0 && <span className="dj-skip-count">{skipVotes}{skipRequired > 0 ? `/${skipRequired}` : ''}</span>}
                {skipMine && votedSongId === jam.now.id && <Check size={13} />}
              </button>
            )}
          </>
        )}
        <div className="dj-volrow" title={t('music.volume')}>
          <button
            type="button"
            className="btn-icon dj-vol-mute"
            aria-label={t('music.mute')}
            onClick={() => setMuted((v) => !v)}
          >
            {muted || volume < 0.01 ? <VolumeX size={15} /> : volume < 0.5 ? <Volume1 size={15} /> : <Volume2 size={15} />}
          </button>
          <input
            type="range"
            className="dj-volbar"
            aria-label={t('music.volume')}
            min="0"
            max="1"
            step="0.01"
            value={muted ? 0 : volume}
            style={{ ['--dj-vol' as string]: `${Math.round((muted ? 0 : volume) * 100)}%` }}
            onChange={(e) => {
              setMuted(false);
              setVolume(Number(e.target.value));
              if (audioRef.current) audioRef.current.volume = Number(e.target.value);
            }}
          />
        </div>
        {blocked && jam.now && jam.playing && (
          <button
            type="button"
            className="btn btn-violet pill-sm dj-resume"
            onClick={() => {
              audioRef.current?.play().then(() => setBlocked(false)).catch(() => setBlocked(true));
            }}
          >
            <Play size={13} /> {t('music.pressPlay')}
          </button>
        )}
        {!jam.now && <div className="dj-waiting">{t('jams.waitingForDJ')}</div>}
      </div>

      {showLyrics && hasLyrics && (
        <div className="dj-lyrics-panel">
          <SyncedLyrics lines={lrcLines} hasWordTiming={hasWordTiming} plainLyrics={plainLyrics} active={lyricActive} />
        </div>
      )}

      <div className="dj-content">
        <div className={`dj-main ${pane !== 'chat' ? 'hidden' : ''}`}>{chatPane}</div>
        <aside className="dj-side">
          <div className="dj-side-tabs">
            <button type="button" className={sideTab === 'queue' ? 'active' : ''} onClick={() => setSideTab('queue')}>
              <Music2 size={14} /> {t('room.tabQueue')}{jam.queue.length > 0 && <span className="dj-badge">{jam.queue.length}</span>}
            </button>
            <button type="button" className={sideTab === 'members' ? 'active' : ''} onClick={() => setSideTab('members')}>
              <UsersIcon size={14} /> {t('room.tabMembers')}
            </button>
          </div>
          <div className="dj-side-body" data-tab={sideTab}>
            <div className={sideTab === 'queue' ? '' : 'hidden'}>{queuePane}</div>
            <div className={sideTab === 'members' ? '' : 'hidden'}>{membersPane}</div>
          </div>
        </aside>
      </div>

      <div className="dj-mobile-tabs">
        <button type="button" className={pane === 'chat' ? 'active' : ''} onClick={() => setPane('chat')}><MessageCircle size={15} /> {t('room.tabChat')}</button>
        <button type="button" className={pane === 'queue' ? 'active' : ''} onClick={() => setPane('queue')}><Music2 size={15} /> {t('room.tabQueue')}{jam.queue.length > 0 && <span className="dj-badge">{jam.queue.length}</span>}</button>
        <button type="button" className={pane === 'members' ? 'active' : ''} onClick={() => setPane('members')}><UsersIcon size={15} /> {t('room.tabMembers')}</button>
      </div>

      <div className="dj-mobile-body">
        {pane === 'chat' && chatPane}
        {pane === 'queue' && queuePane}
        {pane === 'members' && membersPane}
      </div>

      {showInvite && (
        <div className="invites-box" style={{ marginBottom: 12 }}>
          <div className="sub-label">{t('jams.inviteFriends')}</div>
          {friends.length === 0 && <div className="empty-state" style={{ padding: 16 }}>{t('jams.browseEmpty')}</div>}
          {friends.map((f) => (
            <div key={f.id} className="invite-row">
              <JaminoAvatar avatarId={f.avatarId} size={30} photo={f.avatarPhoto} name={f.username} />
              <div className="friend-meta">
                <span className="friend-name">{f.username}</span>
              </div>
              <button type="button" className="btn btn-violet pill-sm" onClick={() => invite(f.id)}><UserPlus size={14} /> {t('jams.inviteFriends')}</button>
            </div>
          ))}
        </div>
      )}

      {reportMessageId != null && <ReportMessageModal target={{ jamMessageId: reportMessageId }} onClose={() => setReportMessageId(null)} />}
    </div>
  );
}