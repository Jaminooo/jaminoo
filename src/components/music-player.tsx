'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import { Howl } from 'howler';
import { useTranslations } from '@/providers/use-translations';
import { api } from '@/lib/client-api';
import { emitLive, onLive, liveConnected, emitWhenConnected } from '@/lib/live';
import { toast } from '@/components/toast';
import { getAudioAnalyzer } from '@/lib/audio/analyzer';
import { activeLineIndex, activeWordIndex, parseLyrics, type LyricLine } from '@/lib/audio/lyrics';
import { useAudioFrame, type AudioFrame } from '@/components/music/use-audio-frame';
import { SyncedLyrics, type LyricActive } from '@/components/music/synced-lyrics';
import { QueueList, type QueueRow } from '@/components/music/queue-list';
import { Magnetic } from '@/components/music/magnetic';
import {
  Play,
  Pause,
  SkipForward,
  RotateCcw,
  ListMusic,
  Mic2,
  Plus,
  Search,
  Star,
  Heart,
  Volume2,
  VolumeX,
  Swords,
  Trophy,
} from 'lucide-react';

const MusicVisualizer = dynamic(
  () => import('@/components/music/music-visualizer').then((m) => m.MusicVisualizer),
  { ssr: false }
);
const WaveformFallback = dynamic(
  () => import('@/components/music/waveform-fallback').then((m) => m.WaveformFallback),
  { ssr: false }
);

export interface MusicSong {
  id: number;
  title: string;
  artist: { id: number; name: string } | null;
  feat: { id: number; name: string }[];
  album: { id: number; title: string; coverUrl: string | null } | null;
  durationSec: number;
  lyrics: string;
  lrc: string;
  audioUrl: string | null;
  audioLink: string | null;
  coverUrl: string | null;
  featured: boolean;
  explicit: boolean;
  plays: number;
}

export interface MusicState {
  now: MusicSong | null;
  playing: boolean;
  positionMs: number;
  atMs: number;
  durationSec: number;
  canControl: boolean;
}

interface QueueItem {
  id: number;
  pos?: number;
  song: MusicSong;
  addedBy: { id: number; username: string };
  createdAt: string;
  votes?: number;
  voted?: boolean;
}

interface SearchResult {
  songs: MusicSong[];
  artists: { id: number; name: string; coverUrl: string | null }[];
  albums: { id: number; title: string; artist: string; coverUrl: string | null }[];
}

interface UserPlaylist {
  id: number;
  name: string;
  items?: { songId: number }[];
}

const AUDIO_FORMAT = ['mp3'];

