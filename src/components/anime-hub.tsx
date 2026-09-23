'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import type { LucideIcon } from 'lucide-react';
import { Clapperboard, Film, Filter, ListPlus, Play, Search, Tv2, UsersRound, X, Globe, Flame, Clock3, Star, ChevronRight, Radio } from 'lucide-react';
import { api } from '@/lib/client-api';
import { toast } from '@/components/toast';
import { useTranslations } from '@/providers/use-translations';
import { useAppStore } from '@/store/app-store';
import { WorkspaceTopbar } from '@/components/hub-gateway';
import { connectLive, onLive } from '@/lib/live';
import { VinylPlayer } from '@/components/vinyl-player';

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
type Shelf = { title: string; kicker: string; icon: LucideIcon; items: AnimeItem[]; tone: string };

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
      {anime.coverUrl ? (
        <Image src={anime.coverUrl} alt={anime.title} fill unoptimized loading="lazy" />
      ) : (
        <span className="anime-card-placeholder">{anime.type === 'MOVIE' ? <Film size={24} /> : <Tv2 size={24} />}</span>
      )}
    </div>
  );
}

function RatingBadge({ rating }: { rating: number }) {
  if (!rating) return null;
  return <span className="anime-rating-badge"><Star size={11} fill="currentColor" /> {rating.toFixed(1)}</span>;
}

function formatDuration(durationSec: number) {
  const m = Math.floor(durationSec / 60);
  const s = String(Math.floor(durationSec % 60)).padStart(2, '0');
  return `${m}:${s}`;
}

