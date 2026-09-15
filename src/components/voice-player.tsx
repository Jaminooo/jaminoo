'use client';

import { useEffect, useRef, useState } from 'react';
import { Pause, Play } from 'lucide-react';

const BARS = 24;

export function VoicePlayer({ src }: { src: string }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    const onMeta = () => setDuration(a.duration || 0);
    const onTime = () => setCurrent(a.currentTime || 0);
    const onEnd = () => {
      setPlaying(false);
      a.currentTime = 0;
    };
    a.addEventListener('loadedmetadata', onMeta);
    a.addEventListener('timeupdate', onTime);
    a.addEventListener('ended', onEnd);
    return () => {
      a.removeEventListener('loadedmetadata', onMeta);
      a.removeEventListener('timeupdate', onTime);
      a.removeEventListener('ended', onEnd);
    };
  }, []);

  const toggle = () => {
    const a = audioRef.current;
    if (!a) return;
    if (playing) {
      a.pause();
    } else {
      a.play().catch(() => {});
    }
  };

  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    a.addEventListener('play', onPlay);
    a.addEventListener('pause', onPause);
    return () => {
      a.removeEventListener('play', onPlay);
      a.removeEventListener('pause', onPause);
    };
  }, []);

  const pct = duration > 0 ? Math.min(100, (current / duration) * 100) : 0;
  const label = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

  return (
    <div className="voice-player" onClick={toggle} role="button" tabIndex={0}>
      <audio ref={audioRef} src={src} preload="metadata" />
      <span className="voice-play">
        {playing ? <Pause size={15} fill="currentColor" /> : <Play size={15} fill="currentColor" style={{ marginInlineStart: 1 }} />}
      </span>
      <span className="voice-wave">
        {Array.from({ length: BARS }).map((_, i) => {
          const h = 30 + ((i * 37 + (i % 3) * 23) % 62);
          const on = (i / BARS) * 100 <= pct;
          return <span key={i} className={`voice-bar${on ? ' on' : ''}`} style={{ height: `${h}%` }} />;
        })}
      </span>
      <span className="voice-time">
        {playing || current > 0 ? label(current ?? 0) : duration > 0 ? label(duration) : '0:00'}
      </span>
    </div>
  );
}