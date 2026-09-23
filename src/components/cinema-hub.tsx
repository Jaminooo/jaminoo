'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import type { LucideIcon } from 'lucide-react';
import { Clapperboard, Film, ListPlus, Play, Search, Tv2, UsersRound, X, Flame, Clock3, ChevronRight } from 'lucide-react';
import { api } from '@/lib/client-api';
import { toast } from '@/components/toast';
import { useTranslations } from '@/providers/use-translations';
import { useAppStore } from '@/store/app-store';
import { WorkspaceTopbar } from '@/components/hub-gateway';
import { connectLive, onLive } from '@/lib/live';
import { VinylPlayer } from '@/components/vinyl-player';

export interface CinemaItem {
  id: number;
  title: string;
  description: string;
  kind: string;
  externalUrl: string | null;
  thumbnailUrl: string | null;
  subtitlesUrl: string | null;
  durationSec: number;
  visibility: string;
}

type CinemaTab = 'home' | 'movies' | 'series' | 'my-list';
type Shelf = { title: string; kicker: string; icon: LucideIcon; items: CinemaItem[]; tone: string };

// Deterministic gradient per title so even cover-less entries look designed.
function titleHue(title: string, offset: number) {
  let h = 0;
  for (let i = 0; i < title.length; i++) h = (h * 31 + title.charCodeAt(i)) % 360;
  return (h + offset) % 360;
}

function Cover({ item }: { item: CinemaItem }) {
  return (
    <div className="anime-card-art anime-card-art-wide" style={artStyle(item)}>
      {item.thumbnailUrl ? (
        <Image src={item.thumbnailUrl} alt={item.title} fill unoptimized loading="lazy" />
      ) : (
        <span className="anime-card-placeholder"><Film size={26} /></span>
      )}
    </div>
  );
}

function CardArt({ item }: { item: CinemaItem }) {
  return (
    <div className="anime-card-art" style={artStyle(item)}>
      {item.thumbnailUrl ? (
        <Image src={item.thumbnailUrl} alt={item.title} fill unoptimized loading="lazy" />
      ) : (
        <span className="anime-card-placeholder"><Film size={22} /></span>
      )}
    </div>
  );
}

function artStyle(item: CinemaItem): React.CSSProperties {
  return item.thumbnailUrl
    ? {}
    : { background: `linear-gradient(135deg, hsl(${titleHue(item.title, 0)}, 65%, 26%), hsl(${titleHue(item.title, 55)}, 70%, 20%))` };
}

function durationLabel(durationSec: number, t: (key: string, vars?: Record<string, string | number>) => string) {
  if (!durationSec) return '';
  const minutes = Math.round(durationSec / 60);
  return t('cinema.duration', { n: minutes });
}

