'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { ArrowLeft, Clapperboard, Film, ListPlus, Play, Popcorn, Tv2, UsersRound, X } from 'lucide-react';
import { api } from '@/lib/client-api';
import { toast } from '@/components/toast';
import { useAppStore } from '@/store/app-store';
import { WorkspaceTopbar } from '@/components/hub-gateway';

type CinemaTab = 'home' | 'movies' | 'series' | 'my-list';

interface CinemaItem {
  id: number;
  title: string;
  description: string;
  kind: 'MOVIE' | 'SERIES';
  externalUrl: string | null;
  thumbnailUrl: string | null;
  subtitlesUrl: string | null;
  durationSec: number;
}

const CINEMA_SAMPLES: CinemaItem[] = [
  { id: -1, title: 'Spider-Man: New Brand', description: 'A featured movie slot prepared for the first Cinema release. The video and dedicated player will be connected later.', kind: 'MOVIE', externalUrl: null, thumbnailUrl: null, subtitlesUrl: null, durationSec: 0 },
  { id: -2, title: 'Spider-Man: New Brand — Series', description: 'A series slot prepared for future episodes. Episodes will appear here when the Cinema catalogue is ready.', kind: 'SERIES', externalUrl: null, thumbnailUrl: null, subtitlesUrl: null, durationSec: 0 },
];

function durationLabel(seconds: number) {
  if (!seconds) return '';
  const minutes = Math.floor(seconds / 60);
  const remaining = Math.floor(seconds % 60);
  return `${minutes}:${String(remaining).padStart(2, '0')}`;
}

