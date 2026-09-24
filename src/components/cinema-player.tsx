'use client';

import { useEffect, useRef, useState } from 'react';
import { Film, Pause, Play, RefreshCw, Share2, SkipBack, Sparkles, UsersRound } from 'lucide-react';
import { api } from '@/lib/client-api';
import { toast } from '@/components/toast';
import { useTranslations } from '@/providers/use-translations';
import { connectLive, emitLive, emitWhenConnected, liveConnected, onLive } from '@/lib/live';

interface CinemaItem {
  id: number;
  title: string;
  description: string;
  kind: string;
  externalUrl: string | null;
  thumbnailUrl: string | null;
  subtitlesUrl: string | null;
  durationSec: number;
}

interface CinemaState {
  now: CinemaItem | null;
  playing: boolean;
  positionMs: number;
  atMs: number;
  durationSec: number;
  canControl: boolean;
}

export function CinemaPlayer({ jamId, chatSlot }: { jamId: string; chatSlot?: React.ReactNode }) {
  const t = useTranslations();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [items, setItems] = useState<CinemaItem[]>([]);
  const [state, setState] = useState<CinemaState>({ now: null, playing: false, positionMs: 0, atMs: Date.now(), durationSec: 0, canControl: false });
  const [selectedId, setSelectedId] = useState('');
  const [busy, setBusy] = useState(false);
  const [mediaError, setMediaError] = useState(false);
  const [playBlocked, setPlayBlocked] = useState(false);

  useEffect(() => {
    api<{ items: CinemaItem[] }>('/api/cinema?kind=ALL').then((data) => setItems(data.items)).catch(() => setItems([]));
    api<{ state: CinemaState }>(`/api/jams/${jamId}/cinema`).then((data) => {
      setState(data.state);
      setSelectedId(data.state.now ? String(data.state.now.id) : '');
    }).catch(() => {});
    const socket = connectLive();
    emitWhenConnected('jam:join', jamId);
    emitWhenConnected('cinema:sync', jamId);
    const off = onLive('cinema:state', (data: { jamId: string } & CinemaState) => {
      if (data.jamId !== jamId) return;
      setState(data);
      setSelectedId(data.now ? String(data.now.id) : '');
    });
    return () => {
      off();
      emitLive('cinema:sync', '');
      socket?.off('cinema:state');
    };
  }, [jamId]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (!state.now?.externalUrl) {
      setMediaError(false);
      setPlayBlocked(false);
      return;
    }
    const source = state.now.externalUrl;
    if (video.src !== new URL(source, window.location.origin).href) {
      setMediaError(false);
      setPlayBlocked(false);
      video.src = source;
      video.load();
    }
    const sync = () => {
      const target = Math.max(0, state.positionMs / 1000);
      if (Math.abs(video.currentTime - target) > 1.2) video.currentTime = target;
      if (state.playing) video.play().then(() => setPlayBlocked(false)).catch(() => setPlayBlocked(true));
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
        const nextId = Number(extra.videoId ?? selectedId);
        if (!Number.isInteger(nextId) || nextId <= 0) return;
        if (liveConnected()) emitLive('cinema:control', { jamId, action, videoId: nextId, position: 0 });
        else {
          const data = await api<{ state: CinemaState }>(`/api/jams/${jamId}/cinema`, { method: 'PATCH', body: JSON.stringify({ action, videoId: nextId, position: 0 }) });
          setState(data.state);
        }
      } else {
        if (liveConnected()) emitLive('cinema:control', { jamId, action, ...extra });
        else {
          const data = await api<{ state: CinemaState }>(`/api/jams/${jamId}/cinema`, { method: 'PATCH', body: JSON.stringify({ action, ...extra }) });
          setState(data.state);
        }
      }
    } catch (error) {
      toast(error instanceof Error ? error.message : t('cinema.syncError'), 'error');
    } finally {
      setBusy(false);
    }
  };

  const selected = items.find((item) => String(item.id) === selectedId) ?? state.now;

  const shareParty = async () => {
    await navigator.clipboard.writeText(`${window.location.origin}/join/${jamId}`).catch(() => {});
    toast(t('cinema.linkCopied'), 'ok');
  };

  const sendPartyReaction = async (emoji: string) => {
    await api(`/api/jams/${jamId}/messages`, { method: 'POST', body: JSON.stringify({ text: `${emoji} ${t('cinema.reaction')}` }) }).catch(() => {});
  };

  const retryPlayback = () => {
    const video = videoRef.current;
    if (!video) return;
    if (mediaError) video.load();
    video.play().then(() => { setMediaError(false); setPlayBlocked(false); }).catch(() => setPlayBlocked(true));
  };

  const kindLabel = (kind: string) => (kind === 'MOVIE' ? t('cinema.movie') : t('cinema.seriesBadge'));

  return (
    <div className="cinema-room-player">
      <div className="room-col-title">
        <Film size={14} /> {t('cinema.sync')}
      </div>
      <div className="cinema-party-bar">
        <div>
          <span className="cinema-party-kicker">
            <Sparkles size={12} /> {t('cinema.partyKicker')}
          </span>
          <b>
            <UsersRound size={13} /> {t('cinema.partyTagline')}
          </b>
        </div>
        <div className="cinema-party-actions">
          <button type="button" className="btn-icon" onClick={shareParty} title={t('cinema.shareParty')}><Share2 size={14} /></button>
          <button type="button" onClick={() => void sendPartyReaction('🔥')}>🔥</button>
          <button type="button" onClick={() => void sendPartyReaction('😂')}>😂</button>
          <button type="button" onClick={() => void sendPartyReaction('👏')}>👏</button>
        </div>
      </div>
      {items.length === 0 ? (
        <div className="cinema-room-empty">
          <Film size={20} />
          <span>{t('cinema.emptyCatalogue')}</span>
        </div>
      ) : (
        <>
          <div className="cinema-room-select">
            <select value={selectedId} onChange={(event) => setSelectedId(event.target.value)} disabled={!state.canControl}>
              <option value="">{t('cinema.choose')}</option>
              {items.map((item) => (
                <option key={item.id} value={item.id}>{item.title} · {kindLabel(item.kind)}</option>
              ))}
            </select>
            <button
              type="button"
              className="btn-icon violet"
              disabled={!state.canControl || !selectedId || busy}
              onClick={() => void control('load', { videoId: Number(selectedId) })}
              title={t('cinema.load')}
            >
              <RefreshCw size={15} />
            </button>
          </div>
          <div className="cinema-room-video-wrap">
            <video ref={videoRef} poster={state.now?.thumbnailUrl || undefined} playsInline preload="metadata" onPlaying={() => { setMediaError(false); setPlayBlocked(false); }} onError={() => setMediaError(true)} onEnded={() => void control('ended')} />
            {(mediaError || playBlocked) && <div className="watch-party-media-notice" role={mediaError ? 'alert' : 'status'}><span>{mediaError ? t('cinema.mediaError') : t('cinema.tapToResume')}</span><button type="button" onClick={retryPlayback}>{mediaError ? t('cinema.retryPlayback') : t('cinema.play')}</button></div>}
            {!state.now && (
              <div className="cinema-room-video-empty">
                <Film size={26} />
                <span>{t('cinema.selectToStart')}</span>
              </div>
            )}
          </div>
          <div className="cinema-room-controls">
            <button type="button" className="btn-icon" disabled={!state.canControl || !state.now} onClick={() => void control('seek', { position: 0 })} title={t('cinema.restart')}>
              <SkipBack size={15} />
            </button>
            <button type="button" className="btn btn-violet pill-sm" disabled={!state.canControl || !state.now} onClick={() => void control(state.playing ? 'pause' : 'resume')}>
              {state.playing ? <Pause size={14} /> : <Play size={14} />} {state.playing ? t('cinema.pause') : t('cinema.play')}
            </button>
            <span>{state.now?.title || t('cinema.waiting')}</span>
          </div>
        </>
      )}
      {chatSlot}
    </div>
  );
}
