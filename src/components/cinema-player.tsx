'use client';

import { useEffect, useRef, useState } from 'react';
import { Film, Pause, Play, RefreshCw, SkipBack } from 'lucide-react';
import { api } from '@/lib/client-api';
import { toast } from '@/components/toast';
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
  const videoRef = useRef<HTMLVideoElement>(null);
  const [items, setItems] = useState<CinemaItem[]>([]);
  const [state, setState] = useState<CinemaState>({ now: null, playing: false, positionMs: 0, atMs: Date.now(), durationSec: 0, canControl: false });
  const [selectedId, setSelectedId] = useState('');
  const [busy, setBusy] = useState(false);

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
      toast(error instanceof Error ? error.message : 'Could not sync the cinema player.', 'error');
    } finally {
      setBusy(false);
    }
  };

  const selected = items.find((item) => String(item.id) === selectedId) ?? state.now;

  return (
    <div className="cinema-room-player">
      <div className="room-col-title"><Film size={14} /> Cinema sync</div>
      {items.length === 0 ? <div className="cinema-room-empty"><Film size={20} /><span>No Cinema Hub titles are available yet.</span></div> : <>
        <div className="cinema-room-select"><select value={selectedId} onChange={(event) => setSelectedId(event.target.value)} disabled={!state.canControl}><option value="">Choose from Cinema Hub</option>{items.map((item) => <option key={item.id} value={item.id}>{item.title} · {item.kind}</option>)}</select><button type="button" className="btn-icon violet" disabled={!state.canControl || !selectedId || busy} onClick={() => void control('load', { videoId: Number(selectedId) })} title="Load title"><RefreshCw size={15} /></button></div>
        <div className="cinema-room-video-wrap"><video ref={videoRef} poster={state.now?.thumbnailUrl || undefined} playsInline preload="metadata" onEnded={() => void control('ended')} />{!state.now && <div className="cinema-room-video-empty"><Film size={26} /><span>Select a Cinema Hub title to start.</span></div>}</div>
        <div className="cinema-room-controls"><button type="button" className="btn-icon" disabled={!state.canControl || !state.now} onClick={() => void control('seek', { position: 0 })} title="Restart"><SkipBack size={15} /></button><button type="button" className="btn btn-violet pill-sm" disabled={!state.canControl || !state.now} onClick={() => void control(state.playing ? 'pause' : 'resume')} >{state.playing ? <Pause size={14} /> : <Play size={14} />} {state.playing ? 'Pause' : 'Play'}</button><span>{state.now?.title || 'Waiting for a title'}</span></div>
      </>}
      {chatSlot}
    </div>
  );
}
