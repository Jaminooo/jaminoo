'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { Clapperboard, Film, Filter, ListPlus, Play, Search, Tv2, UsersRound, X, Globe, Flame, Clock3, Star, ChevronRight, Radio } from 'lucide-react';
import { api } from '@/lib/client-api';
import { toast } from '@/components/toast';
import { useAppStore } from '@/store/app-store';
import { WorkspaceTopbar } from '@/components/hub-gateway';
import { connectLive, onLive } from '@/lib/live';

export interface AnimeItem {
  id: number;
  slug: string;
  title: string;
  original: string;
  overview: string;
  coverUrl: string | null;
  trailerUrl: string;
  type: string;
  status: string;
  year: number;
  episodes: number;
  rating: number;
  genres: string[];
  studio: string;
  colorFrom: number;
  colorTo: number;
  episodeCount?: number;
}

interface EpisodeItem {
  id: number;
  animeId: number;
  number: number;
  title: string;
  durationSec: number;
  externalUrl: string | null;
  thumbnailUrl?: string | null;
  subtitlesUrl?: string | null;
}

type AnimeTab = 'home' | 'series' | 'movies' | 'my-list';
type Shelf = { title: string; kicker: string; icon: typeof Flame; items: AnimeItem[]; tone: string };

const ALL_GENRES = [
  'Action', 'Adventure', 'Comedy', 'Drama', 'Fantasy', 'Sci-Fi', 'Slice of Life',
  'Sports', 'Mystery', 'Horror', 'Romance', 'Isekai', 'Supernatural', 'Mecha', 'Music',
];

function Cover({ anime, wide = false }: { anime: AnimeItem; wide?: boolean }) {
  const style: React.CSSProperties = anime.coverUrl
    ? {}
    : { background: `linear-gradient(135deg, hsl(${anime.colorFrom || 260}, 70%, 24%), hsl(${anime.colorTo || 340}, 70%, 22%))` };
  return (
    <div className={`anime-card-art${wide ? ' anime-card-art-wide' : ''}`} style={style}>
      {anime.coverUrl ? <Image src={anime.coverUrl} alt={anime.title} fill unoptimized loading="lazy" /> : <span className="anime-card-placeholder">{anime.type === 'MOVIE' ? <Film size={24} /> : <Tv2 size={24} />}</span>}
    </div>
  );
}

function RatingBadge({ rating }: { rating: number }) {
  if (!rating) return null;
  return <span className="anime-rating-badge"><Star size={11} fill="currentColor" /> {rating.toFixed(1)}</span>;
}

