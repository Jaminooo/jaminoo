'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { Clapperboard, Film, Filter, ListPlus, Play, Search, Tv2, UsersRound, X, Globe } from 'lucide-react';
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
  number: number;
  title: string;
  durationSec: number;
  externalUrl: string | null;
}

type AnimeTab = 'home' | 'series' | 'movies' | 'my-list';

const ALL_GENRES = [
  'Action', 'Adventure', 'Comedy', 'Drama', 'Fantasy', 'Sci-Fi', 'Slice of Life',
  'Sports', 'Mystery', 'Horror', 'Romance', 'Isekai', 'Supernatural', 'Mecha', 'Music',
];

function Cover({ anime }: { anime: AnimeItem }) {
  const style: React.CSSProperties = anime.coverUrl
    ? {}
    : {
        background: `linear-gradient(135deg, hsl(${anime.colorFrom || 260}, 70%, 24%), hsl(${anime.colorTo || 340}, 70%, 22%))`,
      };
  return (
    <div className="anime-card-art" style={style}>
      {anime.coverUrl ? <Image src={anime.coverUrl} alt={anime.title} fill unoptimized loading="lazy" /> : <span className="anime-card-placeholder">{anime.type === 'MOVIE' ? <Film size={24} /> : <Tv2 size={24} />}</span>}
    </div>
  );
}

function RatingBadge({ rating }: { rating: number }) {
  if (!rating) return null;
  return <span className="anime-rating-badge">★ {rating.toFixed(1)}</span>;
}

