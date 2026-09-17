'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import { BadgeCheck, Heart, History, ListMusic, Music2, Pause, Play, Plus, Radio, Search, SkipForward, Sparkles, UsersRound } from 'lucide-react';
import { api } from '@/lib/client-api';
import { toast } from '@/components/toast';
import { useAppStore } from '@/store/app-store';
import { artistLabel, type MusicSong } from '@/components/music-player';
import { WorkspaceTopbar } from '@/components/hub-gateway';
import { CreatorApplyModal } from '@/components/creator-apply-modal';

type MusicView = 'home' | 'discover' | 'library' | 'playlists' | 'favorites' | 'history' | 'radio';

interface FavoriteRow { songId: number; song: MusicSong; createdAt: string; }
interface HistoryRow { id: number; song: MusicSong; playedAt: string; }
interface Playlist { id: number; name: string; desc?: string; items: { song: MusicSong }[]; }

const NAV: { id: MusicView; label: string; icon: typeof Music2 }[] = [
  { id: 'home', label: 'Home', icon: Music2 },
  { id: 'discover', label: 'Discover', icon: Search },
  { id: 'library', label: 'Library', icon: ListMusic },
  { id: 'playlists', label: 'Playlists', icon: ListMusic },
  { id: 'favorites', label: 'Favorites', icon: Heart },
  { id: 'history', label: 'History', icon: History },
  { id: 'radio', label: 'Radio', icon: Radio },
];

function timeLabel(sec: number) {
  const minutes = Math.floor(Math.max(0, sec) / 60);
  return `${minutes}:${String(Math.floor(Math.max(0, sec) % 60)).padStart(2, '0')}`;
}

function SongRow({ song, active, playing, favorite, playlists, onPlay, onFavorite, onAdd }: { song: MusicSong; active: boolean; playing: boolean; favorite: boolean; playlists: Playlist[]; onPlay: () => void; onFavorite: () => void; onAdd: (playlistId: number) => void }) {
  return (
    <div className={`music-hub-song ${active ? 'active' : ''}`}>
      <button type="button" className="music-hub-song-play" onClick={onPlay} aria-label={playing ? 'Pause' : 'Play'}>
        {song.coverUrl ? <Image src={song.coverUrl} alt="" fill unoptimized loading="lazy" /> : <Music2 size={16} />}
        <span className="music-hub-play-overlay">{playing ? <Pause size={14} /> : <Play size={14} />}</span>
      </button>
      <button type="button" className="music-hub-song-meta" onClick={onPlay}><b>{song.title}</b><span>{artistLabel(song) || 'Unknown artist'}</span></button>
      <span className="music-hub-song-time">{timeLabel(song.durationSec)}</span>
      <button type="button" className={`btn-icon ${favorite ? 'active' : ''}`} onClick={onFavorite} title="Favorite" aria-label="Favorite"><Heart size={15} fill={favorite ? 'currentColor' : 'none'} /></button>
      {playlists.length > 0 && <select className="music-hub-add-select" defaultValue="" onChange={(event) => { if (event.target.value) onAdd(Number(event.target.value)); event.currentTarget.value = ''; }} aria-label="Add to playlist">
        <option value="">Add</option>
        {playlists.map((playlist) => <option key={playlist.id} value={playlist.id}>{playlist.name}</option>)}
      </select>}
    </div>
  );
}

