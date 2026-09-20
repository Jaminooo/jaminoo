'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import { Loader2, Music, Music2, Pause, Play, Repeat, RotateCcw, Scissors, Sparkles, UploadCloud, Volume2, VolumeX, X } from 'lucide-react';

interface VideoEditorModalProps {
  file: File | null;
  open: boolean;
  onClose: () => void;
  onSaved: (file: File) => void;
}

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) seconds = 0;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const pad = (n: number) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

function VolumeSlider({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
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
        onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); e.currentTarget.classList.add('grabbing'); apply(e.clientX); e.preventDefault(); }}
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

export function VideoEditorModal({ file, open, onClose, onSaved }: VideoEditorModalProps) {
  const previewRef = useRef<HTMLVideoElement>(null);
  const filmstripRef = useRef<HTMLDivElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  const handleLRef = useRef<HTMLDivElement>(null);
  const handleRRef = useRef<HTMLDivElement>(null);
  const sliderRef = useRef<HTMLDivElement>(null);
  const videoUrlRef = useRef('');
  const musicUrlRef = useRef('');

  const [videoUrl, setVideoUrl] = useState('');
  const [ready, setReady] = useState(false);
  const [duration, setDuration] = useState(0);
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(0);
  const [current, setCurrent] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [loop, setLoop] = useState(true);
  const [music, setMusic] = useState<{ url: string; name: string } | null>(null);
  const [musicVol, setMusicVol] = useState(1);
  const [videoVol, setVideoVol] = useState(1);
  const [rendering, setRendering] = useState(false);
  const [renderProgress, setRenderProgress] = useState(0);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  const stateRef = useRef({ trimStart: 0, trimEnd: 0, loop: true, duration: 0 });
  useEffect(() => {
    stateRef.current.trimStart = trimStart;
    stateRef.current.trimEnd = trimEnd;
    stateRef.current.loop = loop;
    stateRef.current.duration = duration;
  }, [trimStart, trimEnd, loop, duration]);

  const supported = useMemo(() => typeof window !== 'undefined' && typeof MediaRecorder !== 'undefined' && typeof (HTMLCanvasElement.prototype as HTMLCanvasElement).captureStream === 'function', []);

  useEffect(() => {
    if (!open || !file) return;
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
    setRendering(false);
    setRenderProgress(0);
    setDone(false);
    setError('');
  }, [open, file]);

  useEffect(() => () => {
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
    setTrimStart(0);
    setTrimEnd(duration);
  };

  const setAsStart = () => {
    if (!ready) return;
    setTrimStart(Math.min(Math.max(0, current), tEnd - 0.05));
  };

  const setAsEnd = () => {
    if (!ready) return;
    setTrimEnd(Math.max(Math.min(current, duration), tStart + 0.05));
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

  const applyHandle = (fromStart: boolean, clientX: number) => {
    const timeline = timelineRef.current;
    if (!timeline) return;
    const t = fracFromClient(timeline, clientX) * duration;
    if (fromStart) setTrimStart(Math.min(Math.max(0, t), tEnd - 0.05));
    else setTrimEnd(Math.max(Math.min(t, duration), tStart + 0.05));
  };

  const onHandleDown = (fromStart: boolean) => (e: ReactPointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    e.currentTarget.classList.add('drag');
    applyHandle(fromStart, e.clientX);
    e.preventDefault();
  };
  const onHandleMove = (fromStart: boolean) => (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) applyHandle(fromStart, e.clientX);
  };
  const onHandleUp = (fromStart: boolean) => (e: ReactPointerEvent<HTMLDivElement>) => e.currentTarget.classList.remove('drag');

  const onTimelineDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!ready || !timelineRef.current) return;
    if ((e.target as HTMLElement).closest('.video-editor-handle')) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const v = previewRef.current;
    const t = fracFromClient(e.currentTarget, e.clientX) * duration;
    if (v) v.currentTime = t;
    setCurrent(t);
    e.preventDefault();
  };
  const onTimelineMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!e.currentTarget.hasPointerCapture(e.pointerId)) return;
    const v = previewRef.current;
    const t = fracFromClient(e.currentTarget, e.clientX) * duration;
    if (v) v.currentTime = t;
    setCurrent(t);
  };
  const onTimelineUp = (e: ReactPointerEvent<HTMLDivElement>) => e.currentTarget.classList.remove('grabbing');

  const addMusic = (nextFile: File) => {
    if (musicUrlRef.current) { URL.revokeObjectURL(musicUrlRef.current); musicUrlRef.current = ''; }
    const url = URL.createObjectURL(nextFile);
    musicUrlRef.current = url;
    setMusic({ url, name: nextFile.name });
  };

  const removeMusic = () => {
    if (musicUrlRef.current) { URL.revokeObjectURL(musicUrlRef.current); musicUrlRef.current = ''; }
    setMusic(null);
  };

  const render = useCallback(async () => {
    const v = previewRef.current;
    if (!v || !ready || rendering || !supported || !file) return;
    const s = tStart;
    const e = tEnd;
    if (e - s < 0.1) { setError('Clip is too short to render.'); return; }
    const canvas = document.createElement('canvas');
    canvas.width = v.videoWidth || 640;
    canvas.height = v.videoHeight || 360;
    const ctx = canvas.getContext('2d');
    if (!ctx) { setError('Canvas rendering is not available in this browser.'); return; }

    setRendering(true);
    setRenderProgress(0);
    setDone(false);
    setError('');
    v.pause();

    let rafId = 0;
    let recorder: MediaRecorder | null = null;
    let audioCtx: AudioContext | null = null;
    let musicEl: HTMLAudioElement | null = null;

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
      videoGain.gain.value = muted ? 0 : videoVol;
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

      const canvasStream = canvas.captureStream(30);
      const mixed = new MediaStream([...canvasStream.getVideoTracks(), ...dest.stream.getAudioTracks()]);

      const candidates = ['video/mp4;codecs="avc1.42E01E,mp4a.40.2"', 'video/mp4', 'video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm'];
      const mimeType = candidates.find((m) => MediaRecorder.isTypeSupported(m)) ?? '';
      const recorded = new Promise<Blob>((resolve, reject) => {
        try {
          recorder = new MediaRecorder(mixed, { mimeType: mimeType || undefined, videoBitsPerSecond: 8_000_000, audioBitsPerSecond: 192_000 });
        } catch {
          reject(new Error('This browser cannot record this video format.'));
          return;
        }
        const chunks: Blob[] = [];
        recorder.ondataavailable = (event) => { if (event.data.size > 0) chunks.push(event.data); };
        recorder.onstop = () => resolve(new Blob(chunks, { type: mimeType || 'video/mp4' }));
        recorder.onerror = () => {
          const err = (recorder as (MediaRecorder & { error?: { message?: string } }) | null)?.error;
          reject(new Error(err?.message || 'Recording failed.'));
        };
        recorder.start(500);
      });

      await new Promise<void>((resolve, reject) => {
        videoEl.onloadeddata = () => resolve();
        videoEl.onerror = () => reject(new Error('Could not read this video.'));
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
        try { await videoEl.play(); } catch { throw new Error('Browser blocked playback for rendering.'); }
      }
      musicEl?.play().catch(() => {});

      const stop = () => {
        cancelAnimationFrame(rafId);
        try { videoEl.pause(); } catch { /* noop */ }
        try { musicEl?.pause(); } catch { /* noop */ }
        if (recorder && recorder.state !== 'inactive') recorder.stop();
      };

      const step = () => {
        if (!videoEl.ended) ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height);
        const progress = videoEl.ended ? 1 : Math.max(0, Math.min(1, (videoEl.currentTime - s) / (e - s)));
        setRenderProgress(progress * 100);
        if (videoEl.ended || videoEl.currentTime >= e) {
          stop();
          return;
        }
        rafId = requestAnimationFrame(step);
      };
      rafId = requestAnimationFrame(step);

      const blob = await recorded;
      try { await audioCtx.close(); audioCtx = null; } catch { /* noop */ }
      canvasStream.getTracks().forEach((track) => track.stop());
      const base = file.name.replace(/\.[^.]+$/, '') || 'video';
      const ext = mimeType.includes('mp4') ? 'mp4' : 'webm';
      const editedFile = new File([blob], `${base}-edited.${ext}`, { type: mimeType || 'video/mp4' });
      setRenderProgress(100);
      setDone(true);
      onSaved(editedFile);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not render this video.');
    } finally {
      cancelAnimationFrame(rafId);
      try { audioCtx?.close(); } catch { /* noop */ }
      setRendering(false);
    }
  }, [ready, rendering, supported, tStart, tEnd, file, videoUrl, music, muted, musicVol, videoVol, onSaved]);

  if (!open || !file) return null;
  const playFraction = duration > 0 ? current / duration : 0;
  const leftFrac = duration > 0 ? (tStart / duration) * 100 : 0;
  const widthFrac = duration > 0 ? Math.max(0, ((tEnd - tStart) / duration) * 100) : 100;

  return (
    <div className="video-modal-backdrop" style={{ backdropFilter: 'blur(24px) saturate(1.2)', WebkitBackdropFilter: 'blur(24px) saturate(1.2)' }} onMouseDown={onClose}>
      <section className="video-editor-modal" role="dialog" aria-modal="true" aria-labelledby="video-editor-title" onMouseDown={(event) => event.stopPropagation()}>
        <header className="video-modal-head">
          <div>
            <div className="hub-kicker">VIDEO EDITOR · CUT &amp; MIX</div>
            <h2 id="video-editor-title">Edit before you upload</h2>
            <p className="video-editor-sub">Trim the best part, drop in a soundtrack and export — right before your post goes live.</p>
          </div>
          <button type="button" className="btn-icon" onClick={onClose} aria-label="Close"><X size={18} /></button>
        </header>

        <div className="video-editor-grid">
          <div className="video-editor-main">
            <div className="video-editor-preview">
              <video ref={previewRef} playsInline preload="metadata" muted={muted} />
              {!ready && <div className="video-editor-loading"><Loader2 size={22} className="video-editor-spin" /> Loading preview…</div>}
              {ready && <span className={`video-editor-trim-note ${tStart > 0 || tEnd < duration ? 'show' : ''}`}><Scissors size={12} /> Trim active</span>}
              <div className="video-editor-seek">
                <span className="video-editor-time is-current">{formatTime(current)}</span>
                <div ref={sliderRef} className="video-editor-slider" onPointerDown={onSeekDown} onPointerMove={onSeekMove} onPointerUp={onSeekUp} onPointerCancel={onSeekUp}>
                  <div className="video-editor-track"><span className="video-editor-progress" style={{ width: `${playFraction * 100}%` }} /></div>
                  <span className="video-editor-thumb" style={{ ['--video-editor-thumb' as string]: `${playFraction * 100}%` }} />
                </div>
                <span className="video-editor-time">{formatTime(duration)}</span>
              </div>
              <div className="video-editor-ctls">
                <button type="button" className="video-editor-play" onClick={togglePlay} aria-label={playing ? 'Pause' : 'Play'}>{playing ? <Pause size={20} /> : <Play size={20} fill="currentColor" />}</button>
                <button type="button" className={`video-editor-chip ${loop ? 'on' : ''}`} onClick={() => setLoop((value) => !value)}><Repeat size={14} /> Loop preview</button>
                <button type="button" className={`video-editor-chip ${muted ? 'on' : ''}`} onClick={() => setMuted((value) => !value)}>{muted ? <VolumeX size={14} /> : <Volume2 size={14} />} Video sound</button>
                <button type="button" className="video-editor-chip ipt-right" onClick={resetTrim}><RotateCcw size={14} /> Reset</button>
              </div>
            </div>

            <div className="video-editor-timeline-card">
              <div className="video-editor-timeline-head"><span>Timeline</span><b>{ready ? `${formatTime(tStart)} — ${formatTime(tEnd)} · ${formatTime(tEnd - tStart)}` : 'Loading…'}</b></div>
              <div
                ref={timelineRef}
                className="video-editor-timeline"
                onPointerDown={onTimelineDown}
                onPointerMove={onTimelineMove}
                onPointerUp={onTimelineUp}
                onPointerCancel={onTimelineUp}
              >
                <div ref={filmstripRef} className="video-editor-filmstrip" />
                <div className="video-editor-trim-region">
                  <span className="video-editor-shadow left" />
                  <span className="video-editor-shadow right" />
                  <span className="video-editor-trim-tag left">{formatTime(tStart)}</span>
                  <span className="video-editor-trim-tag right">{formatTime(tEnd)}</span>
                </div>
                <div ref={handleLRef} className="video-editor-handle left" onPointerDown={onHandleDown(true)} onPointerMove={onHandleMove(true)} onPointerUp={onHandleUp(true)} onPointerCancel={onHandleUp(true)}><span className="video-editor-grip" /></div>
                <div ref={handleRRef} className="video-editor-handle right" onPointerDown={onHandleDown(false)} onPointerMove={onHandleMove(false)} onPointerUp={onHandleUp(false)} onPointerCancel={onHandleUp(false)}><span className="video-editor-grip" /></div>
                <div className="video-editor-playhead" style={{ left: `${playFraction * 100}%` }} />
              </div>
              <div className="video-editor-timeline-foot">
                <div className="video-editor-trim-summary">Clip: <b>{formatTime(tStart)}</b> → <b>{formatTime(tEnd)}</b> · Length <b>{formatTime(tEnd - tStart)}</b> / <b>{formatTime(duration)}</b></div>
                <div className="video-editor-chip-row">
                  <button type="button" className="video-editor-chip" onClick={setAsStart}><Scissors size={14} /> Trim start</button>
                  <button type="button" className="video-editor-chip" onClick={setAsEnd}><Scissors size={14} /> Trim end</button>
                </div>
              </div>
            </div>
          </div>

          <div className="video-editor-side">
            <div className="video-editor-panel">
              <div className="video-editor-panel-head"><b>Sound</b><span>Mix a soundtrack</span></div>
              <div className="video-editor-step"><span className="video-editor-step-n">1</span> Add music</div>
              {music ? (
                <div className="video-editor-sound-row">
                  <div className="video-editor-sound-thumb"><Music2 size={18} /></div>
                  <div className="video-editor-sound-info"><b>{music.name}</b><span><Repeat size={11} /> Loops with the clip</span></div>
                  <button type="button" className="video-editor-x" onClick={removeMusic} aria-label="Remove soundtrack"><X size={14} /></button>
                </div>
              ) : (
                <div className="video-editor-sound-empty"><Music size={16} /> No soundtrack yet</div>
              )}
              <label className="video-editor-audio-file"><UploadCloud size={16} /> Add audio file<input type="file" accept="audio/mpeg,audio/wav,audio/ogg,audio/webm,audio/mp4" onChange={(event) => { const f = event.target.files?.[0]; if (f) addMusic(f); event.target.value = ''; }} /></label>
              <div className="video-editor-step"><span className="video-editor-step-n">2</span> Volume mix</div>
              <VolumeSlider label="Music" value={musicVol} onChange={setMusicVol} />
              <VolumeSlider label="Original sound" value={videoVol} onChange={setVideoVol} />
              <div className="video-editor-export">
                <b>Render &amp; use</b>
                <p>Trims your clip and mixes the music into a new video, ready for your post. Rendering runs in real time.</p>
                {!supported && <p className="video-editor-warn">This browser cannot render videos in-browser yet — try the latest Chrome, Edge or Safari.</p>}
                <button type="button" className={`btn btn-violet pill-sm ${rendering ? 'video-editor-render-btn' : ''}`} style={{ width: '100%' }} disabled={rendering || !ready || !supported} onClick={() => void render()}>
                  {rendering ? <>Rendering {Math.round(renderProgress)}%…</> : <><Scissors size={14} /> Render &amp; export</>}
                </button>
                {rendering && (
                  <div className="video-editor-progress">
                    <div className="video-editor-progress-track"><span style={{ width: `${renderProgress}%` }} /></div>
                    <div className="video-editor-progress-row"><span>{Math.round(renderProgress)}%</span><span>{formatTime(Math.max(0, (tEnd - tStart) * (1 - renderProgress / 100)))} left</span></div>
                  </div>
                )}
                {done && <div className="video-editor-done"><Sparkles size={13} /> Edited video ready — applied to your post.</div>}
                {error && <div className="video-editor-error">{error}</div>}
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}