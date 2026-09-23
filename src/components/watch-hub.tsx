'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { AnimatePresence, motion } from 'motion/react';
import type { LucideIcon } from 'lucide-react';
import { ChevronDown, ChevronRight, Clapperboard, Clock3, Film, Filter, Flame, Globe, LayoutGrid, ListPlus, Play, Radio, Search, Sparkles, Star, Tv2, UsersRound, X } from 'lucide-react';
import { api } from '@/lib/client-api';
import { toast } from '@/components/toast';
import { useTranslations } from '@/providers/use-translations';
import { useAppStore } from '@/store/app-store';
import { WorkspaceTopbar } from '@/components/hub-gateway';
import { connectLive, onLive } from '@/lib/live';
import { VinylPlayer } from '@/components/vinyl-player';
import { WATCH_QUALITIES, DEFAULT_QUALITY, resolveWatchSource, type QualitySources, type WatchQuality } from '@/lib/watch-select';
import {
  animeItem as toWatchAnime,
  buildCategoryRails,
  buildGenreRails,
  buildHeroPicks,
  buildNewRails,
  buildWatchShelves,
  cinematicItem as toWatchCinema,
  filterByWatchTab,
  genreCounts,
  matchWatchQuery,
  mergeWatchCatalog,
  watchPartyPlan,
  watchTitleHue,
  type WatchItem,
  type WatchRail,
  type WatchTab,
} from '@/lib/watch-catalog';

// Raw API shapes — structural supersets of what watch-catalog needs.
interface CinemaRow {
  id: number;
  title: string;
  description: string;
  kind: string;
  externalUrl: string | null;
  qualitySources?: QualitySources;
  thumbnailUrl: string | null;
  subtitlesUrl: string | null;
  durationSec: number;
}

interface AnimeRow {
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
}

interface EpisodeItem {
  id: number;
  animeId?: number;
  cinemaVideoId?: number;
  season?: number;
  number: number;
  title: string;
  durationSec: number;
  externalUrl: string | null;
  qualitySources?: QualitySources;
  thumbnailUrl?: string | null;
  subtitlesUrl?: string | null;
}

interface PlayingMedia {
  url: string;
  source: string | null;
  qualitySources: QualitySources;
  poster: string | null;
  subtitles: string | null;
  title: string;
}

type Shelf = { title: string; kicker: string; icon: LucideIcon; items: WatchItem[]; tone: string };

const ALL_GENRES = [
  'Action', 'Adventure', 'Comedy', 'Drama', 'Fantasy', 'Sci-Fi', 'Slice of Life',
  'Sports', 'Mystery', 'Horror', 'Romance', 'Isekai', 'Supernatural', 'Mecha', 'Music',
];

const KIND_ICON: Record<string, LucideIcon> = { MOVIE: Film, SERIES: Tv2, ANIME: Clapperboard, CARTOON: Sparkles };

const WATCH_DEFAULT_ART: Record<string, string> = {
  MOVIE: '/defaults/images/movie.png',
  SERIES: '/defaults/images/video.png',
  CARTOON: '/defaults/images/media.png',
  ANIME: '/defaults/images/video.png',
};

