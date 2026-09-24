'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { BadgeCheck, Disc3, Heart, History, House, LayoutDashboard, ListMusic, Music2, Pause, Play, Plus, Radio, Search, Sparkles, UsersRound } from 'lucide-react';
import { api, uploadWithProgress } from '@/lib/client-api';
import { toast } from '@/components/toast';
import { useAppStore } from '@/store/app-store';
import { artistLabel, type MusicSong } from '@/components/music-player';
import { WorkspaceTopbar } from '@/components/hub-gateway';
import { CreatorApplyModal } from '@/components/creator-apply-modal';
import { MusicCatalogSections, type MusicAlbumCard, type MusicArtistCard, type MusicPublicPlaylist } from '@/components/music-catalog-sections';
import { useTranslations } from '@/providers/use-translations';

type MusicView = 'home' | 'discover' | 'library' | 'playlists' | 'community' | 'artists' | 'albums' | 'singles' | 'favorites' | 'history' | 'radio' | 'studio';

interface FavoriteRow { songId: number; song: MusicSong; createdAt: string; }
interface HistoryRow { id: number; song: MusicSong; playedAt: string; }
interface Playlist { id: number; name: string; desc?: string; isPublic?: boolean; items: { song: MusicSong }[]; }
interface CatalogResponse { songs: MusicSong[]; singles: MusicSong[]; artists: MusicArtistCard[]; albums: MusicAlbumCard[]; playlists: MusicPublicPlaylist[]; }

