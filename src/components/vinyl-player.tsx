'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { KeyboardEvent as ReactKeyboardEvent, MouseEvent as ReactMouseEvent, PointerEvent as ReactPointerEvent } from 'react';
import {
  Captions,
  Gauge,
  Heart,
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
import { useTranslations } from '@/providers/use-translations';
import { playerSolo } from '@/lib/player-solo';
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
const DOUBLE_TAP_MS = 280;
const MEM_KEY = 'jamino.player.memory';

function readMemory(): { volume?: number; muted?: boolean; rate?: number } {
  if (typeof window === 'undefined') return {};
  try {
    return JSON.parse(window.localStorage.getItem(MEM_KEY) || '{}');
  } catch {
    return {};
  }
}

function writeMemory(patch: { volume?: number; muted?: boolean; rate?: number }) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(MEM_KEY, JSON.stringify({ ...readMemory(), ...patch }));
  } catch {}
}

/** Persisted resume points, keyed by src, capped to the last 40 entries. */
const RESUME_KEY = 'jamino.player.resume';
function readResumeMap(): Record<string, number> {
  if (typeof window === 'undefined') return {};
  try {
    return JSON.parse(window.localStorage.getItem(RESUME_KEY) || '{}');
  } catch {
    return {};
  }
}
function saveResumePoint(src: string, seconds: number) {
  if (typeof window === 'undefined' || !src) return;
  try {
    const map = readResumeMap();
    map[src] = Math.floor(seconds);
    const entries = Object.entries(map);
    if (entries.length > 40) {
      const trimmed = Object.fromEntries(entries.slice(-40));
      window.localStorage.setItem(RESUME_KEY, JSON.stringify(trimmed));
    } else {
      window.localStorage.setItem(RESUME_KEY, JSON.stringify(map));
    }
  } catch {}
}
function clearResumePoint(src: string) {
  if (typeof window === 'undefined' || !src) return;
  try {
    const map = readResumeMap();
    delete map[src];
    window.localStorage.setItem(RESUME_KEY, JSON.stringify(map));
  } catch {}
}

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
  /** Chrome-less mode (shorts feed): hairline progress + big play only. */
  bare?: boolean;
  /** Size the box to the video's real aspect ratio once metadata loads. */
  dynamicAspect?: boolean;
  /** Aspect used before metadata arrives, e.g. '9 / 16'. */
  defaultAspect?: string;
  /** Double-tap on the video fires this (shorts: like). */
  onDoubleTap?: () => void;
  /** Seconds to start from (shared links with &t=). */
  startAt?: number;
  /** Remember the position and offer to resume on revisit. */
  rememberPosition?: boolean;
  className?: string;
  onEnded?: () => void;
  onTimeUpdate?: (seconds: number) => void;
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
  bare = false,
  dynamicAspect = false,
  defaultAspect = '16 / 9',
  onDoubleTap,
  startAt,
  rememberPosition = false,
  className = '',
  onEnded,
  onTimeUpdate,
  upNext,
}: VinylPlayerProps) {
  const t = useTranslations();
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
  const [aspect, setAspect] = useState<string | null>(null);
  const [heart, setHeart] = useState<{ x: number; y: number; key: number } | null>(null);
  const tapTimer = useRef<number | null>(null);
  const resumeApplied = useRef(false);
  const soloIdRef = useRef<symbol | null>(null);
  if (soloIdRef.current === null) soloIdRef.current = Symbol('vinyl-player');

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

  /* ---------- element init: never native controls, restore memory ---------- */
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const mem = readMemory();
    const startVol = typeof mem.volume === 'number' ? Math.min(1, Math.max(0, mem.volume)) : 0.9;
    const startMuted = startUnmuted ? false : mem.muted !== false;
    const startRate = typeof mem.rate === 'number' && RATES.includes(mem.rate) ? mem.rate : 1;
    video.volume = startVol;
    video.muted = startMuted;
    video.playbackRate = startRate;
    setVolume(startVol);
    setMuted(startMuted);
    setRate(startRate);
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
    setAspect(null);
    resumeApplied.current = false;
  }, [src]);

  /* ---------- heart burst auto-dismiss ---------- */
  useEffect(() => {
    if (!heart) return;
    const timer = window.setTimeout(() => setHeart(null), 850);
    return () => window.clearTimeout(timer);
  }, [heart]);

  /* ---------- exclusive playback registration (every player) ---------- */
  useEffect(() => {
    const video = videoRef.current;
    const id = soloIdRef.current;
    if (!video || !id) return;
    const pauseSelf = () => {
      try {
        video.pause();
      } catch {}
    };
    return playerSolo.register(id, pauseSelf);
  }, []);

  /* ---------- visibility-driven autoplay (feed cards) ---------- */
  useEffect(() => {
    if (!autoplayInView || !videoRef.current) return;
    const video = videoRef.current;
    const observer = new IntersectionObserver(
      ([entry]) => {
        const id = soloIdRef.current;
        if (!entry.isIntersecting) {
          video.pause();
          if (id) playerSolo.release(id);
          return;
        }
        if (!id || !playerSolo.tryClaim(id)) return;
        video.muted = mutedRef.current;
        video.play()
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
            if (id) playerSolo.release(id);
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
    if (tapTimer.current) window.clearTimeout(tapTimer.current);
    const video = videoRef.current;
    if (video && rememberPosition && Number.isFinite(video.duration)) {
      if (video.currentTime > 5 && video.currentTime < video.duration - 10) saveResumePoint(src, video.currentTime);
      else if (video.currentTime >= video.duration - 10) clearResumePoint(src);
    }
    video?.pause();
    const id = soloIdRef.current;
    if (id) playerSolo.release(id);
  }, [rememberPosition, src]);

  /* ---------- helpers ---------- */
  const armHide = useCallback(() => {
    setUiOn(true);
    if (uiTimer.current) window.clearTimeout(uiTimer.current);
    uiTimer.current = window.setTimeout(() => setUiOn(false), IDLE_MS);
  }, []);

  const attemptPlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    const id = soloIdRef.current;
    if (id) playerSolo.claim(id);
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
    writeMemory({ muted: video.muted });
    toast(video.muted ? t('vp.muted') : t('vp.soundOn'));
  }, []);

  const applyRate = useCallback((nextRate: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.playbackRate = nextRate;
    setRate(nextRate);
    setRateOpen(false);
    writeMemory({ rate: nextRate });
    toast(t('vp.speedChanged', { n: nextRate }));
  }, []);

  const seekBy = useCallback((delta: number) => {
    const video = videoRef.current;
    if (!video || !Number.isFinite(video.duration)) return;
    video.currentTime = Math.max(0, Math.min(video.duration, video.currentTime + delta));
    setCurrent(video.currentTime);
    toast(t('vp.seeked', { delta: `${delta > 0 ? '+' : ''}${delta}` }));
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
    (viewport.requestFullscreen || el.webkitRequestFullscreen)?.call(viewport)?.catch(() => toast(t('vp.fullscreenUnavailable')));
  }, []);

  const togglePip = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (document.pictureInPictureElement) {
      document.exitPictureInPicture().catch(() => {});
    } else if (video.requestPictureInPicture) {
      video.requestPictureInPicture().catch(() => toast(t('vp.pipUnavailable')));
    } else {
      toast(t('vp.pipUnavailable'));
    }
  }, []);

  /* ---------- media event handlers ---------- */
  const handleLoadedMetadata = () => {
    const video = videoRef.current;
    if (!video) return;
    const videoDuration = Number.isFinite(video.duration) ? video.duration : 0;
    setDuration(videoDuration);
    if (dynamicAspect && video.videoWidth && video.videoHeight) {
      setAspect(`${video.videoWidth} / ${video.videoHeight}`);
    }
    // Restore position once per src: explicit startAt wins, then saved resume.
    if (!resumeApplied.current && videoDuration > 0) {
      resumeApplied.current = true;
      const saved = rememberPosition && !startAt ? readResumeMap()[src] ?? 0 : 0;
      const start = startAt && startAt > 0 && startAt < videoDuration - 2 ? startAt : saved;
      if (start > 2 && start < videoDuration - 2) {
        video.currentTime = start;
        setCurrent(start);
      }
    }
  };
  const handleTimeUpdate = () => {
    const video = videoRef.current;
    if (!video) return;
    setCurrent(video.currentTime);
    if (video.buffered.length) setBuffered(video.buffered.end(video.buffered.length - 1));
    onTimeUpdate?.(video.currentTime);
  };
  const handleProgress = () => {
    const video = videoRef.current;
    if (video?.buffered.length) setBuffered(video.buffered.end(video.buffered.length - 1));
  };
  const handleEnded = () => {
    setPlaying(false);
    setEnded(true);
    setShowPoster(true);
    if (rememberPosition && src) clearResumePoint(src);
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
    // Double-tap on the video surface fires the like burst (shorts).
    if (onDoubleTap) {
      const rect = viewportRef.current?.getBoundingClientRect();
      if (tapTimer.current) {
        window.clearTimeout(tapTimer.current);
        tapTimer.current = null;
        setHeart({ x: event.clientX - (rect?.left ?? 0), y: event.clientY - (rect?.top ?? 0), key: Date.now() });
        onDoubleTap();
        return;
      }
      tapTimer.current = window.setTimeout(() => {
        tapTimer.current = null;
        togglePlay();
      }, DOUBLE_TAP_MS);
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
      toast(!value ? t('vp.captionsOn') : t('vp.captionsOff'));
      return !value;
    });
  }, [t]);

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
    writeMemory({ volume: next, muted: video.muted });
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
    <div
      className={`vp-player ${variant === 'card' ? 'vp-card' : 'vp-feature'} ${fill ? 'vp-fill' : 'vp-box'} ${className}`}
      style={!fill ? { aspectRatio: dynamicAspect && aspect ? aspect : defaultAspect } : undefined}
    >
      <div
        ref={viewportRef}
        className={`vp-viewport ${showUI ? 'vp-ui' : ''} ${playing ? 'vp-playing' : 'vp-paused'} ${ended ? 'vp-ended' : ''}`}
        tabIndex={0}
        role="region"
        aria-label={t('vp.playerLabel', { title: title || t('vp.video') })}
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
            const id = soloIdRef.current;
            if (id) playerSolo.claim(id);
            setPlaying(true);
            setEnded(false);
            setShowPoster(false);
            armHide();
          }}
          onPause={() => {
            const id = soloIdRef.current;
            if (id) playerSolo.release(id);
            setPlaying(false);
          }}
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

        <button type="button" className="vp-bigplay" aria-label={t('vp.play')} onClick={(event) => { event.stopPropagation(); togglePlay(); }}>
          <span className="vp-bigplay-circle">
            <svg viewBox="0 0 24 24"><path d="M7 4.5v15l13-7.5-13-7.5z" /></svg>
          </span>
        </button>

        {variant === 'feature' && !bare && (
          <div className="vp-topbar">
            <div className="vp-brand-chip">
              <span className="vp-live-dot" />
              <b>{t('vp.playerName')}</b>
            </div>
            <div className="vp-top-acts">
              <div className="vp-pop-host vp-rate-host">
                <button type="button" className={`vp-ibtn ${rateOpen ? 'is-active' : ''}`} title={t('vp.playbackSpeed')} onClick={(event) => { event.stopPropagation(); setRateOpen((value) => !value); }}>
                  <Gauge size={19} />
                </button>
                <div className={`vp-pop ${rateOpen ? 'is-open' : ''}`}>
                  <div className="vp-pop-title">{t('vp.speed')}</div>
                  {RATES.map((value) => (
                    <button type="button" key={value} className={`vp-pop-item ${rate === value ? 'is-on' : ''}`} onClick={(event) => { event.stopPropagation(); applyRate(value); }}>
                      <span>{value === 1 ? t('vp.normal') : `${value}×`}</span>
                      <span className="vp-go">{value === 1 ? '1×' : `${value}×`}</span>
                    </button>
                  ))}
                </div>
              </div>
              {pipOk && (
                <button type="button" className="vp-ibtn" title={t('vp.pip')} onClick={(event) => { event.stopPropagation(); togglePip(); }}>
                  <PictureInPicture2 size={19} />
                </button>
              )}
              <button type="button" className="vp-ibtn" title={fullscreen ? t('vp.exitFullscreen') : t('vp.fullscreen')} onClick={(event) => { event.stopPropagation(); toggleFullscreen(); }}>
                {fullscreen ? <Minimize size={19} /> : <Maximize size={19} />}
              </button>
            </div>
          </div>
        )}

        {!bare && (
          <div className="vp-overlay">
          {variant === 'feature' && (
            <div className="vp-meta">
              <div className="vp-meta-left">
                <div className="vp-overline">{t('vp.nowPlaying')}</div>
                <h1>{title || t('vp.untitled')}</h1>
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
            <button type="button" className="vp-ibtn vp-play-ctl" title={t('vp.playPause')} onClick={(event) => { event.stopPropagation(); togglePlay(); }}>
              {playing ? <Pause size={21} /> : <Play size={21} />}
            </button>
            <span className="vp-spacer" />
            {subtitlesUrl && (
              <button type="button" className={`vp-ibtn ${captionsOn ? 'is-active' : ''}`} title={t('vp.captions')} onClick={(event) => { event.stopPropagation(); toggleCaptions(); }}>
                <Captions size={19} />
              </button>
            )}
            {variant === 'feature' && <span className="vp-spacer" />}
            <div className={`vp-vol-wrap ${volOpen ? 'is-open' : ''}`} onMouseEnter={onVolumeButtonEnter} onMouseLeave={onVolumeWrapLeave}>
              <button type="button" className={`vp-ibtn ${volOpen ? 'is-active' : ''}`} title={t('vp.volume')} onClick={onVolumeButtonClick}>
                <VolumeIcon size={19} />
              </button>
              <div className={`vp-vol-pop ${volOpen ? 'is-open' : ''}`}>
                <button type="button" className="vp-ibtn" title={t('vp.mute')} onClick={(event) => { event.stopPropagation(); toggleMute(); }}>
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
            <button type="button" className="vp-ibtn" title={fullscreen ? t('vp.exitFullscreen') : t('vp.fullscreen')} onClick={(event) => { event.stopPropagation(); toggleFullscreen(); }}>
              {fullscreen ? <Minimize size={19} /> : <Maximize size={19} />}
            </button>
          </div>
          </div>
        )}

        {bare && <div className="vp-hairline"><span style={{ width: `${progressPct}%` }} /></div>}

        {soundToggle && (
          <button
            type="button"
            className={`vp-sound-chip ${muted ? 'is-muted' : ''}`}
            title={muted ? t('vp.soundOn') : t('vp.mute')}
            onClick={(event) => { event.stopPropagation(); toggleMute(); }}
          >
            {muted ? <VolumeX size={17} /> : <Volume2 size={17} />}
          </button>
        )}
        {audioBlocked && muted && <span className="vp-sound-hint">{t('vp.tapForSound')}</span>}

        {heart && (
          <span key={heart.key} className="vp-heart-burst" style={{ left: heart.x, top: heart.y }} aria-hidden="true">
            <Heart size={74} fill="currentColor" />
          </span>
        )}

        <div className={`vp-error ${error ? 'is-show' : ''}`}>
          <div className="vp-error-inner">
            <div className="vp-error-icon">
              <svg viewBox="0 0 24 24" width="26" height="26" fill="currentColor"><path d="M12 2 1 21h22L12 2zm1 14h-2v2h2v-2zm0-7h-2v5h2V9z" /></svg>
            </div>
            <b>{t('vp.errorTitle')}</b>
            <p>{t('vp.errorDesc')}</p>
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
              <RotateCcw size={15} /> {t('vp.retry')}
            </button>
          </div>
        </div>

        <div className={`vp-end ${ended && !loop && !error ? 'is-show' : ''}`} onClick={(event) => event.stopPropagation()}>
          <div className="vp-end-card">
            {upNext && (
              <>
                <div className="vp-next-thumb" style={upNext.poster ? { backgroundImage: `url("${upNext.poster}")` } : undefined} />
                <div className="vp-next-info">
                  <span className="vp-up-label">{t('vp.upNext')}{countdown !== null && <span className="vp-countdown">· {t('vp.autoIn', { n: countdown })}</span>}</span>
                  <b>{upNext.title}</b>
                  {upNext.sub && <span>{upNext.sub}</span>}
                </div>
                <div className="vp-next-actions">
                  <button type="button" className="vp-btn-pill vp-ghost" title={t('vp.replay')} onClick={replay}>
                    <RotateCcw size={15} />
                  </button>
                  <button type="button" className="vp-btn-pill" onClick={upNext.onSelect}>
                    {t('vp.upNext')} <SkipForward size={15} />
                  </button>
                </div>
              </>
            )}
            {!upNext && (
              <>
                <div className="vp-next-info">
                  <span className="vp-up-label">{t('vp.playbackFinished')}</span>
                  <b>{title || t('vp.video')}</b>
                </div>
                <div className="vp-next-actions">
                  <button type="button" className="vp-btn-pill" onClick={replay}>
                    <RotateCcw size={15} /> {t('vp.replay')}
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
