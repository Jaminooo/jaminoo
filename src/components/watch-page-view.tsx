'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Clapperboard, Film, Play, Sparkles, Star, Tv2 } from 'lucide-react';
import { api } from '@/lib/client-api';
import { useTranslations } from '@/providers/use-translations';
import { VinylPlayer } from '@/components/vinyl-player';
import { TopRightControls } from '@/components/top-controls';
import {
  relatedTitles,
  availableWatchQualities,
  resolveWatchSource,
  type QualitySources,
  groupEpisodesBySeason,
  DEFAULT_QUALITY,
  WATCH_QUALITIES,
  type WatchQuality,
  type WatchSelectEpisode,
  type SeasonGroup,
  type RelatedCandidate,
} from '@/lib/watch-select';
import { mergeWatchCatalog, type WatchItem } from '@/lib/watch-catalog';

const KIND_ICON: Record<string, typeof Film> = { MOVIE: Film, SERIES: Tv2, ANIME: Clapperboard, CARTOON: Sparkles };
const DEFAULT_ART: Record<string, string> = {
  MOVIE: '/defaults/images/movie.png',
  SERIES: '/defaults/images/video.png',
  CARTOON: '/defaults/images/media.png',
  ANIME: '/defaults/images/video.png',
};

interface CinemaDetail {
  id: number;
  title: string;
  description: string;
  kind: string;
  externalUrl: string | null;
  qualitySources: QualitySources;
  thumbnailUrl: string | null;
  subtitlesUrl: string | null;
  durationSec: number;
  episodes: { id: number; season: number; number: number; title: string; externalUrl: string | null; qualitySources: QualitySources; thumbnailUrl: string | null; subtitlesUrl: string | null; durationSec: number }[];
}