export function AnimeHub() {
  const t = useTranslations();
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
      toast(error instanceof Error ? error.message : t('anime.loadError'), 'error');
      setItems([]); setAiring([]); setLatest([]); setTopRated([]);
    } finally {
      setLoading(false);
    }
  }, [tab, query, genre, t]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    connectLive();
    return onLive('anime:update', () => void load());
  }, [load]);

  const filtered = useMemo(() => (tab === 'my-list' ? items.filter((a) => saved.has(a.id)) : items), [items, saved, tab]);
  const shelves = useMemo<Shelf[]>(() => [
    { title: t('anime.topRated'), kicker: t('anime.topRatedKicker'), icon: Star, items: topRated, tone: 'violet' },
    { title: t('anime.airingNow'), kicker: t('anime.airingNowKicker'), icon: Radio, items: airing, tone: 'cyan' },
    { title: t('anime.freshlyAdded'), kicker: t('anime.freshlyAddedKicker'), icon: Clock3, items: latest, tone: 'amber' },
  ].filter((s) => s.items.length > 0), [airing, latest, topRated, t]);

  const toggleSaved = (anime: AnimeItem) => {
    const next = new Set(saved);
    if (next.has(anime.id)) next.delete(anime.id); else next.add(anime.id);
    setSaved(next);
    localStorage.setItem('jamino_anime_list', JSON.stringify([...next]));
  };

  const openDetail = async (anime: AnimeItem) => {
    setSelected(anime);
    setWatching(null);
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
    setWatching(null);
  };

  const startParty = async (anime: AnimeItem, episode?: EpisodeItem) => {
    try {
      const data = await api<{ jam: { id: string } }>('/api/jams', {
        method: 'POST',
        body: JSON.stringify({
          name: `${t('anime.hubTitle')} · ${anime.title}`,
          desc: t('anime.watchPartyDesc'),
          type: 'PRIVATE',
          kind: 'ANIME',
        }),
      });
      if (episode) {
        await api(`/api/jams/${data.jam.id}/anime`, { method: 'PATCH', body: JSON.stringify({ action: 'load', episodeId: episode.id }) });
      }
      closeDetail();
      setProduct('community');
      setTab('jams');
      setRoomId(data.jam.id);
      toast(t('anime.partyCreated'), 'ok');
    } catch (error) {
      toast(error instanceof Error ? error.message : t('anime.partyError'), 'error');
    }
  };

  const tabs: { id: AnimeTab; label: string; icon: LucideIcon }[] = [
    { id: 'home', label: t('anime.home'), icon: Clapperboard },
    { id: 'series', label: t('anime.series'), icon: Tv2 },
    { id: 'movies', label: t('anime.movies'), icon: Film },
    { id: 'my-list', label: t('anime.myList'), icon: ListPlus },
  ];

  const statusLabel = (a: AnimeItem) =>
    a.status === 'AIRING' ? t('anime.statusAiring') : a.status === 'UPCOMING' ? t('anime.statusUpcoming') : t('anime.statusFinished');

  const renderCard = (anime: AnimeItem, compact = false) => (
    <article className={`anime-card${compact ? ' anime-card-compact' : ''}`} key={anime.id}>
      <button type="button" className="anime-card-hit" onClick={() => void openDetail(anime)} aria-label={t('anime.open', { title: anime.title })}>
        <div className="anime-card-media">
          <Cover anime={anime} />
          <RatingBadge rating={anime.rating} />
          <i className={`anime-type-badge ${anime.type === 'MOVIE' ? 'movie' : 'series'}`}>
            {anime.type === 'MOVIE' ? t('anime.typeMovie') : t('anime.typeSeries')}
          </i>
          <span className="anime-card-play"><Play size={16} fill="currentColor" /></span>
        </div>
        <div className="anime-card-copy">
          <b>{anime.title}</b>
          <small>{anime.original || anime.year || 'Anime'}</small>
          <div className="anime-card-meta">
            <span className="anime-status">{statusLabel(anime)}</span>
            <span>{anime.episodes || anime.episodeCount || 0} {t('anime.eps')}</span>
            <span>{anime.year || t('anime.tba')}</span>
          </div>
        </div>
      </button>
      <button
        type="button"
        className={`btn-icon violet anime-save-button${saved.has(anime.id) ? ' is-saved' : ''}`}
        title={saved.has(anime.id) ? t('anime.saved') : t('anime.save')}
        onClick={() => toggleSaved(anime)}
      >
        <ListPlus size={16} />
      </button>
    </article>
  );

  const heroAnime: AnimeItem = topRated[0] || latest[0] || {
    id: 0,
    slug: '',
    title: t('anime.yourNextAnime'),
    original: 'JAMINO',
    overview: '',
    coverUrl: null,
    trailerUrl: '',
    type: 'TV',
    status: 'AIRING',
    year: 2025,
    episodes: 0,
    rating: 0,
    genres: [],
    studio: '',
    colorFrom: 266,
    colorTo: 330,
  };

  const catalogueKicker =
    tab === 'my-list' ? t('anime.yourList') : tab === 'home' ? t('anime.searchResults') : t('anime.browse', { kind: tab.toUpperCase() });

  const catalogueTitle = tab === 'my-list' ? t('anime.savedForLater') : t('anime.pickNext');

  return (
    <div className="hub-shell hub-shell-anime anime-hub-root">
      <WorkspaceTopbar onHome={() => setProduct('home')} product="Anime Hub" />
      <main className="anime-hub-main">
        <section className="anime-hero">
          <div className="anime-hero-copy">
            <span className="hub-kicker"><Flame size={13} /> {t('anime.heroKicker')}</span>
            <h1>
              {t('anime.heroTitleA')}
              <br />
              <em>{t('anime.heroTitleB')}</em>
            </h1>
            <p>{t('anime.heroDesc')}</p>
            <div className="anime-hero-actions">
              <button
                type="button"
                className="btn btn-violet"
                onClick={() => document.getElementById('anime-catalogue')?.scrollIntoView({ behavior: 'smooth' })}
              >
                <Play size={15} fill="currentColor" /> {t('anime.explore')}
              </button>
              <button type="button" className="btn btn-ghost" onClick={() => { setProduct('community'); setTab('jams'); }}>
                <UsersRound size={15} /> {t('anime.openParty')}
              </button>
            </div>
          </div>
          <div className="anime-hero-art">
            <div className="anime-hero-orbit" />
            <div className="anime-hero-poster">
              <Cover anime={heroAnime} wide />
            </div>
            <div className="anime-hero-float">
              <UsersRound size={15} />
              <span>
                <b>{t('anime.partyLabel')}</b>
                <small>{t('anime.syncedPlayback')}</small>
              </span>
            </div>
          </div>
        </section>

        <nav className="anime-tabs">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button type="button" key={id} className={tab === id ? 'active violet' : ''} onClick={() => setTabView(id)}>
              <Icon size={14} /> {label}
            </button>
          ))}
        </nav>
        <div className="anime-toolbar">
          <div className="anime-search">
            <Search size={14} />
            <input placeholder={t('anime.search')} value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>
          <div className="anime-genre-filter">
            <Filter size={14} />
            <select value={genre} onChange={(e) => setGenre(e.target.value)}>
              <option value="">{t('anime.allGenres')}</option>
              {ALL_GENRES.map((g) => <option key={g} value={g}>{g}</option>)}
            </select>
            {genre && (
              <button type="button" className="btn-icon" title={t('anime.clearGenre')} onClick={() => setGenre('')}>
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        {loading ? (
          <div className="anime-loading"><span className="admin-loader" /> {t('anime.loading')}</div>
        ) : tab === 'home' && !query && !genre ? (
          <div className="anime-shelves">
            {shelves.map(({ title, kicker, icon: Icon, items: shelfItems, tone }) => (
              <section className="anime-shelf" key={title}>
                <div className="anime-shelf-head">
                  <div>
                    <span className="hub-kicker"><Icon size={12} /> {kicker}</span>
                    <h2>{title}</h2>
                  </div>
                  <button type="button" className="anime-see-all" onClick={() => setTabView('series')}>
                    {t('anime.seeAll')} <ChevronRight size={14} />
                  </button>
                </div>
                <div className="anime-card-grid anime-card-grid-shelf">
                  {shelfItems.slice(0, 6).map((anime) => renderCard(anime, true))}
                </div>
                <div className={`anime-shelf-rule ${tone}`} />
              </section>
            ))}
          </div>
        ) : (
          <section className="anime-catalogue" id="anime-catalogue">
            <div className="anime-catalogue-head">
              <div>
                <span className="hub-kicker">{catalogueKicker}</span>
                <h2>{catalogueTitle}</h2>
              </div>
              <span className="anime-catalogue-count">{t('anime.count', { n: filtered.length })}</span>
            </div>
            {filtered.length === 0 ? (
              <section className="anime-coming-soon">
                <div className="anime-art-hero"><Film size={44} /></div>
                <h2>{t('anime.emptyState')}</h2>
                <p>{t('anime.emptyHint')}</p>
                <span className="coming-soon-pill"><Globe size={14} /> {t('anime.curated')}</span>
              </section>
            ) : (
              <div className="anime-card-grid">{filtered.map((anime) => renderCard(anime))}</div>
            )}
          </section>
        )}
      </main>

      {selected && (
        <div className="anime-player-backdrop" onMouseDown={closeDetail}>
          <section className="anime-detail-modal" role="dialog" aria-modal="true" onMouseDown={(e) => e.stopPropagation()}>
            <div className="anime-detail-head">
              <div>
                <div className="hub-kicker">{t('anime.detailKicker', { type: selected.type === 'MOVIE' ? t('anime.typeMovie') : t('anime.typeSeries') })}</div>
                <h2>{selected.title}</h2>
                {selected.original && <small className="anime-original">{selected.original}</small>}
              </div>
              <button type="button" className="btn-icon" onClick={closeDetail} aria-label={t('anime.close')}>
                <X size={18} />
              </button>
            </div>
            {watching && (
              <div className="anime-inline-player">
                {watching.externalUrl ? (
                  <VinylPlayer
                    key={watching.id}
                    variant="feature"
                    src={watching.externalUrl}
                    poster={watching.thumbnailUrl}
                    subtitlesUrl={watching.subtitlesUrl}
                    title={`${selected.title} · ${t('anime.episode', { n: watching.number })}`}
                    badge={t('anime.hubTitle')}
                    rememberPosition
                  />
                ) : null}
              </div>
            )}
            <div className="anime-detail-body">
              <div className="anime-detail-art">
                <Cover anime={selected} />
              </div>
              <div className="anime-detail-info">
                <div className="anime-detail-meta">
                  <span className="anime-status">{statusLabel(selected)}</span>
                  <span>· {selected.year || t('anime.tba')}</span>
                  <span>· {selected.studio || t('anime.unknownStudio')}</span>
                  <span>· {selected.episodes || episodes.length} {t('anime.eps')}</span>
                </div>
                <div className="anime-detail-genres">
                  {selected.genres.length
                    ? selected.genres.map((g) => <span key={g} className="anime-genre">{g}</span>)
                    : <span className="anime-dim">{t('anime.noGenres')}</span>}
                </div>
                <p className="anime-detail-overview">{selected.overview || t('anime.noSynopsis')}</p>
                {selected.trailerUrl && (
                  <div className="anime-trailer">
                    <iframe
                      src={selected.trailerUrl.replace('watch?v=', 'embed/')}
                      title={`${selected.title} trailer`}
                      allow="autoplay; encrypted-media; picture-in-picture"
                      allowFullScreen
                    />
                  </div>
                )}
              </div>
            </div>
            <div className="anime-detail-episodes">
              <div className="anime-detail-section-title">
                <span>{t('anime.hubEpisodes')}</span>
                <small>{t('anime.published', { n: episodes.length })}</small>
              </div>
              {episodes.length === 0 ? (
                <p className="anime-dim">{t('anime.noEpisodes')}</p>
              ) : (
                episodes.map((ep) => (
                  <div key={ep.id} className={`anime-episode-row${watching?.id === ep.id ? ' active' : ''}`}>
                    <strong>#{String(ep.number).padStart(2, '0')}</strong>
                    <span className="anime-episode-title">{ep.title || t('anime.episode', { n: ep.number })}</span>
                    <span className="anime-dim">{ep.durationSec ? formatDuration(ep.durationSec) : ''}</span>
                    {ep.externalUrl ? (
                      <button type="button" className="btn btn-violet pill-sm" onClick={() => setWatching(ep)}>
                        <Play size={13} fill="currentColor" /> {t('anime.watch')}
                      </button>
                    ) : (
                      <span className="anime-soon-chip">{t('anime.soon')}</span>
                    )}
                  </div>
                ))
              )}
            </div>
            <div className="anime-detail-actions">
              <button
                type="button"
                className="btn btn-violet"
                disabled={!episodes.some((e) => e.externalUrl)}
                onClick={() => void startParty(selected, watching || episodes.find((e) => e.externalUrl))}
              >
                <UsersRound size={15} /> {t('anime.startParty')}
              </button>
              <button type="button" className="btn btn-ghost" onClick={() => toggleSaved(selected)}>
                <ListPlus size={15} /> {saved.has(selected.id) ? t('anime.removeFromList') : t('anime.saveLater')}
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}