'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, ChevronUp, Heart, ListMusic, MoreHorizontal, Pause, Play, Repeat, Shuffle, SkipBack, SkipForward, Volume1, Volume2, VolumeX, X } from 'lucide-react';
import { api } from '@/lib/client-api';
import { useTranslations } from '@/providers/use-translations';
import type { MusicSong } from '@/components/music-player';

const SONG_KEY = 'jamino.global-song';
const QUEUE_KEY = 'jamino.global-queue';
const PREF_KEY = 'jamino.global-player-prefs';
type RepeatMode = 'off' | 'all' | 'one';
type PlayerEvent = { song: MusicSong; queue?: MusicSong[]; autoplay?: boolean };

function clock(value: number) { const total = Math.max(0, Math.floor(value)); return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`; }
function read<T>(key: string, fallback: T): T { try { const value = window.localStorage.getItem(key); return value ? JSON.parse(value) as T : fallback; } catch { return fallback; } }

export function GlobalMusicPlayer() {
  const t = useTranslations();
  const audioRef = useRef<HTMLAudioElement>(null);
  const [song, setSong] = useState<MusicSong | null>(null);
  const [queue, setQueue] = useState<MusicSong[]>([]);
  const [playing, setPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [muted, setMuted] = useState(false);
  const [shuffle, setShuffle] = useState(false);
  const [repeat, setRepeat] = useState<RepeatMode>('off');
  const [liked, setLiked] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [queueOpen, setQueueOpen] = useState(false);
  const [mobileOptionsOpen, setMobileOptionsOpen] = useState(false);
  const [blocked, setBlocked] = useState(false);

  const currentIndex = useMemo(() => song ? queue.findIndex((item) => item.id === song.id) : -1, [queue, song]);
  const max = duration || song?.durationSec || 1;
  const artistLabel = song?.artist?.name || t('music.unknownArtist');

  const broadcast = useCallback((nextSong: MusicSong | null, nextPlaying: boolean) => {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new CustomEvent('jamino:player-state', { detail: { song: nextSong, playing: nextPlaying } }));
  }, []);

  const loadSong = useCallback((next: MusicSong, autoplay = true) => {
    setSong(next);
    setPosition(0);
    setDuration(next.durationSec || 0);
    setBlocked(false);
    window.localStorage.setItem(SONG_KEY, JSON.stringify(next));
    if (autoplay) broadcast(next, true);
  }, [broadcast]);

  const playAt = useCallback((index: number, direction: 1 | -1 = 1) => {
    if (!queue.length) return;
    const nextIndex = (index + queue.length) % queue.length;
    loadSong(queue[nextIndex], true);
    if (direction === -1) setPosition(0);
  }, [loadSong, queue]);

  const next = useCallback(() => {
    if (!queue.length || currentIndex < 0) return;
    if (shuffle && queue.length > 1) {
      const candidates = queue.map((_, index) => index).filter((index) => index !== currentIndex);
      playAt(candidates[Math.floor(Math.random() * candidates.length)]);
    } else playAt(currentIndex + 1);
  }, [currentIndex, playAt, queue, shuffle]);

  const previous = useCallback(() => {
    if (audioRef.current && audioRef.current.currentTime > 3) { audioRef.current.currentTime = 0; setPosition(0); return; }
    if (currentIndex >= 0) playAt(currentIndex - 1, -1);
  }, [currentIndex, playAt]);

  useEffect(() => {
    const prefs = read<{ volume?: number; muted?: boolean; shuffle?: boolean; repeat?: RepeatMode }>(PREF_KEY, {});
    if (typeof prefs.volume === 'number') setVolume(prefs.volume);
    if (typeof prefs.muted === 'boolean') setMuted(prefs.muted);
    if (typeof prefs.shuffle === 'boolean') setShuffle(prefs.shuffle);
    if (prefs.repeat) setRepeat(prefs.repeat);
    const saved = read<MusicSong | null>(SONG_KEY, null);
    const savedQueue = read<MusicSong[]>(QUEUE_KEY, []);
    if (saved) setSong(saved);
    if (savedQueue.length) setQueue(savedQueue);
    const onPlaySong = (event: Event) => {
      const detail = (event as CustomEvent<PlayerEvent>).detail;
      if (!detail?.song) return;
      if (detail.queue?.length) { setQueue(detail.queue); window.localStorage.setItem(QUEUE_KEY, JSON.stringify(detail.queue)); }
      if (song?.id === detail.song.id && audioRef.current) {
        if (audioRef.current.paused) audioRef.current.play().then(() => { setPlaying(true); broadcast(detail.song, true); }).catch(() => setBlocked(true));
        else { audioRef.current.pause(); setPlaying(false); broadcast(detail.song, false); }
      } else loadSong(detail.song, detail.autoplay !== false);
    };
    window.addEventListener('jamino:play-song', onPlaySong);
    return () => window.removeEventListener('jamino:play-song', onPlaySong);
  }, [broadcast, loadSong, song?.id]);

  useEffect(() => {
    if (!song || !audioRef.current) return;
    const audio = audioRef.current;
    audio.src = song.audioUrl || song.audioLink || '';
    audio.volume = volume;
    audio.muted = muted;
    audio.load();
    if (song.audioUrl || song.audioLink) audio.play().then(() => { setPlaying(true); broadcast(song, true); }).catch(() => { setPlaying(false); setBlocked(true); });
    if ('mediaSession' in navigator) {
      navigator.mediaSession.metadata = new MediaMetadata({ title: song.title, artist: artistLabel, album: song.album?.title || t('brand.name'), artwork: song.coverUrl ? [{ src: song.coverUrl }] : [] });
      navigator.mediaSession.setActionHandler('play', () => audio.play().catch(() => {}));
      navigator.mediaSession.setActionHandler('pause', () => audio.pause());
      navigator.mediaSession.setActionHandler('previoustrack', previous);
      navigator.mediaSession.setActionHandler('nexttrack', next);
    }
    return () => { audio.pause(); };
  }, [broadcast, muted, next, previous, song, volume, artistLabel, t]);

  useEffect(() => { if (audioRef.current) { audioRef.current.volume = volume; audioRef.current.muted = muted; } window.localStorage.setItem(PREF_KEY, JSON.stringify({ volume, muted, shuffle, repeat })); }, [muted, repeat, shuffle, volume]);

  const toggleLike = async () => {
    if (!song) return;
    const nextLiked = !liked;
    setLiked(nextLiked);
    try { await api('/api/music/favorites', { method: nextLiked ? 'POST' : 'DELETE', body: JSON.stringify({ songId: song.id }) }); } catch { setLiked(!nextLiked); }
  };
  const toggle = () => {
    const audio = audioRef.current;
    if (!audio || !song) return;
    if (audio.paused) audio.play().then(() => { setPlaying(true); broadcast(song, true); }).catch(() => setBlocked(true));
    else { audio.pause(); setPlaying(false); broadcast(song, false); }
  };
  const cycleRepeat = () => setRepeat((value) => value === 'off' ? 'all' : value === 'all' ? 'one' : 'off');
  const onEnded = () => { if (repeat === 'one') { if (audioRef.current) { audioRef.current.currentTime = 0; audioRef.current.play().catch(() => {}); } return; } next(); };
  const closePlayer = () => { audioRef.current?.pause(); setSong(null); setQueue([]); window.localStorage.removeItem(SONG_KEY); window.localStorage.removeItem(QUEUE_KEY); };
  if (!song) return null;
  return (
    <section className={`global-player ${expanded ? 'is-expanded' : ''}`} aria-label={`${t('brand.name')} ${t('music.playerLabel')}`}>
      <audio ref={audioRef} preload="metadata" onPlay={() => { setPlaying(true); broadcast(song, true); }} onPause={() => { setPlaying(false); broadcast(song, false); }} onLoadedMetadata={(event) => setDuration(event.currentTarget.duration || song.durationSec || 0)} onTimeUpdate={(event) => setPosition(event.currentTarget.currentTime)} onEnded={onEnded} />
      {queueOpen && <div className="global-player-queue"><div className="global-player-queue-head"><strong>{t('music.queue')}</strong><button type="button" onClick={() => setQueueOpen(false)} aria-label={t('modal.close')}><X size={16} /></button></div>{queue.length ? queue.map((item) => <button key={item.id} type="button" className={`global-player-queue-item ${item.id === song.id ? 'active' : ''}`} onClick={() => { loadSong(item); setQueueOpen(false); }}><span>{item.coverUrl ? <img src={item.coverUrl} alt="" /> : <span className="queue-placeholder">♫</span>}</span><span><b>{item.title}</b><small>{item.artist?.name || t('music.unknownArtist')}</small></span></button>) : <p>{t('music.queueEmpty')}</p>}</div>}
      <div className="global-player-progress"><span style={{ width: `${Math.min(100, (position / max) * 100)}%` }} /></div>
      <div className="global-player-main">
        <button className="global-player-cover" type="button" onClick={() => setExpanded((value) => !value)} aria-label={t('music.expandPlayer')}>{song.coverUrl ? <img src={song.coverUrl} alt="" /> : <span>♫</span>}</button>
        <div className="global-player-track"><strong>{song.title}</strong><span>{artistLabel}</span></div>
        <div className="global-player-actions">
          <button type="button" className={`global-player-icon global-player-shuffle ${shuffle ? 'is-active' : ''}`} onClick={() => setShuffle((value) => !value)} aria-label={t('music.shuffle')} aria-pressed={shuffle}><Shuffle size={16} /></button>
          <button type="button" className="global-player-icon" onClick={previous} aria-label={t('music.previousSong')}><SkipBack size={17} /></button>
          <button type="button" className="global-player-play" onClick={toggle} aria-label={playing ? t('music.pause') : t('music.play')} aria-pressed={playing}>{playing ? <Pause size={17} fill="currentColor" /> : <Play size={17} fill="currentColor" />}</button>
          <button type="button" className="global-player-icon" onClick={next} aria-label={t('music.nextSong')}><SkipForward size={17} /></button>
          <button type="button" className={`global-player-icon global-player-repeat ${repeat !== 'off' ? 'is-active' : ''}`} onClick={cycleRepeat} aria-label={t('music.repeat')} aria-pressed={repeat !== 'off'}><Repeat size={16} /><small>{repeat === 'one' ? '1' : ''}</small></button>
          <button type="button" className="global-player-icon global-player-mobile-more" onClick={() => setMobileOptionsOpen((value) => !value)} aria-label={t('music.playerOptions')} aria-expanded={mobileOptionsOpen} aria-controls="global-player-mobile-options"><MoreHorizontal size={18} /></button>
        </div>
        <div className="global-player-seek"><span>{clock(position)}</span><input aria-label={t('music.seek')} type="range" min="0" max={max} step="0.1" value={Math.min(position, max)} onChange={(event) => { const value = Number(event.target.value); if (audioRef.current) audioRef.current.currentTime = value; setPosition(value); }} /><span>{clock(max)}</span></div>
        <div className="global-player-extra"><button type="button" className={`global-player-icon ${liked ? 'is-liked' : ''}`} onClick={() => void toggleLike()} aria-label={t('music.favorite')}><Heart size={16} fill={liked ? 'currentColor' : 'none'} /></button><button type="button" className="global-player-icon" onClick={() => setQueueOpen((value) => !value)} aria-label={t('music.queue')}><ListMusic size={16} /></button><button type="button" className={`global-player-icon ${muted || volume < 0.01 ? 'is-active' : ''}`} onClick={() => setMuted((value) => !value)} aria-label={t('music.mute')}>{muted || volume === 0 ? <VolumeX size={15} /> : volume < .5 ? <Volume1 size={15} /> : <Volume2 size={15} />}</button><div className="global-player-volbar"><input aria-label={t('music.volume')} type="range" min="0" max="1" step="0.01" value={muted ? 0 : volume} style={{ ['--gp-vol' as string]: `${Math.round((muted ? 0 : volume) * 100)}%` }} onChange={(event) => { setMuted(false); setVolume(Number(event.target.value)); }} /></div><button type="button" className="global-player-icon" onClick={() => setExpanded((value) => !value)} aria-label={expanded ? t('music.collapsePlayer') : t('music.expandPlayer')}>{expanded ? <ChevronDown size={17} /> : <ChevronUp size={17} />}</button><button type="button" className="global-player-icon" onClick={closePlayer} aria-label={t('music.closePlayer')}><X size={16} /></button></div>
      </div>
      {mobileOptionsOpen && (
        <div className="global-player-mobile-options" id="global-player-mobile-options" role="group" aria-label={t('music.playerOptions')}>
          <button type="button" className={`global-player-mobile-option ${liked ? 'is-active' : ''}`} onClick={() => void toggleLike()} aria-label={t('music.favorite')} aria-pressed={liked}><Heart size={16} fill={liked ? 'currentColor' : 'none'} /><span>{t('music.favorite')}</span></button>
          <button type="button" className={`global-player-mobile-option ${queueOpen ? 'is-active' : ''}`} onClick={() => { setQueueOpen((value) => !value); setMobileOptionsOpen(false); }} aria-label={t('music.queue')} aria-pressed={queueOpen}><ListMusic size={16} /><span>{t('music.queue')}</span></button>
          <button type="button" className={`global-player-mobile-option ${muted || volume < 0.01 ? 'is-active' : ''}`} onClick={() => setMuted((value) => !value)} aria-label={t('music.mute')} aria-pressed={muted}>{muted || volume === 0 ? <VolumeX size={16} /> : <Volume2 size={16} />}<span>{t('music.mute')}</span></button>
          <label className="global-player-mobile-volume">
            <span>{t('music.volume')}</span>
            <input aria-label={t('music.volume')} type="range" min="0" max="1" step="0.01" value={muted ? 0 : volume} style={{ ['--gp-vol' as string]: `${Math.round((muted ? 0 : volume) * 100)}%` }} onChange={(event) => { setMuted(false); setVolume(Number(event.target.value)); }} />
          </label>
          <button type="button" className="global-player-mobile-option is-danger" onClick={closePlayer} aria-label={t('music.closePlayer')}><X size={16} /><span>{t('music.closePlayer')}</span></button>
        </div>
      )}
      {blocked && <div className="global-player-blocked">{t('music.pressPlay')}</div>}
      {expanded && <div className="global-player-expanded"><div className="global-player-expanded-art">{song.coverUrl ? <img src={song.coverUrl} alt="" /> : <span>♫</span>}</div><div><small>{t('music.nowPlaying')}</small><h3>{song.title}</h3><p>{artistLabel}{song.album ? ` · ${song.album.title}` : ''}</p></div></div>}
    </section>
  );
}