interface AnimeDetail {
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

function RailArt({ item }: { item: RelatedCandidate }) {
  const kind = item.kind === 'ANIME' ? 'ANIME' : item.kind;
  const art = DEFAULT_ART[kind] ?? DEFAULT_ART.MOVIE;
  const Icon = KIND_ICON[kind] ?? Film;
  return (
    <div className="watch-theater-rail-art">
      <Image src={art} alt={item.title} fill unoptimized loading="lazy" />
      <span className="watch-theater-rail-icon"><Icon size={16} /></span>
    </div>
  );
}

export function WatchPageView({ source, id, episodeParam, qualityParam }: { source: string; id: string; episodeParam?: string; qualityParam?: string }) {
  const t = useTranslations();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [title, setTitle] = useState('');
  const [badge, setBadge] = useState('');
  const [description, setDescription] = useState('');
  const [artwork, setArtwork] = useState<string | null>(null);
  const [kind, setKind] = useState<'MOVIE' | 'SERIES' | 'ANIME' | 'CARTOON'>('MOVIE');
  const [year, setYear] = useState<number | null>(null);
  const [genres, setGenres] = useState<string[]>([]);
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  const [qualitySources, setQualitySources] = useState<QualitySources>({});
  const [subtitlesUrl, setSubtitlesUrl] = useState<string | null>(null);
  const [episodes, setEpisodes] = useState<WatchSelectEpisode[]>([]);
  const [activeEpisode, setActiveEpisode] = useState<WatchSelectEpisode | null>(null);
  const [quality, setQuality] = useState<WatchQuality>(() =>
    WATCH_QUALITIES.includes(qualityParam as WatchQuality) ? (qualityParam as WatchQuality) : DEFAULT_QUALITY
  );
  const [activeSeason, setActiveSeason] = useState(1);
  const [related, setRelated] = useState<RelatedCandidate[]>([]);
  const [relatedItem, setRelatedItem] = useState<WatchItem | null>(null);
  const relatedRequestedRef = useRef(false);
  const relatedTriggerRef = useRef<HTMLDivElement>(null);

  const isAnime = source === 'anime';
  const hasEpisodes = episodes.length > 0;
  const seasonGroups = useMemo<SeasonGroup[]>(() => groupEpisodesBySeason(episodes), [episodes]);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    setRelated([]);
    setRelatedItem(null);
    relatedRequestedRef.current = false;
    try {
      const detail = isAnime
        ? await api<{ anime: AnimeDetail; episodes: { id: number; number: number; season: number; title: string; externalUrl: string | null; qualitySources: QualitySources; subtitlesUrl: string | null; thumbnailUrl: string | null }[] }>(`/api/anime/${id}`)
        : await api<{ item: CinemaDetail; episodes: CinemaDetail['episodes'] }>(`/api/cinema/${id}`);

      let item: WatchItem | null = null;
      let eps: WatchSelectEpisode[] = [];

      if (isAnime && 'anime' in detail) {
        const a = detail.anime;
        setTitle(a.title);
        setBadge(t('watch.typeAnime'));
        setDescription(a.overview);
        setArtwork(a.coverUrl);
        setKind('ANIME');
        setYear(a.year || null);
        setGenres(a.genres);
        eps = (detail.episodes || []).map((ep) => ({
          id: ep.id,
          number: ep.number,
          season: ep.season || 1,
          qualitySources: ep.qualitySources || {},
          subtitlesUrl: ep.subtitlesUrl || null,
          title: ep.title || t('watch.episode', { n: ep.number }),
          externalUrl: ep.externalUrl,
          thumbnailUrl: ep.thumbnailUrl,
        }));
        item = {
          key: `anime:${a.id}`,
          source: 'anime',
          kind: 'ANIME',
          title: a.title,
          subtitle: a.original || a.studio,
          description: a.overview,
          artworkUrl: a.coverUrl,
          trailerUrl: a.trailerUrl,
          colorFrom: a.colorFrom,
          colorTo: a.colorTo,
          rating: a.rating,
          year: a.year || null,
          genres: a.genres,
          status: a.status,
          durationSec: 0,
          episodes: a.episodes,
          externalId: a.id,
          slug: a.slug,
          mediaUrl: null,
          subtitlesUrl: null,
        };
      } else if (!isAnime && 'item' in detail) {
        const c = detail.item;
        setTitle(c.title);
        setBadge((c.kind || 'MOVIE').toUpperCase() === 'SERIES' ? t('watch.typeSeries') : (c.kind || 'MOVIE').toUpperCase() === 'CARTOON' ? t('watch.typeCartoon') : t('watch.typeMovie'));
        setDescription(c.description);
        setArtwork(c.thumbnailUrl);
        setKind((c.kind || 'MOVIE').toUpperCase() === 'SERIES' ? 'SERIES' : (c.kind || 'MOVIE').toUpperCase() === 'CARTOON' ? 'CARTOON' : 'MOVIE');
        setMediaUrl(c.externalUrl);
        setQualitySources(c.qualitySources || {});
        setSubtitlesUrl(c.subtitlesUrl);
        eps = (detail.episodes || []).map((ep) => ({
          id: ep.id, number: ep.number, season: ep.season || 1, title: ep.title || t('watch.episode', { n: ep.number }),
          externalUrl: ep.externalUrl, qualitySources: ep.qualitySources || {}, subtitlesUrl: ep.subtitlesUrl, thumbnailUrl: ep.thumbnailUrl,
        }));
        item = {
          key: `cinema:${c.id}`,
          source: 'cinema',
          kind: (c.kind || 'MOVIE').toUpperCase() as WatchItem['kind'],
          title: c.title,
          subtitle: '',
          description: c.description,
          artworkUrl: c.thumbnailUrl,
          trailerUrl: '',
          colorFrom: 0,
          colorTo: 0,
          rating: 0,
          year: null,
          genres: [],
          status: '',
          durationSec: c.durationSec,
          episodes: 0,
          externalId: c.id,
          slug: '',
          mediaUrl: c.externalUrl,
          subtitlesUrl: c.subtitlesUrl,
        };
      }

      setEpisodes(eps);
      if (eps.length > 0) {
        if (isAnime) { setKind('ANIME'); setBadge(t('watch.typeAnime')); }
        const groups = groupEpisodesBySeason(eps);
        const firstSeason = groups[0]?.season ?? 1;
        setActiveSeason(firstSeason);
        const target = episodeParam ? eps.find((e) => String(e.id) === episodeParam) : groups[0]?.episodes[0] ?? null;
        setActiveEpisode(target ?? groups[0]?.episodes[0] ?? null);
      } else {
        setActiveEpisode(null);
      }

      if (item) {
        setRelatedItem(item);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('watchPage.notFound'));
    } finally {
      setLoading(false);
    }
  }, [isAnime, id, episodeParam, t]);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    const trigger = relatedTriggerRef.current;
    if (loading || error || !trigger || !relatedItem || relatedRequestedRef.current) return;
    let active = true;
    const observer = new IntersectionObserver((entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      relatedRequestedRef.current = true;
      observer.disconnect();
      void Promise.all([
        api<{ items: CinemaDetail[] }>('/api/cinema?kind=ALL').catch(() => ({ items: [] })),
        api<{ items: AnimeDetail[] }>('/api/anime?sort=latest').catch(() => ({ items: [] })),
      ]).then(([cinemaAll, animeAll]) => {
        if (!active) return;
        const candidates = mergeWatchCatalog(cinemaAll.items || [], animeAll.items || []).map((item): RelatedCandidate => ({
          key: item.key,
          title: item.title,
          source: item.source,
          kind: item.kind,
          genres: item.genres,
          rating: item.rating,
          slug: item.slug,
        }));
        setRelated(relatedTitles(relatedItem, candidates));
      }).catch(() => {
        if (active) setRelated([]);
      });
    }, { rootMargin: '240px' });
    observer.observe(trigger);
    return () => {
      active = false;
      observer.disconnect();
    };
  }, [relatedItem, loading, error]);

  const activeSources = activeEpisode?.qualitySources ?? qualitySources;
  const qualityOptions = availableWatchQualities(activeSources);
  const selectedQuality = qualityOptions.includes(quality) ? quality : DEFAULT_QUALITY;
  const playSrc = activeEpisode
    ? resolveWatchSource(activeEpisode.externalUrl, activeSources, selectedQuality)
    : resolveWatchSource(mediaUrl, activeSources, selectedQuality);
  const playPoster = activeEpisode?.thumbnailUrl || artwork;
  const playTitle = activeEpisode
    ? `${title} · ${t('watchPage.episodeLabel', { season: activeEpisode.season, n: activeEpisode.number })}`
    : title;

  const goBack = () => {
    if (window.history.length > 1) router.back();
    else router.push('/');
  };

  const openRelated = (item: RelatedCandidate) => {
    if (!item.slug) return;
    router.push(`/watch/anime/${item.slug}`);
  };

  const KindIcon = KIND_ICON[kind] ?? Film;

  return (
    <main className="watch-theater">
      <div className="watch-theater-ambient" />
      <header className="watch-theater-top">
        <button type="button" className="watch-theater-back" onClick={goBack}>
          <ArrowLeft size={16} /> {t('watchPage.back')}
        </button>
        <span className="watch-theater-brand"><Clapperboard size={15} /> {t('watch.hubTitle')}</span>
        <TopRightControls />
      </header>

      {loading ? (
        <div className="watch-theater-state"><span className="admin-loader" /> {t('watchPage.loading')}</div>
      ) : error ? (
        <div className="watch-theater-state">
          <div className="watch-theater-state-icon"><Film size={26} /></div>
          <h1>{t('watchPage.notFound')}</h1>
          <p>{error}</p>
          <button type="button" className="btn btn-violet" onClick={goBack}>{t('watchPage.back')}</button>
        </div>
      ) : (
        <div className="watch-theater-stage">
          <div className="watch-theater-player-wrap">
            <VinylPlayer
              key={playSrc}
              variant="feature"
              fill
              autoplayInView
              src={playSrc}
              poster={playPoster}
              subtitlesUrl={activeEpisode?.subtitlesUrl || subtitlesUrl}
              title={playTitle}
              badge={badge}
              rememberPosition
            />
            {!hasEpisodes && (
              <nav className="watch-theater-meta-nav">
                <button type="button" className="active" onClick={() => setActiveSeason(activeEpisode?.season ?? 1)}>
                  <Tv2 size={13} /> {t('watch.hubTitle')}
                </button>
              </nav>
            )}
          </div>

          <div className="watch-theater-side">
            <div className="watch-theater-head">
              <span className="watch-theater-kicker"><KindIcon size={13} /> {isAnime ? t('watch.typeAnime') : kind === 'CARTOON' ? t('watch.typeCartoon') : kind === 'SERIES' ? t('watch.typeSeries') : t('watch.typeMovie')}</span>
              <h1>{title}</h1>
              <div className="watch-theater-meta">
                {year ? <span>{year}</span> : null}
                {hasEpisodes ? <span>{episodes.length} {t('watch.eps')}</span> : null}
              </div>
              {genres.length > 0 && (
                <div className="watch-theater-genres">
                  {genres.map((g) => <span key={g} className="anime-genre">{g}</span>)}
                </div>
              )}
              {description && <p className="watch-theater-desc">{description}</p>}
            </div>

            <section className="watch-theater-panel">
              <div className="watch-theater-panel-title">
                <span>{t('watchPage.quality')}</span>
                <small>{t('watchPage.qualityHint')}</small>
              </div>
              <div className="watch-quality-row">
                {qualityOptions.map((q) => (
                  <button
                    type="button"
                    key={q}
                    className={`watch-quality-chip${q === selectedQuality ? ' active' : ''}`}
                    onClick={() => setQuality(q)}
                  >
                    {q === 'auto' ? t('watchPage.qualityAuto') : q === '2160p' ? '4K' : q}
                  </button>
                ))}
              </div>
            </section>
            {hasEpisodes ? (
              <section className="watch-theater-panel">
                <div className="watch-theater-panel-title">
                  <span>{t('watch.episodes')}</span>
                  <small>{t('watchPage.chooseSeason')}</small>
                </div>
                {seasonGroups.length === 0 ? (
                  <p className="watch-theater-dim">{t('watch.noEpisodes')}</p>
                ) : (
                  <>
                    <div className="watch-season-tabs">
                      {seasonGroups.map((g) => (
                        <button
                          type="button"
                          key={g.season}
                          className={g.season === activeSeason ? 'active' : ''}
                          onClick={() => setActiveSeason(g.season)}
                        >
                          {t('watchPage.season', { n: g.season })}
                        </button>
                      ))}
                    </div>
                    <div className="watch-episode-list">
                      {(seasonGroups.find((g) => g.season === activeSeason)?.episodes ?? []).map((ep) => (
                        <button
                          type="button"
                          key={ep.id}
                          className={`watch-episode-row${activeEpisode?.id === ep.id ? ' active' : ''}`}
                          onClick={() => { setActiveEpisode(ep); }}
                        >
                          <span className="watch-episode-thumb">
                            {ep.thumbnailUrl ? <Image src={ep.thumbnailUrl} alt="" fill unoptimized loading="lazy" /> : <Play size={13} fill="currentColor" />}
                          </span>
                          <span className="watch-episode-copy">
                            <b>{ep.title}</b>
                            <small>{t('watchPage.episodeLabel', { season: ep.season, n: ep.number })}</small>
                          </span>
                          <span className="watch-episode-play"><Play size={14} fill="currentColor" /></span>
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </section>
            ) : null}
          </div>
        </div>
      )}

      {!loading && !error && relatedItem && <div ref={relatedTriggerRef} className="watch-theater-related-trigger" aria-hidden="true" />}
      {!loading && !error && related.length > 0 && (
        <section className="watch-theater-related">
          <div className="watch-theater-related-head">
            <span className="hub-kicker">{t('watchPage.relatedKicker')}</span>
            <h2>{t('watchPage.related')}</h2>
          </div>
          <div className="watch-theater-rail" dir="ltr">
            {related.map((r) => (
              <button type="button" key={r.key} className="watch-theater-rail-card" onClick={() => openRelated(r)}>
                <RailArt item={r} />
                <span className="watch-theater-rail-copy">
                  <b>{r.title}</b>
                  <small>{r.rating ? <><Star size={10} /> {r.rating.toFixed(1)}</> : r.genres.slice(0, 2).join(' · ')}</small>
                </span>
              </button>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