export function AnimeHub() {
  const setProduct = useAppStore((s) => s.setProduct);
  const setTab = useAppStore((s) => s.setTab);
  const setRoomId = useAppStore((s) => s.setRoomId);
  const [tab, setTabView] = useState<AnimeTab>('home');
  const [items, setItems] = useState<AnimeItem[]>([]);
  const [saved, setSaved] = useState<Set<number>>(new Set());
  const [selected, setSelected] = useState<AnimeItem | null>(null);
  const [episodes, setEpisodes] = useState<EpisodeItem[]>([]);
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

  const badgeTone = useMemo(() => (tab === 'series' ? 'cyan' : tab === 'movies' ? 'pink' : 'violet'), [tab]);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (tab === 'series') params.set('type', 'TV');
    else if (tab === 'movies') params.set('type', 'MOVIE');
    params.set('featured', '1');
    if (query) params.set('q', query);
    if (genre) params.set('genre', genre);
    try {
      const data = await api<{ items: AnimeItem[]; nextCursor: number | null }>(
        `/api/anime?${params.toString()}`
      );
      setItems(data.items || []);
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Could not load AniHub.', 'error');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [tab, query, genre]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    connectLive();
    return onLive('anime:update', () => void load());
  }, [load]);

  const filtered = useMemo(() => {
    let out = items;
    if (tab === 'my-list') out = out.filter((a) => saved.has(a.id));
    return out;
  }, [items, saved, tab]);

  const toggleSaved = (anime: AnimeItem) => {
    const next = new Set(saved);
    if (next.has(anime.id)) next.delete(anime.id);
    else next.add(anime.id);
    setSaved(next);
    localStorage.setItem('jamino_anime_list', JSON.stringify([...next]));
  };

  const openDetail = async (anime: AnimeItem) => {
    setSelected(anime);
    try {
      const data = await api<{ episodes: EpisodeItem[] }>(`/api/anime/${anime.slug}/episodes`);
      setEpisodes(data.episodes || []);
    } catch {
      setEpisodes([]);
    }
  };

  const closeDetail = () => {
    setSelected(null);
    setEpisodes([]);
  };

  const startParty = async (anime: AnimeItem) => {
    try {
      const data = await api<{ jam: { id: string } }>('/api/jams', {
        method: 'POST',
        body: JSON.stringify({
          name: `Watch ${anime.title}`,
          desc: 'AniHub watch party',
          type: 'PRIVATE',
          kind: 'ANIME',
        }),
      });
      closeDetail();
      setProduct('community');
      setTab('jams');
      setRoomId(data.jam.id);
      toast('Anime Party created. Invite your members.', 'ok');
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Could not start an Anime party.', 'error');
    }
  };

  const tabs: { id: AnimeTab; label: string; icon: typeof Film }[] = [
    { id: 'home', label: 'Home', icon: Clapperboard },
    { id: 'series', label: 'Series', icon: Tv2 },
    { id: 'movies', label: 'Movies', icon: Film },
    { id: 'my-list', label: 'My list', icon: ListPlus },
  ];

  const statusLabel = (a: AnimeItem) => (a.status === 'AIRING' ? 'Airing' : a.status === 'UPCOMING' ? 'Upcoming' : 'Finished');

  return (
    <div className="hub-shell hub-shell-anime anime-hub-root">
      <WorkspaceTopbar onHome={() => setProduct('home')} product="Anime Hub" />
      <main className="anime-hub-main">
        <header className="anime-hub-heading">
          <div>
            <div className="hub-kicker">ANIHUB · CONNECTED TO JAMINO</div>
            <h1>Anime made for a shared screen.</h1>
            <p>Series and films live here. Anime Parties can only play this catalogue together.</p>
          </div>
          <button type="button" className="btn btn-ghost pill-sm" onClick={() => { setProduct('community'); setTab('jams'); }}>
            <UsersRound size={15} /> Community Jams
          </button>
        </header>

        <nav className="anime-tabs">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button type="button" key={id} className={tab === id ? `active ${badgeTone}` : ''} onClick={() => setTabView(id)}>
              <Icon size={14} /> {label}
            </button>
          ))}
        </nav>

        <div className="anime-toolbar">
          <div className="anime-search">
            <Search size={14} />
            <input
              placeholder="Search anime…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <div className="anime-genre-filter">
            <Filter size={14} />
            <select value={genre} onChange={(e) => setGenre(e.target.value)}>
              <option value="">All genres</option>
              {ALL_GENRES.map((g) => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
            {genre && (
              <button type="button" className="btn-icon" title="Clear genre" onClick={() => setGenre('')}>
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        {loading ? (
          <div className="anime-loading"><span className="admin-loader" /> Loading the catalogue…</div>
        ) : filtered.length === 0 ? (
          <section className="anime-coming-soon">
            <div className="anime-art-hero">
              <Film size={44} />
              <span className="anime-orbit" />
            </div>
            <div className="hub-kicker">ANIHUB · {tab.replace('-', ' ').toUpperCase()}</div>
            <h2>Your next episode is coming soon.</h2>
            <p>The AniHub catalogue is curated by the anime admin. Once a title is live, it can be watched here or synced with an Anime Party.</p>
            <span className="coming-soon-pill"><Globe size={14} /> Coming soon</span>
          </section>
        ) : (
          <section className="anime-catalogue">
            <div className="anime-catalogue-head">
              <div>
                <span className="hub-kicker">{tab === 'home' ? 'NOW STREAMING' : tab === 'my-list' ? 'YOUR LIST' : `BROWSE ${tab.toUpperCase()}`}</span>
                <h2>{tab === 'home' ? 'Pick a title, then invite the room.' : tab === 'my-list' ? 'Your saved anime.' : `Browse ${tab}.`}</h2>
              </div>
              <span className="anime-catalogue-count">{filtered.length} titles</span>
            </div>
            <div className="anime-card-grid">
              {filtered.map((anime) => (
                <article className="anime-card" key={anime.id}>
                  <div className="anime-card-media">
                    <Cover anime={anime} />
                    <RatingBadge rating={anime.rating} />
                    <i className={`anime-type-badge ${anime.type === 'MOVIE' ? 'movie' : 'series'}`}>{anime.type === 'MOVIE' ? 'Movie' : 'Series'}</i>
                  </div>
                  <div className="anime-card-copy">
                    <b>{anime.title}</b>
                    <small>{anime.original || anime.year}</small>
                    <div className="anime-card-meta">
                      <span className="anime-status">{statusLabel(anime)}</span>
                      <span>{anime.episodes} eps</span>
                      <span>{anime.rating.toFixed(1)}</span>
                    </div>
                  </div>
                  <button type="button" className="btn-icon violet" title={saved.has(anime.id) ? 'Saved' : 'Save'} onClick={() => toggleSaved(anime)}>
                    <ListPlus size={16} />
                  </button>
                  <button type="button" className="btn btn-violet pill-sm" onClick={() => void openDetail(anime)}>
                    <Play size={14} /> Watch
                  </button>
                </article>
              ))}
            </div>
          </section>
        )}
      </main>

      {selected && (
        <div
          className="anime-player-backdrop"
          style={{ backdropFilter: 'blur(24px) saturate(1.2)', WebkitBackdropFilter: 'blur(24px) saturate(1.2)' }}
          onMouseDown={closeDetail}
        >
          <section className="anime-detail-modal" role="dialog" aria-modal="true" onMouseDown={(e) => e.stopPropagation()}>
            <div className="anime-detail-head">
              <div>
                <div className="hub-kicker">ANIME · {selected.type === 'MOVIE' ? 'MOVIE' : 'SERIES'}</div>
                <h2>{selected.title}</h2>
                {selected.original && <small className="anime-original">{selected.original}</small>}
              </div>
              <button type="button" className="btn-icon" onClick={closeDetail} aria-label="Close">
                <X size={18} />
              </button>
            </div>

            <div className="anime-detail-body">
              <div className="anime-detail-art">
                <Cover anime={selected} />
              </div>
              <div className="anime-detail-info">
                <div className="anime-detail-meta">
                  <span className="anime-status">{statusLabel(selected)}</span>
                  <span>· {selected.year || 'TBA'}</span>
                  <span>· {selected.studio || 'Unknown studio'}</span>
                  <span>· {selected.episodes} episode{selected.episodes === 1 ? '' : 's'}</span>
                </div>
                <div className="anime-detail-genres">
                  {selected.genres.length ? selected.genres.map((g) => <span key={g} className="anime-genre">{g}</span>) : <span className="anime-dim">No genres tagged</span>}
                </div>
                <p className="anime-detail-overview">{selected.overview || 'No synopsis available.'}</p>
                {selected.trailerUrl && (
                  <div className="anime-trailer">
                    <iframe
                      src={selected.trailerUrl.replace('watch?v=', 'embed/')}
                      title={`${selected.title} trailer`}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; picture-in-picture"
                      allowFullScreen
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="anime-detail-episodes">
              <div className="anime-detail-section-title">Episodes</div>
              {episodes.length === 0 ? (
                <p className="anime-dim">No episodes have been published for this title yet.</p>
              ) : (
                episodes.map((ep) => (
                  <div key={ep.id} className="anime-episode-row">
                    <strong>#{ep.number}</strong>
                    <span className="anime-episode-title">{ep.title || `Episode ${ep.number}`}</span>
                    <span className="anime-dim">{ep.durationSec ? `${Math.floor(ep.durationSec / 60)}:${String(Math.floor(ep.durationSec % 60)).padStart(2, '0')}` : ''}</span>
                    {!ep.externalUrl && <span className="anime-soon-chip">Soon</span>}
                  </div>
                ))
              )}
            </div>

            <div className="anime-detail-actions">
              <button type="button" className="btn btn-violet" disabled={!episodes.some((e) => e.externalUrl)} onClick={() => void startParty(selected)}>
                <UsersRound size={15} /> Start Anime Party
              </button>
              <button type="button" className="btn btn-ghost" onClick={() => toggleSaved(selected)}>
                <ListPlus size={15} /> {saved.has(selected.id) ? 'Remove from list' : 'Save for later'}
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
