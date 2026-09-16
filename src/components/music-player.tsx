'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslations } from '@/providers/use-translations';
import { api } from '@/lib/client-api';
import { emitLive, onLive, liveConnected } from '@/lib/live';
import { toast } from '@/components/toast';
import {
  Play,
  Pause,
  SkipForward,
  ListMusic,
  Mic2,
  Plus,
  X,
  Search,
  Star,
  Trash2,
  Clock3,
} from 'lucide-react';

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
  song: MusicSong;
  addedBy: { id: number; username: string };
  createdAt: string;
}

interface SearchResult {
  songs: MusicSong[];
  artists: { id: number; name: string; coverUrl: string | null }[];
  albums: { id: number; title: string; artist: string; coverUrl: string | null }[];
}

function fmtTime(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, '0')}`;
}

function parseLrc(lrc: string): { time: number; text: string }[] {
  const out: { time: number; text: string }[] = [];
  for (const line of lrc.split('\n')) {
    const m = line.match(/\[(\d+):(\d+(?:\.\d+)?)\](.*)/);
    if (!m) continue;
    const time = Math.floor(parseInt(m[1], 10) * 60000 + parseFloat(m[2]) * 1000);
    out.push({ time, text: m[3].trim() });
  }
  return out;
}

export function artistLabel(song: MusicSong | null) {
  if (!song) return '';
  const feat = song.feat.filter((f) => f.id !== song.artist?.id).map((f) => f.name);
  const names = [...(song.artist ? [song.artist.name] : []), ...feat];
  return names.join(' ft. ');
}

export function MusicPlayer({ jamId, canOwner }: { jamId: string; canOwner: boolean }) {
  const t = useTranslations();
  const audioRef = useRef<HTMLAudioElement>(null);
  const [state, setState] = useState<MusicState | null>(null);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [showQueue, setShowQueue] = useState(false);
  const [showLyrics, setShowLyrics] = useState(false);
  const [q, setQ] = useState('');
  const [results, setResults] = useState<SearchResult | null>(null);
  const [searching, setSearching] = useState(false);
  const drill = useRef<number | null>(null);

  const canControl = !!state?.canControl || canOwner;

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
      setState({ now: d.now, playing: d.playing, positionMs: d.positionMs, atMs: d.atMs, durationSec: d.durationSec, canControl: d.canControl });
    });
    const offQueue = onLive('music:queue', (d: { jamId: string; queue: QueueItem[] }) => {
      if (d.jamId !== jamId) return;
      setQueue(d.queue);
    });
    const sync = setInterval(() => {
      if (liveConnected()) emitLive('music:sync', jamId);
      else loadState();
    }, 20000);
    return () => {
      offState();
      offQueue();
      clearInterval(sync);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jamId]);

  const song = state?.now ?? null;
  const songId = song?.id ?? null;

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (!song || !song.audioUrl) {
      audio.pause();
      audio.removeAttribute('src');
      return;
    }
    if (audio.getAttribute('src') !== song.audioUrl) {
      audio.src = song.audioUrl;
      audio.load();
      if (state?.playing) audio.play().catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [songId]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !state) return;
    const interval = setInterval(() => {
      if (!song || !audio.src) return;
      const desiredMs = state.playing ? state.positionMs + (Date.now() - state.atMs) : state.positionMs;
      const audioMs = audio.currentTime * 1000;
      if (state.playing && audio.paused) audio.play().catch(() => {});
      if (!state.playing && !audio.paused) audio.pause();
      if (Math.abs(audioMs - desiredMs) > 1800) {
        audio.currentTime = desiredMs / 1000;
      }
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

  const onEnded = useCallback(() => {
    emitLive('music:ended', jamId);
  }, [jamId]);

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

  const skip = () => control('skip');
  const lrcLines = parseLrc(song?.lrc ?? '');

  return (
    <div className="music-room">
      <audio ref={audioRef} onEnded={onEnded} preload="none" />
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
                    drill.current = window.setTimeout(() => control('seek', { position: Number(e.target.value) }), 250);
                  }}
                  disabled={!durationSec}
                />
              )}
            </div>
            <span className="music-time">{fmtTime(durationSec * 1000)}</span>
          </div>
        </div>
        <div className="music-ctrl">
          {canControl ? (
            <button type="button" className="btn-icon music-playbtn" onClick={() => (state?.playing ? control('pause') : control('play'))}>
              {state?.playing ? <Pause size={18} /> : <Play size={18} />}
            </button>
          ) : (
            <Play size={18} className="music-disabled-play" />
          )}
          {canControl && (
            <button type="button" className="btn-icon" onClick={skip} title={t('music.skip')}>
              <SkipForward size={18} />
            </button>
          )}
        </div>
        {song?.explicit && <span className="badge-explicit" title="Explicit">E</span>}
        {song?.featured && (
          <span className="badge-featured" title={t('music.featured')}>
            <Star size={12} />
          </span>
        )}
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
        <div className="music-lyrics">
          {lrcLines.length > 0 ? (
            lrcLines.map((l, i) => (
              <div key={i} className={`music-lrc-line ${l.time <= desiredMs && (i + 1 >= lrcLines.length || lrcLines[i + 1].time > desiredMs) ? 'active' : ''}`}>
                {l.text}
              </div>
            ))
          ) : (
            <pre className="music-lyrics-plain">{song.lyrics}</pre>
          )}
        </div>
      )}

      {showQueue && (
        <div className="music-queue">
          {queue.length === 0 ? (
            <div className="empty-state" style={{ padding: 20 }}>{t('music.queueEmpty')}</div>
          ) : (
            queue.map((qi) => (
              <div className="music-queue-item" key={qi.id}>
                <div className="music-queue-order">{song?.id === qi.song.id ? t('music.now') : <Clock3 size={12} />}</div>
                <div className="music-queue-info">
                  <b>{qi.song.title}</b>
                  <span>{artistLabel(qi.song)}</span>
                </div>
                <span className="music-queue-added">@{qi.addedBy.username}</span>
                {canControl && (
                  <button type="button" className="btn-icon danger" onClick={() => queueRemove(qi.id)} title={t('music.removeFromQueue')}>
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
            ))
          )}
        </div>
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
            {results?.songs.length === 0 && results?.artists.length === 0 && results?.albums.length === 0 && !searching ? null : null}
            {searching && <div className="empty-state" style={{ padding: 16 }}>{t('admin.loading')}</div>}
          </div>
        </div>
      )}
    </div>
  );
}