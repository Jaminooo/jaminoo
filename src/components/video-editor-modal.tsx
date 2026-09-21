'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import { Loader2, Music, Music2, Pause, Play, Redo2, Repeat, RotateCcw, Scissors, Sparkles, Type, Undo2, UploadCloud, Volume2, VolumeX, X } from 'lucide-react';
import { useTranslations } from '@/providers/use-translations';

interface VideoEditorModalProps {
  file: File | null;
  open: boolean;
  onClose: () => void;
  onSaved: (file: File) => void;
}

interface VideoEditorWorkspaceProps {
  file: File;
  onRenderDone: (file: File) => void;
  renderDoneCopy?: string;
  renderHelperCopy?: string;
}

type FilterId = 'none' | 'punch' | 'warm' | 'cool' | 'mono' | 'fade';
type AspectPreset = 'original' | '16:9' | '9:16' | '1:1';
type QualityPreset = 'original' | 'q1080' | 'q720';

const FILTERS: { id: FilterId; css: string }[] = [
  { id: 'none', css: 'none' },
  { id: 'punch', css: 'contrast(1.18) saturate(1.35) brightness(1.02)' },
  { id: 'warm', css: 'sepia(0.28) saturate(1.18) brightness(1.05)' },
  { id: 'cool', css: 'hue-rotate(185deg) saturate(0.9) brightness(1.03)' },
  { id: 'mono', css: 'grayscale(1) contrast(1.08)' },
  { id: 'fade', css: 'contrast(0.9) brightness(1.08) saturate(0.72)' },
];

const ASPECTS: { id: AspectPreset; ratio: string }[] = [
  { id: 'original', ratio: 'auto' },
  { id: '16:9', ratio: '16 / 9' },
  { id: '9:16', ratio: '9 / 16' },
  { id: '1:1', ratio: '1 / 1' },
];

const QUALITIES: { id: QualityPreset; long: number }[] = [
  { id: 'original', long: 0 },
  { id: 'q1080', long: 1080 },
  { id: 'q720', long: 720 },
];

interface MusicTrack {
  file: File | null;
  name: string;
}

interface EditSnapshot {
  trimStart: number;
  trimEnd: number;
  music: MusicTrack | null;
  musicVol: number;
  videoVol: number;
  filter: FilterId;
  aspect: AspectPreset;
  quality: QualityPreset;
  textOverlay: string;
  textOn: boolean;
}

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) seconds = 0;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const pad = (n: number) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