function Cover({ item, wide = false }: { item: WatchItem; wide?: boolean }) {
  const fallbackArt = WATCH_DEFAULT_ART[item.kind] ?? WATCH_DEFAULT_ART.MOVIE;
  const hasArt = Boolean(item.artworkUrl);
  const style: React.CSSProperties = hasArt
    ? {}
    : { background: `linear-gradient(135deg, hsl(${item.colorFrom || 260}, 70%, 24%), hsl(${item.colorTo || 340}, 70%, 22%))` };
  const Icon = KIND_ICON[item.kind] ?? Film;
  return (
    <div className={`anime-card-art${wide ? ' anime-card-art-wide' : ''} ${hasArt ? '' : 'anime-card-art-default'}`} style={style}>
      {hasArt ? (
        <Image src={item.artworkUrl!} alt={item.title} fill unoptimized loading="lazy" />
      ) : (
        <>
          <Image src={fallbackArt} alt={item.title} fill unoptimized loading="lazy" />
          <span className="anime-card-placeholder"><Icon size={24} /></span>
        </>
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

export function WatchHub() {
  const t = useTranslations();
  const router = useRouter();
  const setProduct = useAppStore((s) => s.setProduct);
  const setTab = useAppStore((s) => s.setTab);
  const setRoomId = useAppStore((s) => s.setRoomId);
  const [tab, setTabView] = useState<WatchTab>('home');
  const [quality, setQuality] = useState<WatchQuality>(DEFAULT_QUALITY);
  const [cinemaItems, setCinemaItems] = useState<CinemaRow[]>([]);
  const [animeItems, setAnimeItems] = useState<AnimeRow[]>([]);
  const [saved, setSaved] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<WatchItem | null>(null);
  const [episodes, setEpisodes] = useState<EpisodeItem[]>([]);
  const [episodesLoading, setEpisodesLoading] = useState(false);
  const [playing, setPlaying] = useState<PlayingMedia | null>(null);
  const [activeEpisode, setActiveEpisode] = useState<EpisodeItem | null>(null);
  const detailRequestRef = useRef(0);
  const [query, setQuery] = useState('');
  const [genre, setGenre] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('jamino_watch_list');
      if (raw) {
        const arr: string[] = JSON.parse(raw);
        if (Array.isArray(arr)) setSaved(new Set(arr.filter((k) => typeof k === 'string' && k.includes(':'))));
      }
    } catch {}
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [cinema, anime] = await Promise.all([
        api<{ items: CinemaRow[] }>('/api/cinema?kind=ALL'),
        api<{ items: AnimeRow[] }>('/api/anime?sort=latest'),
      ]);
      setCinemaItems(cinema.items || []);
      setAnimeItems(anime.items || []);
    } catch (error) {
      toast(error instanceof Error ? error.message : t('watch.loadError'), 'error');
      setCinemaItems([]);
      setAnimeItems([]);
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    connectLive();
    const offCinema = onLive('cinema:update', () => void load());
    const offAnime = onLive('anime:update', () => void load());
    return () => { offCinema(); offAnime(); };
  }, [load]);

  const unified = useMemo<WatchItem[]>(() => mergeWatchCatalog(cinemaItems, animeItems), [cinemaItems, animeItems]);

  // Netflix-style rows for the home surface.
  const newRails = useMemo(() => buildNewRails(unified), [unified]);
  const genreRails = useMemo(() => buildGenreRails(unified, { min: 2, maxRails: 6, limit: 10 }), [unified]);
  const categoryRails = useMemo(() => buildCategoryRails(unified, 10), [unified]);
  const heroPicks = useMemo(() => buildHeroPicks(unified, 6), [unified]);
  const [heroIndex, setHeroIndex] = useState(0);
  const [browseOpen, setBrowseOpen] = useState(false);
  const genreTallies = useMemo(() => genreCounts(unified), [unified]);

  // Rotate the hero spotlight on the home tab (only when more than one pick).
  useEffect(() => {
    if (heroPicks.length < 2) return;
    const timer = window.setInterval(() => setHeroIndex((i) => (i + 1) % heroPicks.length), 7000);
    return () => window.clearInterval(timer);
  }, [heroPicks.length]);

  const filtered = useMemo(() => {
    let list = tab === 'my-list' ? unified.filter((i) => saved.has(i.key)) : filterByWatchTab(unified, tab);
    if (query.trim()) list = list.filter((i) => matchWatchQuery(i, query));
    if (genre) list = list.filter((i) => i.genres.includes(genre));
    return list;
  }, [unified, tab, saved, query, genre]);

  const shelves = useMemo<Shelf[]>(() => {
    const all = unified.filter((i) => !query.trim() && !genre);
    const built = buildWatchShelves(all);
    return [
      { title: t('watch.featured'), kicker: t('watch.featuredKicker'), icon: Star, items: built.featured, tone: 'violet' },
      { title: t('watch.fresh'), kicker: t('watch.freshKicker'), icon: Clock3, items: built.fresh, tone: 'amber' },
      { title: t('watch.airing'), kicker: t('watch.airingKicker'), icon: Radio, items: built.updated, tone: 'cyan' },
    ].filter((s) => s.items.length > 0);
  }, [unified, query, genre, t]);

  const toggleSaved = (item: WatchItem) => {
    const next = new Set(saved);
    if (next.has(item.key)) next.delete(item.key); else next.add(item.key);
    setSaved(next);
    localStorage.setItem('jamino_watch_list', JSON.stringify([...next]));
  };

  const toPlayingMedia = (source: string | null | undefined, sources: QualitySources | undefined, poster: string | null, subtitles: string | null, title: string): PlayingMedia => ({
    url: resolveWatchSource(source, sources, quality),
    source: source || null,
    qualitySources: sources || {},
    poster,
    subtitles,
    title,
  });

  const openDetail = async (item: WatchItem) => {
    const requestId = ++detailRequestRef.current;
    setSelected(item);
    setEpisodes([]);
    setActiveEpisode(null);
    setEpisodesLoading(item.kind === 'ANIME' || item.kind === 'SERIES');
    setPlaying(toPlayingMedia(item.mediaUrl, undefined, item.artworkUrl, item.subtitlesUrl, item.title));
    try {
      if (item.kind === 'ANIME' && item.slug) {
        try {
          const data = await api<{ episodes: EpisodeItem[] }>(`/api/anime/${item.slug}/episodes`);
          if (requestId !== detailRequestRef.current) return;
          const nextEpisodes = data.episodes || [];
          setEpisodes(nextEpisodes);
          const first = nextEpisodes[0];
          if (first) {
            setActiveEpisode(first);
            setPlaying(toPlayingMedia(first.externalUrl, first.qualitySources, first.thumbnailUrl ?? item.artworkUrl, first.subtitlesUrl ?? null, `${item.title} · ${t('watch.episode', { n: first.number })}`));
          }
        } catch {
          if (requestId !== detailRequestRef.current) return;
          setEpisodes([]);
        }
      } else if (item.source === 'cinema') {
        const data = await api<{ item: CinemaRow; episodes: EpisodeItem[] }>(`/api/cinema/${item.externalId}`);
        if (requestId !== detailRequestRef.current) return;
        const detail = data.item;
        setPlaying(toPlayingMedia(detail.externalUrl, detail.qualitySources, detail.thumbnailUrl || item.artworkUrl, detail.subtitlesUrl, item.title));
        const nextEpisodes = data.episodes || [];
        setEpisodes(nextEpisodes);
        const first = nextEpisodes[0];
        if (first) {
          setActiveEpisode(first);
          setPlaying(toPlayingMedia(first.externalUrl, first.qualitySources, first.thumbnailUrl ?? detail.thumbnailUrl, first.subtitlesUrl ?? detail.subtitlesUrl, `${item.title} · S${first.season || 1} · ${t('watch.episode', { n: first.number })}`));
        }
      }
    } catch (error) {
      if (requestId !== detailRequestRef.current) return;
      toast(error instanceof Error ? error.message : t('watch.loadError'), 'error');
    } finally {
      if (requestId === detailRequestRef.current) setEpisodesLoading(false);
    }
  };

  const closeDetail = () => {
    detailRequestRef.current += 1;
    setSelected(null);
    setEpisodes([]);
    setEpisodesLoading(false);
    setPlaying(null);
    setActiveEpisode(null);
  };

  /** Open the dedicated theater page (big player + quality/season pickers). */
  const openTheater = (item: WatchItem, episode?: EpisodeItem | null) => {
    if (item.kind === 'ANIME' && item.slug) {
      const target = episode ?? activeEpisode ?? episodes[0];
      const query = target ? `?e=${target.id}` : '';
      router.push(`/watch/anime/${item.slug}${query}`);
    } else {
      router.push(`/watch/cinema/${item.externalId}?q=${quality}`);
    }
  };

  const DEMO_PLAYBACK = '/defaults/videos/demo.mp4';
  const playMovie = (item: WatchItem) => {
    setActiveEpisode(null);
    setPlaying(toPlayingMedia(item.mediaUrl || DEMO_PLAYBACK, item.source === 'cinema' ? playing?.qualitySources : undefined, item.artworkUrl, item.subtitlesUrl, item.title));
  };

  const playEpisode = (item: WatchItem, ep: EpisodeItem) => {
    setActiveEpisode(ep);
    setPlaying(toPlayingMedia(ep.externalUrl || DEMO_PLAYBACK, ep.qualitySources, ep.thumbnailUrl ?? item.artworkUrl, ep.subtitlesUrl ?? null, `${item.title} · S${ep.season || 1} · ${t('watch.episode', { n: ep.number })}`));
  };

  const startParty = async () => {
    if (!selected) return;
    const fallbackEpisode = episodes.find((e) => e.externalUrl);
    const episode = activeEpisode || fallbackEpisode;
    try {
      const data = await api<{ jam: { id: string } }>('/api/jams', {
        method: 'POST',
        body: JSON.stringify({
          name: `${t('watch.hubTitle')} · ${selected.title}`,
          desc: t('watch.watchPartyDesc'),
          type: 'PRIVATE',
          kind: selected.kind === 'ANIME' ? 'ANIME' : 'MOVIE',
        }),
      });
      const plan = watchPartyPlan(selected, { jamId: data.jam.id, episodeId: episode?.id });
      if (plan) await api(plan.mediaPath, { method: 'PATCH', body: JSON.stringify(plan.mediaBody) });
      closeDetail();
      setProduct('community');
      setTab('jams');
      setRoomId(data.jam.id);
      toast(t('watch.partyCreated'), 'ok');
    } catch (error) {
      toast(error instanceof Error ? error.message : t('watch.partyError'), 'error');
    }
  };

  const kindLabel = (item: WatchItem) =>
    item.kind === 'MOVIE' ? t('watch.typeMovie') : item.kind === 'SERIES' ? t('watch.typeSeries') : item.kind === 'CARTOON' ? t('watch.typeCartoon') : t('watch.typeAnime');

  const kindChip = (item: WatchItem) => (
    <i className={`anime-type-badge ${item.kind === 'MOVIE' ? 'movie' : item.kind === 'SERIES' ? 'series' : item.kind === 'CARTOON' ? 'cartoon' : 'anime'}`}>
      {kindLabel(item)}
    </i>
  );

  const statusLabel = (item: WatchItem) =>
    item.status === 'AIRING' ? t('watch.statusAiring') : item.status === 'UPCOMING' ? t('watch.statusUpcoming') : t('watch.statusFinished');

  const renderCard = (item: WatchItem, compact = false) => (
    <article className={`anime-card${compact ? ' anime-card-compact' : ''}`} key={item.key}>
      <button type="button" className="anime-card-hit" onClick={() => openTheater(item)} aria-label={t('watch.open', { title: item.title })}>
        <div className="anime-card-media">
          <Cover item={item} />
          <RatingBadge rating={item.rating} />
          {kindChip(item)}
          <span className="anime-card-play"><Play size={16} fill="currentColor" /></span>
        </div>
        <div className="anime-card-copy">
          <b>{item.title}</b>
          <small>{item.source === 'anime' ? (item.subtitle || item.year) : item.kind === 'CARTOON' ? t('watch.typeCartoon') : item.year || ''}</small>
          <div className="anime-card-meta">
            <span className="anime-status">{item.kind === 'ANIME' ? statusLabel(item) : kindLabel(item)}</span>
            {item.kind === 'ANIME' ? <span>{item.episodes} {t('watch.eps')}</span> : item.durationSec ? <span>{formatDuration(item.durationSec)}</span> : null}
            <span>{item.year || t('watch.tba')}</span>
          </div>
        </div>
      </button>
      <button
        type="button"
        className={`btn-icon violet anime-save-button${saved.has(item.key) ? ' is-saved' : ''}`}
        title={saved.has(item.key) ? t('watch.saved') : t('watch.save')}
        onClick={() => toggleSaved(item)}
      >
        <ListPlus size={16} />
      </button>
    </article>
  );

  const heroItem: WatchItem | null = heroPicks[heroIndex] ?? unified[0] ?? null;

  // --- Netflix-style rails for the home surface -----------------------------

  const renderRailCard = (item: WatchItem) => (
    <button type="button" className="anime-rail-card" key={item.key} onClick={() => openTheater(item)} aria-label={t('watch.open', { title: item.title })}>
      <div className="anime-rail-card-media">
        <Cover item={item} />
        {kindChip(item)}
        <span className="anime-card-play"><Play size={15} fill="currentColor" /></span>
      </div>
      <span className="anime-rail-card-title">{item.title}</span>
    </button>
  );

  const railTab = (rail: WatchRail): WatchTab | undefined =>
    rail.kind === 'ANIME' ? 'anime' : rail.kind === 'CARTOON' ? 'cartoons' : rail.kind === 'MOVIE' ? 'movies' : undefined;

  const renderRail = (rail: WatchRail, kicker: string, title: string) => {
    if (rail.items.length === 0) return null;
    const Icon = rail.kind !== 'MIXED' ? KIND_ICON[rail.kind] : Film;
    const to = railTab(rail);
    return (
      <section className="anime-rail" key={rail.id}>
        <div className="anime-shelf-head">
          <div>
            <span className="hub-kicker"><Icon size={12} /> {kicker}</span>
            <h2>{title}</h2>
          </div>
          {to && (
            <button type="button" className="anime-see-all" onClick={() => setTabView(to)}>
              {t('watch.seeAll')} <ChevronRight size={14} />
            </button>
          )}
        </div>
        <div className="anime-rail-track">{rail.items.map(renderRailCard)}</div>
      </section>
    );
  };

  const closeBrowse = () => setBrowseOpen(false);
  const pickGenre = (g: string) => {
    setGenre(g);
    setBrowseOpen(false);
    setQuery('');
  };

  const tabs: { id: WatchTab; label: string; icon: LucideIcon }[] = [
    { id: 'home', label: t('watch.home'), icon: Clapperboard },
    { id: 'movies', label: t('watch.movies'), icon: Film },
    { id: 'series', label: t('watch.series'), icon: Tv2 },
    { id: 'anime', label: t('watch.anime'), icon: Clapperboard },
    { id: 'cartoons', label: t('watch.cartoons'), icon: Sparkles },
    { id: 'my-list', label: t('watch.myList'), icon: ListPlus },
  ];

  const catalogueKicker =
    tab === 'my-list' ? t('watch.yourList') : tab === 'home' ? t('watch.searchResults') : t('watch.browse', { kind: kindLabelForTab(tab) });

  function kindLabelForTab(tabKey: WatchTab): string {
    if (tabKey === 'movies') return t('watch.typeMovie');
    if (tabKey === 'series') return t('watch.typeSeries');
    if (tabKey === 'anime') return t('watch.typeAnime');
    if (tabKey === 'cartoons') return t('watch.typeCartoon');
    return t('watch.hubTitle');
  }

  const catalogueTitle = tab === 'my-list' ? t('watch.savedForLater') : t('watch.pickNext');
  const canStartParty = selected ? (selected.kind === 'ANIME' ? episodes.some((episode) => episode.externalUrl) : Boolean(selected.mediaUrl || playing?.source)) : false;

  return (
    <div className="hub-shell hub-shell-watch watch-hub-root">
      <WorkspaceTopbar onHome={() => setProduct('home')} product="Watch Hub" />
      <main className="anime-hub-main">
        <section className="anime-hero watch-hero">
          <div className="anime-hero-copy">
            <span className="hub-kicker"><Flame size={13} /> {t('watch.kicker')}</span>
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                className="watch-hero-copy-slide"
                key={heroItem?.key ?? 'watch-hero-empty'}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.24, ease: 'easeOut' }}
              >
                <h1>{heroItem?.title ?? <>{t('watch.heroTitleA')} <em>{t('watch.heroTitleB')}</em></>}</h1>
                <div className="watch-hero-meta">
                  {heroItem && kindChip(heroItem)}
                  {heroItem?.year ? <span>{heroItem.year}</span> : null}
                  {heroItem?.rating ? <span className="watch-hero-rating"><Star size={13} fill="currentColor" /> {heroItem.rating.toFixed(1)}</span> : null}
                  {heroItem?.genres.slice(0, 2).map((itemGenre) => <span key={itemGenre}>{itemGenre}</span>)}
                </div>
                <p>{heroItem?.description || t('watch.heroDesc')}</p>
              </motion.div>
            </AnimatePresence>
            <div className="anime-hero-actions">
              <button
                type="button"
                className="btn btn-violet"
                onClick={() => heroItem ? openTheater(heroItem) : document.getElementById('anime-catalogue')?.scrollIntoView({ behavior: 'smooth' })}
              >
                <Play size={15} fill="currentColor" /> {heroItem ? t('watch.watch') : t('watch.explore')}
              </button>
              <button type="button" className={`btn btn-ghost${browseOpen ? ' is-active' : ''}`} onClick={() => setBrowseOpen((v) => !v)} aria-expanded={browseOpen}>
                <LayoutGrid size={15} /> {t('watch.browseGenres')} <ChevronDown size={14} className="anime-mega-chevron" />
              </button>
              <button type="button" className="btn btn-ghost" onClick={() => { setProduct('community'); setTab('jams'); }}>
                <UsersRound size={15} /> {t('watch.openParty')}
              </button>
            </div>
          </div>
          <div className="anime-hero-art">
            <div className="anime-hero-orbit" />
            <div className="anime-hero-poster">
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  className="watch-hero-poster-slide"
                  key={heroItem?.key ?? 'watch-poster-empty'}
                  initial={{ opacity: 0, scale: 1.04 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: .98 }}
                  transition={{ duration: .3, ease: 'easeOut' }}
                >
                  {heroItem ? <Cover item={heroItem} wide /> : <div className="anime-card-art anime-card-art-wide" style={{ background: 'linear-gradient(135deg, hsl(252 72% 30%), hsl(184 68% 26%))' }} />}
                </motion.div>
              </AnimatePresence>
            </div>
            {heroPicks.length > 1 && <div className="watch-hero-controls" aria-label={t('watch.featured')}>
              <button type="button" className="watch-hero-arrow" aria-label={t('watch.previousFeatured')} onClick={() => setHeroIndex((index) => (index - 1 + heroPicks.length) % heroPicks.length)}><ChevronRight size={16} /></button>
              <div className="watch-hero-dots">{heroPicks.map((item, index) => <button type="button" key={item.key} aria-label={t('watch.showFeaturedTitle', { n: index + 1 })} aria-current={heroIndex === index ? 'true' : undefined} className={heroIndex === index ? 'active' : ''} onClick={() => setHeroIndex(index)} />)}</div>
              <button type="button" className="watch-hero-arrow next" aria-label={t('watch.nextFeatured')} onClick={() => setHeroIndex((index) => (index + 1) % heroPicks.length)}><ChevronRight size={16} /></button>
            </div>}
            <div className="anime-hero-float">
              <UsersRound size={15} />
              <span>
                <b>{t('watch.partyLabel')}</b>
                <small>{t('watch.syncedPlayback')}</small>
              </span>
            </div>
          </div>
        </section>

        {browseOpen && (
          <div className="anime-mega" role="menu" aria-label={t('watch.browseGenres')} onMouseLeave={closeBrowse}>
            <div className="anime-mega-col">
              <span className="hub-kicker">{t('watch.megaCategories')}</span>
              {tabs
                .filter((x) => x.id !== 'home' && x.id !== 'my-list')
                .map(({ id, label, icon: Icon }) => (
                  <button type="button" key={id} className="anime-mega-link" onClick={() => { setTabView(id); closeBrowse(); }}>
                    <Icon size={15} />
                    <span>{label}</span>
                  </button>
                ))}
            </div>
            <div className="anime-mega-col anime-mega-col-wide">
              <span className="hub-kicker">{t('watch.megaGenres')}</span>
              {genreTallies.length === 0 ? (
                <p className="anime-mega-empty">{t('watch.megaEmpty')}</p>
              ) : (
                <div className="anime-mega-grid">
                  {genreTallies.map(({ genre: g, count }) => (
                    <button type="button" className="anime-mega-chip" key={g} onClick={() => pickGenre(g)}>
                      <span>{g}</span>
                      <b>{count}</b>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

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
            <input placeholder={t('watch.search')} value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>
          <div className="anime-genre-filter">
            <Filter size={14} />
            <select value={genre} onChange={(e) => setGenre(e.target.value)}>
              <option value="">{t('watch.allGenres')}</option>
              {ALL_GENRES.map((g) => <option key={g} value={g}>{g}</option>)}
            </select>
            {genre && (
              <button type="button" className="btn-icon" title={t('watch.clearGenre')} onClick={() => setGenre('')}>
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        {loading ? (
          <div className="anime-loading"><span className="admin-loader" /> {t('watch.loading')}</div>
        ) : tab === 'home' && !query && !genre ? (
          <div className="anime-home">
            {renderRail(newRails.anime, t('watch.newAnimeKicker'), t('watch.newAnime'))}
            {renderRail(newRails.films, t('watch.newFilmsKicker'), t('watch.newFilms'))}
            {categoryRails.map((rail) =>
              renderRail(
                rail,
                t('watch.categoryKicker'),
                rail.kind === 'ANIME' ? t('watch.categoryAnime') : rail.kind === 'CARTOON' ? t('watch.categoryCartoons') : t('watch.categoryFilms')
              )
            )}
            {genreRails.map((rail) => renderRail(rail, t('watch.genreKicker'), rail.id.replace('genre:', '')))}
            <div className="anime-shelves">
              {shelves.map(({ title, kicker, icon: Icon, items: shelfItems, tone }) => (
                <section className="anime-shelf" key={title}>
                  <div className="anime-shelf-head">
                    <div>
                      <span className="hub-kicker"><Icon size={12} /> {kicker}</span>
                      <h2>{title}</h2>
                    </div>
                    <button type="button" className="anime-see-all" onClick={() => setTabView('movies')}>
                      {t('watch.seeAll')} <ChevronRight size={14} />
                    </button>
                  </div>
                  <div className="anime-card-grid anime-card-grid-shelf">
                    {shelfItems.slice(0, 6).map((item) => renderCard(item, true))}
                  </div>
                  <div className={`anime-shelf-rule ${tone}`} />
                </section>
              ))}
            </div>
          </div>
        ) : (
          <section className="anime-catalogue" id="anime-catalogue">
            <div className="anime-catalogue-head">
              <div>
                <span className="hub-kicker">{catalogueKicker}</span>
                <h2>{catalogueTitle}</h2>
              </div>
              <span className="anime-catalogue-count">{t('watch.count', { n: filtered.length })}</span>
            </div>
            {filtered.length === 0 ? (
              <section className="anime-coming-soon">
                <div className="anime-art-hero"><Film size={44} /></div>
                <h2>{t('watch.emptyState')}</h2>
                <p>{t('watch.emptyHint')}</p>
                <span className="coming-soon-pill"><Globe size={14} /> {t('watch.curated')}</span>
              </section>
            ) : (
              <div className="anime-card-grid">{filtered.map((item) => renderCard(item))}</div>
            )}
          </section>
        )}
      </main>

      {selected && (
        <div className="anime-player-backdrop" onMouseDown={closeDetail}>
          <section className="anime-detail-modal" role="dialog" aria-modal="true" onMouseDown={(e) => e.stopPropagation()}>
            <div className="anime-detail-head">
              <div>
                <div className="hub-kicker">{t('watch.detailKicker', { type: kindLabel(selected) })}</div>
                <h2>{selected.title}</h2>
                {selected.subtitle && <small className="anime-original">{selected.subtitle}</small>}
              </div>
              <button type="button" className="btn-icon" onClick={closeDetail} aria-label={t('watch.close')}>
                <X size={18} />
              </button>
            </div>
            {playing && (
              <div className="anime-inline-player">
                <VinylPlayer
                  key={playing.title}
                  variant="feature"
                  autoplayInView
                  src={playing.url}
                  poster={playing.poster}
                  subtitlesUrl={playing.subtitles}
                  title={playing.title}
                  badge={t('watch.hubTitle')}
                  rememberPosition
                />
              </div>
            )}
            <div className="anime-detail-body">
              <div className="anime-detail-art">
                <Cover item={selected} />
              </div>
              <div className="anime-detail-info">
                <div className="anime-detail-meta">
                  <span>{kindLabel(selected)}</span>
                  <span>· {selected.year || t('watch.tba')}</span>
                  {selected.kind === 'ANIME' ? (
                    <>
                      <span>· {selected.subtitle || t('watch.unknownStudio')}</span>
                      <span>· {selected.episodes || episodes.length} {t('watch.eps')}</span>
                    </>
                  ) : (
                    selected.durationSec ? <span>· {formatDuration(selected.durationSec)}</span> : null
                  )}
                </div>
                <div className="anime-detail-genres">
                  {selected.genres.length
                    ? selected.genres.map((g) => <span key={g} className="anime-genre">{g}</span>)
                    : <span className="anime-dim">{t('watch.noGenres')}</span>}
                </div>
                <p className="anime-detail-overview">{selected.description || t('watch.noSynopsis')}</p>
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
            {(selected.kind === 'ANIME' || selected.kind === 'SERIES') && (
              <div className="anime-detail-episodes">
                <div className="anime-detail-section-title">
                  <span>{t('watch.episodes')}</span>
                  <small>{t('watch.published', { n: episodes.length })}</small>
                </div>
                {episodesLoading ? (
                  <p className="anime-dim">{t('watch.loading')}</p>
                ) : episodes.length === 0 ? (
                  <p className="anime-dim">{t('watch.noEpisodes')}</p>
                ) : (
                  episodes.map((ep) => (
                    <div key={ep.id} className={`anime-episode-row${activeEpisode?.id === ep.id ? ' active' : ''}`}>
                      <strong>S{ep.season || 1} · #{String(ep.number).padStart(2, '0')}</strong>
                      <span className="anime-episode-title">{ep.title || t('watch.episode', { n: ep.number })}</span>
                      <span className="anime-dim">{ep.durationSec ? formatDuration(ep.durationSec) : ''}</span>
                      <button type="button" className="btn btn-violet pill-sm" onClick={() => { setActiveEpisode(ep); openTheater(selected, ep); }}>
                        <Play size={13} fill="currentColor" /> {t('watch.watch')}
                      </button>
                    </div>
                  ))
                )}
              </div>
            )}
            <div className="anime-detail-actions">
              {selected.kind === 'ANIME' ? (
                <>
                  <button type="button" className="btn btn-violet" onClick={() => openTheater(selected)}>
                    <Play size={15} fill="currentColor" /> {t('watch.theater')}
                  </button>
                  <button type="button" className="btn btn-ghost" disabled={!episodes[0]} onClick={() => episodes[0] && playEpisode(selected, episodes[0])}>
                    <Clapperboard size={15} /> {t('watch.preview')}
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    disabled={!canStartParty}
                    onClick={() => void startParty()}
                  >
                    <UsersRound size={15} /> {t('watch.startParty')}
                  </button>
                </>
              ) : (
                <>
                  <button type="button" className="btn btn-violet" onClick={() => openTheater(selected)}>
                    <Play size={15} fill="currentColor" /> {t('watch.theater')}
                  </button>
                  <button type="button" className="btn btn-ghost" onClick={() => playMovie(selected)}>
                    <Film size={15} /> {t('watch.preview')}
                  </button>
                  <button type="button" className="btn btn-ghost" disabled={!canStartParty} onClick={() => void startParty()}>
                    <UsersRound size={15} /> {t('watch.startParty')}
                  </button>
                </>
              )}
              <button type="button" className="btn btn-ghost" onClick={() => toggleSaved(selected)}>
                <ListPlus size={15} /> {saved.has(selected.key) ? t('watch.removeFromList') : t('watch.saveLater')}
              </button>
            </div>
            {selected.kind !== 'ANIME' && (
              <div className="anime-detail-quality">
                <small>{t('watchPage.quality')}</small>
                <div className="anime-quality-row">
                  {WATCH_QUALITIES.map((q) => (
                    <button
                      type="button"
                      key={q}
                      className={`anime-quality-chip${q === quality ? ' active' : ''}`}
                      onClick={() => {
                        setQuality(q);
                        setPlaying((current) => current ? { ...current, url: resolveWatchSource(current.source, current.qualitySources, q) } : current);
                      }}
                    >
                      {q === 'auto' ? t('watchPage.qualityAuto') : q === '2160p' ? '4K' : q}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
