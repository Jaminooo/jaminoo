'use client';

import { useEffect, useRef, useState } from 'react';
import { Film, Pause, Play, RefreshCw, Share2, SkipBack, Sparkles, UsersRound, Tv } from 'lucide-react';
import { api } from '@/lib/client-api';
import { toast } from '@/components/toast';
import { connectLive, emitLive, emitWhenConnected, liveConnected, onLive } from '@/lib/live';

export interface AnimeEpisodeItem {
  id: number;
  animeId: number;
  title: string;
  number: number;
  slug: string;
  externalUrl: string | null;
  thumbnailUrl: string | null;
  subtitlesUrl: string | null;
  durationSec: number;
  animeTitle?: string;
}

interface AnimeState {
  now: AnimeEpisodeItem | null;
  playing: boolean;
  positionMs: number;
  atMs: number;
  durationSec: number;
  canControl: boolean;
}

function episodeLabel(e: AnimeEpisodeItem) {
  const pad = (n: number) => String(e.number).padStart(2, '0');
  return `${e.animeTitle || 'Anime'} · ${pad(e.number)}${e.title ? ` — ${e.title}` : ''}`;
}

export function AnimePlayer({ jamId, chatSlot }: { jamId: string; chatSlot?: React.ReactNode }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [items, setItems] = useState<AnimeEpisodeItem[]>([]);
  const [state, setState] = useState<AnimeState>({
    now: null,
    playing: false,
    positionMs: 0,
    atMs: Date.now(),
    durationSec: 0,
    canControl: false,
  });
  const [selectedId, setSelectedId] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api<{ items: AnimeEpisodeItem[] }>('/api/anime/episodes')
      .then((data) => setItems(data.items))
      .catch(() => setItems([]));
    api<{ state: AnimeState }>(`/api/jams/${jamId}/anime`)
      .then((data) => {
        setState(data.state);
        setSelectedId(data.state.now ? String(data.state.now.id) : '');
      })
      .catch(() => {});
    const socket = connectLive();
    emitWhenConnected('jam:join', jamId);
    emitWhenConnected('anime:sync', jamId);
    const off = onLive('anime:state', (data: { jamId: string } & AnimeState) => {
      if (data.jamId !== jamId) return;
      setState(data);
      setSelectedId(data.now ? String(data.now.id) : '');
    });
    return () => {
      off();
      emitLive('anime:sync', '');
      socket?.off('anime:state');
    };
  }, [jamId]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !state.now?.externalUrl) return;
    const source = state.now.externalUrl;
    if (video.src !== new URL(source, window.location.origin).href) {
      video.src = source;
      video.load();
    }
    const sync = () => {
      const target = Math.max(0, state.positionMs / 1000);
      if (Math.abs(video.currentTime - target) > 1.2) video.currentTime = target;
      if (state.playing) video.play().catch(() => {});
      else video.pause();
    };
    if (video.readyState >= 1) sync();
    else video.addEventListener('loadedmetadata', sync, { once: true });
    return () => video.removeEventListener('loadedmetadata', sync);
  }, [state.now, state.positionMs, state.playing]);

  const control = async (action: string, extra: Record<string, unknown> = {}) => {
    if (!state.canControl || busy) return;
    setBusy(true);
    try {
      if (action === 'load' || action === 'play') {
        const nextId = Number(extra.episodeId ?? selectedId);
        if (!Number.isInteger(nextId) || nextId <= 0) return;
        if (liveConnected()) emitLive('anime:control', { jamId, action, episodeId: nextId, position: 0 });
        else {
          const data = await api<{ state: AnimeState }>(`/api/jams/${jamId}/anime`, {
            method: 'PATCH',
            body: JSON.stringify({ action, episodeId: nextId, position: 0 }),
          });
          setState(data.state);
        }
      } else {
        if (liveConnected()) emitLive('anime:control', { jamId, action, ...extra });
        else {
          const data = await api<{ state: AnimeState }>(`/api/jams/${jamId}/anime`, {
            method: 'PATCH',
            body: JSON.stringify({ action, ...extra }),
          });
          setState(data.state);
        }
      }
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Could not sync the anime playback.', 'error');
    } finally {
      setBusy(false);
    }
  };

const shareParty = async () => {
  await navigator.clipboard.writeText(`${window.location.origin}/join/${jamId}`).catch(() => {});
  toast('Anime Party link copied.', 'ok');
};

const sendPartyReaction = async (emoji: string) => {
  await api(`/api/jams/${jamId}/messages`, { method: 'POST', body: JSON.stringify({ text: `${emoji} Anime Party reaction` }) }).catch(() => {});
};

const selected = items.find((item) => String(item.id) === selectedId) ?? state.now;

  return (
    <div className="anime-room-player">
      <div className="room-col-title">
        <Tv size={14} /> Anime sync
      </div>
      <div className="anime-party-bar">
        <div>
          <span className="anime-party-kicker">
            <Sparkles size={12} /> ANIME PARTY
          </span>
          <b>
            <UsersRound size={13} /> Watch together, react together
          </b>
        </div>
        <div className="anime-party-actions">
          <button type="button" className="btn-icon" onClick={shareParty} title="Share party">
            <Share2 size={14} />
          </button>
          <button type="button" onClick={() => void sendPartyReaction('🔥')}>🔥</button>
          <button type="button" onClick={() => void sendPartyReaction('😂')}>😂</button>
          <button type="button" onClick={() => void sendPartyReaction('👏')}>👏</button>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="anime-room-empty">
          <Film size={20} />
          <span>No anime episodes are available yet.</span>
        </div>
      ) : (
        <>
          <div className="anime-room-select">
            <select value={selectedId} onChange={(e) => setSelectedId(e.target.value)} disabled={!state.canControl}>
              <option value="">Choose an episode</option>
              {items.map((item) => (
                <option key={item.id} value={item.id}>
                  {episodeLabel(item)}
                </option>
              ))}
            </select>
            <button
              className="btn-icon violet"
              disabled={!state.canControl || !selectedId || busy}
              onClick={() => void control('load', { episodeId: Number(selectedId) })}
              title="Load episode"
            >
              <RefreshCw size={15} />
            </button>
          </div>
          <div className="anime-room-video-wrap">
            <video ref={videoRef} poster={state.now?.thumbnailUrl || undefined} playsInline preload="metadata" onEnded={() => void control('ended')} />
            {!state.now && (
              <div className="anime-room-video-empty">
                <Film size={26} />
                <span>Select an anime episode to start.</span>
              </div>
            )}
          </div>
          <div className="anime-room-controls">
            <button type="button" className="btn-icon" disabled={!state.canControl || !state.now} onClick={() => void control('seek', { position: 0 })} title="Restart">
              <SkipBack size={15} />
            </button>
            <button type="button" className="btn btn-violet pill-sm" disabled={!state.canControl || !state.now} onClick={() => void control(state.playing ? 'pause' : 'resume')}>
              {state.playing ? <Pause size={14} /> : <Play size={14} />} {state.playing ? 'Pause' : 'Play'}
            </button>
            <span>{state.now?.title || 'Waiting for an episode'}</span>
          </div>
        </>
      )}
      {chatSlot}
    </div>
  );
}
