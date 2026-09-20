'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { KeyboardEvent as ReactKeyboardEvent, MouseEvent as ReactMouseEvent, PointerEvent as ReactPointerEvent } from 'react';
import {
  Captions,
  Gauge,
  Maximize,
  Minimize,
  Pause,
  PictureInPicture2,
  Play,
  RotateCcw,
  SkipForward,
  Volume1,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { toast } from '@/components/toast';
import './vinyl-player.css';

/**
 * VinylPlayer — the React port of prototypes/video-player.html.
 *
 * The native browser controller is never rendered: <video> is created
 * without the `controls` attribute and every interaction goes through
 * this component's own chrome. All styles live in vinyl-player.css and
 * are namespaced with `vp-` so they cannot collide with app styles.
 */

const RATES = [0.5, 0.75, 1, 1.25, 1.5, 2];
const IDLE_MS = 2600;
const AUTO_NEXT_S = 10;

function formatTime(value: number) {
  const s = Number.isFinite(value) && value > 0 ? value : 0;
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60);
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}` : `${m}:${String(sec).padStart(2, '0')}`;
}

export interface VinylUpNext {
  title: string;
  sub?: string;
  poster?: string | null;
  onSelect: () => void;
}

export interface VinylPlayerProps {
  src: string;
  poster?: string | null;
  title?: string;
  badge?: string;
  subtitlesUrl?: string | null;
  /** Play while ≥55% visible and pause when scrolled away (feed cards). */
  autoplayInView?: boolean;
  /** Start unmuted (shorts); muted autoplay falls back with a hint. */
  startUnmuted?: boolean;
  loop?: boolean;
  /** 'card' = compact hover chrome for feed cards, 'feature' = full chrome. */
  variant?: 'card' | 'feature';
  /** Stretch to the parent media box instead of a 16:9 box. */
  fill?: boolean;
  /** Persistent mute chip (shorts) so sound can be restored in one tap. */
  soundToggle?: boolean;
  className?: string;
  onEnded?: () => void;
  upNext?: VinylUpNext;
}

export function VinylPlayer({
  src,
  poster,
  title,
  badge,
  subtitlesUrl,
  autoplayInView = false,
  startUnmuted = false,
  loop = false,
  variant = 'card',
  fill = false,
  soundToggle = false,
  className = '',
  onEnded,
  upNext,
}: VinylPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const seekRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLTrackElement>(null);
  const uiTimer = useRef<number | null>(null);
  const seekDragging = useRef(false);
  const volDragging = useRef(false);
  const previewTimer = useRef<number | null>(null);

  const [playing, setPlaying] = useState(false);
  const [waiting, setWaiting] = useState(false);
  const [muted, setMuted] = useState(!startUnmuted);
  const [volume, setVolume] = useState(0.9);
  const [duration, setDuration] = useState(0);
  const [current, setCurrent] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [rate, setRate] = useState(1);
  const [error, setError] = useState(false);
  const [ended, setEnded] = useState(false);
  const [audioBlocked, setAudioBlocked] = useState(false);
  const [captionsOn, setCaptionsOn] = useState(false);
  const [uiOn, setUiOn] = useState(true);
  const [rateOpen, setRateOpen] = useState(false);
  const [volOpen, setVolOpen] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [pipOk, setPipOk] = useState(false);
  const [coarse, setCoarse] = useState(false);
  const [showPoster, setShowPoster] = useState(true);
  const [seekPreview, setSeekPreview] = useState<{ left: number; text: string } | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);

  const mutedRef = useRef(muted);
  mutedRef.current = muted;

  const showUI = !playing || waiting || ended || uiOn || rateOpen || volOpen;
  const progressPct = duration ? (current / duration) * 100 : 0;
  const bufferedPct = duration ? Math.min(100, (buffered / duration) * 100) : 0;
  const canSeek = duration > 0;

  /* ---------- environment capabilities ---------- */
  useEffect(() => {
    setCoarse(window.matchMedia('(pointer: coarse)').matches);
    setPipOk(typeof document.pictureInPictureEnabled === 'boolean' && document.pictureInPictureEnabled);
  }, []);

  /* ---------- element init: never native controls ---------- */
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !startUnmuted;
    video.volume = 0.9;
    setMuted(!startUnmuted);
    setVolume(0.9);
  }, [startUnmuted, src]);

  /* ---------- src changes reset the transient state ---------- */
  useEffect(() => {
    setError(false);
    setEnded(false);
    setCurrent(0);
    setBuffered(0);
    setShowPoster(true);
    setUiOn(true);
    setCountdown(null);
  }, [src]);

  /* ---------- visibility-driven autoplay (feed cards) ---------- */
  useEffect(() => {
    if (!autoplayInView || !videoRef.current) return;
    const video = videoRef.current;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) {
          video.pause();
          return;
        }
        video.muted = mutedRef.current;
        video.play()
          .then(() => setAudioBlocked(false))
          .catch(() => {
            if (!mutedRef.current) {
              video.muted = true;
              setMuted(true);
              video.play()
                .then(() => setAudioBlocked(true))
                .catch(() => setAudioBlocked(true));
            } else {
              setAudioBlocked(true);
            }
          });
      },
      { threshold: 0.55 },
    );
    observer.observe(video);
    return () => observer.disconnect();
  }, [autoplayInView, src]);

  /* ---------- fullscreen sync (vendor-prefixed browsers included) ---------- */
  useEffect(() => {
    const sync = () => setFullscreen(Boolean(document.fullscreenElement || (document as Document & { webkitFullscreenElement?: Element }).webkitFullscreenElement));
    document.addEventListener('fullscreenchange', sync);
    document.addEventListener('webkitfullscreenchange', sync);
    return () => {
      document.removeEventListener('fullscreenchange', sync);
      document.removeEventListener('webkitfullscreenchange', sync);
    };
  }, []);

  /* ---------- captions mode ---------- */
  useEffect(() => {
    const textTrack = trackRef.current?.track;
    if (textTrack) textTrack.mode = captionsOn ? 'showing' : 'disabled';
  }, [captionsOn, subtitlesUrl]);

  /* ---------- up-next countdown ---------- */
  useEffect(() => {
    if (!ended || !upNext) {
      setCountdown(null);
      return;
    }
    setCountdown(AUTO_NEXT_S);
    const timer = window.setInterval(() => {
      setCountdown((value) => {
        if (value === null) return null;
        if (value <= 1) {
          window.clearInterval(timer);
          upNext.onSelect();
          return null;
        }
        return value - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ended, upNext?.title, upNext?.onSelect]);

  /* ---------- cleanup ---------- */
  useEffect(() => () => {
    if (uiTimer.current) window.clearTimeout(uiTimer.current);
    if (previewTimer.current) window.clearTimeout(previewTimer.current);
    videoRef.current?.pause();
  }, []);

  /* ---------- helpers ---------- */
  const armHide = useCallback(() => {
    setUiOn(true);
    if (uiTimer.current) window.clearTimeout(uiTimer.current);
    uiTimer.current = window.setTimeout(() => setUiOn(false), IDLE_MS);
  }, []);

  const attemptPlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    video.play()
      .then(() => {
        setAudioBlocked(false);
        armHide();
      })
      .catch(() => {
        // Autoplay policy: retry muted once, then surface the hint.
        if (!video.muted) {
          video.muted = true;
          setMuted(true);
          video.play()
            .then(() => setAudioBlocked(true))
            .catch(() => setAudioBlocked(true));
        } else {
          setAudioBlocked(true);
        }
      });
  }, [armHide]);

  const togglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused || video.ended) attemptPlay();
    else video.pause();
    armHide();
  }, [attemptPlay, armHide]);

  const toggleMute = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (video.volume > 0) video.muted = !video.muted;
    else {
      video.volume = 1;
      video.muted = false;
    }
    setMuted(video.muted);
    setAudioBlocked(false);
    toast(video.muted ? 'Muted' : 'Sound on');
  }, []);

  const applyRate = useCallback((nextRate: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.playbackRate = nextRate;
    setRate(nextRate);
    setRateOpen(false);
    toast(`Speed ${nextRate}×`);
  }, []);

  const seekBy = useCallback((delta: number) => {
    const video = videoRef.current;
    if (!video || !Number.isFinite(video.duration)) return;
    video.currentTime = Math.max(0, Math.min(video.duration, video.currentTime + delta));
    setCurrent(video.currentTime);
    toast(`${delta > 0 ? '+' : ''}${delta}s`);
  }, []);

  const replay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    setEnded(false);
    video.currentTime = 0;
    attemptPlay();
  }, [attemptPlay]);

  const toggleFullscreen = useCallback(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const doc = document as Document & { webkitFullscreenElement?: Element; webkitExitFullscreen?: () => void };
    const el = viewport as HTMLDivElement & { webkitRequestFullscreen?: () => Promise<void> };
    const video = videoRef.current as (HTMLVideoElement & { webkitEnterFullscreen?: () => void }) | null;
    const isOn = Boolean(doc.fullscreenElement || doc.webkitFullscreenElement);
    if (isOn) {
      (document.exitFullscreen || doc.webkitExitFullscreen)?.call(document);
      return;
    }
    // iOS Safari only allows fullscreen on the video element itself.
    if (video?.webkitEnterFullscreen) {
      try {
        video.webkitEnterFullscreen();
        return;
      } catch {
        /* fall through to standard API */
      }
    }
    (viewport.requestFullscreen || el.webkitRequestFullscreen)?.call(viewport)?.catch(() => toast('Fullscreen unavailable'));
  }, []);

  const togglePip = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (document.pictureInPictureElement) {
      document.exitPictureInPicture().catch(() => {});
    } else if (video.requestPictureInPicture) {
      video.requestPictureInPicture().catch(() => toast('PiP unavailable on this browser'));
    } else {
      toast('PiP unavailable on this browser');
    }
  }, []);

  /* ---------- media event handlers ---------- */
  const handleLoadedMetadata = () => {
    const video = videoRef.current;
    if (video) setDuration(Number.isFinite(video.duration) ? video.duration : 0);
  };
  const handleTimeUpdate = () => {
    const video = videoRef.current;
    if (!video) return;
    setCurrent(video.currentTime);
    if (video.buffered.length) setBuffered(video.buffered.end(video.buffered.length - 1));
  };
  const handleProgress = () => {
    const video = videoRef.current;
    if (video?.buffered.length) setBuffered(video.buffered.end(video.buffered.length - 1));
  };
  const handleEnded = () => {
    setPlaying(false);
    setEnded(true);
    setShowPoster(true);
    onEnded?.();
  };

  /* ---------- viewport interaction ---------- */
  const onViewportPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (coarse) return;
    armHide();
    event.stopPropagation();
  };

  const onViewportPointerLeave = () => {
    if (!coarse && playing && !rateOpen && !volOpen) setUiOn(false);
  };

  const onViewportClick = (event: ReactMouseEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement;
    if (target.closest('button, .vp-slider, .vp-pop, .vp-end')) return;
    // Coarse pointers: first tap reveals the chrome, the next tap toggles.
    if (coarse && !showUI) {
      armHide();
      return;
    }
    togglePlay();
  };

  const onViewportPointerDownCapture = (event: ReactPointerEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement;
    if (rateOpen && !target.closest('.vp-rate-host')) setRateOpen(false);
    if (volOpen && !target.closest('.vp-vol-wrap')) setVolOpen(false);
  };

  const onViewportKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.metaKey || event.ctrlKey || event.altKey) return;
    const key = event.key;
    const lower = key.toLowerCase();
    if (key === ' ' || lower === 'k') {
      event.preventDefault();
      togglePlay();
    } else if (lower === 'm') toggleMute();
    else if (lower === 'f') toggleFullscreen();
    else if (key === 'ArrowLeft') {
      event.preventDefault();
      seekBy(-5);
    } else if (key === 'ArrowRight') {
      event.preventDefault();
      seekBy(5);
    } else if (lower === 'j') {
      event.preventDefault();
      seekBy(-10);
    } else if (lower === 'l') {
      event.preventDefault();
      seekBy(10);
    } else if (lower === 'c' && subtitlesUrl) toggleCaptions();
    else if (lower === 'p' && pipOk) togglePip();
    else if (lower === 'r') replay();
    else if (/^[1-6]$/.test(lower)) applyRate(RATES[Number(lower) - 1]);
  };

  const toggleCaptions = useCallback(() => {
    setCaptionsOn((value) => {
      toast(!value ? 'Captions on' : 'Captions off');
      return !value;
    });
  }, []);

  /* ---------- seek slider ---------- */
  const fracFrom = (clientX: number, el: HTMLElement) => {
    const rect = el.getBoundingClientRect();
    return Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
  };

  const onSeekPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!canSeek) return;
    event.preventDefault();
    event.stopPropagation();
    seekDragging.current = true;
    event.currentTarget.classList.add('is-grabbing');
    event.currentTarget.setPointerCapture(event.pointerId);
    const video = videoRef.current;
    if (video) {
      video.currentTime = fracFrom(event.clientX, event.currentTarget) * (video.duration || 0);
      setCurrent(video.currentTime);
    }
  };

  const onSeekPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const slider = event.currentTarget;
    if (seekDragging.current) {
      const video = videoRef.current;
      if (video) {
        video.currentTime = fracFrom(event.clientX, slider) * (video.duration || 0);
        setCurrent(video.currentTime);
      }
      return;
    }
    if (coarse || !canSeek) return;
    const frac = fracFrom(event.clientX, slider);
    const left = Math.max(24, Math.min(slider.offsetWidth - 24, frac * slider.offsetWidth));
    setSeekPreview({ left, text: formatTime(frac * duration) });
  };

  const onSeekPointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!seekDragging.current) return;
    seekDragging.current = false;
    event.currentTarget.classList.remove('is-grabbing');
    setSeekPreview(null);
    armHide();
  };

  const onSeekPointerLeave = () => {
    if (previewTimer.current) window.clearTimeout(previewTimer.current);
    previewTimer.current = window.setTimeout(() => setSeekPreview(null), 120);
  };

  /* ---------- volume slider ---------- */
  const applyVolume = (clientX: number, el: HTMLElement) => {
    const video = videoRef.current;
    if (!video) return;
    const next = fracFrom(clientX, el);
    video.muted = next === 0;
    video.volume = next;
    setVolume(next);
    setMuted(video.muted);
    setAudioBlocked(false);
  };

  const onVolumePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    volDragging.current = true;
    event.currentTarget.classList.add('is-grabbing');
    event.currentTarget.setPointerCapture(event.pointerId);
    applyVolume(event.clientX, event.currentTarget);
  };

  const onVolumePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (volDragging.current) applyVolume(event.clientX, event.currentTarget);
  };

  const onVolumePointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!volDragging.current) return;
    volDragging.current = false;
    event.currentTarget.classList.remove('is-grabbing');
  };

  const onVolumeButtonEnter = () => {
    if (!coarse) setVolOpen(true);
  };

  const onVolumeWrapLeave = () => {
    if (!coarse) setVolOpen(false);
  };

  const onVolumeButtonClick = (event: ReactMouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    if (coarse) setVolOpen((value) => !value);
    else toggleMute();
  };

  const VolumeIcon = muted || volume === 0 ? VolumeX : volume < 0.5 ? Volume1 : Volume2;

  return (
    <div className={`vp-player ${variant === 'card' ? 'vp-card' : 'vp-feature'} ${fill ? 'vp-fill' : 'vp-box'} ${className}`}>
      <div
        ref={viewportRef}
        className={`vp-viewport ${showUI ? 'vp-ui' : ''} ${playing ? 'vp-playing' : 'vp-paused'} ${ended ? 'vp-ended' : ''}`}
        tabIndex={0}
        role="region"
        aria-label={title ? `Video player: ${title}` : 'Video player'}
        onClick={onViewportClick}
        onKeyDown={onViewportKeyDown}
        onPointerMove={onViewportPointerMove}
        onPointerLeave={onViewportPointerLeave}
        onPointerDownCapture={onViewportPointerDownCapture}
      >
        <video
          ref={videoRef}
          src={src}
          preload="metadata"
          playsInline
          loop={loop}
          controlsList="nodownload noremoteplayback"
          onLoadedMetadata={handleLoadedMetadata}
          onDurationChange={handleLoadedMetadata}
          onTimeUpdate={handleTimeUpdate}
          onProgress={handleProgress}
          onPlay={() => {
            setPlaying(true);
            setEnded(false);
            setShowPoster(false);
            armHide();
          }}
          onPause={() => setPlaying(false)}
          onEnded={handleEnded}
          onWaiting={() => setWaiting(true)}
          onPlaying={() => setWaiting(false)}
          onCanPlay={() => setWaiting(false)}
          onError={() => setError(true)}
        >
          {subtitlesUrl ? <track ref={trackRef} kind="subtitles" src={subtitlesUrl} label="Subtitles" /> : null}
        </video>

        {poster ? <div className={`vp-poster ${showPoster ? 'is-visible' : ''}`} style={{ backgroundImage: `url("${poster}")` }} /> : null}

        <div className={`vp-spinner ${waiting ? 'is-show' : ''}`} aria-hidden="true">
          <svg viewBox="0 0 24 24">
            <circle className="vp-arc" cx="12" cy="12" r="10" />
          </svg>
        </div>

        <button type="button" className="vp-bigplay" aria-label="Play" onClick={(event) => { event.stopPropagation(); togglePlay(); }}>
          <span className="vp-bigplay-circle">
            <svg viewBox="0 0 24 24"><path d="M7 4.5v15l13-7.5-13-7.5z" /></svg>
          </span>
        </button>

        {variant === 'feature' && (
          <div className="vp-topbar">
            <div className="vp-brand-chip">
              <span className="vp-live-dot" />
              <b>Jamino Player</b>
            </div>
            <div className="vp-top-acts">
              <div className="vp-pop-host vp-rate-host">
                <button type="button" className={`vp-ibtn ${rateOpen ? 'is-active' : ''}`} title="Playback speed" onClick={(event) => { event.stopPropagation(); setRateOpen((value) => !value); }}>
                  <Gauge size={19} />
                </button>
                <div className={`vp-pop ${rateOpen ? 'is-open' : ''}`}>
                  <div className="vp-pop-title">Speed</div>
                  {RATES.map((value) => (
                    <button type="button" key={value} className={`vp-pop-item ${rate === value ? 'is-on' : ''}`} onClick={(event) => { event.stopPropagation(); applyRate(value); }}>
                      <span>{value === 1 ? 'Normal' : `${value}×`}</span>
                      <span className="vp-go">{value === 1 ? '1×' : `${value}×`}</span>
                    </button>
                  ))}
                </div>
              </div>
              {pipOk && (
                <button type="button" className="vp-ibtn" title="Picture-in-Picture (P)" onClick={(event) => { event.stopPropagation(); togglePip(); }}>
                  <PictureInPicture2 size={19} />
                </button>
              )}
              <button type="button" className="vp-ibtn" title="Fullscreen (F)" onClick={(event) => { event.stopPropagation(); toggleFullscreen(); }}>
                {fullscreen ? <Minimize size={19} /> : <Maximize size={19} />}
              </button>
            </div>
          </div>
        )}

        <div className="vp-overlay">
          {variant === 'feature' && (
            <div className="vp-meta">
              <div className="vp-meta-left">
                <div className="vp-overline">Now playing</div>
                <h1>{title || 'Untitled video'}</h1>
              </div>
              {badge && <span className="vp-badge">{badge}</span>}
            </div>
          )}

          <div className="vp-seek-row">
            <span className="vp-time-code is-current">{formatTime(current)}</span>
            <div
              ref={seekRef}
              className={`vp-slider ${canSeek ? '' : 'vp-slider-disabled'}`}
              onPointerDown={onSeekPointerDown}
              onPointerMove={onSeekPointerMove}
              onPointerUp={onSeekPointerUp}
              onPointerCancel={onSeekPointerUp}
              onPointerLeave={onSeekPointerLeave}
            >
              <div className="vp-track">
                <span className="vp-buffered" style={{ width: `${bufferedPct}%` }} />
                <span className="vp-progress" style={{ width: `${progressPct}%` }} />
              </div>
              <span className="vp-thumb-hit" style={{ left: `max(0px, calc(${progressPct}% - 14px))` }}>
                <span className="vp-thumb" />
              </span>
              {seekPreview && <span className="vp-seek-preview is-show" style={{ left: seekPreview.left }}>{seekPreview.text}</span>}
            </div>
            <span className="vp-time-code">{formatTime(duration)}</span>
          </div>

          <div className="vp-ctl-row">
            <button type="button" className="vp-ibtn vp-play-ctl" title="Play / Pause (Space)" onClick={(event) => { event.stopPropagation(); togglePlay(); }}>
              {playing ? <Pause size={21} /> : <Play size={21} />}
            </button>
            <span className="vp-spacer" />
            {subtitlesUrl && (
              <button type="button" className={`vp-ibtn ${captionsOn ? 'is-active' : ''}`} title="Captions (C)" onClick={(event) => { event.stopPropagation(); toggleCaptions(); }}>
                <Captions size={19} />
              </button>
            )}
            {variant === 'feature' && <span className="vp-spacer" />}
            <div className={`vp-vol-wrap ${volOpen ? 'is-open' : ''}`} onMouseEnter={onVolumeButtonEnter} onMouseLeave={onVolumeWrapLeave}>
              <button type="button" className={`vp-ibtn ${volOpen ? 'is-active' : ''}`} title="Volume (M)" onClick={onVolumeButtonClick}>
                <VolumeIcon size={19} />
              </button>
              <div className={`vp-vol-pop ${volOpen ? 'is-open' : ''}`}>
                <button type="button" className="vp-ibtn" title="Mute / unmute" onClick={(event) => { event.stopPropagation(); toggleMute(); }}>
                  <Volume2 size={19} />
                </button>
                <div
                  className="vp-slider"
                  onPointerDown={onVolumePointerDown}
                  onPointerMove={onVolumePointerMove}
                  onPointerUp={onVolumePointerUp}
                  onPointerCancel={onVolumePointerUp}
                >
                  <div className="vp-track">
                    <span className="vp-progress" style={{ width: `${(muted ? 0 : volume) * 100}%` }} />
                  </div>
                  <span className="vp-thumb-hit" style={{ left: `max(0px, calc(${(muted ? 0 : volume) * 100}% - 14px))` }}>
                    <span className="vp-thumb" />
                  </span>
                </div>
                <span className="vp-vol-pct">{Math.round((muted ? 0 : volume) * 100)}</span>
              </div>
            </div>
            <button type="button" className="vp-ibtn" title="Fullscreen (F)" onClick={(event) => { event.stopPropagation(); toggleFullscreen(); }}>
              {fullscreen ? <Minimize size={19} /> : <Maximize size={19} />}
            </button>
          </div>
        </div>

        {soundToggle && (
          <button
            type="button"
            className={`vp-sound-chip ${muted ? 'is-muted' : ''}`}
            title={muted ? 'Turn sound on' : 'Mute sound'}
            onClick={(event) => { event.stopPropagation(); toggleMute(); }}
          >
            {muted ? <VolumeX size={17} /> : <Volume2 size={17} />}
          </button>
        )}
        {audioBlocked && muted && <span className="vp-sound-hint">Tap for sound</span>}

        <div className={`vp-error ${error ? 'is-show' : ''}`}>
          <div className="vp-error-inner">
            <div className="vp-error-icon">
              <svg viewBox="0 0 24 24" width="26" height="26" fill="currentColor"><path d="M12 2 1 21h22L12 2zm1 14h-2v2h2v-2zm0-7h-2v5h2V9z" /></svg>
            </div>
            <b>This video cannot be played.</b>
            <p>The file may be missing or the format is not supported.</p>
            <button
              type="button"
              className="vp-btn-pill vp-ghost"
              onClick={(event) => {
                event.stopPropagation();
                const video = videoRef.current;
                if (!video) return;
                setError(false);
                video.load();
                attemptPlay();
              }}
            >
              <RotateCcw size={15} /> Retry
            </button>
          </div>
        </div>

        <div className={`vp-end ${ended && !loop && !error ? 'is-show' : ''}`} onClick={(event) => event.stopPropagation()}>
          <div className="vp-end-card">
            {upNext && (
              <>
                <div className="vp-next-thumb" style={upNext.poster ? { backgroundImage: `url("${upNext.poster}")` } : undefined} />
                <div className="vp-next-info">
                  <span className="vp-up-label">Up next {countdown !== null && <span className="vp-countdown">· auto in {countdown}</span>}</span>
                  <b>{upNext.title}</b>
                  {upNext.sub && <span>{upNext.sub}</span>}
                </div>
                <div className="vp-next-actions">
                  <button type="button" className="vp-btn-pill vp-ghost" title="Replay (R)" onClick={replay}>
                    <RotateCcw size={15} />
                  </button>
                  <button type="button" className="vp-btn-pill" onClick={upNext.onSelect}>
                    Up next <SkipForward size={15} />
                  </button>
                </div>
              </>
            )}
            {!upNext && (
              <>
                <div className="vp-next-info">
                  <span className="vp-up-label">Playback finished</span>
                  <b>{title || 'Video'}</b>
                </div>
                <div className="vp-next-actions">
                  <button type="button" className="vp-btn-pill" onClick={replay}>
                    <RotateCcw size={15} /> Replay
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