function fmtTime(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, '0')}`;
}

function statePositionMs(state: MusicState | null) {
  if (!state) return 0;
  return state.playing ? state.positionMs + Math.max(0, Date.now() - state.atMs) : state.positionMs;
}

export function artistLabel(song: MusicSong | null) {
  if (!song) return '';
  const feat = song.feat.filter((f) => f.id !== song.artist?.id).map((f) => f.name);
  const names = [...(song.artist ? [song.artist.name] : []), ...feat];
  return names.join(' ft. ');
}

export function MusicPlayer({ jamId, canOwner, miniHost, chatSlot }: { jamId: string; canOwner: boolean; miniHost?: boolean; chatSlot?: ReactNode }) {
  const t = useTranslations();
  const rootRef = useRef<HTMLDivElement>(null);
  const lyricsBoxRef = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<MusicState | null>(null);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [activePanel, setActivePanel] = useState<'lyrics' | 'queue' | 'add' | null>(null);
  const [q, setQ] = useState('');
  const [results, setResults] = useState<SearchResult | null>(null);
  const [searching, setSearching] = useState(false);
  const [playlists, setPlaylists] = useState<UserPlaylist[]>([]);
  const [playlistName, setPlaylistName] = useState('');
  const [active, setActive] = useState<LyricActive | null>(null);
  const [volume, setVolume] = useState(0.8);
  const [muted, setMuted] = useState(false);
  const [prefersReduced, setPrefersReduced] = useState(false);
  const [isDesktop, setIsDesktop] = useState(true);
  const [hasWebGL, setHasWebGL] = useState<boolean | null>(null);
  const [playbackMs, setPlaybackMs] = useState(0);
  const [audioDurationSec, setAudioDurationSec] = useState(0);
  const [favorite, setFavorite] = useState(false);
  const historySongRef = useRef<number | null>(null);

  const howlRef = useRef<Howl | null>(null);
  const wantPlayRef = useRef(false);
  const volumeRef = useRef(0.8);
  const mutedRef = useRef(false);
  const seekOnLoadRef = useRef(0);
  const playbackMsRef = useRef(0);
  const seekTimerRef = useRef<number | null>(null);
  const pendingSeekRef = useRef<number | null>(null);
  const seekingRef = useRef(false);
  const frameRef = useRef<AudioFrame>({
    volume: 0,
    bass: 0,
    mid: 0,
    treble: 0,
    beat: 0,
    time: 0,
    duration: 0,
    playing: false,
    spectrum: new Uint8Array(0),
    wave: new Uint8Array(0),
  });

  const canControl = !!state?.canControl || canOwner || !!miniHost;

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const setRed = () => setPrefersReduced(mq.matches);
    setRed();
    mq.addEventListener('change', setRed);
    const pm = window.matchMedia('(pointer: coarse)');
    const setPtr = () => setIsDesktop(!pm.matches);
    setPtr();
    pm.addEventListener('change', setPtr);
    return () => {
      mq.removeEventListener('change', setRed);
      pm.removeEventListener('change', setPtr);
    };
  }, []);

  useEffect(() => {
    // Lazy WebGL probe so SSR never touches graphics APIs.
    let alive = true;
    import('@/lib/audio/capabilities').then((m) => {
      if (alive) setHasWebGL(m.supportsWebGL());
    });
    return () => {
      alive = false;
    };
  }, []);

  const loadState = useCallback(() => {
    api<{ state: MusicState; queue: QueueItem[] }>(`/api/jams/${jamId}/music`)
      .then((d) => {
        setState(d.state);
        setQueue(d.queue);
      })
      .catch(() => {});
  }, [jamId]);

  useEffect(() => {
    loadState();
    const offState = onLive('music:state', (d: MusicState & { jamId: string }) => {
      if (d.jamId !== jamId) return;
      setState({ now: d.now, playing: d.playing, positionMs: d.positionMs, atMs: d.atMs, durationSec: d.durationSec, canControl: d.canControl ?? canControl });
    });
    const offQueue = onLive('music:queue', (d: { jamId: string; queue: QueueItem[] }) => {
      if (d.jamId !== jamId) return;
      setQueue(d.queue);
    });
    const offVote = onLive('music:vote', (d: { jamId: string; queueItemId: number; votes: number; userId: number }) => {
      if (d.jamId !== jamId) return;
      setQueue((items) => items.map((item) => item.id === d.queueItemId ? { ...item, votes: d.votes } : item));
    });
    const offUpdate = onLive('jam:update', (id: string) => {
      if (id === jamId) loadState();
    });
    const sync = setInterval(() => {
      if (liveConnected()) emitLive('music:sync', jamId);
      else loadState();
    }, 20000);
    return () => {
      offState();
      offQueue();
      offVote();
      offUpdate();
      clearInterval(sync);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jamId]);

  const song = state?.now ?? null;
  const songId = song?.id ?? null;

  useEffect(() => {
    if (!songId) {
      setFavorite(false);
      return;
    }
    api<{ favorites: { songId: number }[] }>('/api/music/favorites')
      .then((data) => setFavorite(data.favorites.some((item) => item.songId === songId)))
      .catch(() => setFavorite(false));
  }, [songId]);

  useEffect(() => {
    if (activePanel !== 'add') return;
    api<{ playlists: UserPlaylist[] }>('/api/music/playlists').then((data) => setPlaylists(data.playlists)).catch(() => {});
  }, [activePanel]);

  useEffect(() => {
    if (!songId || !state?.playing || historySongRef.current === songId) return;
    historySongRef.current = songId;
    api('/api/music/history', { method: 'POST', body: JSON.stringify({ songId, jamId }) }).catch(() => {});
  }, [jamId, songId, state?.playing]);

  useEffect(() => {
    if (seekingRef.current) return;
    const next = Math.max(0, statePositionMs(state));
    playbackMsRef.current = next;
    setPlaybackMs(next);
  }, [songId, state?.atMs, state?.playing, state?.positionMs]);

  useEffect(() => {
    if (!state?.playing) return;
    const timer = window.setInterval(() => {
      if (seekingRef.current) return;
      const next = Math.max(0, statePositionMs(state));
      playbackMsRef.current = next;
      setPlaybackMs(next);
    }, 100);
    return () => window.clearInterval(timer);
  }, [state]);

  const useWebAudio = isDesktop && !prefersReduced;
  const analysisEnabled = useWebAudio;
  const show3D = !!hasWebGL && useWebAudio;
  const show2D = !show3D && useWebAudio;

  const lrcLines = useMemo<LyricLine[]>(() => parseLyrics(song?.lrc ?? '').lines, [song?.lrc]);
  const hasWordTiming = useMemo(() => parseLyrics(song?.lrc ?? '').hasWordTiming, [song?.lrc]);
  const plainLyrics = (song && song.lyrics && !song.lrc) ? song.lyrics : null;

  // --- Howler lifecycle: create/replace/unload per song ---
  useEffect(() => {
    const prev = howlRef.current;
    if (prev) {
      try {
        prev.stop();
        prev.unload();
      } catch {}
      howlRef.current = null;
    }
    if (!song || !song.audioUrl) return;

    setAudioDurationSec(0);
    const effVolume = mutedRef.current ? 0 : volumeRef.current;
    wantPlayRef.current = state?.playing ?? false;
    seekOnLoadRef.current = state?.positionMs ?? 0;

    const howl = new Howl({
      src: [song.audioUrl],
      format: AUDIO_FORMAT,
      html5: !useWebAudio,
      volume: effVolume,
      preload: true,
      onload: () => {
        if (howlRef.current !== howl) return;
        const loadedDuration = howl.duration();
        if (Number.isFinite(loadedDuration) && loadedDuration > 0) setAudioDurationSec(loadedDuration);
        const seekSec = seekOnLoadRef.current / 1000;
        if (seekSec > 0.5) {
          try {
            howl.seek(seekSec);
          } catch {}
        }
        if (wantPlayRef.current && !howl.playing()) {
          howl.play();
        }
      },
      onplay: () => {
        if (useWebAudio) getAudioAnalyzer().resume();
      },
      onend: () => {
        emitLive('music:ended', jamId);
      },
      onloaderror: (_id, err) => {
        toast(t('music.loadError'), 'error');
      },
      onplayerror: (_id, err) => {
        // Browser blocked autoplay; recover on the next user gesture.
        getAudioAnalyzer().resume().then(() => {
          if (wantPlayRef.current && howlRef.current === howl) howl.play();
        });
      },
    });
    howlRef.current = howl;

    return () => {
      if (howlRef.current === howl) howlRef.current = null;
      try {
        howl.stop();
        howl.unload();
      } catch {}
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [songId]);

  // --- Volume / mute ---
  useEffect(() => {
    volumeRef.current = volume;
    mutedRef.current = muted;
    const h = howlRef.current;
    if (h) {
      try {
        h.volume(muted ? 0 : volume);
      } catch {}
    }
  }, [volume, muted]);

  useEffect(() => () => {
    if (seekTimerRef.current !== null) {
      window.clearTimeout(seekTimerRef.current);
      seekTimerRef.current = null;
    }
    try {
      howlRef.current?.stop();
      howlRef.current?.unload();
    } catch {}
    howlRef.current = null;
  }, []);

  const getTime = useCallback(() => {
    const h = howlRef.current;
    if (!h) return 0;
    try {
      const s = h.seek();
      return Number.isFinite(s) ? s : 0;
    } catch {
      return 0;
    }
  }, []);

  const getDuration = useCallback(() => {
    const h = howlRef.current;
    if (h) {
      try {
        const d = h.duration();
        if (Number.isFinite(d) && d > 0) return d;
      } catch {}
    }
    return state?.durationSec ?? song?.durationSec ?? 0;
  }, [song?.durationSec, state?.durationSec]);

  // --- Shared rAF loop: analysis + beat + lyrics + imperative frame ref ---
  const onTick = useCallback(
    (frame: AudioFrame) => {
      frameRef.current = frame;

      if (!seekingRef.current) {
        const fallbackMs = statePositionMs(state);
        const nextMs = howlRef.current?.state() === 'loaded' ? frame.time * 1000 : fallbackMs;
        if (Math.abs(nextMs - playbackMsRef.current) >= 80 || !frame.playing) {
          playbackMsRef.current = Math.max(0, nextMs);
          setPlaybackMs(playbackMsRef.current);
        }
      }

      const lc = lyricsBoxRef.current;
      if (lc) {
        lc.style.setProperty('--lrc-bass', frame.bass.toFixed(3));
        lc.style.setProperty('--lrc-beat', frame.beat.toFixed(3));
        lc.style.setProperty('--lrc-vol', frame.volume.toFixed(3));
      }

      let next: LyricActive | null = null;
      if (lrcLines.length > 0) {
        const tMs = frame.time * 1000;
        const idx = activeLineIndex(lrcLines, tMs);
        if (idx >= 0) {
          let wi = 0;
          const words = lrcLines[idx].words;
          if (words.length > 0 && words[0].time !== null) {
            wi = Math.max(0, activeWordIndex(lrcLines[idx], tMs));
          }
          next = { line: idx, word: wi };
        }
      }
      setActive((prev) => {
        if (prev?.line === next?.line && prev?.word === next?.word) return prev;
        return next;
      });
    },
    [lrcLines, state?.atMs, state?.playing, state?.positionMs]
  );

  useAudioFrame({
    getTime,
    getDuration,
    playing: state?.playing ?? false,
    analysisEnabled,
    resetKey: songId ?? 'none',
    onTick,
  });

  const getFrame = useCallback(() => frameRef.current, []);

  // --- Server round-trip sync loop (authoritative positions) ---
  useEffect(() => {
    const interval = setInterval(() => {
      if (!state || !howlRef.current || howlRef.current.state() !== 'loaded') return;
      if (!song || !song.audioUrl) return;
      const howl = howlRef.current;
      try {
        const desiredMs = state.playing ? state.positionMs + (Date.now() - state.atMs) : state.positionMs;
        const audioMs = (howl.seek() ?? 0) * 1000;
        if (state.playing && !howl.playing()) {
          if (!howl.playing()) howl.play();
        }
        if (!state.playing && howl.playing()) howl.pause();
        if (Math.abs(audioMs - desiredMs) > 800) {
          howl.seek(desiredMs / 1000);
        }
      } catch {}
    }, 500);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, songId]);

  const durationSec = song?.durationSec || state?.durationSec || audioDurationSec || getDuration();
  const durationMs = Math.max(0, durationSec * 1000);
  const desiredMs = durationMs ? Math.min(durationMs, Math.max(0, playbackMs)) : Math.max(0, playbackMs);
  const pct = durationMs ? Math.min(100, (desiredMs / durationMs) * 100) : 0;

  const control = useCallback(
    (action: string, extra?: Record<string, unknown>) => {
      emitWhenConnected('music:control', { jamId, action, ...extra });
    },
    [jamId]
  );

  const toggleFavorite = useCallback(async () => {
    if (!songId) return;
    const next = !favorite;
    setFavorite(next);
    try {
      await api('/api/music/favorites', { method: next ? 'POST' : 'DELETE', body: JSON.stringify({ songId }) });
    } catch {
      setFavorite(!next);
    }
  }, [favorite, songId]);

  const sendPendingSeek = useCallback(() => {
    if (seekTimerRef.current !== null) {
      window.clearTimeout(seekTimerRef.current);
      seekTimerRef.current = null;
    }
    const position = pendingSeekRef.current;
    if (position === null) return;
    pendingSeekRef.current = null;
    control('seek', { position });
  }, [control]);

  const queueSeek = useCallback(
    (rawPosition: number) => {
      const position = durationMs ? Math.min(durationMs, Math.max(0, rawPosition)) : 0;
      seekingRef.current = true;
      pendingSeekRef.current = position;
      playbackMsRef.current = position;
      setPlaybackMs(position);
      setState((prev) => prev ? { ...prev, positionMs: position, atMs: Date.now() } : prev);

      const h = howlRef.current;
      if (h?.state() === 'loaded') {
        try {
          h.seek(position / 1000);
        } catch {}
      }

      if (seekTimerRef.current !== null) window.clearTimeout(seekTimerRef.current);
      seekTimerRef.current = window.setTimeout(sendPendingSeek, 180);
    },
    [durationMs, sendPendingSeek]
  );

  const finishSeek = useCallback(() => {
    sendPendingSeek();
    seekingRef.current = false;
  }, [sendPendingSeek]);

  const seekFromPointer = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (!canControl || !durationMs) return;
    const rect = event.currentTarget.getBoundingClientRect();
    if (!rect.width) return;
    const raw = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
    const rtl = document.documentElement.dir === 'rtl';
    queueSeek((rtl ? 1 - raw : raw) * durationMs);
  }, [canControl, durationMs, queueSeek]);

  const onSeekPointerDown = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (!canControl || !durationMs) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    seekingRef.current = true;
    seekFromPointer(event);
  }, [canControl, durationMs, seekFromPointer]);

  const onSeekPointerMove = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (seekingRef.current && event.currentTarget.hasPointerCapture(event.pointerId)) {
      seekFromPointer(event);
    }
  }, [seekFromPointer]);

  const onSeekPointerUp = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    finishSeek();
  }, [finishSeek]);

  const syncGesture = useCallback(() => {
    const an = getAudioAnalyzer();
    an.attach();
    an.resume().catch(() => {});
  }, []);

  const doSearch = useCallback(async () => {
    setSearching(true);
    try {
      const d = await api<SearchResult>(`/api/music/search?q=${encodeURIComponent(q.trim())}`);
      setResults(d);
    } catch (e) {
      toast(e instanceof Error ? e.message : t('toast.unknownError'), 'error');
    } finally {
      setSearching(false);
    }
  }, [q, t]);

  const queueAdd = (songId: number) => {
    control('queue-add', { songId });
    toast(t('music.addedToQueue'), 'ok');
  };

  const createPlaylist = async (event: FormEvent) => {
    event.preventDefault();
    const name = playlistName.trim();
    if (!name) return;
    try {
      const data = await api<{ playlist: UserPlaylist }>('/api/music/playlists', { method: 'POST', body: JSON.stringify({ name }) });
      setPlaylists((items) => [data.playlist, ...items]);
      setPlaylistName('');
      toast('Playlist created.', 'ok');
    } catch (error) {
      toast(error instanceof Error ? error.message : t('toast.unknownError'), 'error');
    }
  };

  const addToPlaylist = async (playlistId: number, songId: number) => {
    try {
      await api(`/api/music/playlists/${playlistId}`, { method: 'POST', body: JSON.stringify({ songId }) });
      toast('Added to playlist.', 'ok');
    } catch (error) {
      toast(error instanceof Error ? error.message : t('toast.unknownError'), 'error');
    }
  };

  const queueRemove = (qi: number) => control('queue-remove', { qi });

  const queueMove = (qi: number, toIndex: number) => control('queue-move', { qi, toIndex });

  const queueVote = async (queueItemId: number) => {
    const item = queue.find((entry) => entry.id === queueItemId);
    if (!item) return;
    try {
      const response = await api<{ votes: number; voted: boolean }>(`/api/jams/${jamId}/music/vote`, {
        method: item.voted ? 'DELETE' : 'POST',
        body: JSON.stringify({ queueItemId }),
      });
      setQueue((items) => items.map((entry) => entry.id === queueItemId ? { ...entry, votes: response.votes, voted: response.voted } : entry));
    } catch (error) {
      toast(error instanceof Error ? error.message : t('toast.unknownError'), 'error');
    }
  };

  const skipBack = () => {
    if (!song) return;
    if (desiredMs > 5000) control('seek', { position: 0 });
    else emitWhenConnected('music:ended', jamId);
  };

  const skip = () => control('skip');

  const gestureAnd = (fn: () => void) => () => {
    syncGesture();
    fn();
  };

  const togglePlay = gestureAnd(() => control(state?.playing ? 'pause' : 'play'));
  const goPrev = gestureAnd(skipBack);
  const goNext = gestureAnd(skip);

  const queueRows: QueueRow[] = (queue ?? []).map((qi) => ({
    id: qi.id,
    title: qi.song.title,
    artist: artistLabel(qi.song),
    addedBy: qi.addedBy.username,
    isNow: song?.id === qi.song.id,
    votes: qi.votes ?? 0,
    voted: !!qi.voted,
  }));
  const battleLeader = [...queue].sort((a, b) => (b.votes ?? 0) - (a.votes ?? 0))[0] ?? null;

  return (
    <div className="music-room" ref={rootRef}>
      <MusicVisualizer getFrame={getFrame} reduced={prefersReduced} enabled={show2D ? false : show3D} />
      <WaveformFallback getFrame={getFrame} enabled={show2D} />

      <div className="music-player">
        <div className="music-art">
          {song?.coverUrl ? <Image src={song.coverUrl} alt="" fill unoptimized loading="lazy" /> : <Mic2 size={26} />}
        </div>
        <div className="music-main">
          <div className="music-now-title">{song?.title ?? t('music.nothingPlaying')}</div>
          <div className="music-now-artist">{song ? artistLabel(song) : t('music.pickTopHint')}</div>
          <div className="music-progress">
            <span className={canControl ? 'music-time' : 'music-time muted'}>{fmtTime(desiredMs)}</span>
            <div className="music-track">
              <div className="music-track-fill" style={{ width: `${pct}%` }} />
              <div className="music-seek-thumb" style={{ insetInlineStart: `${pct}%` }} />
              {canControl && (
                <div
                  className="music-seek"
                  role="slider"
                  tabIndex={0}
                  aria-label={t('music.seek')}
                  aria-valuemin={0}
                  aria-valuemax={durationMs}
                  aria-valuenow={desiredMs}
                  onPointerDown={onSeekPointerDown}
                  onPointerMove={onSeekPointerMove}
                  onPointerUp={onSeekPointerUp}
                  onPointerCancel={onSeekPointerUp}
                  onKeyDown={(e) => {
                    const step = Math.max(1000, durationMs / 100);
                    if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
                      e.preventDefault();
                      queueSeek(desiredMs - step);
                    } else if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
                      e.preventDefault();
                      queueSeek(desiredMs + step);
                    } else if (e.key === 'Home') {
                      e.preventDefault();
                      queueSeek(0);
                    } else if (e.key === 'End') {
                      e.preventDefault();
                      queueSeek(durationMs);
                    }
                  }}
                  onBlur={finishSeek}
                />
              )}
            </div>
            <span className="music-time">{fmtTime(durationSec * 1000)}</span>
          </div>
        </div>
        <div className="music-ctrl">
          <Magnetic className="btn-icon" onClick={goPrev} title={t('music.back')} disabled={!canControl}>
            <RotateCcw size={16} />
          </Magnetic>
          <Magnetic className="btn-icon music-playbtn" onClick={togglePlay} title={t(state?.playing ? 'music.pause' : 'music.play')}>
            {state?.playing ? <Pause size={18} /> : <Play size={18} />}
          </Magnetic>
          <Magnetic className="btn-icon" onClick={goNext} title={t('music.skip')} disabled={!canControl}>
            <SkipForward size={18} />
          </Magnetic>
        </div>
        {song?.explicit && <span className="badge-explicit" title="Explicit">E</span>}
        {song?.featured && (
          <span className="badge-featured" title={t('music.featured')}>
            <Star size={12} />
          </span>
        )}
      </div>

      <div className="music-volume-row">
        <button type="button" className="btn-icon" onClick={() => setMuted((m) => !m)} title={t('music.mute')}>
          {muted || volume === 0 ? <VolumeX size={15} /> : <Volume2 size={15} />}
        </button>
        <input
          className="music-vol"
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={muted ? 0 : volume}
          onChange={(e) => {
            setVolume(Number(e.target.value));
            if (Number(e.target.value) > 0 && muted) setMuted(false);
          }}
          title={t('music.volume')}
        />
      </div>

      {queue.length > 1 && <div className="music-battle-card"><span className="music-battle-icon"><Swords size={16} /></span><span><b>Music Battle</b><small>{battleLeader ? `${battleLeader.song.title} leads with ${battleLeader.votes ?? 0} votes` : 'Vote for the next track in the queue'}</small></span><Trophy size={15} /></div>}

      <div className="music-actions-row">
        <button type="button" className={`btn btn-ghost pill-sm ${favorite ? 'active' : ''}`} onClick={toggleFavorite} disabled={!song} title={t('music.favorite') ?? 'Favorite'}>
          <Heart size={14} fill={favorite ? 'currentColor' : 'none'} />
        </button>
        <button type="button" className={`btn btn-ghost pill-sm ${activePanel === 'lyrics' ? 'active' : ''}`} onClick={() => setActivePanel((p) => p === 'lyrics' ? null : 'lyrics')} disabled={!song?.lyrics && !song?.lrc}>
          <Mic2 size={14} /> {t('music.lyrics')}
        </button>
        <button type="button" className={`btn btn-ghost pill-sm ${activePanel === 'queue' ? 'active' : ''}`} onClick={() => setActivePanel((p) => p === 'queue' ? null : 'queue')}>
          <ListMusic size={14} /> {t('music.queue')} {queue.length > 0 && <b className="music-queue-count">{queue.length}</b>}
        </button>
        {canControl && (
          <button
            type="button"
            className="btn btn-violet pill-sm"
            onClick={() => {
              setActivePanel((p) => p === 'add' ? null : 'add');
            }}
          >
            <Plus size={14} /> {t('music.addSong')}
          </button>
        )}
      </div>

      {activePanel && (
        <div className="music-modal-backdrop" style={{ backdropFilter: 'blur(24px) saturate(1.2)', WebkitBackdropFilter: 'blur(24px) saturate(1.2)' }} onMouseDown={() => setActivePanel(null)}>
          <div className="music-modal" onMouseDown={(e) => e.stopPropagation()}>
            <div className="music-modal-head">
              <div className="music-modal-title">
                {activePanel === 'lyrics' ? <Mic2 size={17} /> : activePanel === 'queue' ? <ListMusic size={17} /> : <Plus size={17} />}
                {activePanel === 'lyrics' ? t('music.lyrics') : activePanel === 'queue' ? t('music.queue') : t('music.addSong')}
              </div>
              <button type="button" className="btn-icon" onClick={() => setActivePanel(null)} title={t('modal.close')}>×</button>
            </div>
            <div className="music-modal-grid">
              <section className="music-modal-main">
                {activePanel === 'lyrics' && song && (song.lyrics || song.lrc) && (
                  <div ref={lyricsBoxRef} className="music-lyrics-wrap music-modal-scroll">
                    <SyncedLyrics lines={lrcLines} hasWordTiming={hasWordTiming} plainLyrics={plainLyrics} active={active} />
                  </div>
                )}
                {activePanel === 'queue' && (
                  <QueueList
                    rows={queueRows}
                    canControl={canControl}
                    onMove={queueMove}
                    onRemove={queueRemove}
                    onVote={queueVote}
                    emptyText={t('music.queueEmpty')}
                    hintText={t('music.queueHint')}
                  />
                )}
                {activePanel === 'add' && (
                  <div className="music-add">
          <form className="music-playlist-create" onSubmit={createPlaylist}>
            <input value={playlistName} onChange={(event) => setPlaylistName(event.target.value)} placeholder="New playlist name" maxLength={80} />
            <button type="submit" className="btn btn-ghost pill-sm">Create</button>
          </form>
          {playlists.length > 0 && <div className="music-playlists-strip">{playlists.map((playlist) => <span className="music-playlist-chip" key={playlist.id}>{playlist.name}</span>)}</div>}
          <form
            className="music-search"
            onSubmit={(e) => {
              e.preventDefault();
              doSearch();
            }}
          >
            <Search size={14} />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('music.searchSongs')} autoFocus />
            <button type="submit" className="btn btn-violet pill-sm" disabled={searching}>
              {t('admin.search')}
            </button>
          </form>
          <div className="music-results">
            {results && results.songs.length === 0 && <div className="empty-state" style={{ padding: 16 }}>{t('music.noResults')}</div>}
            {results?.songs.map((s) => (
              <div className="music-result" key={s.id}>
                <div className="music-result-art">{s.coverUrl ? <Image src={s.coverUrl} alt="" fill unoptimized loading="lazy" /> : <Mic2 size={14} />}</div>
                <div className="music-result-info">
                  <b>{s.title}</b>
                  <span>{artistLabel(s)}</span>
                </div>
                <span className="music-result-dur">{fmtTime(s.durationSec * 1000)}</span>
                <button type="button" className="btn btn-ghost pill-sm" onClick={() => queueAdd(s.id)}>
                  <Plus size={13} /> {t('music.queueAdd')}
                </button>
                {playlists.length > 0 && <select className="music-playlist-select" defaultValue="" onChange={(event) => { if (event.target.value) addToPlaylist(Number(event.target.value), s.id); event.currentTarget.value = ''; }} aria-label="Add to playlist">
                  <option value="">Playlist</option>
                  {playlists.map((playlist) => <option key={playlist.id} value={playlist.id}>{playlist.name}</option>)}
                </select>}
              </div>
            ))}
            {searching && <div className="empty-state" style={{ padding: 16 }}>{t('admin.loading')}</div>}
                  </div>
                  </div>
                )}
              </section>
              {chatSlot && <aside className="music-modal-chat">{chatSlot}</aside>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