export function CinemaHub() {
  const setProduct = useAppStore((state) => state.setProduct);
  const setTab = useAppStore((state) => state.setTab);
  const setRoomId = useAppStore((state) => state.setRoomId);
  const [tab, setTabView] = useState<CinemaTab>('home');
  const [items, setItems] = useState<CinemaItem[]>([]);
  const [savedIds, setSavedIds] = useState<number[]>([]);
  const [selected, setSelected] = useState<CinemaItem | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('jamino_cinema_list') || '[]');
      if (Array.isArray(saved)) setSavedIds(saved.filter((id) => Number.isInteger(id)));
    } catch {}
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const kind = tab === 'movies' ? 'MOVIE' : tab === 'series' ? 'SERIES' : 'ALL';
      const data = await api<{ items: CinemaItem[] }>(`/api/cinema?kind=${kind}`);
      setItems(data.items);
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Could not load Cinema Hub.', 'error');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [tab]);

  useEffect(() => { void load(); }, [load]);

  const catalogueItems = items.length || tab === 'my-list' ? items : CINEMA_SAMPLES.filter((item) => tab === 'home' || item.kind === (tab === 'movies' ? 'MOVIE' : 'SERIES'));
  const visibleItems = useMemo(() => tab === 'my-list' ? catalogueItems.filter((item) => savedIds.includes(item.id)) : catalogueItems, [catalogueItems, savedIds, tab]);

  const toggleSaved = (item: CinemaItem) => {
    const next = savedIds.includes(item.id) ? savedIds.filter((id) => id !== item.id) : [...savedIds, item.id];
    setSavedIds(next);
    localStorage.setItem('jamino_cinema_list', JSON.stringify(next));
  };

  const createJam = async (item: CinemaItem) => {
    try {
      const data = await api<{ jam: { id: string } }>('/api/jams', { method: 'POST', body: JSON.stringify({ name: `Watch ${item.title}`, desc: 'Cinema Hub watch party', type: 'PUBLIC', kind: 'MOVIE' }) });
      setSelected(null);
      setProduct('community');
      setTab('jams');
      setRoomId(data.jam.id);
      toast('Movie Jam created. Invite your members.', 'ok');
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Could not create a Movie Jam.', 'error');
    }
  };

  const tabs: { id: CinemaTab; label: string; icon: typeof Film }[] = [
    { id: 'home', label: 'Home', icon: Clapperboard },
    { id: 'movies', label: 'Movies', icon: Film },
    { id: 'series', label: 'Series', icon: Tv2 },
    { id: 'my-list', label: 'My list', icon: ListPlus },
  ];

  return (
    <div className="hub-shell hub-shell-cinema cinema-hub-root">
      <WorkspaceTopbar onHome={() => setProduct('home')} product="Cinema Hub" />
      <main className="cinema-hub-main">
        <header className="cinema-hub-heading">
          <div><div className="hub-kicker">CINEMA HUB · CONNECTED TO JAMINO</div><h1>Stories made for a shared screen.</h1><p>Movies and series live here. Movie Jams can only play this Cinema catalogue together.</p></div>
          <button type="button" className="btn btn-ghost pill-sm" onClick={() => { setProduct('community'); setTab('jams'); }}><UsersRound size={15} /> Community Jams</button>
        </header>
        <nav className="cinema-tabs cinema-hub-tabs">{tabs.map(({ id, label, icon: Icon }) => <button type="button" key={id} className={tab === id ? 'active' : ''} onClick={() => setTabView(id)}><Icon size={14} /> {label}</button>)}</nav>
        {loading ? <div className="cinema-loading"><span className="admin-loader" /> Loading the catalogue…</div> : visibleItems.length === 0 ? (
          <section className="cinema-coming-soon"><div className="cinema-art"><Popcorn size={38} /><span className="cinema-orbit cinema-orbit-one" /><span className="cinema-orbit cinema-orbit-two" /></div><div className="hub-kicker">CINEMA HUB · {tab.replace('-', ' ').toUpperCase()}</div><h2>Your next screen is coming soon.</h2><p>The Cinema catalogue is separate from Video Hub and is ready for admin releases. Once a title is live, it can be watched here or synced with a Movie Jam.</p><span className="coming-soon-pill"><Clapperboard size={14} /> Coming soon</span></section>
        ) : (
          <section className="cinema-catalogue"><div className="cinema-feature-strip"><div><span className="hub-kicker">NOW SHOWING</span><h2>{tab === 'home' ? 'Pick a title, then invite the room.' : tab === 'my-list' ? 'Your saved screen time.' : `Browse ${tab}.`}</h2></div><span className="cinema-catalogue-count">{visibleItems.length} titles</span></div><div className="cinema-card-grid">{visibleItems.map((item) => <article className="cinema-card" key={item.id}><button type="button" className="cinema-card-art" onClick={() => setSelected(item)}>{item.thumbnailUrl ? <Image src={item.thumbnailUrl} alt="" fill unoptimized /> : <span><Film size={28} /></span>}<i><Play size={16} fill="currentColor" /></i></button><div className="cinema-card-copy"><div><b>{item.title}</b><small>{item.kind} {item.durationSec ? `· ${durationLabel(item.durationSec)}` : ''}</small></div><button type="button" className={`btn-icon ${savedIds.includes(item.id) ? 'violet' : ''}`} onClick={() => toggleSaved(item)} title="Save"><ListPlus size={16} /></button></div><p>{item.description || 'A new story for the Cinema Hub.'}</p></article>)}</div></section>
        )}
      </main>
      {selected && <div className="cinema-player-backdrop" style={{ backdropFilter: 'blur(24px) saturate(1.2)', WebkitBackdropFilter: 'blur(24px) saturate(1.2)' }} onMouseDown={() => setSelected(null)}><section className="cinema-player-modal" role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}><header className="video-modal-head"><div><div className="hub-kicker">{selected.kind} · CINEMA HUB</div><h2>{selected.title}</h2></div><button type="button" className="btn-icon" onClick={() => setSelected(null)} aria-label="Close"><X size={18} /></button></header><div className="cinema-player-body"><video controls playsInline poster={selected.thumbnailUrl || undefined} src={selected.externalUrl || undefined}>{selected.subtitlesUrl && <track kind="subtitles" src={selected.subtitlesUrl} srcLang="en" label="English" default />}</video><p>{selected.description}</p><div className="cinema-player-actions"><button type="button" className="btn btn-violet" onClick={() => void createJam(selected)}><UsersRound size={15} /> Start Movie Jam</button><button type="button" className="btn btn-ghost" onClick={() => toggleSaved(selected)}><ListPlus size={15} /> {savedIds.includes(selected.id) ? 'Remove from list' : 'Save for later'}</button></div></div></section></div>}
    </div>
  );
}