const NAV: { id: MusicView; key: string; icon: typeof Music2 }[] = [
  { id: 'home', key: 'home', icon: Music2 }, { id: 'discover', key: 'discover', icon: Search }, { id: 'library', key: 'library', icon: ListMusic }, { id: 'playlists', key: 'playlists', icon: ListMusic }, { id: 'community', key: 'community', icon: UsersRound }, { id: 'artists', key: 'artists', icon: UsersRound }, { id: 'albums', key: 'albums', icon: Disc3 }, { id: 'singles', key: 'singles', icon: Music2 }, { id: 'favorites', key: 'favorites', icon: Heart }, { id: 'history', key: 'history', icon: History }, { id: 'radio', key: 'radio', icon: Radio }, { id: 'studio', key: 'studio', icon: LayoutDashboard },
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

function MusicReleaseForm({ creatorStatus, onPublished }: { creatorStatus: 'PENDING' | 'APPROVED' | 'REJECTED' | null; onPublished: (song: MusicSong) => void }) {
  const t = useTranslations();
  const [title, setTitle] = useState('');
  const [artistName, setArtistName] = useState('');
  const [albumTitle, setAlbumTitle] = useState('');
  const [audioLink, setAudioLink] = useState('');
  const [coverLink, setCoverLink] = useState('');
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [durationSec, setDurationSec] = useState('');
  const [lyrics, setLyrics] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      const form = new FormData();
      form.append('title', title);
      form.append('artistName', artistName);
      form.append('albumTitle', albumTitle);
      form.append('audioLink', audioLink);
      form.append('coverLink', coverLink);
      form.append('durationSec', durationSec);
      form.append('lyrics', lyrics);
      if (audioFile) form.append('audioFile', audioFile);
      if (coverFile) form.append('coverFile', coverFile);
      const data = await uploadWithProgress<{ song: MusicSong }>('/api/creator/music', form, setUploadProgress);
      onPublished(data.song);
      setTitle(''); setAlbumTitle(''); setAudioLink(''); setCoverLink(''); setDurationSec(''); setLyrics(''); setAudioFile(null); setCoverFile(null); setUploadProgress(0);
      toast(t('musicHub.publishTrack'), 'ok');
    } catch (error) {
      toast(error instanceof Error ? error.message : t('musicHub.publishFailed'), 'error');
    } finally { setSaving(false); }
  };

  if (creatorStatus !== 'APPROVED') return <div className="music-release-locked"><Disc3 size={19} /><div><b>{creatorStatus === 'PENDING' ? t('musicHub.pendingReview') : t('musicHub.becomeCreatorToPublish')}</b><span>{t('musicHub.afterApproval')}</span></div></div>;

  return <form className="music-release-form" onSubmit={submit}><div className="music-hub-section-head"><div><h3>{t('musicHub.releaseTrack')}</h3><span className="music-catalog-muted">{t('musicHub.releaseSub')}</span></div><Disc3 size={18} /></div><div className="music-release-grid"><label><span>{t('musicHub.trackTitle')}</span><input required value={title} onChange={(event) => setTitle(event.target.value)} maxLength={200} placeholder={t('musicHub.trackTitle')} /></label><label><span>{t('musicHub.artistName')}</span><input value={artistName} onChange={(event) => setArtistName(event.target.value)} maxLength={120} placeholder={t('musicHub.artistName')} /></label><label><span>{t('musicHub.albumEp')}</span><input value={albumTitle} onChange={(event) => setAlbumTitle(event.target.value)} maxLength={200} placeholder={t('musicHub.albumEp')} /></label><label><span>{t('musicHub.audioUrl')}</span><input type="url" value={audioLink} onChange={(event) => setAudioLink(event.target.value)} placeholder="https://…/track.mp3" /></label><label><span>{t('musicHub.audioFile')}</span><input type="file" accept="audio/*" onChange={(event) => setAudioFile(event.target.files?.[0] ?? null)} /></label><label><span>{t('musicHub.coverUrl')}</span><input type="url" value={coverLink} onChange={(event) => setCoverLink(event.target.value)} placeholder="https://…/cover.jpg" /></label><label><span>{t('musicHub.coverFile')}</span><input type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => setCoverFile(event.target.files?.[0] ?? null)} /></label><label><span>{t('musicHub.durationSec')}</span><input inputMode="numeric" value={durationSec} onChange={(event) => setDurationSec(event.target.value)} placeholder="210" /></label><label className="music-release-wide"><span>{t('musicHub.lyrics')}</span><textarea value={lyrics} onChange={(event) => setLyrics(event.target.value)} rows={3} maxLength={12000} placeholder={t('musicHub.lyricsPlaceholder')} /></label></div>{saving && <div className="music-upload-progress"><span style={{ width: `${uploadProgress}%` }} /><small>{t('musicHub.uploadProgress', { p: uploadProgress })}</small></div>}<div className="music-release-foot"><span>{t('musicHub.releaseFoot')}</span><button type="submit" className="btn btn-violet" disabled={saving}>{saving ? t('musicHub.publishing', { p: uploadProgress }) : t('musicHub.publishTrack')}</button></div></form>;
}

function MusicStudio({ catalog, favorites, history, playlists, creatorStatus, onEditProfile, onPublished }: { catalog: MusicSong[]; favorites: FavoriteRow[]; history: HistoryRow[]; playlists: Playlist[]; creatorStatus: 'PENDING' | 'APPROVED' | 'REJECTED' | null; onEditProfile: () => void; onPublished: (song: MusicSong) => void }) {
  const t = useTranslations();
  return (
    <section className="creator-studio-view">
      <div className="creator-studio-hero"><div><div className="hub-kicker">{t('musicHub.studioKicker')}</div><h2>{t('musicHub.studioTitle')}</h2><p>{t('musicHub.studioSub')}</p></div><button type="button" className="btn btn-ghost pill-sm" onClick={onEditProfile}><BadgeCheck size={14} /> {t('musicHub.editProfile')}</button></div>
      <div className="creator-studio-metrics"><div className="creator-studio-metric"><Music2 size={17} /><b>{catalog.length}</b><span>{t('musicHub.tracksDiscoverable')}</span></div><div className="creator-studio-metric"><Heart size={17} /><b>{favorites.length}</b><span>{t('musicHub.audienceFavorites')}</span></div><div className="creator-studio-metric"><History size={17} /><b>{history.length}</b><span>{t('musicHub.recentListens')}</span></div><div className="creator-studio-metric"><ListMusic size={17} /><b>{playlists.length}</b><span>{t('musicHub.savedPlaylists')}</span></div></div>
      <div className="creator-studio-profile"><span className="hub-empty-icon"><Music2 size={20} /></span><div><b>{t('musicHub.artistProfileTitle')}</b><span>{t('musicHub.artistProfileSub')}</span></div><button type="button" className="btn btn-violet pill-sm" onClick={onEditProfile}>{t('musicHub.manageProfile')}</button></div>
      <MusicReleaseForm creatorStatus={creatorStatus} onPublished={onPublished} />
    </section>
  );
}

