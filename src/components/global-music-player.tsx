'use client';
import { useEffect, useRef, useState } from 'react';
import { ChevronDown, Heart, Pause, Play, SkipBack, SkipForward, Volume2, X } from 'lucide-react';
import type { MusicSong } from '@/components/music-player';

function artist(song: MusicSong) {
  return song.artist?.name || 'Jamino artist';
}
function clock(value: number) {
  const minutes = Math.floor(value / 60);
  const seconds = Math.floor(value % 60);
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

export function GlobalMusicPlayer() {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [song, setSong] = useState<MusicSong | null>(null);
  const [playing, setPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem('jamino.global-song');
      if (saved) setSong(JSON.parse(saved) as MusicSong);
    } catch {}
    const onPlaySong = (event: Event) => {
      const next = (event as CustomEvent<{ song: MusicSong }>).detail?.song;
      if (!next) return;
      if (song?.id === next.id && audioRef.current) {
        if (audioRef.current.paused) audioRef.current.play().catch(() => {});
        else audioRef.current.pause();
        return;
      }
      setSong(next);
    };
    window.addEventListener('jamino:play-song', onPlaySong);
    return () => window.removeEventListener('jamino:play-song', onPlaySong);
  }, [song?.id]);

  useEffect(() => {
    if (!song || !audioRef.current) return;
    const audio = audioRef.current;
    audio.src = song.audioUrl || song.audioLink || '';
    audio.load();
    window.localStorage.setItem('jamino.global-song', JSON.stringify(song));
    if (song.audioUrl || song.audioLink) audio.play().catch(() => setPlaying(false));
  }, [song]);

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume;
  }, [volume]);

  if (!song) return null;
  const max = duration || song.durationSec || 1;
  return (
    <section className={`global-player ${expanded ? 'is-expanded' : ''}`} aria-label="Jamino music player">
      <audio ref={audioRef} preload="metadata" onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onLoadedMetadata={(event) => setDuration(event.currentTarget.duration || song.durationSec || 0)} onTimeUpdate={(event) => setPosition(event.currentTarget.currentTime)} onEnded={() => setPlaying(false)} />
      <div className="global-player-progress"><span style={{ width: `${Math.min(100, (position / max) * 100)}%` }} /></div>
      <div className="global-player-main">
        <button className="global-player-cover" type="button" onClick={() => setExpanded((value) => !value)} aria-label="Expand player">{song.coverUrl ? <img src={song.coverUrl} alt="" /> : <span>♫</span>}</button>
        <div className="global-player-track"><strong>{song.title}</strong><span>{artist(song)}</span></div>
        <div className="global-player-actions"><button type="button" className="global-player-icon" aria-label="Like"><Heart size={16} /></button><button type="button" className="global-player-icon" onClick={() => { if (audioRef.current) audioRef.current.currentTime = Math.max(0, audioRef.current.currentTime - 10); }} aria-label="Previous"><SkipBack size={17} /></button><button type="button" className="global-player-play" onClick={() => { if (!audioRef.current) return; if (audioRef.current.paused) audioRef.current.play().catch(() => {}); else audioRef.current.pause(); }} aria-label={playing ? 'Pause' : 'Play'}>{playing ? <Pause size={17} fill="currentColor" /> : <Play size={17} fill="currentColor" />}</button><button type="button" className="global-player-icon" onClick={() => { if (audioRef.current) audioRef.current.currentTime = Math.min(max, audioRef.current.currentTime + 10); }} aria-label="Next"><SkipForward size={17} /></button></div>
        <div className="global-player-seek"><span>{clock(position)}</span><input type="range" min="0" max={max} step="0.1" value={Math.min(position, max)} onChange={(event) => { const next = Number(event.target.value); if (audioRef.current) audioRef.current.currentTime = next; setPosition(next); }} /><span>{clock(max)}</span></div>
        <div className="global-player-volume"><Volume2 size={15} /><input type="range" min="0" max="1" step="0.01" value={volume} onChange={(event) => setVolume(Number(event.target.value))} /></div>
        <button type="button" className="global-player-icon" onClick={() => setExpanded((value) => !value)} aria-label="Toggle player"><ChevronDown size={17} /></button><button type="button" className="global-player-icon" onClick={() => { audioRef.current?.pause(); setSong(null); window.localStorage.removeItem('jamino.global-song'); }} aria-label="Close player"><X size={16} /></button>
      </div>
      {expanded && <div className="global-player-expanded"><div className="global-player-expanded-art">{song.coverUrl ? <img src={song.coverUrl} alt="" /> : <span>♫</span>}</div><div><small>NOW PLAYING</small><h3>{song.title}</h3><p>{artist(song)}</p></div></div>}
    </section>
  );
}
