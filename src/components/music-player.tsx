'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
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
  Volume2,
  VolumeX,
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
}

interface SearchResult {
  songs: MusicSong[];
  artists: { id: number; name: string; coverUrl: string | null }[];
  albums: { id: number; title: string; artist: string; coverUrl: string | null }[];
}

const AUDIO_FORMAT = ['mp3'];

function fmtTime(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, '0')}`;
}

export function artistLabel(song: MusicSong | null) {
  if (!song) return '';
  const feat = song.feat.filter((f) => f.id !== song.artist?.id).map((f) => f.name);
  const names = [...(song.artist ? [song.artist.name] : []), ...feat];
  return names.join(' ft. ');
}

export function MusicPlayer({ jamId, canOwner, miniHost }: { jamId: string; canOwner: boolean; miniHost?: boolean }) {
  const t = useTranslations();
  const rootRef = useRef<HTMLDivElement>(null);
  const lyricsBoxRef = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<MusicState | null>(null);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [showQueue, setShowQueue] = useState(false);
  const [showLyrics, setShowLyrics] = useState(false);
  const [q, setQ] = useState('');
  const [results, setResults] = useState<SearchResult | null>(null);
  const [searching, setSearching] = useState(false);
  const [active, setActive] = useState<LyricActive | null>(null);
  const [volume, setVolume] = useState(0.8);
  const [muted, setMuted] = useState(false);
  const [prefersReduced, setPrefersReduced] = useState(false);
  const [isDesktop, setIsDesktop] = useState(true);
  const [hasWebGL, setHasWebGL] = useState<boolean | null>(null);
  const drill = useRef<number | null>(null);

  const howlRef = useRef<Howl | null>(null);
  const wantPlayRef = useRef(false);
  const volumeRef = useRef(0.8);
  const mutedRef = useRef(false);
  const seekOnLoadRef = useRef(0);
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
      offUpdate();
      clearInterval(sync);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jamId]);

  const song = state?.now ?? null;
  const songId = song?.id ?? null;
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- Shared rAF loop: analysis + beat + lyrics + imperative frame ref ---
  const onTick = useCallback(
    (frame: AudioFrame) => {
      frameRef.current = frame;

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
    [lrcLines]
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

  const desiredMs = useMemo(() => {
    if (!state || !song) return 0;
    return state.playing ? state.positionMs + (Date.now() - state.atMs) : state.positionMs;
  }, [state, song]);

  const durationSec = song?.durationSec || state?.durationSec || 0;
  const pct = durationSec ? Math.min(100, (desiredMs / (durationSec * 1000)) * 100) : 0;

  const control = useCallback(
    (action: string, extra?: Record<string, unknown>) => {
      emitLive('music:control', { jamId, action, ...extra });
    },
    [jamId]
  );

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

  const queueRemove = (qi: number) => control('queue-remove', { qi });

  const queueMove = (qi: number, toIndex: number) => control('queue-move', { qi, toIndex });

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
  }));

  return (
    <div className="music-room" ref={rootRef}>
      <MusicVisualizer getFrame={getFrame} reduced={prefersReduced} enabled={show2D ? false : show3D} />
      <WaveformFallback getFrame={getFrame} enabled={show2D} />

      <div className="music-player">
        <div className="music-art">
          {song?.coverUrl ? <img src={song.coverUrl} alt="" loading="lazy" /> : <Mic2 size={26} />}
        </div>
        <div className="music-main">
          <div className="music-now-title">{song?.title ?? t('music.nothingPlaying')}</div>
          <div className="music-now-artist">{song ? artistLabel(song) : t('music.pickTopHint')}</div>
          <div className="music-progress">
            <span className={canControl ? 'music-time' : 'music-time muted'}>{fmtTime(desiredMs)}</span>
            <div className="music-track">
              <div className="music-track-fill" style={{ width: `${pct}%` }} />
              {canControl && (
                <input
                  className="music-seek"
                  type="range"
                  min={0}
                  max={durationSec * 1000 || 0}
                  value={Math.min(desiredMs, durationSec * 1000 || 0)}
                  onChange={(e) => {
                    if (drill.current) clearTimeout(drill.current);
                    drill.current = window.setTimeout(() => control('seek', { position: Number(e.target.value) }), 200);
                  }}
                  disabled={!durationSec}
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

      <div className="music-actions-row">
        <button type="button" className={`btn btn-ghost pill-sm ${showLyrics ? 'active' : ''}`} onClick={() => setShowLyrics((v) => !v)} disabled={!song?.lyrics && !song?.lrc}>
          <Mic2 size={14} /> {t('music.lyrics')}
        </button>
        <button type="button" className={`btn btn-ghost pill-sm ${showQueue ? 'active' : ''}`} onClick={() => setShowQueue((v) => !v)}>
          <ListMusic size={14} /> {t('music.queue')} {queue.length > 0 && <b className="music-queue-count">{queue.length}</b>}
        </button>
        {canControl && (
          <button
            type="button"
            className="btn btn-violet pill-sm"
            onClick={() => {
              setShowQueue(false);
              setShowAdd((v) => !v);
            }}
          >
            <Plus size={14} /> {t('music.addSong')}
          </button>
        )}
      </div>

      {showLyrics && song && (song.lyrics || song.lrc) && (
        <div ref={lyricsBoxRef} className="music-lyrics-wrap">
          <SyncedLyrics lines={lrcLines} hasWordTiming={hasWordTiming} plainLyrics={plainLyrics} active={active} />
        </div>
      )}

      {showQueue && (
        <QueueList
          rows={queueRows}
          canControl={canControl}
          onMove={queueMove}
          onRemove={queueRemove}
          emptyText={t('music.queueEmpty')}
          hintText={t('music.queueHint')}
        />
      )}

      {showAdd && (
        <div className="music-add">
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
                <div className="music-result-art">{s.coverUrl ? <img src={s.coverUrl} alt="" loading="lazy" /> : <Mic2 size={14} />}</div>
                <div className="music-result-info">
                  <b>{s.title}</b>
                  <span>{artistLabel(s)}</span>
                </div>
                <span className="music-result-dur">{fmtTime(s.durationSec * 1000)}</span>
                <button type="button" className="btn btn-ghost pill-sm" onClick={() => queueAdd(s.id)}>
                  <Plus size={13} /> {t('music.queueAdd')}
                </button>
              </div>
            ))}
            {searching && <div className="empty-state" style={{ padding: 16 }}>{t('admin.loading')}</div>}
          </div>
        </div>
      )}
    </div>
  );
}