export function MusicHub() {
  const t = useTranslations();
  const setProduct = useAppStore((state) => state.setProduct);
  const setTab = useAppStore((state) => state.setTab);
  const [view, setView] = useState<MusicView>('home');
  const [catalog, setCatalog] = useState<MusicSong[]>([]);
  const [favorites, setFavorites] = useState<FavoriteRow[]>([]);
  const [history, setHistory] = useState<HistoryRow[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [artists, setArtists] = useState<MusicArtistCard[]>([]);
  const [albums, setAlbums] = useState<MusicAlbumCard[]>([]);
  const [singles, setSingles] = useState<MusicSong[]>([]);
  const [communityPlaylists, setCommunityPlaylists] = useState<MusicPublicPlaylist[]>([]);
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [playlistName, setPlaylistName] = useState('');
  const [playlistPublic, setPlaylistPublic] = useState(false);
  const [current, setCurrent] = useState<MusicSong | null>(null);
  const [playing, setPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [creatorOpen, setCreatorOpen] = useState(false);
  const [creatorStatus, setCreatorStatus] = useState<'PENDING' | 'APPROVED' | 'REJECTED' | null>(null);

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
      if (search) {
        const data = await api<{ songs: MusicSong[] }>(`/api/music/search?q=${encodeURIComponent(search)}`);
        setCatalog(data.songs);
      } else {
        const data = await api<CatalogResponse>('/api/music/catalog');
        setCatalog(data.songs);
        setSingles(data.singles);
        setArtists(data.artists);
        setAlbums(data.albums);
        setCommunityPlaylists(data.playlists);
      }
    } catch {
      setCatalog([]);
    } finally {
      setSearching(false);
    }
  }, []);

  useEffect(() => {
    loadCatalog();
    loadLibrary().catch(() => {});
    api<{ applications: { status: 'PENDING' | 'APPROVED' | 'REJECTED' }[] }>('/api/creator/apply?hub=MUSIC').then((data) => setCreatorStatus(data.applications[0]?.status ?? null)).catch(() => {});
  }, [loadCatalog, loadLibrary]);

  useEffect(() => {
    const songId = Number(new URLSearchParams(window.location.search).get('song'));
    if (!songId || current) return;
    const song = catalog.find((item) => item.id === songId);
    if (song) setCurrent(song);
  }, [catalog, current]);

  const radioSongs = catalog.length ? catalog : favorites.map((item) => item.song);

  useEffect(() => {
    const onPlayerState = (event: Event) => {
      const detail = (event as CustomEvent<{ song: MusicSong | null; playing: boolean }>).detail;
      if (detail?.song) setCurrent(detail.song);
      setPlaying(Boolean(detail?.playing));
    };
    window.addEventListener('jamino:player-state', onPlayerState);
    return () => window.removeEventListener('jamino:player-state', onPlayerState);
  }, []);

  const playSong = (song: MusicSong) => {
    const same = current?.id === song.id;
    window.dispatchEvent(new CustomEvent('jamino:play-song', { detail: { song, queue: radioSongs, autoplay: true } }));
    if (!same) setCurrent(song);
    setPlaying(same ? !playing : true);
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
      await api('/api/music/playlists', { method: 'POST', body: JSON.stringify({ name: playlistName.trim(), isPublic: playlistPublic }) });
      setPlaylistName('');
      setPlaylistPublic(false);
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
  const catalogView = view === 'community' ? 'playlists' : view === 'artists' || view === 'albums' || view === 'singles' ? view : null;

  return (
    <div className="hub-shell hub-shell-music">
      <WorkspaceTopbar onHome={() => setProduct('home')} product="Music Hub" />
      <div className="music-hub-layout">
        <aside className="music-hub-sidebar">
          <div className="music-hub-brand"><span className="hub-empty-icon"><Music2 size={22} /></span><div><b>{t('musicHub.title')}</b><small>{t('musicHub.titleSub')}</small></div></div>
          <nav>{NAV.map(({ id, key, icon: Icon }) => <button type="button" key={id} className={view === id ? 'active' : ''} onClick={() => setView(id)}><Icon size={16} /><span>{t(`musicNav.${key}`)}</span></button>)}</nav>
          <button type="button" className="music-hub-jam-link" onClick={() => { setProduct('community'); setTab('jams'); }}><UsersRound size={15} /> {t('jams.joinJam')}</button>
        </aside>
        <main className="music-hub-main">
          <header className="music-hub-heading"><div><div className="hub-kicker">{t('hubs.music').toUpperCase()}</div><h1>{view === 'home' ? t('musicHub.homeTitle') : t(`musicNav.${NAV.find((item) => item.id === view)?.key ?? 'home'}`)}</h1><p>{view === 'home' ? t('musicHub.lifetimeSub') : t('musicHub.otherSub')}</p></div><div className="hub-heading-actions"><button type="button" className="btn btn-ghost pill-sm" onClick={() => setCreatorOpen(true)}><BadgeCheck size={14} /> {creatorStatus === 'APPROVED' ? t('musicHub.artistProfile') : t('musicHub.becomeCreator')}</button>{view === 'discover' && <form className="music-hub-search" onSubmit={(event) => { event.preventDefault(); loadCatalog(query); }}><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t('musicHub.searchPlaceholderLong')} /><button type="submit" className="btn btn-violet pill-sm">{t('musicHub.searchAction')}</button></form>}</div></header>

          {view === 'home' && <>
            <div className="music-hub-hero"><div><Sparkles size={20} /><h2>{t('musicHub.heroTitle')}</h2><p>{t('musicHub.heroSub')}</p></div><button type="button" className="btn btn-violet" onClick={() => setView('discover')}>{t('musicHub.explore')}</button></div>
            <div className="music-hub-section-head"><h2>{t('musicHub.popularNow')}</h2><button type="button" className="btn btn-ghost pill-sm" onClick={() => setView('discover')}>{t('musicHub.seeAll')}</button></div>
          </>}

          {view === 'library' && <div className="music-library-overview"><div className="music-library-stat"><Heart size={17} /><b>{favorites.length}</b><span>{t('musicHub.favorites')}</span></div><div className="music-library-stat"><History size={17} /><b>{history.length}</b><span>{t('musicHub.playedTracks')}</span></div><div className="music-library-stat"><ListMusic size={17} /><b>{playlists.length}</b><span>{t('musicHub.playlists')}</span></div></div>}

          {view === 'playlists' && <form className="music-hub-create-playlist" onSubmit={createPlaylist}><input value={playlistName} onChange={(event) => setPlaylistName(event.target.value)} placeholder={t('musicHub.createPlaylist')} maxLength={80} /><label className="music-playlist-public-toggle"><input type="checkbox" checked={playlistPublic} onChange={(event) => setPlaylistPublic(event.target.checked)} /> {t('musicHub.public')}</label><button type="submit" className="btn btn-violet pill-sm"><Plus size={14} /> {t('musicHub.create')}</button></form>}

          {view === 'radio' && <div className="music-hub-radio-card"><Radio size={22} /><div><h2>{t('musicHub.radioTitle')}</h2><p>{t('musicHub.radioSub')}</p></div><button type="button" className="btn btn-violet" disabled={!radioSongs.length} onClick={() => playSong(radioSongs[0])}><Play size={14} /> {t('musicHub.startRadio')}</button></div>}

          {view === 'studio' && <MusicStudio catalog={catalog} favorites={favorites} history={history} playlists={playlists} creatorStatus={creatorStatus} onEditProfile={() => setCreatorOpen(true)} onPublished={(song) => { setCatalog((items) => [song, ...items]); setSingles((items) => [song, ...items]); }} />}

          {catalogView && <MusicCatalogSections kind={catalogView} artists={artists} albums={albums} singles={singles} playlists={communityPlaylists} activeSongId={current?.id ?? null} playing={playing} onPlay={playSong} />}

          {view === 'library' && <div className="music-library-columns"><section><div className="music-hub-section-head"><h2>Favorites</h2><button type="button" className="btn btn-ghost pill-sm" onClick={() => setView('favorites')}>Open</button></div>{favorites.slice(0, 5).map((item) => <SongRow key={item.songId} song={item.song} active={current?.id === item.song.id} playing={playing && current?.id === item.song.id} favorite onPlay={() => playSong(item.song)} onFavorite={() => toggleFavorite(item.song)} playlists={playlists} onAdd={(id) => addToPlaylist(id, item.song.id)} />)}</section><section><div className="music-hub-section-head"><h2>History</h2><button type="button" className="btn btn-ghost pill-sm" onClick={() => setView('history')}>Open</button></div>{history.slice(0, 5).map((item) => <SongRow key={item.id} song={item.song} active={current?.id === item.song.id} playing={playing && current?.id === item.song.id} favorite={favoriteIds.has(item.song.id)} onPlay={() => playSong(item.song)} onFavorite={() => toggleFavorite(item.song)} playlists={playlists} onAdd={(id) => addToPlaylist(id, item.song.id)} />)}</section></div>}

          {(view === 'home' || view === 'discover' || view === 'favorites' || view === 'history') && <div className="music-hub-song-list">{searching && <div className="empty-state">{t('musicHub.searching')}</div>}{!searching && visibleSongs.length === 0 && <div className="music-hub-empty"><Music2 size={22} /><b>{t(view === 'favorites' ? 'musicHub.favoriteEmpty' : view === 'history' ? 'musicHub.historyEmpty' : 'musicHub.noTracks')}</b><span>{t('musicHub.noTracksSub')}</span></div>}{!searching && visibleSongs.map((song) => <SongRow key={song.id} song={song} active={current?.id === song.id} playing={playing && current?.id === song.id} favorite={favoriteIds.has(song.id)} onPlay={() => playSong(song)} onFavorite={() => toggleFavorite(song)} playlists={playlists} onAdd={(id) => addToPlaylist(id, song.id)} />)}</div>}

          {view === 'playlists' && <div className="music-playlist-grid">{playlists.length === 0 && <div className="music-hub-empty"><ListMusic size={22} /><b>{t('musicHub.playlistEmpty')}</b><span>{t('musicHub.firstPlaylist')}</span></div>}{playlists.map((playlist) => <section className="music-playlist-card" key={playlist.id}><div className="music-playlist-card-head"><ListMusic size={18} /><div><b>{playlist.name}</b><span>{t('musicHub.songs', { n: playlist.items.length })} · {playlist.isPublic ? t('musicHub.public') : t('musicHub.private')}</span></div></div>{playlist.items.slice(0, 6).map((item) => <button type="button" className="music-playlist-item" key={item.song.id} onClick={() => playSong(item.song)}><span>{item.song.title}</span><small>{item.song.artist?.name ?? t('musicHub.unknownArtist')}</small></button>)}</section>)}</div>}
        </main>
      </div>
      <nav className="hub-mobile-nav"><button type="button" onClick={() => setProduct('home')} aria-label={t('hubs.choose')}><House size={17} /><span>{t('musicNav.home')}</span></button>{NAV.filter(({ id }) => id !== 'home').map(({ id, key, icon: Icon }) => <button type="button" key={id} className={view === id ? 'active' : ''} onClick={() => setView(id)}><Icon size={17} /><span>{t(`musicNav.${key}`)}</span></button>)}</nav>
      <CreatorApplyModal hub="MUSIC" open={creatorOpen} onClose={() => setCreatorOpen(false)} onSubmitted={(application) => setCreatorStatus(application.status)} />
    </div>
  );
}