function drawTextLayer(ctx: CanvasRenderingContext2D, w: number, h: number, text: string) {
  const fontPx = Math.max(16, Math.round(w * 0.042));
  ctx.font = `700 ${fontPx}px Inter, system-ui, -apple-system, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const padX = fontPx * 0.75;
  const padY = fontPx * 0.45;
  const tw = ctx.measureText(text).width;
  const bw = tw + padX * 2;
  const bh = fontPx + padY * 2;
  const r = bh / 2;
  const bx = (w - bw) / 2;
  const by = h - fontPx - fontPx * 1.5;
  ctx.beginPath();
  ctx.moveTo(bx + r, by - bh / 2);
  ctx.arcTo(bx + bw, by - bh / 2, bx + bw, by - bh / 2 + r, r);
  ctx.lineTo(bx + bw, by + bh / 2 - r);
  ctx.arcTo(bx + bw, by + bh / 2, bx + bw - r, by + bh / 2, r);
  ctx.lineTo(bx + r, by + bh / 2);
  ctx.arcTo(bx, by + bh / 2, bx, by + bh / 2 - r, r);
  ctx.lineTo(bx, by - bh / 2 + r);
  ctx.arcTo(bx, by - bh / 2, bx + r, by - bh / 2, r);
  ctx.closePath();
  ctx.fillStyle = 'rgba(0, 0, 0, 0.52)';
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.fillText(text, w / 2, by);
}

function VolumeSlider({ label, value, onChange, onBegin }: { label: string; value: number; onChange: (value: number) => void; onBegin?: () => void }) {
  const sliderRef = useRef<HTMLDivElement>(null);
  const apply = (clientX: number) => {
    const el = sliderRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    if (rect.width <= 0) return;
    onChange(Math.max(0, Math.min(1, (clientX - rect.left) / rect.width)));
  };
  return (
    <div className="video-editor-vol">
      <div className="video-editor-vol-head"><b>{label}</b><output>{Math.round(value * 100)}%</output></div>
      <div
        ref={sliderRef}
        className="video-editor-slider"
        onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); e.currentTarget.classList.add('grabbing'); onBegin?.(); apply(e.clientX); e.preventDefault(); }}
        onPointerMove={(e) => { if (e.currentTarget.hasPointerCapture(e.pointerId)) apply(e.clientX); }}
        onPointerUp={(e) => e.currentTarget.classList.remove('grabbing')}
        onPointerCancel={(e) => e.currentTarget.classList.remove('grabbing')}
      >
        <div className="video-editor-track"><span className="video-editor-progress" style={{ width: `${value * 100}%` }} /></div>
        <span className="video-editor-thumb" style={{ ['--video-editor-thumb' as string]: `${value * 100}%` }} />
      </div>
    </div>
  );
}

export function VideoEditorWorkspace({ file, onRenderDone, renderDoneCopy, renderHelperCopy }: VideoEditorWorkspaceProps) {
  const t = useTranslations();
  const previewRef = useRef<HTMLVideoElement>(null);
  const filmstripRef = useRef<HTMLDivElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  const handleLRef = useRef<HTMLDivElement>(null);
  const handleRRef = useRef<HTMLDivElement>(null);
  const sliderRef = useRef<HTMLDivElement>(null);
  const videoUrlRef = useRef('');
  const musicUrlRef = useRef('');
  const cancelRef = useRef(false);

  const [videoUrl, setVideoUrl] = useState('');
  const [ready, setReady] = useState(false);
  const [duration, setDuration] = useState(0);
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(0);
  const [current, setCurrent] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [loop, setLoop] = useState(true);
  const [music, setMusic] = useState<{ url: string; name: string; file: File | null } | null>(null);
  const [musicVol, setMusicVol] = useState(1);
  const [videoVol, setVideoVol] = useState(1);
  const [filter, setFilter] = useState<FilterId>('none');
  const [aspect, setAspect] = useState<AspectPreset>('original');
  const [quality, setQuality] = useState<QualityPreset>('original');
  const [textOverlay, setTextOverlay] = useState('');
  const [textOn, setTextOn] = useState(false);
  const [rendering, setRendering] = useState(false);
  const [renderProgress, setRenderProgress] = useState(0);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  const [hist, setHist] = useState<EditSnapshot[]>([]);
  const [hi, setHi] = useState(-1);

  const stateRef = useRef({ trimStart: 0, trimEnd: 0, loop: true, duration: 0 });
  useEffect(() => {
    stateRef.current.trimStart = trimStart;
    stateRef.current.trimEnd = trimEnd;
    stateRef.current.loop = loop;
    stateRef.current.duration = duration;
  }, [trimStart, trimEnd, loop, duration]);

  const supported = useMemo(() => typeof window !== 'undefined' && typeof MediaRecorder !== 'undefined' && typeof (HTMLCanvasElement.prototype as HTMLCanvasElement).captureStream === 'function', []);

  useEffect(() => {
    const url = URL.createObjectURL(file);
    if (videoUrlRef.current) URL.revokeObjectURL(videoUrlRef.current);
    videoUrlRef.current = url;
    if (musicUrlRef.current) { URL.revokeObjectURL(musicUrlRef.current); musicUrlRef.current = ''; }
    setVideoUrl(url);
    setMusic(null);
    setReady(false);
    setDuration(0);
    setTrimStart(0);
    setTrimEnd(0);
    setCurrent(0);
    setPlaying(false);
    setMuted(false);
    setLoop(true);
    setMusicVol(1);
    setVideoVol(1);
    setFilter('none');
    setAspect('original');
    setQuality('original');
    setTextOverlay('');
    setTextOn(false);
    setRendering(false);
    setRenderProgress(0);
    setDone(false);
    setError('');
    setHist([]);
    setHi(-1);
    cancelRef.current = false;
  }, [file]);

  useEffect(() => () => {
    cancelRef.current = true;
    if (videoUrlRef.current) URL.revokeObjectURL(videoUrlRef.current);
    if (musicUrlRef.current) URL.revokeObjectURL(musicUrlRef.current);
  }, []);

  useEffect(() => {
    const v = previewRef.current;
    if (!v || !videoUrl) return;
    v.src = videoUrl;
    v.load();
  }, [videoUrl]);

  useEffect(() => {
    const v = previewRef.current;
    if (!v || !videoUrl) return;
    const handle = () => {
      const d = v.duration || 0;
      setDuration(d);
      setTrimEnd(d);
      setCurrent(0);
      setReady(true);
    };
    v.addEventListener('loadedmetadata', handle);
    return () => v.removeEventListener('loadedmetadata', handle);
  }, [videoUrl]);

  useEffect(() => {
    const v = previewRef.current;
    if (!v) return;
    const onTime = () => setCurrent(v.currentTime);
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onEnded = () => {
      setPlaying(false);
      if (stateRef.current.loop && stateRef.current.duration) {
        v.currentTime = Math.min(stateRef.current.trimStart, stateRef.current.trimEnd);
        v.play().catch(() => {});
      }
    };
    v.addEventListener('timeupdate', onTime);
    v.addEventListener('play', onPlay);
    v.addEventListener('pause', onPause);
    v.addEventListener('ended', onEnded);
    return () => {
      v.removeEventListener('timeupdate', onTime);
      v.removeEventListener('play', onPlay);
      v.removeEventListener('pause', onPause);
      v.removeEventListener('ended', onEnded);
    };
  }, [videoUrl]);

  const buildFilmstrip = useCallback(() => {
    const el = filmstripRef.current;
    const v = previewRef.current;
    if (!el || !v) return;
    const d = stateRef.current.duration;
    if (!d) return;
    const count = 22;
    el.innerHTML = '';
    void (async () => {
      for (let i = 0; i < count; i++) {
        const cell = document.createElement('div');
        cell.className = 'video-editor-film-cell';
        const cvs = document.createElement('canvas');
        cvs.width = 160;
        cvs.height = 90;
        cell.appendChild(cvs);
        el.appendChild(cell);
        try {
          await new Promise<void>((resolve) => { v.onseeked = () => resolve(); v.currentTime = (i + 0.5) * (d / count); });
          const ctx = cvs.getContext('2d');
          if (ctx) ctx.drawImage(v, 0, 0, 160, 90);
        } catch {
          // skip frames that fail to decode
        }
      }
      v.onseeked = null;
      v.currentTime = Math.min(stateRef.current.trimStart, stateRef.current.trimEnd);
      setCurrent(v.currentTime);
    })();
  }, []);

  useEffect(() => {
    if (ready && duration > 0) buildFilmstrip();
  }, [ready, duration, buildFilmstrip]);

  const tStart = Math.min(trimStart, trimEnd);
  const tEnd = Math.max(trimStart, trimEnd);

  const snapshot = (): EditSnapshot => ({
    trimStart: tStart,
    trimEnd: tEnd,
    music: music ? { file: music.file, name: music.name } : null,
    musicVol,
    videoVol,
    filter,
    aspect,
    quality,
    textOverlay,
    textOn,
  });

  const pushHistory = () => {
    const next = [...hist.slice(0, Math.max(0, hi + 1)), snapshot()].slice(-50);
    setHist(next);
    setHi(next.length - 1);
  };

  const applyMusic = (next: MusicTrack | null) => {
    if (musicUrlRef.current) { URL.revokeObjectURL(musicUrlRef.current); musicUrlRef.current = ''; }
    if (next?.file) {
      const url = URL.createObjectURL(next.file);
      musicUrlRef.current = url;
      setMusic({ url, name: next.name, file: next.file });
    } else {
      setMusic(null);
    }
  };

  const commit = (changes: Partial<EditSnapshot>) => {
    pushHistory();
    if (changes.trimStart !== undefined) setTrimStart(changes.trimStart);
    if (changes.trimEnd !== undefined) setTrimEnd(changes.trimEnd);
    if (changes.music !== undefined) applyMusic(changes.music);
    if (changes.musicVol !== undefined) setMusicVol(changes.musicVol);
    if (changes.videoVol !== undefined) setVideoVol(changes.videoVol);
    if (changes.filter !== undefined) setFilter(changes.filter);
    if (changes.aspect !== undefined) setAspect(changes.aspect);
    if (changes.quality !== undefined) setQuality(changes.quality);
    if (changes.textOverlay !== undefined) setTextOverlay(changes.textOverlay);
    if (changes.textOn !== undefined) setTextOn(changes.textOn);
  };

  const applySnapshot = (s: EditSnapshot) => {
    setTrimStart(s.trimStart);
    setTrimEnd(s.trimEnd);
    applyMusic(s.music);
    setMusicVol(s.musicVol);
    setVideoVol(s.videoVol);
    setFilter(s.filter);
    setAspect(s.aspect);
    setQuality(s.quality);
    setTextOverlay(s.textOverlay);
    setTextOn(s.textOn);
  };

  const seekInRange = (start: number, end: number) => {
    const v = previewRef.current;
    if (!v) return;
    if (v.currentTime < start || v.currentTime > end) {
      v.currentTime = start;
      setCurrent(start);
    }
  };

  const undo = () => {
    if (!ready || hi < 0) return;
    const s = hist[hi];
    setHist((h) => h.slice(0, hi));
    setHi((i) => Math.max(-1, i - 1));
    if (s) {
      applySnapshot(s);
      seekInRange(s.trimStart, s.trimEnd);
    }
  };

  const redo = () => {
    if (!ready) return;
    const s = hist[hi + 1];
    if (!s) return;
    setHi((i) => i + 1);
    applySnapshot(s);
    seekInRange(s.trimStart, s.trimEnd);
  };

  const togglePlay = () => {
    const v = previewRef.current;
    if (!v || !ready) return;
    if (v.paused || v.ended) {
      if (v.currentTime < tStart || v.currentTime > tEnd) v.currentTime = tStart;
      v.play().catch(() => {});
    } else v.pause();
  };

  const resetTrim = () => {
    if (!ready) return;
    commit({ trimStart: 0, trimEnd: duration });
  };

  const setAsStart = () => {
    if (!ready) return;
    const next = Math.min(Math.max(0, current), tEnd - 0.05);
    if (next !== tStart) commit({ trimStart: next });
  };

  const setAsEnd = () => {
    if (!ready) return;
    const next = Math.max(Math.min(current, duration), tStart + 0.05);
    if (next !== tEnd) commit({ trimEnd: next });
  };

  const fracFromClient = (el: HTMLElement, clientX: number) => {
    const rect = el.getBoundingClientRect();
    return rect.width > 0 ? Math.max(0, Math.min(1, (clientX - rect.left) / rect.width)) : 0;
  };

  const seekAt = (clientX: number) => {
    const el = sliderRef.current;
    const v = previewRef.current;
    if (!el || !v || !ready) return;
    v.currentTime = fracFromClient(el, clientX) * duration;
    setCurrent(v.currentTime);
  };

  const onSeekDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    e.currentTarget.classList.add('grabbing');
    seekAt(e.clientX);
    e.preventDefault();
  };
  const onSeekMove = (e: ReactPointerEvent<HTMLDivElement>) => { if (e.currentTarget.hasPointerCapture(e.pointerId)) seekAt(e.clientX); };
  const onSeekUp = (e: ReactPointerEvent<HTMLDivElement>) => e.currentTarget.classList.remove('grabbing');

  const moveHandle = (fromStart: boolean, clientX: number) => {
    const timeline = timelineRef.current;
    if (!timeline) return;
    const tmpT = fracFromClient(timeline, clientX) * duration;
    if (fromStart) setTrimStart(Math.min(Math.max(0, tmpT), tEnd - 0.05));
    else setTrimEnd(Math.max(Math.min(tmpT, duration), tStart + 0.05));
  };

  const onHandleDown = (fromStart: boolean) => (e: ReactPointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    e.currentTarget.classList.add('drag');
    pushHistory();
    moveHandle(fromStart, e.clientX);
    e.preventDefault();
  };
  const onHandleMove = (fromStart: boolean) => (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) moveHandle(fromStart, e.clientX);
  };
  const onHandleUp = (fromStart: boolean) => (e: ReactPointerEvent<HTMLDivElement>) => e.currentTarget.classList.remove('drag');

  const onTimelineDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!ready || !timelineRef.current) return;
    if ((e.target as HTMLElement).closest('.video-editor-handle')) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const v = previewRef.current;
    const tmpT = fracFromClient(e.currentTarget, e.clientX) * duration;
    if (v) v.currentTime = tmpT;
    setCurrent(tmpT);
    e.preventDefault();
  };
  const onTimelineMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!e.currentTarget.hasPointerCapture(e.pointerId)) return;
    const v = previewRef.current;
    const tmpT = fracFromClient(e.currentTarget, e.clientX) * duration;
    if (v) v.currentTime = tmpT;
    setCurrent(tmpT);
  };
  const onTimelineUp = (e: ReactPointerEvent<HTMLDivElement>) => e.currentTarget.classList.remove('grabbing');

  const onPickMusic = (nextFile: File) => commit({ music: { file: nextFile, name: nextFile.name } });
  const removeMusic = () => commit({ music: null });

  const render = useCallback(async () => {
    const v = previewRef.current;
    if (!v || !ready || rendering || !supported) return;
    const s = tStart;
    const e = tEnd;
    if (e - s < 0.1) { setError(t('video.editor.ws.errShort')); return; }
    const srcW = v.videoWidth || 640;
    const srcH = v.videoHeight || 360;
    const cap = QUALITIES.find((q) => q.id === quality)?.long ?? 0;
    let boxW = srcW;
    let boxH = srcH;
    if (aspect === '9:16') { boxW = 540; boxH = 960; }
    else if (aspect === '16:9') { boxW = 960; boxH = 540; }
    else if (aspect === '1:1') { boxW = 720; boxH = 720; }
    if (cap > 0) {
      const mx = Math.max(boxW, boxH);
      if (mx > cap) {
        const k = cap / mx;
        boxW = Math.round(boxW * k);
        boxH = Math.round(boxH * k);
      }
    }
    const canvas = document.createElement('canvas');
    canvas.width = boxW;
    canvas.height = boxH;
    const ctx = canvas.getContext('2d');
    if (!ctx) { setError(t('video.editor.ws.errCanvas')); return; }
    const fxCss = FILTERS.find((f) => f.id === filter)?.css ?? 'none';
    const txt = textOn && textOverlay.trim() ? textOverlay.trim().slice(0, 80) : '';

    setRendering(true);
    setRenderProgress(0);
    setDone(false);
    setError('');
    v.pause();
    cancelRef.current = false;

    let rafId = 0;
    let recorder: MediaRecorder | null = null;
    let audioCtx: AudioContext | null = null;
    let musicEl: HTMLAudioElement | null = null;
    let canvasStream: MediaStream | null = null;

    const releaseCanvasStream = () => {
      try { canvasStream?.getTracks().forEach((track) => track.stop()); } catch { /* noop */ }
    };

    try {
      const AudioCtxClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      audioCtx = new AudioCtxClass();
      await audioCtx.resume();
      const dest = audioCtx.createMediaStreamDestination();

      const videoEl = document.createElement('video');
      videoEl.src = videoUrl;
      videoEl.preload = 'auto';
      videoEl.muted = false;
      videoEl.playsInline = true;
      const videoSrc = audioCtx.createMediaElementSource(videoEl);
      const videoGain = audioCtx.createGain();
      videoGain.gain.value = videoVol;
      videoSrc.connect(videoGain).connect(dest);

      if (music) {
        musicEl = new Audio(music.url);
        musicEl.loop = true;
        musicEl.preload = 'auto';
        const musicSrc = audioCtx.createMediaElementSource(musicEl);
        const musicGain = audioCtx.createGain();
        musicGain.gain.value = musicVol;
        musicSrc.connect(musicGain).connect(dest);
      }

      canvasStream = canvas.captureStream(30);
      const mixed = new MediaStream([...canvasStream.getVideoTracks(), ...dest.stream.getAudioTracks()]);

      const candidates = ['video/mp4;codecs="avc1.42E01E,mp4a.40.2"', 'video/mp4', 'video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm'];
      const mimeType = candidates.find((m) => MediaRecorder.isTypeSupported(m)) ?? '';
      try {
        recorder = new MediaRecorder(mixed, { mimeType: mimeType || undefined, videoBitsPerSecond: 8_000_000, audioBitsPerSecond: 192_000 });
      } catch {
        throw new Error(t('video.editor.ws.errRecord'));
      }
      const chunks: Blob[] = [];
      const recorded = new Promise<Blob>((resolve, reject) => {
        recorder!.ondataavailable = (event) => { if (event.data.size > 0) chunks.push(event.data); };
        recorder!.onstop = () => resolve(new Blob(chunks, { type: mimeType || 'video/mp4' }));
        recorder!.onerror = () => {
          const err = (recorder as (MediaRecorder & { error?: { message?: string } }) | null)?.error;
          reject(new Error(err?.message || t('video.editor.ws.errRecording')));
        };
      });

      await new Promise<void>((resolve, reject) => {
        videoEl.onloadeddata = () => resolve();
        videoEl.onerror = () => reject(new Error(t('video.editor.ws.errRead')));
        videoEl.load();
      });
      await new Promise<void>((resolve) => {
        videoEl.onseeked = () => resolve();
        videoEl.currentTime = s;
      });
      try {
        await videoEl.play();
      } catch {
        videoEl.muted = true;
        try { await videoEl.play(); } catch { throw new Error(t('video.editor.ws.errBlocked')); }
      }
      await audioCtx.resume().catch(() => {});
      musicEl?.play().catch(() => {});
      if (!recorder) throw new Error(t('video.editor.ws.errRecord'));
      recorder.start(250);

      const stop = () => {
        cancelAnimationFrame(rafId);
        try { videoEl.pause(); } catch { /* noop */ }
        try { musicEl?.pause(); } catch { /* noop */ }
        if (recorder && recorder.state !== 'inactive') recorder.stop();
      };

      const draw = () => {
        if (videoEl.ended || !ctx) return;
        ctx.filter = fxCss;
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, boxW, boxH);
        const scale = Math.min(boxW / srcW, boxH / srcH);
        const dw = srcW * scale;
        const dh = srcH * scale;
        ctx.drawImage(videoEl, (boxW - dw) / 2, (boxH - dh) / 2, dw, dh);
        ctx.filter = 'none';
        if (txt) drawTextLayer(ctx, boxW, boxH, txt);
      };

      const step = () => {
        if (cancelRef.current) { stop(); return; }
        draw();
        const progress = videoEl.ended ? 1 : Math.max(0, Math.min(1, (videoEl.currentTime - s) / (e - s)));
        setRenderProgress(progress * 100);
        if (videoEl.ended || videoEl.currentTime >= e) { stop(); return; }
        rafId = requestAnimationFrame(step);
      };
      rafId = requestAnimationFrame(step);

      const blob = await recorded;
      if (cancelRef.current) return;
      releaseCanvasStream();
      const base = file.name.replace(/\.[^.]+$/, '') || 'video';
      const outType = blob.type || mimeType || 'video/mp4';
      const ext = outType.includes('mp4') ? 'mp4' : 'webm';
      const editedFile = new File([blob], `${base}-edited.${ext}`, { type: outType });
      setRenderProgress(100);
      setDone(true);
      onRenderDone(editedFile);
    } catch (err) {
      if (!cancelRef.current) setError(err instanceof Error ? err.message : t('video.editor.ws.errRender'));
    } finally {
      cancelAnimationFrame(rafId);
      try { audioCtx?.close(); } catch { /* noop */ }
      releaseCanvasStream();
      setRendering(false);
    }
  }, [ready, rendering, supported, tStart, tEnd, file, videoUrl, music, musicVol, videoVol, filter, aspect, quality, textOverlay, textOn, onRenderDone, t]);

  const playFraction = duration > 0 ? current / duration : 0;
  const trimLeftPct = duration > 0 ? (tStart / duration) * 100 : 0;
  const trimWidthPct = duration > 0 ? Math.max(0, ((tEnd - tStart) / duration) * 100) : 100;
  const previewRatio = ASPECTS.find((a) => a.id === aspect)?.ratio ?? 'auto';
  const filterCss = FILTERS.find((f) => f.id === filter)?.css ?? 'none';

  return (
    <div className="video-editor-grid">
      <div className="video-editor-main">
        <div className="video-editor-preview">
          <video ref={previewRef} playsInline preload="metadata" muted={muted} style={{ aspectRatio: previewRatio, filter: filterCss }} />
          {!ready && <div className="video-editor-loading"><Loader2 size={22} className="video-editor-spin" /> {t('video.editor.ws.loadingPreview')}</div>}
          {ready && <span className={`video-editor-trim-note ${tStart > 0 || tEnd < duration ? 'show' : ''}`}><Scissors size={12} /> {t('video.editor.ws.trimActive')}</span>}
          <div className="video-editor-seek">
            <span className="video-editor-time is-current">{formatTime(current)}</span>
            <div ref={sliderRef} className="video-editor-slider" onPointerDown={onSeekDown} onPointerMove={onSeekMove} onPointerUp={onSeekUp} onPointerCancel={onSeekUp}>
              <div className="video-editor-track"><span className="video-editor-progress" style={{ width: `${playFraction * 100}%` }} /></div>
              <span className="video-editor-thumb" style={{ ['--video-editor-thumb' as string]: `${playFraction * 100}%` }} />
            </div>
            <span className="video-editor-time">{formatTime(duration)}</span>
          </div>
          <div className="video-editor-ctls">
            <button type="button" className="video-editor-play" onClick={togglePlay} aria-label={playing ? t('video.editor.ws.pause') : t('video.editor.ws.play')}>{playing ? <Pause size={20} /> : <Play size={20} fill="currentColor" />}</button>
            <button type="button" className={`video-editor-chip ${loop ? 'on' : ''}`} onClick={() => setLoop((value) => !value)}><Repeat size={14} /> {t('video.editor.ws.loopPreview')}</button>
            <button type="button" className={`video-editor-chip ${muted ? 'on' : ''}`} onClick={() => setMuted((value) => !value)}>{muted ? <VolumeX size={14} /> : <Volume2 size={14} />} {t('video.editor.ws.videoSound')}</button>
            <button type="button" className="video-editor-chip ipt-right" onClick={resetTrim}><RotateCcw size={14} /> {t('video.editor.ws.reset')}</button>
          </div>
        </div>

        <div className="video-editor-timeline-card">
          <div className="video-editor-timeline-head"><span>{t('video.editor.ws.timeline')}</span><b>{ready ? t('video.editor.ws.strip', { start: formatTime(tStart), end: formatTime(tEnd), len: formatTime(tEnd - tStart), total: formatTime(duration) }) : t('video.editor.ws.loading')}</b></div>
          <div
            ref={timelineRef}
            className="video-editor-timeline"
            onPointerDown={onTimelineDown}
            onPointerMove={onTimelineMove}
            onPointerUp={onTimelineUp}
            onPointerCancel={onTimelineUp}
          >
            <div ref={filmstripRef} className="video-editor-filmstrip" />
            <div className="video-editor-trim-region" style={{ left: `${trimLeftPct}%`, width: `${trimWidthPct}%` }}>
              <span className="video-editor-shadow left" />
              <span className="video-editor-shadow right" />
              <span className="video-editor-trim-tag left">{formatTime(tStart)}</span>
              <span className="video-editor-trim-tag right">{formatTime(tEnd)}</span>
            </div>
            <div ref={handleLRef} className="video-editor-handle left" style={{ left: `calc(${trimLeftPct}% - 11px)`, right: 'auto' }} onPointerDown={onHandleDown(true)} onPointerMove={onHandleMove(true)} onPointerUp={onHandleUp(true)} onPointerCancel={onHandleUp(true)}><span className="video-editor-grip" /></div>
            <div ref={handleRRef} className="video-editor-handle right" style={{ left: `calc(${trimLeftPct + trimWidthPct}% - 11px)`, right: 'auto' }} onPointerDown={onHandleDown(false)} onPointerMove={onHandleMove(false)} onPointerUp={onHandleUp(false)} onPointerCancel={onHandleUp(false)}><span className="video-editor-grip" /></div>
            <div className="video-editor-playhead" style={{ left: `${playFraction * 100}%` }} />
          </div>
          <div className="video-editor-timeline-foot">
            <div className="video-editor-trim-summary">{t('video.editor.ws.strip', { start: formatTime(tStart), end: formatTime(tEnd), len: formatTime(tEnd - tStart), total: formatTime(duration) })}{' '}· {t('video.editor.ws.timeline')}</div>
            <div className="video-editor-chip-row">
              <button type="button" className="video-editor-ux" onClick={undo} disabled={hi < 0} aria-label={t('video.editor.ws.undo')}><Undo2 size={13} /> {t('video.editor.ws.undo')}</button>
              <button type="button" className="video-editor-ux" onClick={redo} disabled={!hist[hi + 1]} aria-label={t('video.editor.ws.redo')}><Redo2 size={13} /> {t('video.editor.ws.redo')}</button>
              <button type="button" className="video-editor-chip" onClick={setAsStart}><Scissors size={14} /> {t('video.editor.ws.trimStart')}</button>
              <button type="button" className="video-editor-chip" onClick={setAsEnd}><Scissors size={14} /> {t('video.editor.ws.trimEnd')}</button>
            </div>
          </div>
        </div>
      </div>

      <div className="video-editor-side">
        <div className="video-editor-panel">
          <div className="video-editor-panel-head"><b>{t('video.editor.ws.sound')}</b><span>{t('video.editor.ws.mixHint')}</span></div>
          <div className="video-editor-step"><span className="video-editor-step-n">1</span> {t('video.editor.ws.addMusic')}</div>
          {music ? (
            <div className="video-editor-sound-row">
              <div className="video-editor-sound-thumb"><Music2 size={18} /></div>
              <div className="video-editor-sound-info"><b>{music.name}</b><span><Repeat size={11} /> {t('video.editor.ws.loops')}</span></div>
              <button type="button" className="video-editor-x" onClick={removeMusic} aria-label={t('video.common.close')}><X size={14} /></button>
            </div>
          ) : (
            <div className="video-editor-sound-empty"><Music size={16} /> {t('video.editor.ws.noMusic')}</div>
          )}
          <label className="video-editor-audio-file"><UploadCloud size={16} /> {t('video.editor.ws.addAudio')}<input type="file" accept="audio/mpeg,audio/wav,audio/ogg,audio/webm,audio/mp4" onChange={(event) => { const f = event.target.files?.[0]; if (f) onPickMusic(f); event.target.value = ''; }} /></label>
          <div className="video-editor-step"><span className="video-editor-step-n">2</span> {t('video.editor.ws.volumeMix')}</div>
          <VolumeSlider label={t('video.editor.ws.musicLabel')} value={musicVol} onChange={setMusicVol} onBegin={pushHistory} />
          <VolumeSlider label={t('video.editor.ws.originalLabel')} value={videoVol} onChange={setVideoVol} onBegin={pushHistory} />
          <div className="video-editor-step"><span className="video-editor-step-n">3</span> {t('video.editor.ws.look')}</div>
          <div className="video-editor-fx-row">
            {FILTERS.map((fx) => (
              <button key={fx.id} type="button" className={`video-editor-fx ${filter === fx.id ? 'on' : ''}`} onClick={() => commit({ filter: fx.id })}>
                <span className="video-editor-fx-swatch" style={{ filter: fx.css }} />
                {t(`video.editor.fx.${fx.id}`)}
              </button>
            ))}
          </div>
          <div className="video-editor-step"><span className="video-editor-step-n">4</span> {t('video.editor.ws.position')}</div>
          <div className="video-editor-chip-row video-editor-fxrow">
            {ASPECTS.map((a) => (
              <button key={a.id} type="button" className={`video-editor-chip ${aspect === a.id ? 'on' : ''}`} onClick={() => commit({ aspect: a.id })}>{t(`video.editor.fmt.${a.id}`)}</button>
            ))}
          </div>
          <div className="video-editor-step"><span className="video-editor-step-n">5</span> {t('video.editor.ws.quality')}</div>
          <div className="video-editor-chip-row video-editor-fxrow">
            {QUALITIES.map((q) => (
              <button key={q.id} type="button" className={`video-editor-chip ${quality === q.id ? 'on' : ''}`} onClick={() => commit({ quality: q.id })}>{t(`video.editor.q.${q.id}`)}</button>
            ))}
          </div>
          <div className="video-editor-step"><span className="video-editor-step-n">6</span> {t('video.editor.ws.text')}</div>
          <div className="video-editor-text">
            <input value={textOverlay} onChange={(event) => setTextOverlay(event.target.value)} maxLength={80} placeholder={t('video.editor.ws.textPlaceholder')} />
            <button type="button" className={`video-editor-chip ${textOn && textOverlay.trim() ? 'on' : ''}`} disabled={!textOverlay.trim()} onClick={() => commit({ textOn: !textOn })}><Type size={13} /> {t('video.editor.ws.textToggle')}</button>
          </div>
          <div className="video-editor-export">
            <b>{t('video.editor.ws.exportTitle')}</b>
            <p>{renderHelperCopy ?? t('video.editor.ws.helperCopy')}</p>
            {!supported && <p className="video-editor-warn">{t('video.editor.ws.warn')}</p>}
            <button type="button" className={`btn btn-violet pill-sm ${rendering ? 'video-editor-render-btn' : ''}`} style={{ width: '100%' }} disabled={rendering || !ready || !supported} onClick={() => void render()}>
              {rendering ? t('video.editor.ws.rendering', { n: Math.round(renderProgress) }) : <><Scissors size={14} /> {t('video.editor.ws.renderExport')}</>}
            </button>
            {rendering && (
              <div className="video-editor-render-progress">
                <div className="video-editor-progress-track"><span style={{ width: `${renderProgress}%` }} /></div>
                <div className="video-editor-progress-row"><span>{Math.round(renderProgress)}%</span><span>{formatTime(Math.max(0, (tEnd - tStart) * (1 - renderProgress / 100)))} {t('video.editor.ws.left')}</span></div>
                <button type="button" className="video-editor-cancel" onClick={() => { cancelRef.current = true; }}>{t('video.editor.ws.cancelRender')}</button>
              </div>
            )}
            {done && <div className="video-editor-done"><Sparkles size={13} /> {renderDoneCopy ?? t('video.editor.ws.doneCopy')}</div>}
            {error && <div className="video-editor-error">{error}</div>}
          </div>
        </div>
      </div>
    </div>
  );
}

export function VideoEditorModal({ file, open, onClose, onSaved }: VideoEditorModalProps) {
  const t = useTranslations();
  if (!open || !file) return null;
  return (
    <div className="video-modal-backdrop" style={{ backdropFilter: 'blur(24px) saturate(1.2)', WebkitBackdropFilter: 'blur(24px) saturate(1.2)' }} onMouseDown={onClose}>
      <section className="video-editor-modal" role="dialog" aria-modal="true" aria-labelledby="video-editor-title" onMouseDown={(event) => event.stopPropagation()}>
        <header className="video-modal-head">
          <div>
            <div className="hub-kicker">{t('video.editor.modalKicker')}</div>
            <h2 id="video-editor-title">{t('video.editor.modalTitle')}</h2>
            <p className="video-editor-sub">{t('video.editor.modalSub')}</p>
          </div>
          <button type="button" className="btn-icon" onClick={onClose} aria-label={t('video.common.close')}><X size={18} /></button>
        </header>
        <VideoEditorWorkspace file={file} onRenderDone={onSaved} />
      </section>
    </div>
  );
}