export function MusicHub() {
  const setProduct = useAppStore((state) => state.setProduct);
  const setTab = useAppStore((state) => state.setTab);
  const [view, setView] = useState<MusicView>('home');
  const [catalog, setCatalog] = useState<MusicSong[]>([]);
  const [favorites, setFavorites] = useState<FavoriteRow[]>([]);
  const [history, setHistory] = useState<HistoryRow[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [playlistName, setPlaylistName] = useState('');
  const [current, setCurrent] = useState<MusicSong | null>(null);
  const [playing, setPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [creatorOpen, setCreatorOpen] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  const favoriteIds = useMemo(() => new Set(favorites.map((item) => item.songId)), [favorites]);

  const loadLibrary = useCallback(async () => {
    const [favoriteData, historyData, playlistData] = await Promise.all([
      api<{ favorites: FavoriteRow[] }>('/api/music/favorites'),
      api<{ history: HistoryRow[] }>('/api/music/history'),
      api<{ playlists: Playlist[] }>('/api/music/playlists'),
    ]);
    setFavorites(favoriteData.favorites);
    setHistory(historyData.history);
    setPlaylists(playlistData.playlists);
  }, []);

  const loadCatalog = useCallback(async (search = '') => {
    setSearching(true);
    try {
      const data = await api<{ songs: MusicSong[] }>(`/api/music/search?q=${encodeURIComponent(search)}`);
      setCatalog(data.songs);
    } catch {
      setCatalog([]);
    } finally {
      setSearching(false);
    }
  }, []);

  useEffect(() => {
    loadCatalog();
    loadLibrary().catch(() => {});
  }, [loadCatalog, loadLibrary]);

  useEffect(() => {
    const songId = Number(new URLSearchParams(window.location.search).get('song'));
    if (!songId || current) return;
    const song = catalog.find((item) => item.id === songId);
    if (song) setCurrent(song);
  }, [catalog, current]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !current) return;
    audio.src = current.audioUrl || current.audioLink || '';
    audio.load();
    if (current.audioUrl || current.audioLink) audio.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
    if ('mediaSession' in navigator) {
      navigator.mediaSession.metadata = new MediaMetadata({ title: current.title, artist: artistLabel(current), album: current.album?.title ?? 'Jamino Music Hub', artwork: current.coverUrl ? [{ src: current.coverUrl }] : [] });
      navigator.mediaSession.setActionHandler('play', () => audio.play().catch(() => {}));
      navigator.mediaSession.setActionHandler('pause', () => audio.pause());
      navigator.mediaSession.setActionHandler('seekbackward', () => { audio.currentTime = Math.max(0, audio.currentTime - 10); });
      navigator.mediaSession.setActionHandler('seekforward', () => { audio.currentTime = Math.min(audio.duration || Infinity, audio.currentTime + 10); });
    }
    return () => {
      audio.pause();
      if ('mediaSession' in navigator) {
        try { navigator.mediaSession.metadata = null; } catch {}
      }
    };
  }, [current]);

  const playSong = (song: MusicSong) => {
    if (current?.id === song.id && audioRef.current) {
      if (playing) audioRef.current.pause();
      else audioRef.current.play().catch(() => {});
      return;
    }
    setCurrent(song);
    window.history.replaceState({}, '', `/?hub=music&song=${song.id}`);
  };

  const toggleFavorite = async (song: MusicSong) => {
    const next = !favoriteIds.has(song.id);
    try {
      await api('/api/music/favorites', { method: next ? 'POST' : 'DELETE', body: JSON.stringify({ songId: song.id }) });
      await loadLibrary();
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Could not update favorite.', 'error');
    }
  };

  const createPlaylist = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!playlistName.trim()) return;
    try {
      await api('/api/music/playlists', { method: 'POST', body: JSON.stringify({ name: playlistName.trim() }) });
      setPlaylistName('');
      await loadLibrary();
      toast('Playlist created.', 'ok');
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Could not create playlist.', 'error');
    }
  };

  const addToPlaylist = async (playlistId: number, songId: number) => {
    try {
      await api(`/api/music/playlists/${playlistId}`, { method: 'POST', body: JSON.stringify({ songId }) });
      await loadLibrary();
      toast('Added to playlist.', 'ok');
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Could not update playlist.', 'error');
    }
  };

  const visibleSongs = view === 'favorites' ? favorites.map((item) => item.song) : view === 'history' ? history.map((item) => item.song) : catalog;
  const radioSongs = catalog.length ? catalog : favorites.map((item) => item.song);

  return (
    <div className="hub-shell hub-shell-music">
      <WorkspaceTopbar onHome={() => setProduct('home')} product="Music Hub" />
      <div className="music-hub-layout">
        <aside className="music-hub-sidebar">
          <div className="music-hub-brand"><span className="hub-empty-icon"><Music2 size={22} /></span><div><b>Music Hub</b><small>Listen together, anywhere.</small></div></div>
          <nav>{NAV.map(({ id, label, icon: Icon }) => <button type="button" key={id} className={view === id ? 'active' : ''} onClick={() => setView(id)}><Icon size={16} /><span>{label}</span></button>)}</nav>
          <button type="button" className="music-hub-jam-link" onClick={() => { setProduct('community'); setTab('jams'); }}><UsersRound size={15} /> Join a Jam</button>
        </aside>
        <main className="music-hub-main">
          <header className="music-hub-heading"><div><div className="hub-kicker">MUSIC HUB</div><h1>{view === 'home' ? 'Your sound, your space.' : NAV.find((item) => item.id === view)?.label}</h1><p>{view === 'home' ? 'Discover music, build your library and take the room with you.' : 'Everything stays connected to your Jamino account.'}</p></div><div className="hub-heading-actions"><button type="button" className="btn btn-ghost pill-sm" onClick={() => setCreatorOpen(true)}><BadgeCheck size={14} /> Become a creator</button>{view === 'discover' && <form className="music-hub-search" onSubmit={(event) => { event.preventDefault(); loadCatalog(query); }}><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search songs and artists…" /><button type="submit" className="btn btn-violet pill-sm">Search</button></form>}</div></header>

          {view === 'home' && <>
            <div className="music-hub-hero"><div><Sparkles size={20} /><h2>Make a soundtrack for the moment.</h2><p>Save favorites, build playlists and continue listening from any Jam.</p></div><button type="button" className="btn btn-violet" onClick={() => setView('discover')}>Explore music</button></div>
            <div className="music-hub-section-head"><h2>Popular now</h2><button type="button" className="btn btn-ghost pill-sm" onClick={() => setView('discover')}>See all</button></div>
          </>}

          {view === 'library' && <div className="music-library-overview"><div className="music-library-stat"><Heart size={17} /><b>{favorites.length}</b><span>Favorites</span></div><div className="music-library-stat"><History size={17} /><b>{history.length}</b><span>Played tracks</span></div><div className="music-library-stat"><ListMusic size={17} /><b>{playlists.length}</b><span>Playlists</span></div></div>}

          {view === 'playlists' && <form className="music-hub-create-playlist" onSubmit={createPlaylist}><input value={playlistName} onChange={(event) => setPlaylistName(event.target.value)} placeholder="Create a playlist" maxLength={80} /><button type="submit" className="btn btn-violet pill-sm"><Plus size={14} /> Create</button></form>}

          {view === 'radio' && <div className="music-hub-radio-card"><Radio size={22} /><div><h2>Jamino Radio</h2><p>Start a continuous mix from the tracks in your library.</p></div><button type="button" className="btn btn-violet" disabled={!radioSongs.length} onClick={() => playSong(radioSongs[0])}><Play size={14} /> Start radio</button></div>}

          {view === 'library' && <div className="music-library-columns"><section><div className="music-hub-section-head"><h2>Favorites</h2><button type="button" className="btn btn-ghost pill-sm" onClick={() => setView('favorites')}>Open</button></div>{favorites.slice(0, 5).map((item) => <SongRow key={item.songId} song={item.song} active={current?.id === item.song.id} playing={playing && current?.id === item.song.id} favorite onPlay={() => playSong(item.song)} onFavorite={() => toggleFavorite(item.song)} playlists={playlists} onAdd={(id) => addToPlaylist(id, item.song.id)} />)}</section><section><div className="music-hub-section-head"><h2>History</h2><button type="button" className="btn btn-ghost pill-sm" onClick={() => setView('history')}>Open</button></div>{history.slice(0, 5).map((item) => <SongRow key={item.id} song={item.song} active={current?.id === item.song.id} playing={playing && current?.id === item.song.id} favorite={favoriteIds.has(item.song.id)} onPlay={() => playSong(item.song)} onFavorite={() => toggleFavorite(item.song)} playlists={playlists} onAdd={(id) => addToPlaylist(id, item.song.id)} />)}</section></div>}

          {(view === 'home' || view === 'discover' || view === 'favorites' || view === 'history') && <div className="music-hub-song-list">{searching && <div className="empty-state">Searching…</div>}{!searching && visibleSongs.length === 0 && <div className="music-hub-empty"><Music2 size={22} /><b>No tracks here yet.</b><span>Add music from a Jam or ask an admin to populate the catalog.</span></div>}{!searching && visibleSongs.map((song) => <SongRow key={song.id} song={song} active={current?.id === song.id} playing={playing && current?.id === song.id} favorite={favoriteIds.has(song.id)} onPlay={() => playSong(song)} onFavorite={() => toggleFavorite(song)} playlists={playlists} onAdd={(id) => addToPlaylist(id, song.id)} />)}</div>}

          {view === 'playlists' && <div className="music-playlist-grid">{playlists.length === 0 && <div className="music-hub-empty"><ListMusic size={22} /><b>No playlists yet.</b><span>Create your first playlist above.</span></div>}{playlists.map((playlist) => <section className="music-playlist-card" key={playlist.id}><div className="music-playlist-card-head"><ListMusic size={18} /><div><b>{playlist.name}</b><span>{playlist.items.length} songs</span></div></div>{playlist.items.slice(0, 6).map((item) => <button type="button" className="music-playlist-item" key={item.song.id} onClick={() => playSong(item.song)}><span>{item.song.title}</span><small>{item.song.artist?.name ?? 'Unknown artist'}</small></button>)}</section>)}</div>}
        </main>
      </div>
      <audio ref={audioRef} preload="metadata" onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onLoadedMetadata={(event) => setDuration(event.currentTarget.duration || current?.durationSec || 0)} onTimeUpdate={(event) => setPosition(event.currentTarget.currentTime)} onEnded={() => setPlaying(false)} />
      {current && <div className="music-hub-player"><button type="button" className="music-hub-player-main" onClick={() => playSong(current)}>{current.coverUrl ? <Image src={current.coverUrl} alt="" fill unoptimized /> : <Music2 size={16} />}<span><b>{current.title}</b><small>{artistLabel(current)}</small></span></button><button type="button" className="btn-icon music-hub-play-button" onClick={() => playSong(current)}>{playing ? <Pause size={18} /> : <Play size={18} />}</button><input className="music-hub-range" type="range" min={0} max={duration || current.durationSec || 1} step={0.1} value={Math.min(position, duration || current.durationSec || 1)} onChange={(event) => { const next = Number(event.target.value); if (audioRef.current) audioRef.current.currentTime = next; setPosition(next); }} /><span className="music-hub-player-time">{timeLabel(position)} / {timeLabel(duration || current.durationSec)}</span><button type="button" className="btn-icon" onClick={() => { const next = radioSongs.find((song) => song.id !== current.id); if (next) playSong(next); }} title="Next"><SkipForward size={16} /></button></div>}
      <nav className="hub-mobile-nav">{NAV.slice(0, 5).map(({ id, label, icon: Icon }) => <button type="button" key={id} className={view === id ? 'active' : ''} onClick={() => setView(id)}><Icon size={17} /><span>{label}</span></button>)}</nav>
      <CreatorApplyModal hub="MUSIC" open={creatorOpen} onClose={() => setCreatorOpen(false)} />
    </div>
  );
}