export function AnimeHub() {
  const setProduct = useAppStore((s) => s.setProduct);
  const setTab = useAppStore((s) => s.setTab);
  const setRoomId = useAppStore((s) => s.setRoomId);
  const [tab, setTabView] = useState<AnimeTab>('home');
  const [items, setItems] = useState<AnimeItem[]>([]);
  const [airing, setAiring] = useState<AnimeItem[]>([]);
  const [latest, setLatest] = useState<AnimeItem[]>([]);
  const [topRated, setTopRated] = useState<AnimeItem[]>([]);
  const [saved, setSaved] = useState<Set<number>>(new Set());
  const [selected, setSelected] = useState<AnimeItem | null>(null);
  const [episodes, setEpisodes] = useState<EpisodeItem[]>([]);
  const [watching, setWatching] = useState<EpisodeItem | null>(null);
  const [query, setQuery] = useState('');
  const [genre, setGenre] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('jamino_anime_list');
      if (raw) {
        const arr: number[] = JSON.parse(raw);
        if (Array.isArray(arr)) setSaved(new Set(arr.filter((n) => Number.isInteger(n))));
      }
    } catch {}
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    const base = new URLSearchParams();
    if (tab === 'series') base.set('type', 'TV');
    else if (tab === 'movies') base.set('type', 'MOVIE');
    if (query) base.set('q', query);
    if (genre) base.set('genre', genre);
    try {
      const [catalogue, airingData, latestData, topData] = await Promise.all([
        api<{ items: AnimeItem[] }>(`/api/anime?${base.toString()}&sort=latest`),
        api<{ items: AnimeItem[] }>(`/api/anime?${base.toString()}&status=AIRING&sort=airing`),
        api<{ items: AnimeItem[] }>(`/api/anime?${base.toString()}&sort=latest`),
        api<{ items: AnimeItem[] }>(`/api/anime?${base.toString()}&sort=rating&featured=1`),
      ]);
      setItems(catalogue.items || []);
      setAiring(airingData.items || []);
      setLatest(latestData.items || []);
      setTopRated(topData.items || []);
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Could not load AniHub.', 'error');
      setItems([]); setAiring([]); setLatest([]); setTopRated([]);
    } finally {
      setLoading(false);
    }
  }, [tab, query, genre]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    connectLive();
    return onLive('anime:update', () => void load());
  }, [load]);

  const filtered = useMemo(() => tab === 'my-list' ? items.filter((a) => saved.has(a.id)) : items, [items, saved, tab]);
  const shelves = useMemo<Shelf[]>(() => [
    { title: 'Top rated picks', kicker: 'MYANIMELIST ENERGY', icon: Star, items: topRated, tone: 'violet' },
    { title: 'Airing now', kicker: 'NEW EPISODES', icon: Radio, items: airing, tone: 'cyan' },
    { title: 'Freshly added', kicker: 'JUST IN', icon: Clock3, items: latest, tone: 'amber' },
  ].filter((s) => s.items.length > 0), [airing, latest, topRated]);

  const toggleSaved = (anime: AnimeItem) => {
    const next = new Set(saved);
    if (next.has(anime.id)) next.delete(anime.id); else next.add(anime.id);
    setSaved(next);
    localStorage.setItem('jamino_anime_list', JSON.stringify([...next]));
  };

  const openDetail = async (anime: AnimeItem) => {
    setSelected(anime); setWatching(null);
    try {
      const data = await api<{ episodes: EpisodeItem[] }>(`/api/anime/${anime.slug}/episodes`);
      setEpisodes(data.episodes || []);
    } catch { setEpisodes([]); }
  };

  const closeDetail = () => { setSelected(null); setEpisodes([]); setWatching(null); };

  const startParty = async (anime: AnimeItem, episode?: EpisodeItem) => {
    try {
      const data = await api<{ jam: { id: string } }>('/api/jams', {
        method: 'POST',
        body: JSON.stringify({ name: `Watch ${anime.title}`, desc: 'AniHub watch party', type: 'PRIVATE', kind: 'ANIME' }),
      });
      if (episode) await api(`/api/jams/${data.jam.id}/anime`, { method: 'PATCH', body: JSON.stringify({ action: 'load', episodeId: episode.id }) });
      closeDetail(); setProduct('community'); setTab('jams'); setRoomId(data.jam.id);
      toast('Anime Party created. Invite your members.', 'ok');
    } catch (error) { toast(error instanceof Error ? error.message : 'Could not start an Anime Party.', 'error'); }
  };

  const tabs: { id: AnimeTab; label: string; icon: typeof Film }[] = [
    { id: 'home', label: 'Discover', icon: Clapperboard }, { id: 'series', label: 'Series', icon: Tv2 },
    { id: 'movies', label: 'Movies', icon: Film }, { id: 'my-list', label: 'My list', icon: ListPlus },
  ];

  const statusLabel = (a: AnimeItem) => a.status === 'AIRING' ? 'Airing' : a.status === 'UPCOMING' ? 'Upcoming' : 'Finished';
  const renderCard = (anime: AnimeItem, compact = false) => (
    <article className={`anime-card${compact ? ' anime-card-compact' : ''}`} key={anime.id}>
      <button type="button" className="anime-card-hit" onClick={() => void openDetail(anime)} aria-label={`Open ${anime.title}`}>
        <div className="anime-card-media"><Cover anime={anime} /><RatingBadge rating={anime.rating} /><i className={`anime-type-badge ${anime.type === 'MOVIE' ? 'movie' : 'series'}`}>{anime.type === 'MOVIE' ? 'Movie' : 'Series'}</i><span className="anime-card-play"><Play size={16} fill="currentColor" /></span></div>
        <div className="anime-card-copy"><b>{anime.title}</b><small>{anime.original || anime.year || 'Anime'}</small><div className="anime-card-meta"><span className="anime-status">{statusLabel(anime)}</span><span>{anime.episodes || anime.episodeCount || 0} eps</span><span>{anime.year || 'TBA'}</span></div></div>
      </button>
      <button type="button" className={`btn-icon violet anime-save-button${saved.has(anime.id) ? ' is-saved' : ''}`} title={saved.has(anime.id) ? 'Saved' : 'Save'} onClick={() => toggleSaved(anime)}><ListPlus size={16} /></button>
    </article>
  );

  return (
    <div className="hub-shell hub-shell-anime anime-hub-root">
      <WorkspaceTopbar onHome={() => setProduct('home')} product="Anime Hub" />
      <main className="anime-hub-main">
        <section className="anime-hero">
          <div className="anime-hero-copy"><span className="hub-kicker"><Flame size={13} /> JAMINO ANIME · WATCH TOGETHER</span><h1>Your next world<br /><em>starts here.</em></h1><p>Curated series, cinematic films, and Anime Parties built into the same screen.</p><div className="anime-hero-actions"><button type="button" className="btn btn-violet" onClick={() => document.getElementById('anime-catalogue')?.scrollIntoView({ behavior: 'smooth' })}><Play size={15} fill="currentColor" /> Explore catalogue</button><button type="button" className="btn btn-ghost" onClick={() => { setProduct('community'); setTab('jams'); }}><UsersRound size={15} /> Open a Party</button></div></div>
          <div className="anime-hero-art"><div className="anime-hero-orbit" /><div className="anime-hero-poster"><Cover anime={topRated[0] || latest[0] || { id: 0, slug: '', title: 'Your next anime', original: 'JAMINO', overview: '', coverUrl: null, trailerUrl: '', type: 'TV', status: 'AIRING', year: 2025, episodes: 0, rating: 0, genres: [], studio: '', colorFrom: 266, colorTo: 330 }} wide /></div><div className="anime-hero-float"><UsersRound size={15} /><span><b>Anime Party</b><small>Synced playback</small></span></div></div>
        </section>

        <nav className="anime-tabs">{tabs.map(({ id, label, icon: Icon }) => <button type="button" key={id} className={tab === id ? 'active violet' : ''} onClick={() => setTabView(id)}><Icon size={14} /> {label}</button>)}</nav>
        <div className="anime-toolbar"><div className="anime-search"><Search size={14} /><input placeholder="Search titles, studios, genres…" value={query} onChange={(e) => setQuery(e.target.value)} /></div><div className="anime-genre-filter"><Filter size={14} /><select value={genre} onChange={(e) => setGenre(e.target.value)}><option value="">All genres</option>{ALL_GENRES.map((g) => <option key={g} value={g}>{g}</option>)}</select>{genre && <button type="button" className="btn-icon" title="Clear genre" onClick={() => setGenre('')}><X size={14} /></button>}</div></div>

        {loading ? <div className="anime-loading"><span className="admin-loader" /> Loading your catalogue…</div> : tab === 'home' && !query && !genre ? <div className="anime-shelves">{shelves.map(({ title, kicker, icon: Icon, items: shelfItems, tone }) => <section className="anime-shelf" key={title}><div className="anime-shelf-head"><div><span className="hub-kicker"><Icon size={12} /> {kicker}</span><h2>{title}</h2></div><button type="button" className="anime-see-all" onClick={() => setTabView('series')}>See all <ChevronRight size={14} /></button></div><div className="anime-card-grid anime-card-grid-shelf">{shelfItems.slice(0, 6).map((anime) => renderCard(anime, true))}</div><div className={`anime-shelf-rule ${tone}`} /></section>)}</div> : <section className="anime-catalogue" id="anime-catalogue"><div className="anime-catalogue-head"><div><span className="hub-kicker">{tab === 'my-list' ? 'YOUR LIST' : tab === 'home' ? 'SEARCH RESULTS' : `BROWSE ${tab.toUpperCase()}`}</span><h2>{tab === 'my-list' ? 'Saved for later.' : 'Pick your next story.'}</h2></div><span className="anime-catalogue-count">{filtered.length} titles</span></div>{filtered.length === 0 ? <section className="anime-coming-soon"><div className="anime-art-hero"><Film size={44} /></div><h2>No titles found yet.</h2><p>Try another search or ask an anime admin to publish a new title.</p><span className="coming-soon-pill"><Globe size={14} /> Curated by Jamino</span></section> : <div className="anime-card-grid">{filtered.map((anime) => renderCard(anime))}</div>}</section>}
      </main>

      {selected && <div className="anime-player-backdrop" onMouseDown={closeDetail}><section className="anime-detail-modal" role="dialog" aria-modal="true" onMouseDown={(e) => e.stopPropagation()}><div className="anime-detail-head"><div><div className="hub-kicker">ANIME · {selected.type === 'MOVIE' ? 'MOVIE' : 'SERIES'}</div><h2>{selected.title}</h2>{selected.original && <small className="anime-original">{selected.original}</small>}</div><button type="button" className="btn-icon" onClick={closeDetail} aria-label="Close"><X size={18} /></button></div>{watching && <div className="anime-inline-player">{watching.externalUrl?.match(/\.(mp4|webm|ogg|m3u8)(\?|$)/i) ? <video controls autoPlay src={watching.externalUrl} poster={watching.thumbnailUrl || undefined} /> : <iframe src={watching.externalUrl || ''} title={`${selected.title} episode ${watching.number}`} allow="autoplay; fullscreen; picture-in-picture" allowFullScreen />}</div>}<div className="anime-detail-body"><div className="anime-detail-art"><Cover anime={selected} /></div><div className="anime-detail-info"><div className="anime-detail-meta"><span className="anime-status">{statusLabel(selected)}</span><span>· {selected.year || 'TBA'}</span><span>· {selected.studio || 'Unknown studio'}</span><span>· {selected.episodes || episodes.length} episodes</span></div><div className="anime-detail-genres">{selected.genres.length ? selected.genres.map((g) => <span key={g} className="anime-genre">{g}</span>) : <span className="anime-dim">No genres tagged</span>}</div><p className="anime-detail-overview">{selected.overview || 'No synopsis available.'}</p>{selected.trailerUrl && <div className="anime-trailer"><iframe src={selected.trailerUrl.replace('watch?v=', 'embed/')} title={`${selected.title} trailer`} allow="autoplay; encrypted-media; picture-in-picture" allowFullScreen /></div>}</div></div><div className="anime-detail-episodes"><div className="anime-detail-section-title"><span>Episodes</span><small>{episodes.length} published</small></div>{episodes.length === 0 ? <p className="anime-dim">No episodes have been published for this title yet.</p> : episodes.map((ep) => <div key={ep.id} className={`anime-episode-row${watching?.id === ep.id ? ' active' : ''}`}><strong>#{String(ep.number).padStart(2, '0')}</strong><span className="anime-episode-title">{ep.title || `Episode ${ep.number}`}</span><span className="anime-dim">{ep.durationSec ? `${Math.floor(ep.durationSec / 60)}:${String(Math.floor(ep.durationSec % 60)).padStart(2, '0')}` : ''}</span>{ep.externalUrl ? <button type="button" className="btn btn-violet pill-sm" onClick={() => setWatching(ep)}><Play size={13} fill="currentColor" /> Watch</button> : <span className="anime-soon-chip">Soon</span>}</div>)}</div><div className="anime-detail-actions"><button type="button" className="btn btn-violet" disabled={!episodes.some((e) => e.externalUrl)} onClick={() => void startParty(selected, watching || episodes.find((e) => e.externalUrl))}><UsersRound size={15} /> Start Anime Party</button><button type="button" className="btn btn-ghost" onClick={() => toggleSaved(selected)}><ListPlus size={15} /> {saved.has(selected.id) ? 'Remove from list' : 'Save for later'}</button></div></section></div>}
    </div>
  );
}