export function CinemaHub() {
  const t = useTranslations();
  const setProduct = useAppStore((s) => s.setProduct);
  const setTab = useAppStore((s) => s.setTab);
  const setRoomId = useAppStore((s) => s.setRoomId);
  const [tab, setTabView] = useState<CinemaTab>('home');
  const [items, setItems] = useState<CinemaItem[]>([]);
  const [saved, setSaved] = useState<Set<number>>(new Set());
  const [selected, setSelected] = useState<CinemaItem | null>(null);
  const [watching, setWatching] = useState<CinemaItem | null>(null);
  const [query, setQuery] = useState('');
  const [kind, setKind] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('jamino_cinema_list');
      if (raw) {
        const arr: number[] = JSON.parse(raw);
        if (Array.isArray(arr)) setSaved(new Set(arr.filter((n) => Number.isInteger(n))));
      }
    } catch {}
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api<{ items: CinemaItem[] }>('/api/cinema?kind=ALL');
      setItems(data.items || []);
    } catch (error) {
      toast(error instanceof Error ? error.message : t('cinema.loadError'), 'error');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    connectLive();
    return onLive('cinema:update', () => void load());
  }, [load]);

  const filtered = useMemo(() => {
    let list = items;
    if (tab === 'movies') list = list.filter((i) => i.kind === 'MOVIE');
    else if (tab === 'series') list = list.filter((i) => i.kind === 'SERIES');
    else if (tab === 'my-list') list = list.filter((i) => saved.has(i.id));
    if (kind) list = list.filter((i) => i.kind === kind);
    const q = query.trim().toLowerCase();
    if (q) list = list.filter((i) => i.title.toLowerCase().includes(q) || i.description.toLowerCase().includes(q));
    return list;
  }, [items, saved, tab, query, kind]);

  const shelves = useMemo<Shelf[]>(() => {
    const all = items.filter((i) => !kind && !query.trim());
    return [
      { title: t('cinema.nowShowing'), kicker: t('cinema.nowShowingKicker'), icon: Flame, items: all.slice(0, 6), tone: 'amber' },
      { title: t('cinema.freshlyAdded'), kicker: t('cinema.freshlyAddedKicker'), icon: Clock3, items: all.slice(6, 12), tone: 'violet' },
    ].filter((s) => s.items.length > 0);
  }, [items, kind, query, t]);

  const toggleSaved = (item: CinemaItem) => {
    const next = new Set(saved);
    if (next.has(item.id)) next.delete(item.id); else next.add(item.id);
    setSaved(next);
    localStorage.setItem('jamino_cinema_list', JSON.stringify([...next]));
  };

  const openDetail = (item: CinemaItem) => {
    setSelected(item);
    setWatching(item);
  };

  const startParty = async (item: CinemaItem) => {
    try {
      const data = await api<{ jam: { id: string } }>('/api/jams', {
        method: 'POST',
        body: JSON.stringify({
          name: `${t('cinema.hubTitle')} · ${item.title}`,
          desc: t('cinema.partyTagline'),
          type: 'PRIVATE',
          kind: 'MOVIE',
        }),
      });
      await api(`/api/jams/${data.jam.id}/cinema`, { method: 'PATCH', body: JSON.stringify({ action: 'load', videoId: item.id }) });
      setSelected(null);
      setProduct('community');
      setTab('jams');
      setRoomId(data.jam.id);
      toast(t('cinema.partyCreated'), 'ok');
    } catch (error) {
      toast(error instanceof Error ? error.message : t('cinema.partyError'), 'error');
    }
  };

  const tabs: { id: CinemaTab; label: string; icon: LucideIcon }[] = [
    { id: 'home', label: t('cinema.home'), icon: Clapperboard },
    { id: 'movies', label: t('cinema.movies'), icon: Film },
    { id: 'series', label: t('cinema.series'), icon: Tv2 },
    { id: 'my-list', label: t('cinema.myList'), icon: ListPlus },
  ];

  const renderCard = (item: CinemaItem, compact = false) => (
    <article className={`anime-card${compact ? ' anime-card-compact' : ''}`} key={item.id}>
      <button type="button" className="anime-card-hit" onClick={() => openDetail(item)} aria-label={t('cinema.open', { title: item.title })}>
        <div className="anime-card-media">
          <CardArt item={item} />
          <i className={`anime-type-badge ${item.kind === 'MOVIE' ? 'movie' : 'series'}`}>
            {item.kind === 'MOVIE' ? t('cinema.movie') : t('cinema.seriesBadge')}
          </i>
          <span className="anime-card-play"><Play size={16} fill="currentColor" /></span>
        </div>
        <div className="anime-card-copy">
          <b>{item.title}</b>
          <small>{item.description ? `${item.description.slice(0, 60)}${item.description.length > 60 ? '…' : ''}` : durationLabel(item.durationSec, t)}</small>
          <div className="anime-card-meta">
            <span className="anime-status">{item.kind === 'MOVIE' ? t('cinema.movie') : t('cinema.seriesBadge')}</span>
            <span>{item.durationSec ? durationLabel(item.durationSec, t) : t('cinema.tba')}</span>
          </div>
        </div>
      </button>
      <button
        type="button"
        className={`btn-icon violet anime-save-button${saved.has(item.id) ? ' is-saved' : ''}`}
        title={saved.has(item.id) ? t('cinema.saved') : t('cinema.save')}
        onClick={() => toggleSaved(item)}
      >
        <ListPlus size={16} />
      </button>
    </article>
  );

  const heroAnime: CinemaItem = items[0] || {
    id: 0,
    title: t('cinema.yourNextFilm'),
    description: '',
    kind: 'MOVIE',
    externalUrl: null,
    thumbnailUrl: null,
    subtitlesUrl: null,
    durationSec: 0,
    visibility: 'PUBLIC',
  };

  const catalogueKicker =
    tab === 'my-list' ? t('cinema.searchResults') : tab === 'home' ? t('cinema.catalogueKickerResults') : t('cinema.catalogueKickerBrowse', { kind: tab.toUpperCase() });

  return (
    <div className="hub-shell hub-shell-anime anime-hub-root cinema-hub-root">
      <WorkspaceTopbar onHome={() => setProduct('home')} product="Cinema Hub" />
      <main className="anime-hub-main">
        <section className="anime-hero">
          <div className="anime-hero-copy">
            <span className="hub-kicker"><Flame size={13} /> {t('cinema.heroKicker')}</span>
            <h1>
              {t('cinema.heroTitleA')}
              <br />
              <em>{t('cinema.heroTitleB')}</em>
            </h1>
            <p>{t('cinema.heroDesc')}</p>
            <div className="anime-hero-actions">
              <button
                type="button"
                className="btn btn-violet"
                onClick={() => document.getElementById('cinema-catalogue')?.scrollIntoView({ behavior: 'smooth' })}
              >
                <Play size={15} fill="currentColor" /> {t('cinema.explore')}
              </button>
              <button type="button" className="btn btn-ghost" onClick={() => { setProduct('community'); setTab('jams'); }}>
                <UsersRound size={15} /> {t('cinema.openParty')}
              </button>
            </div>
          </div>
          <div className="anime-hero-art">
            <div className="anime-hero-orbit" />
            <div className="anime-hero-poster">
              <Cover item={heroAnime} />
            </div>
            <div className="anime-hero-float">
              <UsersRound size={15} />
              <span>
                <b>{t('cinema.partyLabel')}</b>
                <small>{t('cinema.syncedPlayback')}</small>
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
            <input placeholder={t('cinema.search')} value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>
          <div className="anime-genre-filter">
            <select value={kind} onChange={(e) => setKind(e.target.value)}>
              <option value="">{t('cinema.allKinds')}</option>
              <option value="MOVIE">{t('cinema.movie')}</option>
              <option value="SERIES">{t('cinema.seriesBadge')}</option>
            </select>
            {kind && (
              <button type="button" className="btn-icon" title={t('cinema.clearKind')} onClick={() => setKind('')}>
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        {loading ? (
          <div className="anime-loading"><span className="admin-loader" /> {t('cinema.loading')}</div>
        ) : tab === 'home' && !query && !kind ? (
          <div className="anime-shelves">
            {shelves.map(({ title, kicker, icon: Icon, items: shelfItems, tone }) => (
              <section className="anime-shelf" key={title}>
                <div className="anime-shelf-head">
                  <div>
                    <span className="hub-kicker"><Icon size={12} /> {kicker}</span>
                    <h2>{title}</h2>
                  </div>
                  <button type="button" className="anime-see-all" onClick={() => setTabView('movies')}>
                    {t('cinema.seeAll')} <ChevronRight size={14} />
                  </button>
                </div>
                <div className="anime-card-grid anime-card-grid-shelf">
                  {shelfItems.map((item) => renderCard(item, true))}
                </div>
                <div className={`anime-shelf-rule ${tone}`} />
              </section>
            ))}
          </div>
        ) : (
          <section className="anime-catalogue" id="cinema-catalogue">
            <div className="anime-catalogue-head">
              <div>
                <span className="hub-kicker">{catalogueKicker}</span>
                <h2>{t('cinema.catalogueTitle')}</h2>
              </div>
              <span className="anime-catalogue-count">{t('cinema.count', { n: filtered.length })}</span>
            </div>
            {filtered.length === 0 ? (
              <section className="anime-coming-soon">
                <div className="anime-art-hero"><Film size={44} /></div>
                <h2>{t('cinema.empty')}</h2>
                <p>{t('cinema.emptyHint')}</p>
                <span className="coming-soon-pill">{t('cinema.curated')}</span>
              </section>
            ) : (
              <div className="anime-card-grid">{filtered.map((item) => renderCard(item))}</div>
            )}
          </section>
        )}
      </main>

      {selected && (
        <div className="anime-player-backdrop" onMouseDown={() => setSelected(null)}>
          <section className="anime-detail-modal" role="dialog" aria-modal="true" onMouseDown={(e) => e.stopPropagation()}>
            <div className="anime-detail-head">
              <div>
                <div className="hub-kicker">{t('cinema.detailKicker', { kind: selected.kind === 'MOVIE' ? t('cinema.movie') : t('cinema.seriesBadge') })}</div>
                <h2>{selected.title}</h2>
                <small className="anime-original">{durationLabel(selected.durationSec, t)}</small>
              </div>
              <button type="button" className="btn-icon" onClick={() => setSelected(null)} aria-label={t('cinema.close')}>
                <X size={18} />
              </button>
            </div>
            {watching?.externalUrl && (
              <div className="anime-inline-player">
                <VinylPlayer
                  key={watching.id}
                  variant="feature"
                  src={watching.externalUrl}
                  poster={watching.thumbnailUrl}
                  subtitlesUrl={watching.subtitlesUrl}
                  title={watching.title}
                  badge={t('cinema.hubTitle')}
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
                  <span>{selected.kind === 'MOVIE' ? t('cinema.movie') : t('cinema.seriesBadge')}</span>
                  <span>· {selected.durationSec ? durationLabel(selected.durationSec, t) : t('cinema.tba')}</span>
                </div>
                <p className="anime-detail-overview">{selected.description || t('cinema.noDescription')}</p>
              </div>
            </div>
            <div className="anime-detail-actions">
              <button type="button" className="btn btn-violet" disabled={!selected.externalUrl} onClick={() => void startParty(selected)}>
                <UsersRound size={15} /> {t('cinema.startParty')}
              </button>
              <button type="button" className="btn btn-ghost" onClick={() => toggleSaved(selected)}>
                <ListPlus size={15} /> {saved.has(selected.id) ? t('cinema.removeFromList') : t('cinema.saveForLater')}
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}